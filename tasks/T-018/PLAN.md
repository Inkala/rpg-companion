# T-018: Whole-application security baseline

Status: approved

## Parallel-work assessment

- Classification: Red.
- Recommendation: pause T-017 coding and use one dedicated Security worktree after this planning
  checkpoint is approved and committed.
- Reason: the task crosses shared authentication, server, character validation, configuration, CI,
  and deployment boundaries.
- Expected owned files or folders: exact list pending investigation; likely backend auth,
  characters, server/config/startup and tests, Compose, lockfile/CI security configuration, and
  task-local evidence.
- Shared files or dependencies: session middleware, server routing, production configuration,
  frontend API error behavior, CI, Railway/hosting settings, and orchestration records.
- Merge order: T-018 security baseline, full CI and deployment verification, then resume T-017 from
  the updated clean base.

## Goal

Resolve or explicitly disposition the whole-app Security review before adding Party or another
feature, while preserving the working review deployment and current user flows.

## Source

Security review dated 2026-07-12:
`/Users/marce/.codex/attachments/740bddba-c3cf-4cba-be77-dcbb35d1b699/pasted-text.txt`

Primary rubric: `docs/course-rubric.md` section 4.

## Scope

- Confirmed current-app vulnerabilities from report section 12.
- Applicable P1-before-deployment controls from section 15.
- Secret/configuration, auth/session, input/payload, HTTP, dependency, frontend, CI, and deployed
  verification findings across the full report.
- Explicit accepted limitations for controls that are disproportionate to the educational review.

Party-specific token, membership, roster, and GM authorization work remains in T-017 and is paused.

## Validation

- Planning: scope consistency, `git diff --check`, clean-base/status verification.
- Implementation: focused security tests, full backend/frontend checks, dependency/secret evidence,
  CI, and deployed configuration/smoke verification.

## Single Next Action

Have the Security session perform a read-only implementation investigation and return exact values,
owned files, test-first slices, deployment checks, and proposed deferrals. Then revise and approve
T-018 before any code changes.
