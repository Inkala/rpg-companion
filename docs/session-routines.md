# Session Routines

## Start Of Session

1. Read `AGENTS.md`.
2. Read `PROJECT.md`.
3. Read `CURRENT.md`.
4. If a task is active, read only `PLAN.md` and `TASKS.md` first.
5. State the current task, state, and next action.
6. If this is a worker session, verify the assigned worktree path, branch, base, and file ownership.

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

Only the orchestrator performs step 5. Worker sessions report the state needed for that update.

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

Worker session:

1. Update the assigned task checklist and notes when authorized.
2. Run the relevant validation.
3. Return the standard report in `docs/orchestration.md`.
4. Leave shared coordination files untouched unless explicitly assigned.

Orchestrator session:

1. Reconcile worker reports and task status.
2. Append to `WORKLOG.md`.
3. Update `CURRENT.md` with one next action.
4. Update submission/course checklists and GitHub planning state where relevant.
5. Add durable choices to `DECISIONS.md`.

End with enough context that the next session can resume without reading the chat.
