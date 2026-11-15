import { randomUUID } from "node:crypto";

import {
  executeBibliographyJob,
  expandBibliographyJobCandidates,
  refreshJobEditorialPresentation,
  type ExecuteJobOptions,
} from "./job-pipeline.ts";
import { JobStore } from "./job-store.ts";
import {
  loadBibliographerConfig,
  MAX_HITS_LIMIT,
  MAX_RUNTIME_SECONDS_LIMIT,
} from "./bibliographer-config.ts";
import type {
  ExtractionDepth,
  ModelProvider,
  ReferenceCategory,
} from "./historical-references.ts";
import { timestampWindowUrl } from "./markdown-export.ts";
import { getYouTubeMetadata, planVideoChapters } from "./youtube-metadata.ts";
import type { YouTubeChapter } from "./youtube-metadata-schema.ts";
import { parseTimestampRange } from "./youtube-transcript.ts";
import {
  isRetryableJobStatus,
  isTerminalJobStatus,
  phaseMessage,
  type JobSnapshot,
  type JobSummary,
  type PersistedJob,
} from "./job-types.ts";

type ActiveRun = {
  controller: AbortController;
  promise: Promise<void>;
};

const store = new JobStore();
const activeRuns = new Map<string, ActiveRun>();
let recoveryPromise: Promise<void> | null = null;

function startJob(jobId: string, options?: ExecuteJobOptions) {
  if (activeRuns.has(jobId)) {
    return;
  }

  const controller = new AbortController();
  const promise = executeBibliographyJob(
    jobId,
    store,
    controller.signal,
    options,
  ).finally(() => {
    activeRuns.delete(jobId);
  });

  activeRuns.set(jobId, { controller, promise });
  void promise;
}

async function recoverInterruptedJobs() {
  const records = await store.list();
  for (const record of records) {
    if (isTerminalJobStatus(record.status)) {
      continue;
    }

    if (record.status === "running") {
      await store.write({
        ...record,
        status: "interrupted",
        message:
          "The previous worker stopped; resuming from the latest checkpoint.",
        error: null,
      });
    }

    startJob(record.jobId);
  }
}

export async function ensureJobRecovery() {
  recoveryPromise ??= recoverInterruptedJobs().catch(() => undefined);
  await recoveryPromise;
}

async function readRecord(jobId: string) {
  await ensureJobRecovery();
  return store.read(jobId);
}

export async function listBibliographyJobs(): Promise<JobSummary[]> {
  await ensureJobRecovery();
  const records = await store.list();
  return [...records]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((record) => store.summary(record));
}

export async function createBibliographyJob(
  videoUrl: string,
  options: {
    includeThumbnails?: boolean;
    provider?: ModelProvider;
    temperature?: number;
    startSeconds?: number;
    endSeconds?: number | null;
    extractionDepth?: ExtractionDepth;
    focusPrompt?: string;
    targetCategories?: ReferenceCategory[];
    useChapterPlan?: boolean;
    chapters?: YouTubeChapter[];
  } = {},
) {
  await ensureJobRecovery();
  const config = await loadBibliographerConfig();
  const parsedRange = parseTimestampRange(videoUrl);
  const startSeconds = options.startSeconds ?? parsedRange.startSeconds;
  const endSeconds =
    options.endSeconds !== undefined
      ? options.endSeconds
      : parsedRange.endSeconds;
  const effectiveUrl =
    options.startSeconds !== undefined || options.endSeconds !== undefined
      ? timestampWindowUrl(videoUrl, startSeconds, endSeconds)
      : videoUrl;
  const depth = options.extractionDepth ?? "all";

  let chapterPlan: YouTubeChapter[] = [];
  if (options.useChapterPlan) {
    let rawChapters = options.chapters ?? [];
    let durationSeconds: number | null = null;
    if (rawChapters.length === 0) {
      try {
        const meta = await getYouTubeMetadata(
          effectiveUrl,
          config.thumbnails.ytdlpPath,
        );
        rawChapters = meta.chapters;
        durationSeconds = meta.durationSeconds;
      } catch {
        rawChapters = [];
      }
    }
    const planned = planVideoChapters(rawChapters, durationSeconds);
    chapterPlan = planned.plannedChapters;
  }

  const chapterBudgetSeconds =
    chapterPlan.length > 0
      ? Math.min(
          4 * 3_600,
          Math.max(MAX_RUNTIME_SECONDS_LIMIT, chapterPlan.length * 1_800),
        )
      : undefined;

  const record = await store.create(effectiveUrl, randomUUID(), {
    maxHits: depth === "all" ? MAX_HITS_LIMIT : config.processing.maxHits,
    softMaxHits:
      depth === "all" ? MAX_HITS_LIMIT : config.processing.softMaxHits,
    tailGraceSeconds: config.processing.tailGraceSeconds,
    maxRuntimeSeconds:
      chapterBudgetSeconds ??
      (depth === "all"
        ? MAX_RUNTIME_SECONDS_LIMIT
        : config.processing.maxRuntimeSeconds),
    allowUnlimited: chapterPlan.length > 0,
    includeThumbnails: options.includeThumbnails ?? false,
    provider: options.provider ?? config.llm.provider,
    temperature: options.temperature ?? null,
    extractionDepth: depth,
    focusPrompt: options.focusPrompt?.trim() || null,
    targetCategories: Array.from(new Set(options.targetCategories ?? [])),
    processingEndSeconds: endSeconds ?? null,
    chapterPlan,
  });
  startJob(record.jobId, {
    includeThumbnails: record.includeThumbnails,
    provider: record.provider,
    temperature: record.temperature ?? undefined,
  });

  return {
    jobId: record.jobId,
    status: record.status,
    pollUrl: `/api/references/${record.jobId}`,
  };
}

export async function getBibliographyJob(jobId: string): Promise<JobSnapshot> {
  const record = await readRecord(jobId);
  return store.snapshot(record);
}

export async function getBibliographyThumbnail(jobId: string, index: number) {
  await readRecord(jobId);
  return store.readThumbnail(jobId, index);
}

export async function cancelBibliographyJob(jobId: string) {
  const record = await readRecord(jobId);
  if (isTerminalJobStatus(record.status)) {
    return store.snapshot(record);
  }

  const activeRun = activeRuns.get(jobId);
  const updated = await store.write({
    ...record,
    cancelRequested: true,
    message: "Cancellation requested; waiting for the local worker to stop.",
  });

  if (activeRun) {
    activeRun.controller.abort();
  } else {
    const cancelled = await store.write({
      ...updated,
      status: "cancelled",
      phase: "cancelled",
      message: phaseMessage("cancelled"),
    });
    return store.snapshot(cancelled);
  }

  return store.snapshot(updated);
}

export async function retryBibliographyJob(jobId: string) {
  const record = await readRecord(jobId);
  if (!isRetryableJobStatus(record.status)) {
    throw new Error(
      "Only failed, cancelled, interrupted, or capped jobs can be resumed.",
    );
  }

  const queued = await store.write({
    ...record,
    status: "queued",
    phase: "queued",
    message: "Resume queued; saved transcript and checkpoints will be reused.",
    error: null,
    cancelRequested: false,
    capReason: null,
    resumeFromSeconds: null,
    resumeUrl: null,
  });
  if (record.synthesisByGroup["expand:base"]) {
    const controller = new AbortController();
    const promise = expandBibliographyJobCandidates(
      jobId,
      store,
      controller.signal,
    ).finally(() => {
      activeRuns.delete(jobId);
    });
    activeRuns.set(jobId, { controller, promise });
    void promise;
  } else {
    startJob(jobId);
  }
  return store.snapshot(queued);
}

export async function expandBibliographyJob(
  jobId: string,
  options: {
    provider?: ModelProvider;
    temperature?: number;
  } = {},
) {
  const record = await readRecord(jobId);
  if (
    activeRuns.has(jobId) ||
    record.status === "running" ||
    record.status === "queued"
  ) {
    throw new Error(
      "Wait for the current run to pause or finish before verifying remaining candidates.",
    );
  }
  const snapshot = store.snapshot(record);
  if (snapshot.unverifiedCandidateCount === 0) {
    return snapshot;
  }

  const queued = await store.write({
    ...record,
    status: "running",
    phase: "synthesizing",
    message: `Preparing to verify ${snapshot.unverifiedCandidateCount} remaining candidates.`,
    error: null,
    cancelRequested: false,
    ...(options.provider ? { provider: options.provider } : {}),
    ...(options.temperature !== undefined
      ? { temperature: options.temperature }
      : {}),
  });

  const controller = new AbortController();
  const promise = expandBibliographyJobCandidates(
    jobId,
    store,
    controller.signal,
    options,
  ).finally(() => {
    activeRuns.delete(jobId);
  });
  activeRuns.set(jobId, { controller, promise });
  void promise;

  return store.snapshot(queued);
}

export async function restyleBibliographyJob(
  jobId: string,
  options: {
    provider?: ModelProvider;
    temperature?: number;
  } = {},
) {
  const record = await readRecord(jobId);
  if (
    activeRuns.has(jobId) ||
    record.status === "running" ||
    record.status === "queued"
  ) {
    throw new Error(
      "Wait for the current run to pause or finish before refreshing its narrative.",
    );
  }
  if (record.hits.length === 0) {
    throw new Error("This job has no saved references to restyle yet.");
  }

  const restoreStatus =
    record.status === "capped" || record.capReason !== null
      ? ("capped" as const)
      : ("completed" as const);
  const queued = await store.write({
    ...record,
    status: "running",
    phase: "synthesizing",
    message: "Refreshing narrative notes and video sections.",
    error: null,
    cancelRequested: false,
    ...(options.provider ? { provider: options.provider } : {}),
    ...(options.temperature !== undefined
      ? { temperature: options.temperature }
      : {}),
  });

  const controller = new AbortController();
  const promise = refreshJobEditorialPresentation(
    jobId,
    store,
    controller.signal,
    {
      ...options,
      restoreStatus,
    },
  ).finally(() => {
    activeRuns.delete(jobId);
  });
  activeRuns.set(jobId, { controller, promise });
  void promise;

  return store.snapshot(queued);
}

export function isKnownJobError(error: unknown) {
  return (
    error instanceof Error &&
    /job id|can be retried|can be resumed|to restyle|current run/i.test(
      error.message,
    )
  );
}

export type { PersistedJob };
