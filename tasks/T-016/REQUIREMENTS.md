# T-016 Requirements: Orchestration reset and TFM submission alignment

## Problem

The repository has strong implementation history but conflicting status records. `CURRENT.md`, the
old backlog, the course-derived checklist, task folders, README, and GitHub board do not describe the
same state. Parallel sessions also lack a single written handoff and shared-file ownership protocol.

## Goals

- Make the formal TFM deliverables and 20 July 2026 deadline explicit.
- Make submission readiness more important than optional feature breadth during the final week.
- Establish one authority hierarchy for status and scope.
- Give worker sessions a reusable investigation, approval, implementation, validation, and report
  contract.
- Preserve safe parallel worktrees while preventing shared documentation conflicts.
- Reconcile shipped, active, deferred, and blocked work across local docs and GitHub.

## Non-Goals

- Implementing product features.
- Claiming unfinished course-evidence items as complete.
- Requiring long-term production operation after teacher review.
- Adding paid services or creating external accounts.
- Changing Git history or committing the reset.

## Required Behavior

1. `docs/submission-checklist.md` must become the final-week delivery source of truth.
2. `docs/project-checklist.md` must remain available as the broader course-evidence checklist, with
   a clear statement that it is not the formal submission contract.
3. `CURRENT.md` must describe the actual T-015 follow-up and T-016 coordination state.
4. `README.md` must accurately describe Hunin, its stack, setup, structure, principal features,
   deployed URLs, and outstanding submission links/credentials.
5. The orchestrator must own shared status records and GitHub board synchronization.
6. Worker sessions must remain inside their assigned worktree and report results instead of editing
   shared coordination files unless explicitly authorized.
7. GitHub issues must distinguish completed feature outcomes from genuinely remaining scope.
8. No product-code file may be modified by this task.

## Acceptance Criteria

- Formal submission requirements are traceable to `Documento del TFM.pdf`.
- Deadline, public repo, deployed frontend/backend, missing slides, missing video, and missing test
  credentials are visible in one checklist.
- The current main/worktree state and T-015 mobile follow-up are accurately recorded.
- The orchestration workflow includes file ownership, approval gates, validation, report format,
  and merge coordination.
- Stale top-level claims about name and deployment are corrected or clearly superseded.
- GitHub project status is read back after synchronization.
- `git diff --check` passes and only Markdown files change under T-016.

## Open Questions

- The dedicated teacher-review account username/password still needs to be created and supplied by
  Marcela before submission.
- Slides and video URLs cannot be completed until those artifacts exist.
