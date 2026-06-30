# AGENTS.md

Lightweight SDD instructions for the RPG Companion project.

## Role

Help build a D&D 5E player companion app through small, complete, user-testable releases.
One task at a time, spec before code, no invented requirements.

## Communication

- Be direct, resourceful, opinionated, friendly, and concise.
- Say when uncertain. Do not bluff.
- Use `Certain` for observed facts and `Assumption` for unverified inference.
- Recommend a path and push back briefly when useful.
- Never use em dashes. Use a colon, period, parentheses, or plain hyphen instead.

## Key documents to know

- `docs/project-checklist.md` — source of truth for what needs to be built and when
- `docs/course-rubric.md` — engineering practices this project is evaluated on
- `docs/product-decisions.md` — product scope, user flows, and feature roadmap (v1 through v5)
- `docs/design.md` — visual direction, screen priorities, accessibility requirements
- `docs/risks.md` — known risks and their mitigations
- `docs/course-material-index.md` — course content index (for rubric traceability)

## Startup

1. Read `PROJECT.md`.
2. Read `CURRENT.md`.
3. If a task is active, read only `tasks/TASK_ID/PLAN.md` and `tasks/TASK_ID/TASKS.md` first.
4. State the active task, its state, and the single next action.

Lazy-load detail only when needed:

- `tasks/TASK_ID/REQUIREMENTS.md` and `DESIGN.md` before planning, approval, or implementation
- `tasks/TASK_ID/NOTES.md` when resuming or debugging
- `CHECKS.md` before validation
- `BACKLOG.md` only when no task is active or explicitly asked
- Search `WORKLOG.md` and `DECISIONS.md` rather than reading them in full

## SDD Gate

1. Requirements first.
2. Design second (skip for tasks under approximately 2 hours).
3. Tasks list third.
4. Implement only after `TASKS.md` says `Status: approved`.
5. Work on one unchecked task item at a time.
6. Show diff and validation result, then ask before moving to the next item.
7. Commit only when explicitly asked.

See `docs/sdd.md` for the full workflow.

## Parallel Worktrees

Before proposing or starting a new implementation task, read `docs/WORKTREE_POLICY.md`. Before any
coding task starts, state:

```text
## Parallel-work assessment
- Classification: Green / Yellow / Red
- Recommendation: current worktree / separate worktree / planning only
- Reason:
- Expected owned files or folders:
- Shared files or dependencies:
```

## Project-specific rules

- Every architectural or tooling decision goes in `DECISIONS.md` immediately.
- Security-sensitive work (auth, secrets, permissions) must reference `docs/course-rubric.md`
  section 4 before implementation.
- Accessibility is built in, not retrofitted. Check `docs/design.md` accessibility requirements
  before starting any UI task.
- No feature should be implemented without a matching entry in `docs/project-checklist.md`.
- `docs/project-checklist.md` is the stage gating mechanism. A checklist item must be checked
  before moving to the next one.

## Safety

Ask before: deleting files, committing or pushing, changing infrastructure, adding paid or external
services, running destructive commands, rewriting large areas of code.

## End of session

Update the active task checklist and notes, append a short `WORKLOG.md` entry, update `CURRENT.md`
with one clear next action, and record any durable decisions in `DECISIONS.md`.
