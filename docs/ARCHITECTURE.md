# Architecture

The application is a local-first Next.js route plus a filesystem-backed worker. `app/api/historical-references/` owns HTTP boundaries, `lib/job-manager.ts` owns lifecycle and recovery, `lib/job-store.ts` owns durable state, `lib/job-pipeline.ts` owns bounded orchestration, and `components/historical-quote-extractor.tsx` owns polling and presentation.

## Bounded lifecycle

```text
POST URL
  -> queued job.json
  -> retrieve captions and apply optional t=<seconds>s cursor
  -> extract 12,000-character chunks with high-recall phrase filtering
  -> globally deduplicate candidates
  -> verify only a <=40-item shortlist, expanding to <=52 in the final five minutes
  -> optionally enrich the saved presentation
  -> generate best-effort 320x180 storyboard tiles
  -> completed or capped job.json
```

Creation returns `202` with a job identifier and poll URL. A worker starts with the project-owned `bibliographer.config.toml`, reads `DEFAULT_PROMPT.md`, and invokes isolated Codex CLI subprocesses. Candidate extraction uses the project’s high-recall effort, while synthesis, verification, overview, and optional context enrichment use medium effort by default; the shared setting remains a fallback for stage-specific overrides. The CLI still ignores user configuration and repository rules; the application injects the project prompt explicitly.

The default safety envelope is a usual 40 final hits, a hard 52-hit ceiling in the final five minutes, and 600 seconds. Extraction proceeds in chronological batches and checks the deadline between calls. A capped job is terminal, keeps partial hits, records `capReason`, `processedUntilSeconds`, timing, and `resumeUrl`, and can be continued by submitting that URL as a new job. The soft limit, hard ceiling, and tail allowance are persisted with the job. Failed jobs remain retryable from their latest checkpoint; capped jobs use the explicit continuation path.

## Processing boundaries

Transcript retrieval keeps every available caption segment. `parseTimestampStart` reads `t=245s`, `t=4m5s`, and similar YouTube values; `filterTranscriptFromTimestamp` applies that cursor before chunking. The default chunk size is 12,000 characters with one-segment overlap.

Candidate extraction asks for high-value multi-word phrases only. `lib/phrase-curation.ts` rejects one-word concepts, introductions, show metadata, generic restatements, and repeated titles deterministically after schema validation. Candidates are deduplicated globally before any web search. Intermediate synthesis may merge evidence but receives only the curated candidates. Final verification receives a shortlist and is filtered back to its supplied titles, so it cannot expand the result set.

`lib/codex.ts` is the only subprocess adapter. It passes the configured reasoning effort (`medium`, `high`, `xhigh`, or `max`), JSON Schema output, a read-only sandbox, and a temporary working directory. API-key environment variables are removed. The browser receives persisted snapshots only.

## Persistence and media

Each job directory contains `job.json`, `transcript.json`, and optionally `thumbnails/<index>.jpg`. Atomic JSON writes make checkpoints recoverable. Job state also persists best-effort `videoMetadata` and a reader-facing `videoOverview`. New overviews use description-only people/theme/summary enrichment and cap the participant list at four. Snapshot-only `thumbnailUrl` values point to `/api/historical-references/[jobId]/thumbnails/[index]`; Markdown is served exactly by `/api/historical-references/[jobId]/markdown` and shown on `/app/jobs/[jobId]/markdown`, not embedded in the long results list.

Storyboard generation calls `yt-dlp` for a signed storyboard format and `ffmpeg` for tile crops. Both paths are configurable. Tool absence, missing storyboard formats, HTTP failures, and individual crop failures are warnings, while the bibliography remains usable.

## UI

The title is followed by a rendered Mermaid flowchart with a text fallback. Running jobs show percent, caption sections, possible references, references kept, elapsed time, approximate remaining time, and the ten-minute budget. Results open with a compact video preamble and use numbered annotated timeline cards with lazy thumbnails, description-bounded speaker attribution, prominent original-source links, concise bibliographer notes, optional compact discussion context, and collapsed audit details. A capped alert offers a continuation action, and Markdown navigation appears after the result cards.
