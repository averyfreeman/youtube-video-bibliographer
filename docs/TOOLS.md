**WHEN MAKING PLANS, CONSIDER THE FOLLOWING TOOLS:**

`skill:atlas` and `lavish-axi` can be extremely helpful for displaying lightweight examples of UX/UI, other visually-oriented, or other applicable topics difficult to discuss without rich, visual representation. _This is computationally expensive, so ensure high threshold._
**Use examples:**

- Incorporating a new visual feature. Significantly altering layout.
- Creating a comparison example of several color, typographical, or component options.
- Creating a complex pipeline for curating data from external sources [ e.g.: GitHub repos to `.mdx` profiles ].

## [ agent_recommendations ]

### Tool Server / Plugin / Skill Recommendations (install via `omp install`)

Target is the **Oh My Pi (`omp`)** harness; tool servers/plugins/skills are installed via `omp install <target>`. **Prefer AXI over MCP wherever an AXI server exists** (AXI is more efficient/effective for lightweight tool servers; reference SDK at `$HOME/.bun/install/global/node_modules/axi-sdk-js`).

- `nextjs-mcp` — Next.js docs MCP; this is a Next 16 stack, so a live-framework reference reduces hallucinated API usage. If an AXI equivalent exists for the same framework docs, install that instead (AXI preferred).
- `daisyui-mcp` — DaisyUI component reference; matches the chosen component library. AXI equivalent preferred if available.
- `npmjs-mcp` (or `npm-mcp`) — package metadata/version lookup for dependency checks.
- `skill-writer` (Oh My Pi built-in) — author/maintain managed `SKILL.md` files as the project grows skills.
- Reuse the already-installed `.agents/skills/` (nextjs-16, supabase, supabase-postgres-best-practices) before adding new skills; convert reusable Claude Code skills → `omp` managed skills (procedures worth codifying for this repo).
- Keep the connected `firecrawl` MCP (already serves the article-curation pipeline use case in `TOOLS.md`); prefer an AXI variant if available.
- **AXI-first guidance:** when choosing or building a lightweight tool server, prefer writing an AXI server (see `$HOME/.bun/install/global/node_modules/axi-sdk-js` reference SDK) over a full MCP server, because AXI is substantially more efficient. Rewrite existing MCPs to AXI where a lightweight AXI shape beats the full MCP server.
- Plugin/harness notes (per user's examples): `@openclaw/pi-coder` and `omp` harness plugins such as `@pi-mfin/ass-kicking-connector`.
- **Cmux agent windows:** can spawn additional agent windows inside Cmux backed by skills or MCP for parallel/observable work (e.g. a reviewer or research pane) — a workspace-organizational tooling option, not a dependency.

### Model Recommendations (OpenRouter + Hugging Face)

For this coding-heavy Next.js/TS/MDX work; wired via `omp --model`/`--smol`/`--slow`/`--plan`, or `PI_SMOL_MODEL`/`PI_SLOW_MODEL`/`PI_PLAN_MODEL`:

- OpenRouter daily-driver (cheap, strong coding): `deepseek/deepseek-chat` or `qwen/qwen3-coder-480b`.
- OpenRouter high-capability for hardest refactors/debugging: `anthropic/claude-sonnet-4` (or the current best `-latest` coder slot at execution time).
- OpenRouter free tier (fallback / smoke tasks): use `:free` slots.
- Hugging Face (self-hosted / Inference Providers): `Qwen/Qwen3-Coder-480B-A35B-Instruct` and `deepseek-ai/DeepSeek-V3.1` — strong open-weights coders for local/offline execution.
- Slot guidance: cheap coding model → `--smol`; high-capability coder → `--slow`/`--plan`; keep the reasoning-effort tuning high for the coding slots.
- **Note:** model names/prices rotate; verify current availability on OpenRouter and Hugging Face before committing. This is the one place a later availability check is expected; do not block the file write on it.
