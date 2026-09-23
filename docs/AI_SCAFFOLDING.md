# AI scaffolding

The repository keeps the AI boundary inspectable and replaceable:

- `bibliographer.config.toml` is project-owned policy. It references `DEFAULT_PROMPT.md`, uses high-recall candidate extraction with medium synthesis/overview reasoning, increases chunk size, and defines the 40-hit/600-second envelope. User-level Codex configuration remains ignored intentionally.
- `lib/codex.ts` is the only subprocess adapter. It passes the selected reasoning effort, JSON Schema output, read-only sandboxing, cancellation, and bounded timeouts to local Codex CLI OAuth.
- `lib/codex-candidates.schema.json` constrains extraction; `lib/codex-final.schema.json` constrains synthesis and source metadata.
- `lib/historical-references.ts` is the shared Zod boundary. `lib/phrase-curation.ts` is the deterministic phrase gate and global dedupe seam.
- `lib/job-pipeline.ts` processes chronological batches, persists cursors, verifies only a shortlist, and filters final output back to supplied titles.
- `.agents/skills/video-bibliographer/` describes the same phrase-only evidence contract for reusable agent runs.

## Model contract

Extraction reports only multi-word references supported by the supplied transcript. It excludes single-word glossary concepts, introductions, show metadata, generic restatements, and filler, while allowing a small second tier of distinct phrases with clear further-reading value. Synthesis can verify sources, but it cannot add, broaden, or invent a title. Each retained hit receives evidence-bounded speaker attribution and one or two discussion-context paragraphs. `unavailable` with `sources=[]` is required when no trustworthy source can be established.

The active path is local Codex CLI OAuth. The app does not accept OpenAI or Gemini API keys. Stage-specific effort is explicit: candidate extraction defaults to `high`, synthesis/verification and the video overview to `medium`; the benchmark command runs the same transcript at `medium`, `high`, and `max` so quality and latency can be reviewed together.

## Prompt shape

Each extraction prompt includes the project prompt, the chunk number, its timestamp range, and every normalized line in the window. Candidate output is phrase-filtered and globally deduplicated before synthesis. Leaf synthesis receives curated candidates; final web verification receives at most 40 existing titles, plus a bounded transcript context window for each title, and its response is intersected with those titles. A separate overview pass combines best-effort `yt-dlp` metadata with a transcript orientation excerpt. Empty arrays, unavailable metadata, and partial capped output are valid results.
