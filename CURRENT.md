# Current Work

Submission deadline: 20 July 2026

Most recent coordination task: T-016 Orchestration reset and TFM submission alignment

State: docs-only implementation complete and validated. This coordination checkpoint changed no
product code.

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
- Party features, guest draft migration, account hardening, resource tracking, and AI remain deferred
  unless the submission checklist is secure or Marcela explicitly reprioritizes them.

## Single next action

Select the next product priority and create its requirements before starting another coding
worktree.

Last updated: 2026-07-12
