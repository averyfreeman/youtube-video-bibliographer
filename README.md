# YouTube Video Bibliographer

This is a standalone Next.js prototype for turning a YouTube video into a timestamped historical bibliography. It is intentionally scoped to one page at `/app`.

The server retrieves the video's captions, splits them into bounded overlapping chunks, asks the locally installed Codex CLI to find candidate historical references, and makes a final Codex web-search pass to verify and enrich those candidates. The fixed model is `gpt-5.6-luna` with `model_reasoning_effort=max`. The route does not accept an API key: it reuses the local Codex CLI's OAuth session.

## Run locally

```bash
pnpm install
codex login
pnpm dev
```

Open <http://localhost:3000/app>. If `codex` is not on `PATH`, set `CODEX_CLI_PATH`. Set `CODEX_HOME` when the OAuth session lives in a non-default Codex directory. The child process runs with a read-only sandbox and strips API-key environment variables before invoking Codex.

## Output

Each hit is shown in the order it appears in the video and includes a `HH:MM:SS` link, evidence type, historical date when established, one or two analysis paragraphs, and one or two further-reading URLs. Primary sources are preferred. Secondary, analysis, and culture sources are retained but marked for independent verification. The complete ordered timeline can be copied from the code block or downloaded as `.md`.

## Checks

```bash
CI=true pnpm lint
CI=true pnpm typecheck
CI=true pnpm test
CI=true pnpm build
CI=true pnpm test:e2e
```

Captions must be available through YouTube's transcript endpoints. There is no YouTube Data API key or manual transcript editor in this prototype. Transcript processing is bounded to 320,000 characters and eight analysis chunks so the synchronous local workflow remains predictable.
