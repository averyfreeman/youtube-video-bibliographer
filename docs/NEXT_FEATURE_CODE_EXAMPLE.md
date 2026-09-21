# Historical Reference Extractor: implementation prompt

You are a senior Next.js 16 engineer working in this repository.

Build a new **Historical References** feature that is reachable from the existing
top navigation. The feature accepts a public YouTube URL, obtains its available
captions, and returns a structured index of references found in the spoken
material.

## Requirements

- Use the App Router, strict TypeScript, React Server Components by default, and
  a small client boundary only for the interactive form and results.
- Use the Vercel AI SDK with an OpenAI model selected from the currently available
  provider models. Keep `OPENAI_API_KEY` server-only.
- Validate all request input and model output with Zod.
- Let the user choose brief or detailed output, reference categories, and whether
  to include contextual notes.
- Extract quotes, books, speeches, historical events, financial bubbles/crises,
  regulatory failures, and executive statements when present.
- Render timestamps as plain text such as `00:11:43`; never convert them into
  interactive chips or links.
- Prefer authoritative source links. If a source cannot be verified, say so and
  leave the URL absent rather than inventing one.
- Handle invalid URLs, unavailable captions, missing configuration, rate limits,
  provider failures, empty transcripts, and malformed output with useful user
  messages.
- Use semantic form controls, keyboard-accessible labels, visible focus states,
  responsive layout, and the existing daisyUI/Catppuccin theme tokens.
- Add a short setup note for the required environment variable without writing
  any secret into the repository.

## Implementation constraints

- Inspect the repository before choosing file locations or replacing existing
  components.
- Read the relevant Next.js 16 and AI SDK documentation in `node_modules` first;
  do not use deprecated structured-output APIs.
- Keep transcript fetching and model calls on the server.
- Do not modify the read-only `content` sources or unrelated assets.

## Deliverable

Implement the feature, update navigation, add focused tests or testable helpers,
and report the changed files, setup requirement, validation commands, and any
known provider limitations.
