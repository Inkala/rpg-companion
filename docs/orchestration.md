# Orchestration and Parallel Session Workflow

## Purpose

Use one orchestrator session to divide Hunin work into isolated tasks, prepare worker prompts, track
reports, coordinate merge order, and keep shared project status accurate.

## Authority order

When records disagree, use this order:

1. `docs/submission-checklist.md` for final-week delivery priority.
2. `CURRENT.md` for active work, worktree ownership, and the single next action.
3. The active task's `REQUIREMENTS.md`, `PLAN.md`, `TASKS.md`, and `NOTES.md` for task scope and
   evidence.
4. `DECISIONS.md` for durable product, architecture, tooling, and workflow decisions.
5. `docs/project-checklist.md` for broader course-evidence opportunities.
6. GitHub issues and the project board as a mirrored planning view.
7. `BACKLOG.md` as a concise future-work index.

`WORKLOG.md` is chronological evidence. It is not the current-state authority.

## Shared coordination ownership

The orchestrator owns these shared records:

- `CURRENT.md`
- `WORKLOG.md`
- `DECISIONS.md`
- `BACKLOG.md`
- `docs/submission-checklist.md`
- `docs/project-checklist.md`
- GitHub issue and project-board status

Worker sessions must not edit them unless the prompt explicitly assigns a specific shared-file
integration step. Workers normally update only their task folder and declared implementation files,
then report the information the orchestrator needs for shared bookkeeping.

## Worktree registry

`CURRENT.md` records every active coding worktree with:

- task ID and objective;
- path and branch;
- base commit;
- status and owner session;
- owned files/folders;
- prohibited shared files;
- dependencies and intended merge order;
- latest validation result.

No two active coding sessions may own the same file. Planning and read-only investigation may run in
parallel when they do not mutate shared state.

## Task lifecycle

### 1. Orchestrator scopes the task

- Confirm the task advances `docs/submission-checklist.md` or a deliberate product goal.
- Read `docs/WORKTREE_POLICY.md`.
- Assign Green, Yellow, or Red classification.
- Declare exact file ownership and merge order.
- Create or select the task folder.
- Write requirements before design and tasks.

### 2. Worker investigates without editing

The first prompt gives one worktree path and prohibits Git-state changes. The worker reads only the
needed context and reports:

1. repository/worktree status;
2. parallel-work assessment;
3. observed current behavior;
4. exact files expected to change;
5. proposed design and test-first plan;
6. risks, dependencies, and merge considerations;
7. whether implementation can proceed safely.

### 3. Orchestrator approves or revises

Implementation starts only when `TASKS.md` says `Status: approved` and the user has explicitly
approved the implementation step.

### 4. Worker implements one bounded slice

- Stay inside the assigned worktree.
- Edit only declared files.
- Add or update focused tests first where practical.
- Capture the expected red result.
- Apply the smallest implementation.
- Run focused validation, then the relevant full service checks.
- Do not stage, commit, push, merge, rebase, delete, or modify infrastructure unless explicitly
  instructed.

### 5. Worker reports

Every implementation report must include:

1. root cause or implemented outcome;
2. changed files;
3. test-first evidence or documented exception;
4. validation commands and results;
5. manual checks run or still missing;
6. final `git status --short --branch`;
7. unresolved risks or follow-ups;
8. proposed commit message;
9. whether the branch is ready for integration.

### 6. Orchestrator integrates

- Review the diff and report.
- Confirm no ownership or scope violation.
- Decide whether more validation is required.
- Ask explicitly before committing or pushing.
- Coordinate rebase/merge order.
- Update shared coordination records and GitHub after integration.
- Close the task only when its acceptance criteria and bookkeeping are complete.

## Worker prompt minimums

Every worker prompt should state:

- exact worktree path and branch;
- base commit;
- task goal and user-visible outcome;
- in-scope and out-of-scope behavior;
- exact or expected file ownership;
- prohibited actions;
- test-first expectations;
- validation commands;
- required report format;
- whether to stop for approval before editing.

The T-015 profile prompt in the project history is the reference style: concrete, bounded,
test-oriented, and explicit about Git safety.

## Final-week rule

Until the 20 July 2026 submission, formal TFM deliverables outrank optional feature breadth. A task
that does not protect the demo, complete a required artifact, or provide high-value course evidence
must wait unless Marcela explicitly changes the priority.
