# T-017: Party MVP vertical slice

Status: pending security amendment approval

Dependency: paused until T-018 whole-application security baseline is integrated and verified.

## Parallel-work assessment

- Classification: Red for the complete epic. Yellow/Green child worktrees can begin after contract
  approval and a clean base.
- Can start in a separate worktree now: No. Existing read-only investigations may finish their
  reports, but no Party implementation or further planning expansion starts before T-018.
- Required base branch or commit: both child worktrees exist at clean, CI-verified commit `3a327e2`.
- Files/folders this planning step owns: `tasks/T-017/` and orchestrator bookkeeping only.
- Shared files it must not modify during planning: frontend/backend product code, migrations, CI,
  deployment configuration, and the T-015/T-016 diffs.
- Dependencies or tasks that must merge first: T-018 whole-application security hardening,
  validation, CI, and deployed verification.
- Planned integration point: clean `main` after the security amendment and child-task contracts are
  approved and committed.
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

Pause the Party workers, complete T-018, then rebase or recreate the Party worktrees from its
verified commit. Do not begin T-017 implementation until `TASKS.md` returns to approved.
