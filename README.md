# YouTube Video Bibliographer

This standalone Next.js application turns a YouTube URL into a compact, timestamped, source-grounded historical bibliography. Captions are retrieved locally, isolated Codex CLI OAuth workers curate meaningful multi-word phrases, and resumable job state is stored under `.runtime/jobs`.

## Run locally

```bash
pnpm install
codex login
pnpm dev
```

Open <http://localhost:3000/app>. Set `CODEX_CLI_PATH` if `codex` is not on `PATH`, `CODEX_HOME` if OAuth lives elsewhere, or `BIBLIOGRAPHER_RUNTIME_DIR` for another job directory. The optional `BIBLIOGRAPHER_CONFIG_PATH` overrides the project config location.

`bibliographer.config.toml` is project-owned and references `DEFAULT_PROMPT.md`. Candidate extraction uses high-recall reasoning; synthesis, verification, and the video overview use medium reasoning. The contract uses 80,000-character chunks, phrase-only curation, a 40-hit maximum, and a ten-minute processing budget. User-level Codex configuration and API-key environment variables are not used.

## Workflow

Submitting a URL returns immediately while the worker:

1. retrieves and normalizes captions, applying any YouTube `t=<seconds>s` cursor;
2. extracts a small set of meaningful multi-word phrases from larger chunks;
3. globally deduplicates before source verification;
4. creates a factual video preamble from metadata and the YouTube description;
5. verifies only the bounded shortlist and optionally adds compact transcript-local discussion context afterward;
6. generates best-effort 320×180 storyboard thumbnails; and
7. writes ordered hits and exact Markdown output.

Long runs stop safely as `capped` after ten minutes or 40 projected hits. The UI preserves partial results, elapsed/ETA counters, and a continuation action that starts at the saved timestamp. Missing `yt-dlp`, `ffmpeg`, or storyboard formats produce warnings without failing the bibliography.

## Output

The results begin with a video preamble covering title, channel, upload/publication date, description-supported primary participants, theme, and summary when established. Each hit includes a linked `HH:MM:SS` timestamp, category, evidence type, historical date when established, description-only speaker attribution when supported, faithful video evidence, optional compact discussion context, concise historical analysis, confidence, verification status, and up to three sources. Results remain in video order. The Markdown code block lives at `/app/jobs/[jobId]/markdown`; the exact file is downloaded from `/api/historical-references/[jobId]/markdown`.

The page defaults to a dark daisyUI theme, includes a Mermaid process diagram with a text fallback, and uses lazy storyboard images on compact result cards.

## Project documents

- `CONTEXT.md` defines the domain vocabulary and invariants.
- `docs/ARCHITECTURE.md` explains bounded orchestration, persistence, media, and UI ownership.
- `docs/ACCEPTANCE.md` records automated and manual acceptance requirements.
- `docs/AI_SCAFFOLDING.md` describes prompts, schemas, benchmarks, and the Codex boundary.
- `docs/GRANULARITY_METHODS.md` records the three one-notch coverage options and the stage-specific reasoning recommendation.
- `docs/diagrams/` contains the canonical Mermaid v2 diagram and generated source.
- `docs/adr/` contains durable architecture decisions.
- `.agents/skills/video-bibliographer/` is the reusable phrase-only extraction contract.

## Checks and benchmarks

```bash
pnpm verify
pnpm benchmark -- --transcript path/to/transcript.json --output docs/benchmarks/reasoning-ab-latest.json
```

`pnpm verify` runs formatting, linting, typechecking, unit tests, the production build, and Playwright tests. The benchmark compares `medium`, `high`, and `max` on one transcript and records operational and manual-quality fields.
