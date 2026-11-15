# Use the installed Codex CLI for local OAuth

## Status

Accepted; the project-owned prompt and runtime budget now layer on top of this boundary.

The bibliographer runs on a developer machine that already has Codex and/or Antigravity (`agy`) authenticated, so the worker invokes the local OAuth CLI (`agy -p` for Google OAuth with `gemini-4-hydrogen` or `codex exec` for Codex OAuth with `gpt-6-luna`) instead of requiring an application API key by default. This keeps credentials outside the app, adapts stage reasoning effort from the project-owned configuration, runs extraction from an isolated temporary working directory so repository instructions cannot become model context, and exercises the intended OAuth paths. Optional `GEMINI_API_KEY` configuration enables Gemini REST (`gemini-4-hydrogen`) when raw temperature/top-K sampling parameters are desired. Benchmark runs may select `high` or `max` explicitly without changing the application default.
