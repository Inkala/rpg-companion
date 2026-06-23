# Spec-Driven Development

Use this process for personal software project work.

## Task Folder

Each task lives in `tasks/T-###/`:

```text
PLAN.md
REQUIREMENTS.md
DESIGN.md
TASKS.md
NOTES.md
```

## Requirements

Write `REQUIREMENTS.md` before design or implementation. Include the problem, goals, non-goals,
required behavior, acceptance criteria, and open questions.

## Design

Write `DESIGN.md` after requirements are clear. Include the chosen approach, likely files or
components, tradeoffs, risks, and validation plan.

## Tasks

Write `TASKS.md` as small implementation items.

Use:

```text
Status: pending

- [ ] Small reviewable task
- [ ] Another small reviewable task
```

Implementation starts only after Marcela approves the task list by changing the status to:

```text
Status: approved
```

## Implementation

Once approved:

1. Work on one unchecked item.
2. Run the smallest useful validation check.
3. Mark only that item as complete.
4. Show the diff and validation result.
5. Ask Marcela whether to continue.
6. Ask whether to commit.
