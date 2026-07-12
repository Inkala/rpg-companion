# T-017: Party MVP vertical slice

Status: approved

## Parallel-work assessment

- Classification: Red for the complete epic. Yellow/Green child worktrees can begin after contract
  approval and a clean base.
- Can start in a separate worktree now: Planning only.
- Required base branch or commit: `7f5e787` is the clean T-016 orchestration base. Child worktrees
  must start after the approved T-017 planning commit is integrated on top of it.
- Files/folders this planning step owns: `tasks/T-017/` and orchestrator bookkeeping only.
- Shared files it must not modify during planning: frontend/backend product code, migrations, CI,
  deployment configuration, and the T-015/T-016 diffs.
- Dependencies or tasks that must merge first: T-016 is integrated in `7f5e787` and CI passed.
  Approved T-017 planning docs must be integrated before child worktrees start.
- Planned integration point: clean `main` after those two commits pass CI.
- Intended merge order: T-017A backend, T-017B isolated frontend feature, T-017C central frontend
  integration, T-017D validation/deployment.

## Goal

Deliver the smallest complete two-user party flow from creation and invitation through joining,
character linking, roster display, and GM read-only Character Reference access.

## Context

- Party access is the main missing original v1 product capability.
- Authentication, owner-scoped characters, My characters, and Character Reference already exist.
- AI integration is later optional scope and is not a dependency.
- Security-sensitive work must follow `docs/course-rubric.md` section 4.

## Non-Goals

See `REQUIREMENTS.md`. The epic intentionally excludes external invitation delivery, party
administration, playing GMs, editing another user's character, and unrelated account/character
features.

## Likely Files Or Artifacts

- `tasks/T-017A/` through `tasks/T-017D/` after plan approval
- one new party migration pair
- new backend `internal/parties` package
- focused party access additions around characters/server
- new frontend `src/parties` feature folder
- later central router/App/Home integration
- backend/frontend/security tests

## Risks

- Authorization leakage.
- Cross-worktree API contract drift.
- Migration overlap.
- Central frontend routing conflicts.
- Starting from the current dirty main checkout.
- Expanding into party administration instead of the narrow vertical slice.

## Validation

- Planning: `git diff --check` and status inspection.
- Implementation: child-task validation plus combined local, CI, migration, deployment, and public
  two-account smoke tests.

## Next Action

Review and approve or revise the proposed invite, roster, character-link, and GM rules. Do not begin
implementation until `TASKS.md` becomes approved and a clean base exists.
