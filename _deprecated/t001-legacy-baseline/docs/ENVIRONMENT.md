# Environment (Terminal & Editors)

## Purpose

Define a portable, terminal-first baseline for AI-assisted development where the terminal is the control surface, `tmux` is the persistence layer, and the editor is a swappable implementation detail. Preferred editors in this model are `subl` by default, `code` for heavier IDE work, and `vim` for terminal editing.

## Design Principles

- Prefer additive configuration over replacement.
- Keep the terminal as the primary entry point for project work.
- Use `tmux` for persistence, reattachment, and task-oriented session naming.
- Treat editors as interchangeable tools behind stable shell defaults.
- Favor portable `zsh` and POSIX `sh` patterns over machine-specific shortcuts.
- Keep scripts simple, explicit, and easy to audit.

## Required Components

- `zsh`
- `tmux`
- Standard Unix utilities available on macOS and Linux
- One or more of: `subl`, `code`, `vim`

## Optional Components

- `git` for repository-aware workflows
- `fzf` for interactive selection
- `rg` for fast search
- `less` with mouse disabled for keyboard-first navigation
- A patched font or theme layer, if desired

## Directory/Layout Conventions

- `bin/`
  - User-facing workflow scripts
- `config/tmux/`
  - Example or shared `tmux` configuration
- `config/shell/`
  - Shell snippets sourced from `.zshrc` or a bootstrap layer
- `docs/`
  - Operating notes, setup instructions, and reviewable examples

Use `$HOME/bin` or another user-managed script directory on `PATH` when these files are adopted outside this workspace.

## Environment Variables

- `EDITOR='subl'`
  - Default editor for CLI tools that respect `EDITOR`
- `VISUAL`
  - Mirror `EDITOR` unless a user already prefers something else
- `PAGER`
  - Optional pager default for CLI review tasks
- `LESS`
  - Optional pager flags for predictable keyboard behavior
- `PATH`
  - Add user-managed script directories without duplicating entries

### Historical References feature

The `/historical-references` route requires a server-only image-generation key.
Next.js loads `.env`, `.env.local`, and shell variables, but the dev server
must be restarted after changing them. The app prefers Gemini when either
`GOOGLE_GENERATIVE_AI_API_KEY` or the local alias `GEMINI_API_KEY` is present.
It uses Nano Banana 2 (`gemini-3.1-flash-image`) by default and retains
OpenAI as a fallback through `OPENAI_API_KEY`; older local setups using the
typo `OPENAPI_API_KEY` are accepted as a temporary compatibility fallback.

```sh
export OPENAI_API_KEY="$(<\"$HOME/.secrets/Macclawd/openai-api-key\")"
pnpm dev
```

See `/Users/avery/config/shell/ai-dev-env.zsh` for the concrete example.

Reference thumbnails use the AI SDK Google provider and Nano Banana 2 when a
Gemini key is available. Gemini image generation uses a `4:3` aspect ratio;
the server then converts the result to WebP and enforces a maximum of
`1024x768`. The browser only calls `/api/reference-thumbnail`; it never
receives the provider key. Do not use a `NEXT_PUBLIC_` prefix for either
Gemini or OpenAI credentials.

Transcript analysis and web search use the OpenAI Responses API. The default
text model is `gpt-5.5`; override it with the server-only
`REFERENCE_TEXT_MODEL` variable if needed.

## tmux Session Model

Name sessions by project or task, using short stable names such as:

- `dotfiles`
- `api-migration`
- `client-audit`
- `repo-main`
- `repo-feature-x`

Model:

- One named `tmux` session per active project or task lane
- Reattach to the same session instead of recreating terminal state
- Root each session in the relevant working directory when known
- Use separate sessions for concurrent worktrees or risky parallel efforts

## Editor Integration Model

The terminal starts and controls work. Editors are launched from inside the shell or a `tmux` pane as needed.

- `subl`
  - Default general-purpose editor and the value of `EDITOR`
- `code`
  - Heavier project IDE for search, refactors, debugging, and extension-driven work
- `vim`
  - Lowest-latency terminal editor for quick edits inside a pane

The workflow should remain usable if any one editor is unavailable.

## Role of Each Editor

- `subl`
  - Default editor for this workflow and the value of `EDITOR`
  - Best for quick file editing, note-taking, and lightweight project work
- `code`
  - Preferred for IDE-style tasks such as large refactors, debugging, extension-based tooling, and multi-pane project navigation
- `vim`
  - Preferred for in-terminal editing, fast one-file changes, and low-latency edits inside `tmux`

## How They Fit the Workflow

The terminal remains the control surface. Start in `zsh`, attach to a named `tmux` session, and launch the editor that matches the task.

- Use `vim` when staying fully inside the terminal matters most.
- Use `subl` when a graphical editor is helpful but full IDE overhead is unnecessary.
- Use `code` when project-scale tooling is worth switching context.

## Interaction with tmux

- `tmux` holds the persistent shell and project state.
- Editors are launched from panes rather than replacing the session model.
- `vim` stays natural because tmux bindings are kept behind the tmux prefix or inside copy mode.
- `subl` and `code` are companions to the terminal, not the source of session persistence.

## Interaction with zsh

- `zsh` provides the environment defaults and command entry point.
- `EDITOR='subl'` gives CLI tools a stable default editor.
- `VISUAL` follows `EDITOR` unless the user overrides it.
- The shell snippet keeps PATH additions and a few broadly useful CLI variables disciplined and reviewable.

## Practical Preference Guide

- Prefer `vim` for quick terminal edits and command-adjacent work.
- Prefer `subl` for general editing and as the default editor invoked by other tools.
- Prefer `code` for heavier project tasks that benefit from IDE features.

This keeps the terminal first, tmux persistent, and editor choice flexible.

## Shell Integration Model

Assume `zsh` as the interactive shell.

- Source a small dedicated snippet from `.zshrc`
- Keep exports focused on generally useful CLI behavior
- Avoid app-specific clutter in the base environment
- Prefer shell functions and small scripts over large shell frameworks for this layer
- Keep editor defaults and user script directories explicit

## Installation Order

1. Ensure `zsh` and `tmux` are installed and reachable on `PATH`.
2. Place `bin/dev-session` and `bin/dev-worktree-session` in a user-managed script directory.
3. Make both scripts executable.
4. Review `config/tmux/tmux.conf.example`.
5. Link or copy the tmux example into the active `tmux` config path as a starting point.
6. Source `config/shell/ai-dev-env.zsh` from `.zshrc`.
7. Confirm `EDITOR` resolves to `subl`.
8. Start a named `tmux` session and verify reattachment.

## Verification Steps

Run the following commands after setup:

```sh
tmux -V
test -x ./bin/dev-session
test -x ./bin/dev-worktree-session
./bin/dev-session --help
./bin/dev-worktree-session --help
./bin/dev-session verify-session
tmux detach-client
./bin/dev-session verify-session
./bin/dev-session verify-session "$HOME"
tmux detach-client
./bin/dev-worktree-session "$HOME" "$HOME" verify-worktree
zsh -n ./config/shell/ai-dev-env.zsh
zsh -lc '. ./config/shell/ai-dev-env.zsh && printf "%s\n" "$EDITOR"'
sed -n '1,220p' ./config/tmux/tmux.conf.example
```

Expected outcomes:

- `tmux -V` prints a version
- `test -x` succeeds for both scripts
- Both scripts print concise help
- `dev-session` creates and then reattaches to the named session
- A session can start in a supplied directory
- `dev-worktree-session` accepts explicit repo and worktree paths
- The `zsh` snippet parses cleanly
- `EDITOR` prints `subl`
- The tmux config is immediately reviewable in the terminal

## Daily Workflow

1. Open a terminal.
2. Enter the target project directory.
3. Start or attach with `dev-session <project-name>` or `dev-session <project-name> <dir>`.
4. Use `vim` for fast in-pane edits.
5. Launch `subl` for broader file editing.
6. Launch `code` when IDE features are worth the overhead.
7. Use a separate named session for a second project or worktree.
8. Leave sessions running and reattach later.

## Portability Notes

- Scripts use POSIX `sh`, not Bash-specific features.
- Paths are expressed using `$HOME` or caller-supplied arguments.
- The example `tmux` config avoids platform-specific plugins.
- Linux users can keep the same layout and adjust editor binaries if needed.
- If `subl` or `code` are unavailable, the environment still works with `vim`.

## Known Tradeoffs

- `EDITOR='subl'` assumes the `subl` CLI is installed and on `PATH`.
- The baseline does not auto-install tools or manage packages.
- Session naming conventions are manual by design.
- The tmux example stays conservative and does not include plugin managers.
- Worktree awareness is explicit in the script interface rather than automatic repository discovery.
