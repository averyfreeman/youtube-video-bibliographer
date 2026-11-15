# YouTube Video Bibliographer

This standalone Next.js application and CLI turns a YouTube URL into a thorough, timestamped, source-grounded bibliography covering historical references, public policy, economics research, key quotations, and events. Captions are retrieved locally, isolated Codex CLI OAuth workers curate meaningful multi-word phrases, and resumable job state is stored under `.runtime/jobs`.

## Run locally

```bash
pnpm install
codex login
pnpm dev
```

Open <http://localhost:3000/app>. Set `CODEX_CLI_PATH` if `codex` is not on `PATH`, `CODEX_HOME` if OAuth lives elsewhere, `AGY_CLI_PATH` if `agy` is elsewhere, optional `GEMINI_API_KEY` if you want raw temperature/top-K sampling tuning via REST API, or `BIBLIOGRAPHER_RUNTIME_DIR` for another job directory. The optional `BIBLIOGRAPHER_CONFIG_PATH` overrides the project config location.

`bibliographer.config.toml` is project-owned and references `DEFAULT_PROMPT.md`. It supports **Antigravity CLI OAuth (`agy -p`, defaulting to `gemini-4-hydrogen` with Google OAuth2.0 and no API key needed)**, **Codex CLI OAuth (`gpt-6-luna`)**, and an optional `GEMINI_API_KEY` REST provider (`gemini-4-hydrogen` with `temperature = 0.35`, `editorial_temperature = 0.85`, `top_k = 40`). The default contract uses 12,000-character chunks, 16 candidates per chunk, timeline-balanced shortlisting up to 50–65 references, parallel batched verification (`verification_batch_size = 8`, `verification_concurrency = 3`), and a 15-minute processing budget. User-level Codex configuration and API-key environment variables are not used.

## CLI & `../policy-braintrust` integration

Run from the command line without starting the web server:

```bash
# Run a video and output JSON (includes PolicyTimeline-ready items)
pnpm cli -- run "https://www.youtube.com/watch?v=VIDEO_ID" --format json

# Export a ready-to-publish Starlight MDX policy dossier into ../policy-braintrust
pnpm cli -- run "https://www.youtube.com/watch?v=VIDEO_ID" --format policy-mdx --out ../policy-braintrust/src/content/docs/policies/my-dossier.mdx

# Run a video and verify all extracted candidates across a specific time window
pnpm cli -- run "https://www.youtube.com/watch?v=VIDEO_ID" --start 15:00 --end 1:05:00 --all-candidates

# Chain detected YouTube chapters sequentially into one unified bibliography (coalescing <3m segments)
pnpm cli -- run "https://www.youtube.com/watch?v=VIDEO_ID" --all-sections --format md

# Expand remaining unverified candidates on an existing saved job without re-extracting
pnpm cli -- expand <job-id>

# Resume an interrupted or capped job from its saved checkpoint
pnpm cli -- resume <job-id>

# Restyle an existing saved job with thematic sections and vivid prose (no web re-search)
pnpm cli -- restyle <job-id>

# Export or list saved jobs in .runtime/jobs
pnpm cli -- list --format md
pnpm cli -- export <job-id> --format policy-mdx
```

CLI flags include `--start`, `--end`, `--all-candidates`, `--all-sections`, `--max-hits`, `--soft-max-hits`, `--max-runtime`, `--no-limit`, `--categories`, `--focus`, `--no-thumbnails`, `--no-context`, `--provider`, `--temperature`, `--title`, `--description`, and `--quiet`. The web UI supports `?t=` / `?start=` / `&end=` URL windows, **What kind of references are you most interested in?** optional research focus & topic selectors (`Any`, `Economics`, `Public policy`, `Events`, `Historical context`, `Politics`, `Famous quotes`), **Inspect video** (placed ahead of **Collect references**) with chapter slicing and unified **All sections** chaining, an **All extracted candidates** (default) vs **Curated 1-pass** coverage selector, client-side pagination (`10`, `25` default, `50`, `100`, `All`) that leaves Markdown exports complete, **Verify remaining N candidates** in-place expansion, and **Expand all audits** / **Collapse all audits**.

## Workflow

Submitting a URL returns immediately while the worker:

1. retrieves and normalizes captions, applying any optional YouTube `t=<seconds>s` cursor;
2. generates a factual video overview in parallel with chunk extraction;
3. extracts meaningful multi-word phrases across all transcript chunks (`candidate_concurrency = 3`);
4. globally deduplicates and selects a timeline-balanced shortlist;
5. verifies the shortlist in parallel checkpointed batches (`verification_batch_size = 8`), groups the timeline into thematic video sections, and runs a warm editorial pass over context, analysis, and source notes;
6. optionally generates best-effort 320×180 storyboard thumbnails when `--thumbnails` / the UI checkbox is enabled (off by default); and
7. writes ordered hits, sections, and exact Markdown output.

If a run reaches its time budget, it pauses safely as `capped` with all extracted candidates and verified batches preserved. Resuming from checkpoint continues right where the pipeline stopped without clearing existing references from the UI. Missing `yt-dlp`, `ffmpeg`, or storyboard formats produce warnings without failing the bibliography.

## Output

The results begin with a video preamble covering title, channel, upload/publication date, description-supported primary participants, theme, and summary when established. Each result is presented as a numbered annotated timeline entry with a category badge, linked `HH:MM:SS` timestamp, brief evidence, an original-source link when available, concise bibliographer’s analysis, optional description-only speaker attribution and discussion context, and a collapsed audit section containing confidence, source quality, reference date, verification notes, and all source links. The Markdown code block lives at `/app/jobs/[jobId]/markdown`; the exact file is downloaded from `/api/references/[jobId]/markdown`.

## Checks and benchmarks

```bash
pnpm verify
pnpm benchmark -- --transcript path/to/transcript.json --output docs/benchmarks/reasoning-ab-latest.json
```

`pnpm verify` runs formatting, linting, typechecking, unit tests, the production build, and Playwright tests.
