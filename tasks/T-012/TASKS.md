# T-012 Tasks

Status: implementation complete

## 1. Revised questionnaire planning

## Parallel-work assessment

- Classification: Yellow
- Recommendation: current worktree for planning, implementation only after approval
- Reason: Planning is isolated to `tasks/T-012/` and status docs, but implementation will touch
  `frontend/src/character-creation/` and shared route-level tests.
- Expected owned files or folders: `tasks/T-012/`; later `frontend/src/character-creation/`
- Shared files or dependencies: `frontend/src/App.test.tsx`, existing `/characters/new` route,
  future app-shell/header/navigation work

- [x] Create `tasks/T-012/PLAN.md`.
- [x] Create `tasks/T-012/REQUIREMENTS.md`.
- [x] Create `tasks/T-012/DESIGN.md`.
- [x] Create `tasks/T-012/TASKS.md`.
- [x] Create `tasks/T-012/NOTES.md`.
- [x] Update `CURRENT.md`.
- [x] Append `WORKLOG.md`.
- [x] Review and approve revised T-012 questionnaire direction.

## 2. Implementation: data model

- [x] Add typed fantasy buckets.
- [x] Add typed answer IDs and question IDs.
- [x] Add quiz answer, bucket score, unsupported fantasy, recommendation, selected build, and
  override state to the draft.

## 3. Implementation: quiz UI

- [x] Start the revised quiz from `Help me choose`.
- [x] Show 5 questions with 4 answers each.
- [x] Hide scoring, fantasy buckets, and build mappings while answering.
- [x] Support Back and Next.
- [x] Disable or block Next until an answer is selected.
- [x] Show progress text.

## 4. Implementation: result UI

- [x] Score fantasy buckets.
- [x] Resolve to Strength melee Fighter or Dexterity archer Fighter.
- [x] Show future-path messaging when unsupported buckets are prominent.
- [x] Allow accepting the recommendation.
- [x] Allow choosing the other supported Fighter style.
- [x] Store selected build separately from recommended build.

## 5. Validation

- [x] Add focused tests for hidden mappings, answer selection, progress, scoring, future-path
  messaging, recommendation, and override behavior.
- [x] Run frontend lint.
- [x] Run frontend typecheck.
- [x] Run frontend test.
- [x] Run frontend build.
- [x] Run `git diff --check`.
