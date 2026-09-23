# Acceptance

## Automated gate

Run:

```bash
pnpm verify
```

The gate covers phrase rejection, intro filtering, project configuration, timestamp cursors, ETA/cap state, storyboard tile selection, metadata/overview and discussion-context contracts, Markdown headers/body, mocked asynchronous polling, Mermaid fallback, lazy thumbnails, exact Markdown downloads, and the production build.

The preserved raw result artifact `docs/RAW_PAGE_DOWNLOAD_1.md` is intentionally ignored by formatting because it is a baseline capture rather than application source. `DEFAULT_PROMPT.md` is part of this release and must remain formatted.

## Known inspiration video

The live acceptance target is <https://www.youtube.com/watch?v=Xxodq1QWvMk>. Run it locally only after `codex login` and confirm that captions are available. The default run is intentionally capped at 600 seconds and 40 hits. Record the job UUID, cursor, cap reason, elapsed time, warnings, transcript language, processed chunks, candidate phrases, final hit count, and generated Markdown.

The prior exhaustive baseline (`5728a0ea-36c5-4d96-a94c-8d13300ccb1e`) took more than three hours and produced 94 hits from 96 candidates. It is retained as evidence for the compact design; it is not a target output count.

## Manual review gate

Inspect at least one completed and one capped run. Confirm that:

- one-word concepts and introduction/show metadata do not appear;
- the preamble identifies the video and theme only where metadata or captions support it;
- each hit’s speaker and discussion context remain distinct from historical analysis;
- timestamps remain in video order and continuation URLs use `t=<seconds>s`;
- verification does not add or broaden titles beyond the supplied shortlist;
- thumbnails are 320×180, lazy, and linked to the associated timestamp;
- the capped alert is non-blocking and starts a new run at the saved cursor;
- the standalone Markdown page and download contain exactly the generated Markdown.

## Reasoning benchmark

Run `pnpm benchmark -- --transcript <same-transcript.json> --output docs/benchmarks/reasoning-ab-latest.json` to compare `medium`, `high`, and `max` on the same fixture. The command records elapsed time, Codex calls, chunks, synthesis groups, candidates, final hits, cap reason, resume cursor, warnings, and manual quality notes. The checked-in report under `docs/benchmarks/` records the latest controlled run or its explicit unavailable reason.
