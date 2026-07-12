# T-016: Orchestration reset and TFM submission alignment

Status: complete

## Parallel-work assessment

- Classification: Red.
- Can start in a separate worktree now: No.
- Required base branch or commit: `main` at `86fe342` with the validated T-015 mobile profile
  follow-up preserved as unrelated uncommitted work.
- Files/folders this task owns: `tasks/T-016/`, shared top-level Markdown status records,
  orchestration guidance, submission/checklist documentation, and GitHub planning metadata.
- Shared files it must not modify: frontend and backend product code, including the three current
  T-015 mobile profile follow-up files.
- Dependencies or tasks that must merge first: None. T-015 implementation state must be described
  accurately without changing its code.
- Planned integration point: current `main` checkout after docs review.
- Intended merge order: finish and integrate T-015 mobile follow-up code, then integrate this
  orchestration reset or rebase the docs if required.

## Goal

Create one reliable source of truth for the final TFM week, define how the orchestrator and worker
sessions coordinate parallel worktrees, and reconcile local documentation with implemented and
GitHub-visible state.

## Context

- The formal TFM deadline is 20 July 2026.
- The project is educational and only needs to remain available through teacher review.
- The formal submission requires a complete README, source repository, deployment when possible,
  public slides, a narrated screen-capture video, and test credentials for projects with login.
- The existing engineering checklist was derived from course topics. It is useful evidence and a
  prioritization aid, but it is broader than the formal TFM submission contract.
- Multiple Codex sessions may work in separate worktrees. Shared coordination files need one owner.

## Non-Goals

- Product-code changes.
- Staging, committing, pushing, merging, rebasing, or deleting worktrees.
- Creating slides, recording the video, or creating production test credentials in this task.
- Completing optional product features only to satisfy the old roadmap.

## Likely Files Or Artifacts

- `AGENTS.md`
- `PROJECT.md`
- `CURRENT.md`
- `README.md`
- `BACKLOG.md`
- `DECISIONS.md`
- `WORKLOG.md`
- `docs/orchestration.md`
- `docs/session-routines.md`
- `docs/WORKTREE_POLICY.md`
- `docs/submission-checklist.md`
- `docs/project-checklist.md`
- selected stale status headers in product, design, risk, and rubric documents
- GitHub issues and project-board fields

## Risks

- Overstating completion when evidence is incomplete.
- Editing task-owned product files while another session is active.
- Treating the course-topic checklist as the formal submission requirements.
- Creating another documentation layer without clearly defining authority.

## Validation

- `git diff --check`
- `git status --short --branch`
- Markdown link/path spot checks
- GitHub issue and project-board readback
- Confirm no frontend or backend file was changed by T-016

## Next Action

Review the docs-only reset and the separate validated T-015 mobile profile diff before deciding the
two-commit integration order.
