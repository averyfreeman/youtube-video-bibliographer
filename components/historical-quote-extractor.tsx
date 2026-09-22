"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { ProcessFlowDiagram } from "@/components/process-flow-diagram";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  isWeakSource,
  referenceCategoryLabels,
} from "@/lib/historical-references";
import {
  isTerminalJobStatus,
  type CreateJobResponse,
  type JobSnapshot,
} from "@/lib/job-types";
import { timestampUrl } from "@/lib/markdown-export";

function readableEvidenceType(value: string) {
  return value.replace(/_/g, " ");
}

function readableQuality(value: string) {
  return value.replace(/_/g, " ");
}

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "Estimating…";
  }

  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function isJobSnapshot(value: unknown): value is JobSnapshot {
  return Boolean(
    value &&
    typeof value === "object" &&
    "jobId" in value &&
    "status" in value &&
    "progress" in value,
  );
}

const MAX_POLL_FAILURES = 5;

export function HistoricalQuoteExtractor() {
  const [videoUrl, setVideoUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading =
    isSubmitting || Boolean(job && !isTerminalJobStatus(job.status));
  const jobStatus = job?.status;
  const visibleHits = job?.hits ?? [];
  const hasResults =
    visibleHits.length > 0 ||
    job?.status === "completed" ||
    job?.status === "capped";

  useEffect(() => {
    if (!jobId || (jobStatus && isTerminalJobStatus(jobStatus))) {
      return;
    }

    let stopped = false;
    let timer: number | undefined;
    let consecutiveFailures = 0;

    async function poll() {
      let retryableFailure = true;
      try {
        const response = await fetch(`/api/historical-references/${jobId}`, {
          cache: "no-store",
        });
        const payload: unknown = await response.json();

        if (!response.ok) {
          retryableFailure =
            response.status === 408 ||
            response.status === 429 ||
            response.status >= 500;
          throw new Error(
            payload && typeof payload === "object" && "error" in payload
              ? String(payload.error)
              : "The bibliography job could not be read.",
          );
        }

        if (!isJobSnapshot(payload)) {
          throw new Error("The server returned an invalid job snapshot.");
        }

        if (!stopped) {
          consecutiveFailures = 0;
          setError(null);
          setJob(payload);
          if (!isTerminalJobStatus(payload.status)) {
            timer = window.setTimeout(poll, 1_250);
          }
        }
      } catch (pollError) {
        if (!stopped) {
          setError(
            pollError instanceof Error
              ? pollError.message
              : "The bibliography job could not be read.",
          );
          consecutiveFailures += 1;
          if (retryableFailure && consecutiveFailures < MAX_POLL_FAILURES) {
            timer = window.setTimeout(poll, 1_250);
          } else {
            setJob(null);
            setJobId(null);
          }
        }
      }
    }

    void poll();
    return () => {
      stopped = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [jobId, jobStatus]);

  async function startJob(requestedVideoUrl: string) {
    setError(null);
    setJob(null);
    setJobId(null);
    setIsSubmitting(true);
    setVideoUrl(requestedVideoUrl);

    try {
      const response = await fetch("/api/historical-references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: requestedVideoUrl }),
      });
      const payload = (await response.json()) as
        CreateJobResponse | { error?: string };

      if (!response.ok || !("jobId" in payload)) {
        throw new Error(
          "error" in payload
            ? (payload.error ?? "The bibliography worker could not be started.")
            : "The bibliography worker returned an incomplete response.",
        );
      }

      setJobId(payload.jobId);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The bibliography worker could not be started.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void startJob(videoUrl);
  }

  async function cancelJob() {
    if (!jobId) {
      return;
    }

    const response = await fetch(`/api/historical-references/${jobId}/cancel`, {
      method: "POST",
    });
    const payload = (await response.json()) as JobSnapshot | { error?: string };
    if (!response.ok || !isJobSnapshot(payload)) {
      setError(
        "error" in payload
          ? (payload.error ?? "The job could not be cancelled.")
          : "The job could not be cancelled.",
      );
      return;
    }
    setJob(payload);
  }

  async function retryJob() {
    if (!jobId) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/historical-references/${jobId}/retry`, {
      method: "POST",
    });
    const payload = (await response.json()) as JobSnapshot | { error?: string };
    if (!response.ok || !isJobSnapshot(payload)) {
      setError(
        "error" in payload
          ? (payload.error ?? "The job could not be retried.")
          : "The job could not be retried.",
      );
      return;
    }
    setJob(payload);
  }

  function continueFromCursor() {
    if (!job?.resumeUrl) {
      return;
    }
    void startJob(job.resumeUrl);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="badge badge-outline">Local Codex worker</div>
            <ThemeSwitcher />
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            YouTube Video Bibliographer
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-base-content/75">
            Build a compact, source-grounded reading list from meaningful
            multi-word phrases in a YouTube transcript.
          </p>
          <ProcessFlowDiagram />
        </header>

        <form
          className="card card-border bg-base-100 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="card-body gap-5">
            <div>
              <label className="label" htmlFor="video-url">
                <span className="label-text font-semibold">
                  YouTube video URL
                </span>
              </label>
              <input
                id="video-url"
                className="input input-bordered w-full"
                type="url"
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                required
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading loading-spinner" />
                ) : null}
                {isLoading ? "Processing video" : "Build bibliography"}
              </button>
              <span className="text-sm text-base-content/60">
                Phrase-only · max 40 hits · ten-minute budget · medium reasoning
              </span>
            </div>

            {job && !isTerminalJobStatus(job.status) ? (
              <div className="space-y-3" role="status" aria-live="polite">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span>{job.message}</span>
                  <span className="font-mono tabular-nums">
                    {job.progress.percent}%
                  </span>
                </div>
                <progress
                  className="progress progress-primary w-full"
                  value={job.progress.percent}
                  max="100"
                />
                <div className="grid gap-2 text-xs text-base-content/65 sm:grid-cols-2 lg:grid-cols-4">
                  <span>
                    Elapsed: {formatDuration(job.timing.elapsedSeconds)}
                  </span>
                  <span>
                    Approx. remaining:{" "}
                    {formatDuration(job.timing.estimatedRemainingSeconds)}
                  </span>
                  <span>
                    Budget: {formatDuration(job.timing.budgetSeconds)}
                  </span>
                  <span>
                    Chunks: {job.progress.completedChunks}/
                    {job.progress.totalChunks || "…"}
                  </span>
                  <span>Candidate phrases: {job.progress.candidateCount}</span>
                  <span>
                    Hits: {job.hits.length}/{job.maxHits}
                  </span>
                  <span>Job: {job.jobId.slice(0, 8)}</span>
                </div>
                <button
                  className="btn btn-sm btn-outline"
                  type="button"
                  onClick={cancelJob}
                >
                  Cancel job
                </button>
              </div>
            ) : null}
          </div>
        </form>

        {error ? (
          <div className="alert alert-error mt-6" role="alert">
            <span>{error}</span>
          </div>
        ) : null}

        {job?.status === "failed" || job?.status === "cancelled" ? (
          <div className="alert alert-warning mt-6" role="status">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <span>{job.error ?? job.message}</span>
              <button className="btn btn-sm" type="button" onClick={retryJob}>
                Retry from checkpoint
              </button>
            </div>
          </div>
        ) : null}

        {job?.status === "capped" ? (
          <div className="alert alert-warning mt-6" role="alert">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">
                  This run stopped at its limit.
                </div>
                <p className="text-sm">
                  {job.capReason === "hits"
                    ? `The ${job.maxHits}-hit cap was reached.`
                    : "The ten-minute processing budget was reached."}{" "}
                  Your partial bibliography is saved.
                </p>
              </div>
              {job.resumeUrl ? (
                <button
                  className="btn btn-sm"
                  type="button"
                  onClick={continueFromCursor}
                >
                  Continue from {formatDuration(job.resumeFromSeconds)}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {hasResults && job ? (
          <section className="mt-10 space-y-6" aria-live="polite">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="badge badge-outline mb-3">
                  {job.status === "completed"
                    ? "Bibliography ready"
                    : "Partial results"}
                </div>
                <h2 className="text-3xl font-bold">Bibliographic hits</h2>
                <p className="mt-2 text-base-content/70">
                  {visibleHits.length} hit{visibleHits.length === 1 ? "" : "s"}{" "}
                  in video order
                  {job.transcriptLanguage
                    ? ` · captions: ${job.transcriptLanguage}`
                    : ""}
                </p>
              </div>
              <a
                className="link link-primary break-all text-sm"
                href={job.videoUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open source video
              </a>
            </div>

            {job.warnings.length > 0 ? (
              <div className="alert alert-warning" role="status">
                <div>
                  <div className="font-semibold">Run notes</div>
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {job.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {visibleHits.length === 0 ? (
              <div className="card card-border bg-base-100">
                <div className="card-body">
                  <p className="text-base-content/70">
                    No meaningful multi-word phrases survived curation before
                    the run stopped.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-5">
              {visibleHits.map((hit, index) => (
                <article
                  className="card card-border bg-base-100 shadow-sm"
                  key={`${hit.timestamp}-${hit.title}`}
                >
                  {hit.thumbnailUrl ? (
                    <figure className="bg-base-300">
                      <a
                        href={timestampUrl(job.videoUrl, hit.timestampSeconds)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Image
                          src={hit.thumbnailUrl}
                          alt={`Storyboard thumbnail for ${hit.title} at ${hit.timestamp}`}
                          width={320}
                          height={180}
                          className="h-auto w-full object-cover sm:max-h-44"
                          loading="lazy"
                          unoptimized
                        />
                      </a>
                    </figure>
                  ) : null}
                  <div className="card-body gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="badge badge-outline">
                          {referenceCategoryLabels[hit.category]}
                        </span>
                        <span className="badge badge-ghost">
                          {readableEvidenceType(hit.evidenceType)}
                        </span>
                        <span className="badge badge-ghost">
                          Confidence: {hit.confidence}
                        </span>
                        <span className="badge badge-ghost">
                          {readableEvidenceType(hit.verificationStatus)}
                        </span>
                      </div>
                      <span className="text-sm text-base-content/60">
                        Hit {index + 1}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold">{hit.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-base-content/70">
                        <a
                          className="timestamp-link link link-primary font-mono"
                          href={timestampUrl(
                            job.videoUrl,
                            hit.timestampSeconds,
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {hit.timestamp}
                        </a>
                        {hit.historicalDate ? (
                          <span>Historical date: {hit.historicalDate}</span>
                        ) : null}
                      </div>
                    </div>

                    <blockquote className="border-l-4 border-primary/40 pl-4 text-base-content/80">
                      {hit.videoEvidence}
                    </blockquote>

                    <div className="bibliographer-prose leading-7 text-base-content/80">
                      {hit.analysisParagraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>

                    <details className="border-t border-base-300 pt-4 text-sm">
                      <summary className="cursor-pointer font-semibold">
                        Verification and further reading
                      </summary>
                      <div className="mt-3 space-y-3">
                        <p className="text-base-content/70">
                          {hit.verificationNote}
                        </p>
                        <p className="text-base-content/60">
                          Confidence reasons: {hit.confidenceReasons.join("; ")}
                        </p>
                        {hit.sources.length > 0 ? (
                          <ul className="space-y-2">
                            {hit.sources.map((source) => (
                              <li key={source.url}>
                                <a
                                  className="link link-primary"
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {source.title}
                                </a>{" "}
                                <span className="text-base-content/60">
                                  ({readableQuality(source.quality)})
                                </span>
                                {isWeakSource(source) ? (
                                  <span className="ml-2 text-warning">
                                    Verify independently.
                                  </span>
                                ) : null}
                                {source.note ? (
                                  <span className="block text-base-content/60">
                                    {source.note}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-base-content/60">
                            No trustworthy source was available yet.
                          </p>
                        )}
                      </div>
                    </details>
                  </div>
                </article>
              ))}
            </div>

            {job.markdown ? (
              <div className="card card-border bg-base-100">
                <div className="card-body flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold">Portable Markdown</h3>
                    <p className="text-sm text-base-content/70">
                      Open the full code block on its own page or download the
                      exact generated file.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="btn btn-sm btn-outline"
                      href={`/app/jobs/${job.jobId}/markdown`}
                    >
                      View Markdown
                    </Link>
                    <a
                      className="btn btn-sm btn-primary"
                      download="youtube-bibliography.md"
                      href={`/api/historical-references/${job.jobId}/markdown`}
                    >
                      Download `.md`
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
