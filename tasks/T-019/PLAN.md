# T-019: Account and character UX polish

Status: complete

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

1. Registration success and sign-in toast: complete in
   `cf79f919f3ef56b77f6e1779606c3bc7aa94e77d`.
2. Required-field guidance and ordinary post-save navigation: complete in
   `c53de604388ff89d2750bc4b757155db7b6d0143`.
3. Shared character-card presentation and full-width My characters layout: complete in
   `b6ce49b457aa1225a505aa3be6ded8ef2a693f98`.

Each slice starts with focused failing tests, stops for review, and requires explicit approval
before commit or continuation.

## Evidence checkpoint

- Certain: Slice 1 requires explicit sign-in after registration, keeps registration private and
  throttled, adds Sonner `2.0.7`, and shows the exact accessible toast
  `Account created. Sign in to continue.`
- Certain: Slice 2 adds required-field markers, first-invalid focus in form document order after
  React renders errors, and ordinary guided/manual save navigation directly to Character Reference.
- Certain: Slice 2 preserves the custom Party-invite return behavior and does not implement
  automatic Party linking.
- Certain: Slice 3 extends the owner-scoped Character summary DTO only with `portraitAssetId`,
  `portraitAlt`, `featuredAbilities`, and `landingConcept`.
- Certain: Slice 3 privacy tests assert exact summary response keys and exclude full
  `referencePayload`, owner identifiers, email, and Party data.
- Certain: Slice 3 adds the tested shared `CharacterSummaryCard`, uses it for Mara and saved
  characters, keeps Mara's portrait and audited sample content, and falls back to the generic avatar
  for missing or unknown saved-character portraits.
- Certain: Slice 3 renders My characters with a full-width header row and full-width saved-character
  cards below it.
- Certain: backend, frontend, disposable PostgreSQL, privacy, accessibility, and responsive evidence
  are recorded in `NOTES.md`.
- Certain: no Party files or Party behavior changed in T-019.

## Deferred

Automatic Party linking after character creation remains explicitly deferred. A future task should
connect a character created from an invite to the pending Party and open the expanded Character
Reference after the save/link sequence succeeds.
