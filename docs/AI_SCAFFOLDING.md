# AI scaffolding

The repository keeps the AI boundary inspectable and replaceable:

- `bibliographer.config.toml` is project-owned policy. It references `DEFAULT_PROMPT.md`, sets medium reasoning, increases chunk size, and defines the 40-hit/600-second envelope. User-level Codex configuration remains ignored intentionally.
- `lib/codex.ts` is the only subprocess adapter. It passes the selected reasoning effort, JSON Schema output, read-only sandboxing, cancellation, and bounded timeouts to local Codex CLI OAuth.
- `lib/codex-candidates.schema.json` constrains extraction; `lib/codex-final.schema.json` constrains synthesis and source metadata.
- `lib/historical-references.ts` is the shared Zod boundary. `lib/phrase-curation.ts` is the deterministic phrase gate and global dedupe seam.
- `lib/job-pipeline.ts` processes chronological batches, persists cursors, verifies only a shortlist, and filters final output back to supplied titles.
- `.agents/skills/video-bibliographer/` describes the same phrase-only evidence contract for reusable agent runs.

## Model contract

Extraction reports only multi-word references supported by the supplied transcript. It excludes single-word glossary concepts, introductions, show metadata, generic restatements, and filler. Synthesis can verify sources, but it cannot add, broaden, or invent a title. `unavailable` with `sources=[]` is required when no trustworthy source can be established.

The active path is local Codex CLI OAuth. The app does not accept OpenAI or Gemini API keys. The default reasoning effort is `medium`; the benchmark command runs the same transcript at `medium`, `high`, and `max` so quality and latency can be reviewed together.

## Prompt shape

Each extraction prompt includes the project prompt, the chunk number, its timestamp range, and every normalized line in the window. Candidate output is phrase-filtered and globally deduplicated before synthesis. Leaf synthesis receives curated candidates; final web verification receives at most 40 existing titles and its response is intersected with those titles. Empty arrays and partial capped output are valid results.
