# T-014 Tasks

Status: approved

This is a documentation-only feedback triage task. Do not modify application code, tests, backend
code, migrations, dependencies, CI, deployment config, branches, worktrees, staging, commits,
pushes, or Git history.

## 1. Capture GM feedback

## Parallel-work assessment

- Classification: Green.
- Recommendation: current worktree.
- Reason: Docs-only feedback triage.
- Expected owned files or folders: `tasks/T-014/`, `CURRENT.md`, `WORKLOG.md`.
- Shared files or dependencies: task bookkeeping only.

- [x] Capture the Spanish GM feedback as product signal.
- [x] Keep scope limited to Character Reference and in-session experience triage.
- [x] Avoid turning all feedback into implementation.

## 2. Classify every suggestion

- [x] Classify redundant passive modifiers.
- [x] Classify conditional attack reminders.
- [x] Classify duplicated feature line/cards.
- [x] Classify calculation breakdown modal.
- [x] Classify `It's my turn` button.
- [x] Classify class-aware action/spell suggestions.
- [x] Classify resource-aware recommendations.
- [x] Classify resource tracker.
- [x] Classify rest buttons.
- [x] Classify advantage/disadvantage toggle.
- [x] Classify HP quick controls.
- [x] Classify combat/exploration mode.
- [x] Classify compact stat/header feedback.
- [x] Classify `No concentration` placement.

## 3. Recommend next slices

- [x] Recommend Character Reference compact stat/header polish as the immediate next slice.
- [x] Recommend Attack action reminder badges as a small follow-up.
- [x] Record calculation breakdown modal as a possible follow-up after source metadata is clear.
- [x] Explicitly defer tactical assistant, full resource tracker, combat/exploration mode, and rest
  system.

## 4. Update task bookkeeping

- [x] Create `tasks/T-014/PLAN.md`.
- [x] Create `tasks/T-014/REQUIREMENTS.md`.
- [x] Create `tasks/T-014/DESIGN.md`.
- [x] Create `tasks/T-014/TASKS.md`.
- [x] Create `tasks/T-014/NOTES.md`.
- [x] Update `CURRENT.md` with the T-014 status and next action.
- [x] Append a `WORKLOG.md` entry.

## 5. Validation

- [x] Run `git diff --check`.
- [x] Run `git status --short --branch`.

## Proposed commit message

```text
docs(product): triage GM feedback for character reference
```
