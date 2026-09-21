# YouTube Video Bibliographer Rebase

## Goal

Rebase this workspace into a standalone, local-first Next.js video bibliographer that can process the full dense inspiration video through Codex CLI OAuth, persist resumable jobs, expose progress and recovery controls, and provide an eye-friendly dark interface.

## Acceptance criteria

- The active tree contains no live Astro, Starlight, portfolio, or unrelated content-pipeline references.
- Legacy documents and `BACKUP_DONT_USE` are recoverably archived under `_deprecated`.
- The `.agents/skills/video-bibliographer` skill, `CONTEXT.md`, ADRs, and implementation plan describe the same Codex-only pipeline and vocabulary.
- The full retrieved transcript is processed without the former global transcript or eight-chunk truncation cap.
- Jobs persist checkpoints locally and support polling, cancellation, retry, and restart recovery.
- The known inspiration video completes a full-coverage acceptance run when Codex OAuth and captions are available.
- Dark mode is the default, light mode is selectable and persisted without a hydration flash.
- Dependency updates remain within current major versions and all verification checks pass.

## Verification

```sh
pnpm verify
```
