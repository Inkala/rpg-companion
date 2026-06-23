# Session Routines

## Start Of Session

1. Read `AGENTS.md`.
2. Read `PROJECT.md`.
3. Read `CURRENT.md`.
4. If a task is active, read only `PLAN.md` and `TASKS.md` first.
5. State the current task, state, and next action.

Load detail only when needed:

- `REQUIREMENTS.md` and `DESIGN.md` before planning, approval, or implementation.
- `NOTES.md` when resuming details or debugging.
- `CHECKS.md` before validation.
- `BACKLOG.md` when no task is active or Marcela asks what is open.

## Starting A New Task

1. Pick or create a `TASK_ID`.
2. Create `tasks/TASK_ID/`.
3. Add `PLAN.md`, `REQUIREMENTS.md`, `DESIGN.md`, `TASKS.md`, and `NOTES.md`.
4. Draft requirements, then design, then implementation tasks.
5. Update `CURRENT.md`.

Suggested task files:

```text
tasks/TASK_ID/
  PLAN.md
  REQUIREMENTS.md
  DESIGN.md
  TASKS.md
  NOTES.md
```

## End Of Session

1. Update the task checklist.
2. Add useful notes to the task folder.
3. Append to `WORKLOG.md`.
4. Update `CURRENT.md` with one next action.
5. Add durable choices to `DECISIONS.md`.

End with enough context that the next session can resume without reading the chat.
