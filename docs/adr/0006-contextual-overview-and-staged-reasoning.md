# Contextual overview and staged reasoning

## Status

Accepted

## Decision

The bibliography remains phrase-only and bounded at 40 hits, but the extraction pass gets a higher-recall reasoning setting than synthesis and verification. This adds one useful granularity notch without returning to exhaustive line-by-line extraction. The benchmark command compares the same transcript at `medium`, `high`, and `max` so the effort tradeoff stays measurable.

Every completed or capped run includes a best-effort video preamble. `yt-dlp --dump-single-json` supplies title, channel, description, and upload/publication metadata when available; an optional Codex orientation pass uses metadata and the YouTube description only to identify up to four primary participants, theme, and a short summary. The orientation pass runs after the historical work so it cannot consume discovery context or reduce the historical shortlist.

Each retained hit may receive one short discussion-context paragraph from a separate post-verification pass using a compact transcript window around its timestamp. Context explains why the reference appears at that moment; historical analysis remains a separate field. This pass cannot add, remove, rename, or reorder hits. Speaker attribution is accepted only when the YouTube description supports it; nearby captions never establish the speaker.

## Consequences

Readers get a useful orientation and can understand the local discussion before opening sources. The optional overview and context calls add work, but they run after the historical pass and cannot reduce recall. Metadata availability varies by `yt-dlp` and descriptions, so the UI and Markdown omit unsupported presentation fields instead of displaying boilerplate.
