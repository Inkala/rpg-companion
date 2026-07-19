# T-028 Tasks: Party invitation code flow

Status: approved

Planning is approved. Implementation must not start until it is separately assigned.

## Contract approval

- [x] Approve the eight-character `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` alphabet and `XXXX-XXXX`
  display.
- [x] Approve authenticated-only code inspection and join.
- [x] Approve HMAC-SHA-256 storage with a dedicated stable 32-byte server key and no T-028 key
  rotation.
- [x] Approve migration 000004, legacy token-only compatibility, and historical code-hash uniqueness.
- [x] Approve the exact API additions and unchanged 256-bit token endpoints.
- [x] Approve 5/user/minute, 20/user/hour, and 100/global/minute shared code-attempt limits.
- [x] Approve one-time GM display, private signed-out continuation, recovery behavior, controlled
  rollout, rollback, and final integration order.
- [x] Approve the three-slice implementation sequence and deployment-key gate.

## Slice 1: credential and PostgreSQL contract

- [x] Add initial failing code generation, normalization, digest, collision, migration, regeneration,
  expiry, rollback, and concurrency tests.
- [x] Add migration 000004 up/down and PostgreSQL migration coverage.
- [x] Add secure code generation and canonical normalization.
- [x] Add domain-separated HMAC digesting and fail-closed typed key configuration.
- [x] Prove the key is a dedicated stable 32-byte secret that is never logged, returned, committed,
  sent to the frontend, or reused from another application secret.
- [x] Document regeneration of active invitations as recovery after an intentional key change; do
  not add key rotation.
- [x] Extend invitation creation to persist one unique code hash with the existing token hash.
- [x] Retry complete credential-pair generation on collision without losing the prior active invite.
- [x] Preserve legacy token-only invitation inspection and join.
- [x] Run and record focused PostgreSQL and race validation.

## Slice 2: API and attempt controls

- [x] Add initial failing exact response, privacy, no-store, logging, and throttle tests.
- [x] Extend GM invitation creation with the one-time formatted `code` field.
- [x] Prove the generation result is the only source for GM code and complete-link display and that
  neither credential can be recovered from stored hashes.
- [x] Add authenticated `/party-invites/code/inspect`.
- [x] Add authenticated `/party-invites/code/join`.
- [x] Apply the shared layered limiter immediately after authentication and before request-body
  decoding, normalization, hashing, and lookup.
- [x] Make malformed, expired, revoked, replaced, and unknown code responses indistinguishable.
- [x] Preserve wrapped internal database errors and generic public errors.
- [x] Prove existing token endpoints and complete invitation links remain unchanged.

## Slice 3: frontend flow

- [x] Add initial failing bare Join, valid code, auth-return, unavailable, copy, focus, and privacy
  tests.
- [x] Add the accessible bare Join code-entry form and local normalization.
- [x] Keep submitted codes only in private typed memory and clear the rendered input immediately.
- [x] Continue code invitations through signed-in and signed-out authentication paths.
- [x] Prove signed-out submission does not call inspection before authentication and inspects exactly
  once after successful authentication.
- [x] Clear pending credential memory on cancellation, replacement, failed authentication,
  unavailable invitation, and completed join.
- [x] Add `Try another code` and the authentication-specific escape destination.
- [x] Make `Try another code` clear the failed credential and focus an empty code input.
- [x] Add separate GM `Copy code` and `Copy invitation link` controls.
- [x] Give both copy actions fixed accessible success feedback that never repeats credentials.
- [x] Hide credentials and copy actions when private response state is gone; retain regeneration as
  the recovery path and explain the one-time behavior safely.
- [x] Preserve direct-link token automation, character selection/creation, joining, and navigation.
- [x] Prove credentials never enter DOM after submission, navigation, history, storage, logs, errors,
  analytics, or toasts.

## Complete validation

- [x] Run focused backend and frontend tests after implementation.
- [x] Run all PostgreSQL-backed tests with an explicit disposable database.
- [x] Run complete backend tests with `-p 1`, focused race tests, vet, and build.
- [x] Run frozen frontend install, high-severity audit, typecheck, lint, full tests, and build using the
  required Node and pnpm versions.
- [x] Validate keyboard, focus, live announcements, 44px targets, and no overflow at 320px, 390px,
  720px, and desktop with no console errors.
- [x] Run `git diff --check` and confirm no T-023, provider, deployment, production, or unrelated files
  changed.
- [x] Return the standard worker report and stop before commit unless separately authorized.

## Controlled rollout and integration

- [ ] Validate migration 000004 up/down against disposable PostgreSQL.
- [ ] Record a production backup checkpoint before rollout.
- [ ] Provision the dedicated stable `INVITE_CODE_HASH_KEY` in Railway without exposing its value.
- [ ] Apply and verify the additive migration, deploy the backend, and verify health plus old-link and
  new-code contracts.
- [ ] Deploy the frontend and run public GM/player link-and-code smoke tests.
- [ ] If incident rollback is needed, leave migration 000004 applied, allow frontend/backend rollback
  to ignore the additive schema, and preserve the key unless intentionally invalidating active codes.
- [ ] Merge T-028 product work before T-023.
- [ ] After successful T-028 production smoke, hand off to the orchestrator to rebase T-023 onto final
  `main` and record the shipped flow, final SHA, CI, deployment, smoke evidence, and limitations.
