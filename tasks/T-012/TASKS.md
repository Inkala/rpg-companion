# T-012 Tasks

Status: planning

This is a docs-only task until the revised questionnaire is approved.

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
- [ ] Review and approve revised T-012 questionnaire direction.

## 2. Future implementation: data model

- [ ] Add typed fantasy buckets.
- [ ] Add typed answer IDs and question IDs.
- [ ] Add quiz answer, bucket score, unsupported fantasy, recommendation, selected build, and
  override state to the draft.

## 3. Future implementation: quiz UI

- [ ] Start the revised quiz from `Help me choose`.
- [ ] Show 5 questions with 4 answers each.
- [ ] Hide scoring, fantasy buckets, and build mappings while answering.
- [ ] Support Back and Next.
- [ ] Disable or block Next until an answer is selected.
- [ ] Show progress text.

## 4. Future implementation: result UI

- [ ] Score fantasy buckets.
- [ ] Resolve to Strength melee Fighter or Dexterity archer Fighter.
- [ ] Show future-path messaging when unsupported buckets are prominent.
- [ ] Allow accepting the recommendation.
- [ ] Allow choosing the other supported Fighter style.
- [ ] Store selected build separately from recommended build.

## 5. Future implementation: validation

- [ ] Add focused tests for hidden mappings, answer selection, progress, scoring, future-path
  messaging, recommendation, and override behavior.
- [ ] Run frontend lint.
- [ ] Run frontend typecheck.
- [ ] Run frontend test.
- [ ] Run frontend build.
- [ ] Run `git diff --check`.

