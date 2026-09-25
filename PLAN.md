# Thorough bounded bibliography release plan

- [x] Phrase-only extraction with deterministic rejection of single words, introductions, show metadata, and generic restatements.
- [x] Project-owned `bibliographer.config.toml` layered into isolated Codex prompts with medium reasoning by default.
- [x] 12,000-character transcript windows, 16 candidates per window, global deduplication, and verification constrained to supplied titles.
- [x] Ten-minute jobs with a persisted 40-reference soft limit, 52-reference hard ceiling during the final five minutes, cursor, cap reason, ETA, and continuation URL.
- [x] Best-effort 320×180 storyboard crops through `yt-dlp` and `ffmpeg`, persisted per job and served through a thumbnail route.
- [x] Mermaid process diagram under the title with accessible text fallback and canonical source under `docs/diagrams/`.
- [x] Separate Markdown page and exact attachment route; results no longer render the large inline code block.
- [x] Unit, API-facing, Playwright, and storyboard/config/timing coverage; benchmark command and report.
- [ ] Run live inspiration-video acceptance after `codex login` and record the thorough output.
- [ ] Execute Git BBQ release actions after review: public GitHub repo, selective commits, pushes, and SemVer tags.
