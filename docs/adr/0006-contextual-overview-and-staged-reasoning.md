# Contextual overview and staged reasoning

## Status

Accepted

## Decision

The bibliography remains phrase-only and bounded at 40 hits, but the extraction pass gets a higher-recall reasoning setting than synthesis and verification. This adds one useful granularity notch without returning to exhaustive line-by-line extraction. The benchmark command compares the same transcript at `medium`, `high`, and `max` so the effort tradeoff stays measurable.

Every completed or capped run begins with a best-effort video preamble. `yt-dlp --dump-single-json` supplies title, channel, and upload/publication metadata when available; a separate Codex orientation pass uses metadata and a bounded transcript excerpt to identify people, theme, and a short summary. Missing tools or uncertain evidence produce explicit gaps and warnings rather than invented facts.

Each retained hit includes optional speaker attribution and one or two short discussion-context paragraphs generated from a bounded transcript window around its timestamp. Context explains why the reference appears at that moment; historical analysis remains a separate field. Verification receives these windows only for supplied candidates and cannot add or broaden hits.

## Consequences

Readers get a useful orientation and can understand the local discussion before opening sources. The extra overview call and context payload add work, but the higher reasoning effort is isolated to candidate recall and the run remains protected by the ten-minute budget. Metadata availability varies by `yt-dlp` and captions, so the UI and Markdown use transparent unavailable fallbacks.
