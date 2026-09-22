# YouTube Video Bibliographer Context

This file is the domain glossary. Runtime architecture and acceptance procedures live in `docs/ARCHITECTURE.md` and `docs/ACCEPTANCE.md`.

## Terms

- **Phrase**: A curated multi-word historical expression or named subject grounded in a spoken transcript. Single words are intentionally excluded; this release has no glossary.
- **Video timeline**: The order in which phrases are spoken. It is the canonical display and export order.
- **Transcript segment**: One caption line with source offset, duration, normalized text, and an `HH:MM:SS` timestamp.
- **Transcript chunk**: An overlapping prompt-sized window. Chunking limits one Codex call, not the retrieved transcript; a continuation job applies a timestamp cursor first.
- **Candidate**: A possible phrase returned by extraction before global deduplication and source verification.
- **Hit**: A deduplicated, source-grounded phrase shown in the results. A run returns at most 40 hits by default.
- **Cursor**: The integer video second at which a capped run stopped. Continuation URLs use YouTube's `t=<seconds>s` query.
- **Storyboard tile**: A UI-only 320×180 crop from a YouTube storyboard sprite sheet, linked to a hit timestamp.
- **Bibliography job**: A persisted asynchronous run identified by UUID. Its transcript, extraction checkpoints, timing, cap state, thumbnails, and Markdown are recoverable locally.
- **Cap reason**: `time` for the ten-minute processing budget or `hits` for the 40-hit safety limit.
- **Checkpoint**: A durable boundary: `created`, `transcript`, `candidates`, `synthesis`, or `complete`.

## Domain invariants

- Results contain meaningful multi-word phrases only; introductions, show metadata, generic restatements, and single-word concepts are rejected.
- Global title deduplication happens before web verification. Verification may improve evidence but cannot add or broaden hits.
- A hit is ordered by video timestamp, never by historical date, and always links to transcript evidence and the source video.
- A capped run is terminal, preserves partial results, records elapsed time and the processed cursor, and exposes a continuation URL.
- An unavailable source is represented explicitly with an empty source list and an explanation; the system does not invent citations.
- Thumbnails are presentation-only and best effort. Missing `yt-dlp`, `ffmpeg`, or a storyboard produces a warning, not a failed bibliography.
