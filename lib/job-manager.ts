import { randomUUID } from "node:crypto";

import { executeBibliographyJob } from "./job-pipeline.ts";
import { JobStore } from "./job-store.ts";
import { loadBibliographerConfig } from "./bibliographer-config.ts";
import {
  isRetryableJobStatus,
  isTerminalJobStatus,
  phaseMessage,
  type JobSnapshot,
  type PersistedJob,
} from "./job-types.ts";

type ActiveRun = {
  controller: AbortController;
  promise: Promise<void>;
};

const store = new JobStore();
const activeRuns = new Map<string, ActiveRun>();
let recoveryPromise: Promise<void> | null = null;

function startJob(jobId: string) {
  if (activeRuns.has(jobId)) {
    return;
  }

  const controller = new AbortController();
  const promise = executeBibliographyJob(
    jobId,
    store,
    controller.signal,
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

export async function createBibliographyJob(videoUrl: string) {
  await ensureJobRecovery();
  const config = await loadBibliographerConfig();
  const record = await store.create(videoUrl, randomUUID(), {
    maxHits: config.processing.maxHits,
    maxRuntimeSeconds: config.processing.maxRuntimeSeconds,
  });
  startJob(record.jobId);

  return {
    jobId: record.jobId,
    status: record.status,
    pollUrl: `/api/historical-references/${record.jobId}`,
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
      "Only failed, cancelled, or interrupted jobs can be retried.",
    );
  }

  const queued = await store.write({
    ...record,
    status: "queued",
    phase: "queued",
    message: "Retry queued; saved transcript and checkpoints will be reused.",
    error: null,
    cancelRequested: false,
  });
  startJob(jobId);
  return store.snapshot(queued);
}

export function isKnownJobError(error: unknown) {
  return (
    error instanceof Error && /job id|job can be retried/i.test(error.message)
  );
}

export type { PersistedJob };
