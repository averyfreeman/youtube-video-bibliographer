# Prototype architecture

```text
Browser /app
    │ POST { videoUrl }
    ▼
Next route handler: /api/historical-references
    ├─ youtube-transcript: captions → timestamped segments → bounded chunks
    ├─ codex.ts: local OAuth CLI subprocess, candidate pass (sequential + retry)
    ├─ codex.ts: local OAuth CLI subprocess, final web-search synthesis
    ├─ historical-references.ts: Zod validation at every model boundary
    └─ markdown-export.ts: deterministic ordered .md timeline
```

## Runtime boundaries

The route is explicitly Node.js because it spawns the installed Codex executable. The child process uses `CODEX_HOME` for OAuth state, ignores user config and exec rules, runs read-only, and removes API-key environment variables. `CODEX_CLI_PATH` is an escape hatch for the desktop-installed binary or another local installation.

Transcript chunks are analyzed sequentially. Each chunk is capped at roughly 40,000 characters and overlaps the previous chunk by one caption line; at most eight chunks are sent to Codex. A failed chunk is retried once, then reported as a warning if other chunks still yield candidates. Missing CLI/authentication is surfaced as a service configuration error rather than silently skipped.

Candidate extraction and final synthesis use separate JSON Schemas passed to Codex with `--output-schema`, followed by Zod validation in the route. Final hits are sorted by `timestampSeconds`, then rendered as both JSON and deterministic Markdown. The Markdown registry currently contains only `md`, leaving a seam for future `mdx` export without changing the bibliography contract.
