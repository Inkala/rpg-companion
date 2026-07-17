# T-023 Plan: Final TFM Submission Documentation

Status: approved

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: documentation branch only after feature freeze.
- Reason: this task touches evaluator-facing shared documentation and submission evidence, but no
  product code.
- Expected owned files or folders: `README.md`, `docs/portrait-assets.md`,
  `docs/submission-checklist.md`, `CURRENT.md`, `WORKLOG.md`, and this task folder.
- Shared files or dependencies: final deployment SHA, teacher-review account, slides URL, narrated
  video URL, final CI, final smoke-test evidence, and submission form confirmation.

## Owned files

- `README.md`
- `docs/portrait-assets.md`
- `docs/submission-checklist.md`
- `CURRENT.md`
- `WORKLOG.md`
- `BACKLOG.md` only if final deferred/completed state needs reconciliation
- `tasks/T-023/REQUIREMENTS.md`
- `tasks/T-023/PLAN.md`
- `tasks/T-023/TASKS.md`
- `tasks/T-023/NOTES.md`

## Execution plan

1. Wait for Marcela to freeze the product feature set.
2. Gather final URLs, credentials, CI, smoke-test, and release SHA evidence.
3. Update README for evaluator review.
4. Add `docs/portrait-assets.md` with detailed provenance and limitations.
5. Update `docs/submission-checklist.md`.
6. Record final evidence in task notes and shared status docs.
7. Validate documentation diff and stop for review.

## Non-goals

- Do not restart final slides or narrated video until Marcela says the feature set is frozen.
- Do not integrate portrait assets into the application.
- Do not implement product code.
- Do not deploy manually.
