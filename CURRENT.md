# Current Work

Submission deadline: 20 July 2026

Active planning task: T-018 whole-application security baseline

State: the dedicated whole-repository Security review is complete. It found no current Critical/High
data-access vulnerability or secret exposure, but confirmed medium-risk weaknesses in the current
application. Marcela directed that whole-app security hardening and verification finish before new
feature work continues. T-018 requirements, design, and plan are approved. Exact implementation
values and file ownership remain pending the Security worker's read-only investigation report.

T-017 Party is paused. Its original product defaults remain approved, while its Party-specific
security amendment remains pending until T-018 is complete.

T-016 orchestration and submission alignment was committed and pushed in `7f5e787`; CI passed.
T-017 planning was committed and pushed in `3a327e2`; CI passed.

## T-018 Security worktree

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-security-hardening`
- Branch: `codex/t018-security-hardening`
- Base: the approved T-018 orchestration commit on `main`.
- Classification: Red, one sequential Security worker.
- Status: create after the planning checkpoint is committed and CI passes; investigation only until
  `tasks/T-018/TASKS.md` becomes approved.
- Expected ownership: exact paths pending investigation; likely backend auth, characters,
  server/config/startup and tests, Compose, dependency/CI configuration, and task-local evidence.
- Prohibited: Party implementation and orchestrator-owned shared records.

## Paused T-017 investigation worktrees

### T-017A backend

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-backend`
- Branch: `codex/t017a-party-backend`
- Base: `3a327e2`
- Classification: paused. The worker may finish and return an existing read-only report, but must not
  edit or continue implementation planning until T-018 is complete.
- Expected ownership after approval: Party migration, `backend/internal/parties/`, narrow
  server/character integration, Party-specific abuse controls, and focused tests.
- Prohibited: frontend and orchestrator-owned shared records.

### T-017B isolated frontend

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-frontend`
- Branch: `codex/t017b-party-frontend`
- Base: `3a327e2`
- Classification: paused. The worker may finish and return an existing read-only report, but must not
  edit or continue implementation planning until T-018 is complete.
- Expected ownership after approval: `frontend/src/parties/` only.
- Prohibited: central App/router/Home files, backend, and orchestrator-owned shared records.

## Source of truth

1. `docs/submission-checklist.md`: final-week delivery priorities.
2. This file: active worktrees, integration state, and one next action.
3. Active task documents: scope, checklist, and validation evidence.
4. `docs/project-checklist.md`: broader course-evidence backlog.
5. GitHub project board: mirrored planning view.

## In-flight implementation

### T-015 mobile profile navigation follow-up

- Status: committed and pushed as `0a724fb fix(accounts): improve mobile account menu`.
- CI: passed on 2026-07-12.
- Integrated files:
  - `frontend/src/App.tsx`
  - `frontend/src/app/AppShell.tsx`
  - `frontend/src/app/AppShell.test.tsx`
- Outcome: mobile `My profile` now navigates to `/profile` and closes the menu. Desktop profile
  navigation and mobile sign-out remain intact.
- TDD evidence: expected red tests for mobile profile navigation and icon state, followed by 154
  passing tests.
- Validation: focused/full frontend tests, lint, typecheck, build, `git diff --check`, and GitHub CI
  passed.

The original T-015 worktree is clean:

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-profile-page`
- Branch: `marcela.ramirez/T-profile/read_only_profile_page`
- HEAD: `86fe342`
- Status: implementation already merged to main; worktree cleanup requires explicit approval later.

## Delivered baseline

- Public frontend and backend are deployed and smoke-tested.
- Registration, sign-in, sign-out, and session restoration work.
- Signed-in users can create and save generated Fighter characters.
- Signed-in users can transfer a manual character sheet and save it.
- My characters lists owner-scoped characters.
- Saved characters open and refresh in Character Reference.
- Mara Vale remains a public guest sample with quick reference.
- T-014A compact Character Reference polish is merged.
- T-015 read-only profile page is merged.
- T-015 mobile profile navigation and account-menu icon follow-up is merged.
- CI passed on `0a724fb`.

## Final-week constraints

- Formal submission artifacts outrank optional product features.
- No new coding task starts in the dirty main checkout.
- Parallel coding uses separate worktrees with disjoint ownership.
- Worker sessions do not edit shared coordination records.
- Marcela explicitly prioritized whole-app security hardening before Party or any other new feature.
  Guest draft migration, unrelated account features, resource tracking, and AI remain deferred.

## Single next action

Commit and push the approved T-018 planning checkpoint, create the dedicated Security worktree, and
have the existing Security session return exact implementation values, files, tests, production
checks, and proposed deferrals before code changes.

Last updated: 2026-07-12
