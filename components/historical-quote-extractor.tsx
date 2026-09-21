"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  isWeakSource,
  referenceCategoryLabels,
  type HistoricalReferencesResponse,
} from "@/lib/historical-references";
import { timestampUrl } from "@/lib/markdown-export";

const stages = [
  "Retrieving captions…",
  "Mapping the transcript timeline…",
  "Finding historical references…",
  "Verifying sources with web search…",
  "Writing the bibliography…",
];

function readableEvidenceType(value: string) {
  return value.replace(/_/g, " ");
}

function readableQuality(value: string) {
  return value.replace(/_/g, " ");
}

export function HistoricalQuoteExtractor() {
  const [videoUrl, setVideoUrl] = useState("");
  const [result, setResult] = useState<HistoricalReferencesResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const interval = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % stages.length);
    }, 4_000);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setCopied(false);
    setStageIndex(0);
    setIsLoading(true);

    try {
      const response = await fetch("/api/historical-references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });
      const payload = (await response.json()) as {
        error?: string;
        warnings?: string[];
        videoUrl?: string;
        transcriptLanguage?: string | null;
        transcriptTruncated?: boolean;
        hits?: HistoricalReferencesResponse["hits"];
        markdown?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The bibliography request failed.");
      }

      if (
        !payload.videoUrl ||
        !payload.hits ||
        !payload.markdown ||
        payload.transcriptLanguage === undefined ||
        payload.transcriptTruncated === undefined
      ) {
        throw new Error("The server returned an incomplete bibliography.");
      }

      setResult({
        videoUrl: payload.videoUrl,
        transcriptLanguage: payload.transcriptLanguage,
        transcriptTruncated: payload.transcriptTruncated,
        warnings: payload.warnings ?? [],
        hits: payload.hits,
        markdown: payload.markdown,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The bibliography request failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function copyMarkdown() {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  function downloadMarkdown() {
    if (!result) {
      return;
    }

    const blob = new Blob([result.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "youtube-bibliography.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 space-y-4">
          <div className="badge badge-primary badge-outline">
            Local Codex prototype
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            YouTube Video Bibliographer
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-base-content/75">
            Give the local Codex CLI a YouTube URL. It will read the captions,
            preserve the video timeline, and build a detailed bibliography of
            historical quotes, publications, events, and related references.
          </p>
        </header>

        <form
          className="card border border-base-300 bg-base-100 shadow-sm"
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
                {isLoading ? "Building bibliography" : "Build bibliography"}
              </button>
              <span className="text-sm text-base-content/60">
                Captions only · local OAuth · gpt-5.6-luna / max reasoning
              </span>
            </div>
            {isLoading ? (
              <div
                className="alert alert-info"
                role="status"
                aria-live="polite"
              >
                <span className="loading loading-dots loading-sm" />
                <span>{stages[stageIndex]}</span>
              </div>
            ) : null}
          </div>
        </form>

        {error ? (
          <div className="alert alert-error mt-6" role="alert">
            <span>{error}</span>
          </div>
        ) : null}

        {result ? (
          <section className="mt-10 space-y-6" aria-live="polite">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="badge badge-success badge-outline mb-3">
                  Bibliography ready
                </div>
                <h2 className="text-3xl font-bold">Bibliographic hits</h2>
                <p className="mt-2 text-base-content/70">
                  {result.hits.length} hit{result.hits.length === 1 ? "" : "s"}{" "}
                  in video order
                  {result.transcriptLanguage
                    ? ` · captions: ${result.transcriptLanguage}`
                    : ""}
                </p>
              </div>
              <a
                className="link link-primary break-all text-sm"
                href={result.videoUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open source video
              </a>
            </div>

            {result.warnings.length > 0 ? (
              <div className="alert alert-warning" role="status">
                <div>
                  <div className="font-semibold">Partial-run notes</div>
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="space-y-5">
              {result.hits.map((hit, index) => (
                <article
                  className="card border border-base-300 bg-base-100 shadow-sm"
                  key={`${hit.timestamp}-${hit.title}`}
                >
                  <div className="card-body gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="badge badge-primary">
                          {referenceCategoryLabels[hit.category]}
                        </span>
                        <span className="badge badge-ghost">
                          {readableEvidenceType(hit.evidenceType)}
                        </span>
                        <span className="badge badge-ghost">
                          Confidence: {hit.confidence}
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
                            result.videoUrl,
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

                    <div className="border-t border-base-300 pt-4">
                      <h4 className="font-semibold">Further reading</h4>
                      <ul className="mt-2 space-y-2 text-sm">
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
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <section className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">Portable Markdown</h2>
                    <p className="text-sm text-base-content/70">
                      Copy the full timeline or download it as a `.md` file.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-sm btn-outline"
                      type="button"
                      onClick={copyMarkdown}
                    >
                      {copied ? "Copied" : "Copy Markdown"}
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      type="button"
                      onClick={downloadMarkdown}
                    >
                      Download `.md`
                    </button>
                  </div>
                </div>
                <div className="mockup-code overflow-hidden bg-base-300">
                  <pre
                    className="markdown-output p-4 text-sm"
                    aria-label="Markdown bibliography"
                  >
                    <code>{result.markdown}</code>
                  </pre>
                </div>
              </div>
            </section>
          </section>
        ) : null}
      </div>
    </main>
  );
}
