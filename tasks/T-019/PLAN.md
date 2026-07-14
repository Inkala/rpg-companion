# T-019: Account and character UX polish

Status: approved

## Parallel-work assessment

- Classification: Red.
- Can start in a separate worktree now: Yes, after this planning checkpoint is approved and
  committed.
- Required base branch or commit: clean `main` at
  `4f7116f0febe020438e37687b03de0756ef5d98c` or its planning-only descendant.
- Files/folders this task owns: approved auth registration files, character creation files,
  character summary API/model files, Home character-card files, focused tests, `frontend/package.json`,
  and `frontend/pnpm-lock.yaml`.
- Shared files it must not modify: `frontend/src/parties/`, `backend/internal/parties/`, Party
  migrations, shared orchestration records, deployment configuration, CI, and infrastructure.
- Dependencies or tasks that must merge first: T-017 is complete, deployed, and publicly validated.
- Planned integration point: one dedicated T-019 worktree and one PR after three sequential review
  checkpoints.
- Intended merge order: registration behavior, character creation usability, then shared character
  cards and Home layout.

## Goal

Apply Marcela's first post-MVP usability findings without broadening Party behavior or delaying the
formal submission package.

## Slices

1. Registration success and sign-in toast.
2. Required-field guidance and ordinary post-save navigation.
3. Shared character-card presentation and full-width My characters layout.

Each slice starts with focused failing tests, stops for review, and requires explicit approval
before commit or continuation.

## Next action

Review `REQUIREMENTS.md`, `DESIGN.md`, and `TASKS.md`. Implementation starts only after Marcela
approves the exact checklist.
