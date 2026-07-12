# Worktree Policy

Use this policy before starting a new Hunin task in a separate Git worktree. Worktrees make parallel
work easier by giving each task its own checkout, but they do not remove merge conflicts. Conflicts
still happen when tasks edit the same files, depend on the same schema or contract, or merge in the
wrong order.

Never begin a coding worktree from a branch with important uncommitted work. Do not run two coding
agents against the same working tree. No two active tasks may own the same file without an explicit
coordination plan. Planning and research can happen in parallel even when coding cannot. Every
parallel task must be independently testable before merge.

## Green: safe to parallelize

Use a separate worktree when the task is isolated and has no expected overlap with active work.

Examples:

- Read-only research.
- Documentation.
- New isolated feature folders.
- Static D&D reference data.
- Isolated tests.
- Independent UI components that do not modify shared app-shell files.

## Yellow: parallelizable only with an explicit plan

Use a separate worktree only after writing down the coordination details.

Examples:

- A feature that needs one planned integration point.
- Frontend work that will later touch `App.tsx`.
- Backend work that depends on a stable API contract.
- Work requiring a coordinated merge order.

Required plan:

- Declared file ownership.
- Declared integration point.
- Declared base branch or commit.
- Declared merge order.

## Red: do not parallelize while active

Keep this work in the current coordinated flow, or limit parallel effort to planning/research only.

Examples:

- Uncommitted migrations.
- Active auth/session changes.
- CI workflow changes.
- Deployment or configuration changes.
- Active shared-schema work.
- Simultaneous edits to `App.tsx`, global CSS, shared routes, or shared task bookkeeping.
- Any task with unknown overlap.

Shared task bookkeeping includes files such as `CURRENT.md`, `WORKLOG.md`, project checklists, and
active task-status files. Treat these as Red while another active task owns them unless the merge
order is explicitly coordinated.

## Orchestrator ownership

The orchestrator owns shared coordination records and GitHub planning metadata. Coding worktrees
must not edit `CURRENT.md`, `WORKLOG.md`, `DECISIONS.md`, `BACKLOG.md`, shared checklists, or the
GitHub board unless their prompt explicitly assigns a final integration step.

Worker reports replace independent shared bookkeeping. The orchestrator applies shared updates once
the worker diff and validation evidence have been reviewed.

## Main checkout

Use the main checkout as the integration and orchestration workspace. Prefer separate worktrees for
Green and planned Yellow coding tasks. Do not start new product work in a dirty main checkout.

An existing dirty main checkout must be registered in `CURRENT.md` with its owner, exact files,
validation state, and next action before any parallel task begins.
