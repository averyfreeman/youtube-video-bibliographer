# Curate phrases and bound long runs

## Status

Accepted

## Decision

The bibliography emits meaningful multi-word phrases only. Single-word concepts belong to a future glossary and are excluded now. Introductions, show metadata, sponsor language, generic restatements, and filler are rejected in both prompts and deterministic post-processing. Candidates are globally deduplicated before web verification, and final verification is intersected with the supplied shortlist so it cannot expand results.

Each job has a default ten-minute processing budget and a maximum of 40 hits. Work is checkpointed chronologically. When the time or hit limit is reached, the job enters terminal `capped` state, preserves partial results and timing metadata, and returns a YouTube continuation URL with `t=<seconds>s`. A new job processes captions from that cursor.

Storyboard thumbnails are a best-effort presentation layer. They are generated from signed YouTube storyboard sheets with `yt-dlp` and cropped by `ffmpeg`; missing tools or individual failures become warnings and never invalidate the textual bibliography.

## Consequences

The output is shorter and more useful for further reading, and long videos become observable and recoverable instead of silently running for hours. A continuation may repeat one boundary caption and cannot guarantee that a reference spanning the cursor is preserved; the one-segment chunk overlap and timestamped evidence make that tradeoff explicit. The system deliberately favors a compact, auditable shortlist over exhaustive glossary-style coverage.
