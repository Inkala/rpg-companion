# T-023 Plan: Final TFM Submission Documentation

Status: approved

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: dedicated documentation worktree may draft in parallel with T-026. Final
  evidence reconciliation and merge wait for T-026 deployment and public smoke.
- Reason: this task touches evaluator-facing shared documentation and submission evidence, but no
  product code.
- Expected owned files or folders: `README.md`, `docs/portrait-assets.md`,
  `docs/submission-checklist.md`, `CURRENT.md`, `WORKLOG.md`, and this task folder.
- Shared files or dependencies: final deployment SHA, teacher-review account, slides URL, narrated
  video URL, final CI, final smoke-test evidence, submission form confirmation, and T-026 final SHA,
  CI, deployment, functionality, screenshots, and smoke evidence.

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

1. Create a separate T-023 documentation worktree after the planning checkpoint is integrated.
2. Draft README and submission documentation while retaining placeholders for all T-026 final
   evidence.
3. Wait for Marcela to freeze the product feature set before final slide/video production.
4. Wait for T-026 implementation, validation, deployment, and public smoke to finish.
5. Rebase T-023 onto final main after T-026 integrates.
6. Replace every T-026 placeholder and gather final URLs, credentials, CI, smoke, and release SHA.
7. Complete README, portrait provenance, submission checklist, slides/video links, and form
   evidence.
8. Record final evidence in task notes and shared status docs.
9. Validate the complete documentation diff and stop for review.

## Post-T-026 release checkpoint

- T-026 source implementation merged to `main` at
  `232335f26b8a16b5addcc68bf5de29bd22451b3f`.
- T-023 rebased its single drafting commit onto that exact SHA and force-with-lease pushed rebased
  commit `38e466968fd1c9ce97bf85f88e771147057cb460`.
- `docs/rules-data.md` now exists on the integrated base and remains owned by T-026.
- T-026 CI, frontend/backend evidence, exact-SHA Railway and Cloudflare deployments, and public
  Level Up smoke are confirmed.
- T-023 now retains placeholders only for teacher access, slides, video, and submission date.
- Feature freeze, dedicated teacher smoke, submission form, and final T-023 commit still wait for
  Marcela or later confirmed evidence.

## Post-T-028 release checkpoint

- T-028 merged and deployed at `e0ac1e450849e5c751ba71b396e8c11b4545d0b0`.
- Main CI `https://github.com/Inkala/rpg-companion/actions/runs/29688775007` passed Frontend,
  Backend, and Secret history.
- Exact-SHA Railway and Cloudflare deployments, HTTP health, migration `000004`, public invitation
  smoke, privacy, authorization, accessibility, and responsive evidence are confirmed.
- Automatic production deployments remain enabled, and no unexpected deployment occurred.
- T-025 is active. T-023 records T-028 evidence now but does not rebase until T-025 integrates.
- After T-025 integrates, T-023 rebases onto the later `main`, preserves all product and task
  evidence, reconciles final documentation, and merges last.

## Strict non-owned files

- Product code and tests
- Canonical/generated rules data and generation tooling
- `docs/rules-data.md`
- `tasks/T-025/`, `tasks/T-026/`, and `tasks/T-028/`

## Merge order

T-026 and T-028 release evidence are confirmed. T-025 must integrate first. T-023 then rebases onto
post-T-025 `main`, preserves the complete integrated product state, completes the teacher,
feature-freeze, slides, video, submission-form, and final-commit gates, and merges last.

## Non-goals

- Do not restart final slides or narrated video until Marcela says the feature set is frozen.
- Do not integrate portrait assets into the application.
- Do not implement product code.
- Do not deploy manually.
