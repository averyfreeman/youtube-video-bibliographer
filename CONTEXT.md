# YouTube Video Bibliographer Context

## Purpose

The prototype turns a YouTube URL into a portable, source-backed historical bibliography. It is an adjunct-sized tool for a future shared-memory system, not an all-purpose personal site.

## Vocabulary

- **Video timeline**: The order references are spoken in the source video. It is the canonical display and export order.
- **Hit**: A deduplicated historical reference that survived transcript evidence, synthesis, and source checks.
- **Candidate**: A possible hit found while analyzing one timestamped transcript chunk.
- **Evidence type**: `direct_quote` means the speaker quotes wording; `paraphrase` means the speaker restates an idea; `reference` means the speaker points to an event, work, institution, or statement without quoting it.
- **Source quality**: `primary`, `reputable`, `secondary`, `analysis`, or `culture`. The last three are retained with an explicit verification note.
- **Historical date**: The date or date range of the referenced historical subject, separate from the timestamp where it occurs in the video.

## Boundaries

- One user-facing route: `/app`.
- Caption retrieval only; no YouTube API key and no manual transcript fallback.
- Local Codex CLI OAuth only; no OpenAI API key is accepted by the route.
- Fixed Codex model `gpt-5.6-luna` and reasoning level `max`.
- Markdown (`.md`) is the first export format. The export registry is intentionally extensible for a later `.mdx` adapter.
- The browser receives a JSON response and renders the Markdown export locally; no bibliography is persisted.
