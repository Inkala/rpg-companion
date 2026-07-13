# T-017: Party MVP vertical slice

Status: approved and in progress

Dependency: satisfied. T-018 is integrated and verified. T-017A backend and T-017B isolated frontend
are merged through PR #24 (`02b0bc8`) and PR #25 (`af592ec`).

## Parallel-work assessment

- Classification: Red for the complete epic. Yellow/Green child worktrees can begin after contract
  approval and a clean base.
- Can start in a separate worktree now: Yes, only for the declared T-017C central integration.
- Required base branch or commit: clean `main` containing `af592ec` and this orchestration checkpoint.
- Files/folders this planning step owns: `tasks/T-017/` and orchestrator bookkeeping only.
- Shared files it must not modify during planning: frontend/backend product code, migrations, CI,
  deployment configuration, and the T-015/T-016 diffs.
- Dependencies or tasks that must merge first: satisfied by T-018, T-017A, and T-017B.
- Planned integration point: central T-017C frontend integration.
- Remaining merge order: T-017C central frontend integration, then T-017D validation/deployment.

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

- this `tasks/T-017/` folder remains the approved contract and checklist for workstreams A through D
- one new party migration pair
- new backend `internal/parties` package
- focused party access additions around characters/server
- new frontend `src/parties` feature folder
- later central router/App/Home integration
- backend/frontend/security tests

## Risks

- Authorization leakage.
- Invite-token leakage through URL paths, history, referrers, logs, or persistent browser state.
- Authentication and join resource abuse without request limits, server timeouts, or throttling.
- Malformed cross-user Character Reference payloads.
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

Commit the reconciled integration checkpoint. Then create one dedicated T-017C worktree and begin
the route parser, serializer, and secure pre-React invite-fragment bootstrap slice.
