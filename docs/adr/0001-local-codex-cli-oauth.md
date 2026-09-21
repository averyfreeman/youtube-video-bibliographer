# ADR 0001: Use the installed Codex CLI for local OAuth

## Status

Accepted

## Decision

The prototype invokes the locally installed Codex CLI from the Node.js route handler instead of calling the OpenAI API directly. The invocation uses the saved Codex OAuth session, the fixed `gpt-5.6-luna` model, `model_reasoning_effort=max`, a read-only sandbox, and JSON Schema-constrained output.

## Context

The prototype is intended to exercise the Youtube Video Bibliographer workflow on a developer machine that already has Codex authenticated. Requiring an API key would create a second credential path and would not test the intended local OAuth integration. A synchronous subprocess keeps this first model easy to inspect and avoids adding an application-specific token broker.

## Consequences

- `codex login` is required before using the page.
- `CODEX_HOME` can point at an alternate local auth directory; `CODEX_CLI_PATH` can point at the executable.
- The route strips `OPENAI_API_KEY`, `OPENAPI_API_KEY`, and `CODEX_API_KEY` from the child environment.
- The feature is local-first and is not suitable for deployment as-is because it depends on a local executable and OAuth session.
- CLI failures are mapped to actionable HTTP errors; malformed model output is rejected by both the CLI schema boundary and Zod.
