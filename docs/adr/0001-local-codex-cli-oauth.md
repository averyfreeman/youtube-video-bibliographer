# Use the installed Codex CLI for local OAuth

## Status

Accepted; the project-owned prompt and runtime budget now layer on top of this boundary.

The bibliographer runs on a developer machine that already has Codex authenticated, so the worker invokes the installed Codex CLI instead of accepting an application API key. This keeps credentials outside the app, fixes the model at `gpt-5.6-luna`, reads the default reasoning effort (`medium`) from the project-owned configuration, runs extraction from an isolated temporary working directory so repository instructions cannot become model context, and exercises the intended OAuth path. Benchmark runs may select `high` or `max` explicitly without changing the application default.
