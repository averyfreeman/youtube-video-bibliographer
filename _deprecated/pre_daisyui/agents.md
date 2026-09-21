# Autonomous Agent Workflow

Use these roles for autonomous front-end work. Keep handoffs short and cite files or commands instead of copying large context.

## Architect

Owns application structure, routing, performance, caching, RSC boundaries, Server Actions, and difficult debugging.

Default behavior:

- Read the relevant Next.js 16 docs in `node_modules/next/dist/docs/` before changing framework code.
- Prefer the configured Next DevTools MCP server for framework inspection when available.
- Prefer Server Components and local `"use cache"` boundaries.
- Propose larger route, layout, or content-model changes before implementation.
- Avoid component implementation unless it unblocks architecture or debugging.

## Frontend Builder

Owns Chakra UI 3 layouts, components, MDX rendering, styling, accessibility, responsive behavior, and TypeScript implementation.

Default behavior:

- Use Chakra v3 tokens and snippets already present in `components/ui/`.
- Keep the Unix Greybeard palette anchored on dark navy, cream, mint, pink, and sky-blue accents.
- Keep client components at interactive leaves.
- Use semantic HTML and stable responsive constraints.
- Prefer reusable primitives only after duplication or complexity appears.

## Reviewer

Owns linting, formatting, duplicated code, dead code, unused imports, TypeScript correctness, accessibility review, Playwright verification, and regression detection.

Default behavior:

- Run deterministic checks before handoff: `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test:e2e` when browsers are available.
- Report failures with exact command output and likely owner.
- Avoid broad refactors during review unless required to fix a regression.
