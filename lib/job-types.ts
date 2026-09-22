import { z } from "zod";

import {
  historicalCandidateSchema,
  historicalReferenceSchema,
  presentationHistoricalReferenceSchema,
} from "./historical-references.ts";

export const jobStatuses = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  "interrupted",
  "capped",
] as const;

export const jobPhases = [
  "queued",
  "retrieving_transcript",
  "extracting_candidates",
  "synthesizing",
  "completed",
  "failed",
  "cancelled",
  "capped",
] as const;

export const capReasons = ["time", "hits"] as const;
export const capReasonSchema = z.enum(capReasons);
export const jobTimingSchema = z
  .object({
    elapsedSeconds: z.number().int().nonnegative(),
    estimatedRemainingSeconds: z.number().int().nonnegative().nullable(),
    budgetSeconds: z.number().int().positive(),
  })
  .strict();

export const jobStatusSchema = z.enum(jobStatuses);
export const jobPhaseSchema = z.enum(jobPhases);

export const jobProgressSchema = z
  .object({
    completedChunks: z.number().int().nonnegative(),
    totalChunks: z.number().int().nonnegative(),
    candidateCount: z.number().int().nonnegative(),
    completedSynthesisGroups: z.number().int().nonnegative(),
    totalSynthesisGroups: z.number().int().nonnegative(),
    percent: z.number().int().min(0).max(100),
  })
  .strict();

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type JobPhase = z.infer<typeof jobPhaseSchema>;
export type JobProgress = z.infer<typeof jobProgressSchema>;
export type CapReason = z.infer<typeof capReasonSchema>;
export type JobTiming = z.infer<typeof jobTimingSchema>;

export const jobSnapshotSchema = z
  .object({
    jobId: z.string().uuid(),
    status: jobStatusSchema,
    phase: jobPhaseSchema,
    progress: jobProgressSchema,
    message: z.string(),
    videoUrl: z.string().url(),
    transcriptLanguage: z.string().nullable(),
    transcriptTruncated: z.boolean(),
    warnings: z.array(z.string()),
    hits: z.array(presentationHistoricalReferenceSchema),
    markdown: z.string().nullable(),
    error: z.string().nullable(),
    timing: jobTimingSchema,
    startedAt: z.string().datetime().nullable(),
    processingStartSeconds: z.number().int().nonnegative(),
    processedUntilSeconds: z.number().int().nonnegative(),
    capReason: capReasonSchema.nullable(),
    resumeFromSeconds: z.number().int().nonnegative().nullable(),
    resumeUrl: z.string().url().nullable(),
    maxHits: z.number().int().positive(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type JobSnapshot = z.infer<typeof jobSnapshotSchema>;

export const createJobResponseSchema = z
  .object({
    jobId: z.string().uuid(),
    status: jobStatusSchema,
    pollUrl: z.string().min(1),
  })
  .strict();

export type CreateJobResponse = z.infer<typeof createJobResponseSchema>;

export const persistedJobSchema = jobSnapshotSchema
  .extend({
    hits: z.array(historicalReferenceSchema),
    chunkCharacters: z.number().int().positive().nullable().default(null),
    cancelRequested: z.boolean(),
    candidatesByChunk: z.record(z.string(), z.array(historicalCandidateSchema)),
    failedChunks: z.array(z.number().int().nonnegative()),
    synthesisByGroup: z.record(z.string(), z.array(historicalReferenceSchema)),
    checkpoint: z.enum([
      "created",
      "transcript",
      "candidates",
      "synthesis",
      "complete",
    ]),
    maxRuntimeSeconds: z.number().int().positive(),
    thumbnailPaths: z.record(z.string(), z.string()),
  })
  .strict();

export type PersistedJob = z.infer<typeof persistedJobSchema>;

export function isTerminalJobStatus(status: JobStatus) {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "capped"
  );
}

export function isRetryableJobStatus(status: JobStatus) {
  return (
    status === "failed" || status === "cancelled" || status === "interrupted"
  );
}

export function phaseMessage(phase: JobPhase) {
  switch (phase) {
    case "queued":
      return "Waiting for a local Codex worker.";
    case "retrieving_transcript":
      return "Retrieving and normalizing the complete caption timeline.";
    case "extracting_candidates":
      return "Finding meaningful multi-word phrases in the transcript.";
    case "synthesizing":
      return "Deduplicating references and verifying sources.";
    case "completed":
      return "Bibliography ready.";
    case "failed":
      return "The bibliography job failed.";
    case "cancelled":
      return "The bibliography job was cancelled.";
    case "capped":
      return "The run reached its processing limit; continue from the saved timestamp.";
  }
}

export function calculateEtaSeconds(
  elapsedSeconds: number,
  completedUnits: number,
  totalUnits: number,
) {
  if (
    completedUnits <= 0 ||
    totalUnits <= 0 ||
    completedUnits >= totalUnits ||
    elapsedSeconds <= 0
  ) {
    return completedUnits >= totalUnits && totalUnits > 0 ? 0 : null;
  }

  return Math.max(
    0,
    Math.ceil(
      (elapsedSeconds / completedUnits) * (totalUnits - completedUnits),
    ),
  );
}

export function calculateJobTiming(
  record: Pick<
    PersistedJob,
    "startedAt" | "maxRuntimeSeconds" | "progress" | "status" | "phase"
  >,
  now = Date.now(),
): JobTiming {
  const startedAt = record.startedAt ? Date.parse(record.startedAt) : NaN;
  const elapsedSeconds = Number.isFinite(startedAt)
    ? Math.max(0, Math.floor((now - startedAt) / 1_000))
    : 0;
  const completedUnits =
    record.phase === "synthesizing"
      ? record.progress.completedSynthesisGroups
      : record.progress.completedChunks;
  const totalUnits =
    record.phase === "synthesizing"
      ? record.progress.totalSynthesisGroups
      : record.progress.totalChunks;

  return {
    elapsedSeconds,
    estimatedRemainingSeconds:
      record.status === "completed" || record.status === "capped"
        ? 0
        : calculateEtaSeconds(elapsedSeconds, completedUnits, totalUnits),
    budgetSeconds: record.maxRuntimeSeconds,
  };
}
