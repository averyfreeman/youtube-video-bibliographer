import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_MAX_HITS,
  DEFAULT_MAX_RUNTIME_SECONDS,
} from "./bibliographer-config.ts";
import {
  persistedJobSchema,
  type PersistedJob,
  type JobSnapshot,
} from "./job-types.ts";
import { calculateJobTiming } from "./job-types.ts";
import type { YouTubeTranscript } from "./youtube-transcript.ts";

export type JobCreateOptions = {
  maxHits?: number;
  maxRuntimeSeconds?: number;
};

const JOB_ID_PATTERN = /^[0-9a-f-]{36}$/i;

export function runtimeJobsDirectory() {
  return (
    process.env.BIBLIOGRAPHER_RUNTIME_DIR?.trim() ||
    path.join(process.cwd(), ".runtime", "jobs")
  );
}

function assertJobId(jobId: string) {
  if (!JOB_ID_PATTERN.test(jobId)) {
    throw new Error("Invalid bibliography job id.");
  }
}

async function writeJsonAtomically(filePath: string, value: unknown) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(value, null, 2), "utf8");
  await rename(temporaryPath, filePath);
}

export class JobStore {
  readonly rootDirectory: string;

  constructor(rootDirectory = runtimeJobsDirectory()) {
    this.rootDirectory = rootDirectory;
  }

  private directoryFor(jobId: string) {
    assertJobId(jobId);
    return path.join(this.rootDirectory, jobId);
  }

  private recordPath(jobId: string) {
    return path.join(this.directoryFor(jobId), "job.json");
  }

  private transcriptPath(jobId: string) {
    return path.join(this.directoryFor(jobId), "transcript.json");
  }

  thumbnailDirectory(jobId: string) {
    return path.join(this.directoryFor(jobId), "thumbnails");
  }

  thumbnailPath(jobId: string, index: number) {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error("Invalid thumbnail index.");
    }
    return path.join(this.thumbnailDirectory(jobId), `${index}.jpg`);
  }

  async ensureRoot() {
    await mkdir(this.rootDirectory, { recursive: true });
  }

  async create(
    videoUrl: string,
    jobId: string,
    options: JobCreateOptions = {},
  ): Promise<PersistedJob> {
    const now = new Date().toISOString();
    const record = persistedJobSchema.parse({
      jobId,
      status: "queued",
      phase: "queued",
      progress: {
        completedChunks: 0,
        totalChunks: 0,
        candidateCount: 0,
        completedSynthesisGroups: 0,
        totalSynthesisGroups: 0,
        percent: 0,
      },
      message: "Waiting for a local Codex worker.",
      videoUrl,
      transcriptLanguage: null,
      transcriptTruncated: false,
      videoOverview: null,
      warnings: [],
      hits: [],
      markdown: null,
      error: null,
      timing: {
        elapsedSeconds: 0,
        estimatedRemainingSeconds: null,
        budgetSeconds: options.maxRuntimeSeconds ?? DEFAULT_MAX_RUNTIME_SECONDS,
      },
      startedAt: null,
      processingStartSeconds: 0,
      processedUntilSeconds: 0,
      capReason: null,
      resumeFromSeconds: null,
      resumeUrl: null,
      maxHits: options.maxHits ?? DEFAULT_MAX_HITS,
      createdAt: now,
      updatedAt: now,
      chunkCharacters: null,
      cancelRequested: false,
      candidatesByChunk: {},
      failedChunks: [],
      synthesisByGroup: {},
      checkpoint: "created",
      maxRuntimeSeconds:
        options.maxRuntimeSeconds ?? DEFAULT_MAX_RUNTIME_SECONDS,
      thumbnailPaths: {},
      videoMetadata: null,
    });

    await this.ensureRoot();
    await mkdir(this.directoryFor(jobId), { recursive: true });
    await this.write(record);
    return record;
  }

  async read(jobId: string): Promise<PersistedJob> {
    const raw = await readFile(this.recordPath(jobId), "utf8");
    return persistedJobSchema.parse(JSON.parse(raw));
  }

  async write(record: PersistedJob) {
    const parsed = persistedJobSchema.parse({
      ...record,
      updatedAt: new Date().toISOString(),
    });
    await mkdir(this.directoryFor(parsed.jobId), { recursive: true });
    await writeJsonAtomically(this.recordPath(parsed.jobId), parsed);
    return parsed;
  }

  async writeTranscript(jobId: string, transcript: YouTubeTranscript) {
    await writeJsonAtomically(this.transcriptPath(jobId), transcript);
  }

  async writeThumbnail(jobId: string, index: number, content: Uint8Array) {
    await mkdir(this.thumbnailDirectory(jobId), { recursive: true });
    await writeFile(this.thumbnailPath(jobId, index), content);
  }

  async readThumbnail(jobId: string, index: number) {
    return readFile(this.thumbnailPath(jobId, index));
  }

  async readTranscript(jobId: string) {
    try {
      const raw = await readFile(this.transcriptPath(jobId), "utf8");
      return JSON.parse(raw) as YouTubeTranscript;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  async list() {
    await this.ensureRoot();
    const entries = await readdir(this.rootDirectory, { withFileTypes: true });
    const records: PersistedJob[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || !JOB_ID_PATTERN.test(entry.name)) {
        continue;
      }

      try {
        records.push(await this.read(entry.name));
      } catch {
        // A partially written or manually removed job should not block recovery.
      }
    }

    return records.sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  }

  snapshot(record: PersistedJob): JobSnapshot {
    return {
      jobId: record.jobId,
      status: record.status,
      phase: record.phase,
      progress: record.progress,
      message: record.message,
      videoUrl: record.videoUrl,
      transcriptLanguage: record.transcriptLanguage,
      transcriptTruncated: record.transcriptTruncated,
      videoOverview: record.videoOverview,
      warnings: record.warnings,
      hits: record.hits.map((hit, index) => ({
        ...hit,
        thumbnailUrl: record.thumbnailPaths[String(index)]
          ? `/api/historical-references/${record.jobId}/thumbnails/${index}`
          : null,
      })),
      markdown: record.markdown,
      error: record.error,
      timing: calculateJobTiming(record),
      startedAt: record.startedAt,
      processingStartSeconds: record.processingStartSeconds,
      processedUntilSeconds: record.processedUntilSeconds,
      capReason: record.capReason,
      resumeFromSeconds: record.resumeFromSeconds,
      resumeUrl: record.resumeUrl,
      maxHits: record.maxHits,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
