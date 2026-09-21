# T001 legacy baseline archive

This directory preserves material removed from the active tree while the
workspace was rebased as a standalone local-first video bibliographer.

The original top-level paths are retained below their original names:

- `BACKUP_DONT_USE/` — unrelated Supabase skill backups.
- `content/` — the legacy article corpus and Google Takeout/Airflow pipeline,
  including its nested agent scaffolding and raw archives.
- `projects/` and `public/` — portfolio content and branding assets.
- `skills/` — duplicated legacy skill copies.
- `.claude/`, `.crush/`, `.codex-loop/`, and `memory/` — unrelated agent
  configuration, loop state, and shared memory.
- `docs/` — superseded mixed project documentation; the active Codex OAuth ADR
  was restored to `docs/adr/0001-local-codex-cli-oauth.md`.
- `WORD_CLOUD_IDEAS.md`, `tailwindcss-72557.log`, `last_session.sh`,
  `.gitmodules`, and `skills-lock.json` — legacy planning, build-log,
  launcher, submodule, and skill-manager artifacts.

Nothing in this archive is required by the active Next.js application. Restore
an item by moving it back to its original top-level path after reviewing the
active tree for conflicts.
