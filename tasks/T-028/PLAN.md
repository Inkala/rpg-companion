# T-028 Plan: Party invitation code flow

Status: approved

## Delivery strategy

Implement sequentially in one dedicated worktree. This is one product task but should be reviewed in
three slices because the database and backend credential contract are prerequisites for frontend
presentation.

### Slice 1: Credential and database contract

- Add failing normalization, secure generation, keyed digest, collision, and migration tests.
- Add migration 000004 with nullable 32-byte `code_hash` and historical uniqueness.
- Add validated `INVITE_CODE_HASH_KEY` configuration.
- Prove the key is dedicated, stable, exactly 32 random bytes, never exposed, and not reused from any
  other secret. Do not implement rotation.
- Generate a token/code pair and store only their hashes.
- Preserve legacy token-only invitations.
- Prove regeneration, expiry, rollback, and concurrency with PostgreSQL.

### Slice 2: Code API and throttling

- Add failing handler/server contract, privacy, logging, and limiter tests.
- Add authenticated code inspection and join endpoints.
- Share a strict code-attempt limiter across both endpoints and run it before credential lookup.
- Reuse current Party inspection, character ownership, idempotency, and join transaction behavior.
- Extend GM invitation creation response with only the formatted code.
- Preserve one-time response semantics and prove neither credential is recoverable from persistence.
- Preserve all strong-token endpoints and generic internal database errors.

### Slice 3: Player and GM experience

- Add failing bare Join, signed-in, signed-out, auth-return, invalid-state, copy, and credential-leak
  tests.
- Add the labelled bare Join code form and local normalization.
- Extend private-memory continuation to discriminate token and code credentials.
- Defer code inspection until after authentication for signed-out users, then inspect exactly once.
- Clear the pending credential on cancellation, replacement, failed authentication, unavailable
  response, and completed join.
- Add exact unavailable recovery actions and focus changes.
- Add separate GM `Copy code` and `Copy invitation link` actions.
- Hide credential actions when private response memory is gone and use fixed accessible copy feedback
  that never repeats a credential.
- Preserve direct links, character selection/creation, automatic join, and Party navigation.
- Complete responsive browser and accessibility validation.

## Validation sequence

1. Record focused red evidence before each slice.
2. Run focused backend unit, repository, handler, server, migration, and race tests.
3. Run focused frontend Party, App, authentication-return, and character-continuation tests.
4. Run PostgreSQL-backed backend tests with an explicit test database so none skip.
5. Run `go test -p 1 ./...`, appropriate serialized race tests, `go vet ./...`, and `go build ./...`.
6. Use workspace Node 24 and pnpm 11.7.0 for frozen install, high-severity audit, typecheck, lint,
   complete tests, and build.
7. Validate 320px, 390px, 720px, and desktop in a real browser.
8. Run `git diff --check` and audit scope, secrets, migration ordering, and exact response keys.

## Review gates

- Requirements, design, API, migration, HMAC lifecycle, throttling, one-time display, continuation,
  recovery, rollout, and integration order are approved.
- Implementation still requires a separate explicit assignment.
- Do not begin frontend work until the backend contract is green.
- Do not merge a deployable feature until the stable target-environment hash key is provisioned under
  separate authorization.
- Do not update T-023 or shared orchestration records from the worker branch.

## Controlled production rollout

After implementation review and explicit rollout authorization:

1. Validate migration up/down against disposable PostgreSQL.
2. Record a production backup checkpoint.
3. Provision `INVITE_CODE_HASH_KEY` in Railway without exposing its value.
4. Apply and verify the additive migration.
5. Deploy the backend.
6. Verify health and both old-link and new-code contracts.
7. Deploy the frontend.
8. Run public GM/player link-and-code smoke tests.

For incident rollback, leave migration 000004 applied. Frontend rollback leaves the additive schema
harmless, backend rollback leaves the code columns unused, and the stable key remains provisioned
unless active short codes are being intentionally invalidated. Do not run the down migration during
incident rollback.

## Final integration

- T-028 product work merges before T-023.
- After T-028 production smoke passes, T-023 rebases onto final `main`.
- The T-023 integration records the shipped invitation-code flow, final SHA, CI, deployment, smoke
  evidence, and remaining limitations.
- T-023 and shared coordination changes remain orchestrator-owned unless explicitly assigned.

## Estimate

- Slice 1: 1 to 1.5 focused engineering days.
- Slice 2: 1 to 1.5 focused engineering days.
- Slice 3: 1 to 1.5 focused engineering days.
- Full validation, browser evidence, and review corrections: 0.5 to 1 day.
- Total: 3.5 to 5.5 focused engineering days, excluding separately authorized provider configuration,
  CI wait time, and deployment.

The approved integration order supersedes the earlier sequencing proposal: T-028 product work must
merge and pass production smoke before final T-023 integration.
