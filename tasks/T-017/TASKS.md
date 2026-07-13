# T-017 Tasks: Party MVP vertical slice

Status: approved and in progress

Marcela approved the original contract on 2026-07-12 and approved continuing the reviewed
Security-amended contract on 2026-07-13. T-018 is integrated and verified. Both Party branches are
rebased onto `a82bb34`, validated, and synchronized with origin.

## 1. Approve product and security contract

- [x] Approve invite delivery as a copied opaque shareable link with no email/SMS provider.
- [x] Approve seven-day reusable invite expiration and regeneration invalidating the old link.
- [x] Approve atomic join with one owned saved character.
- [x] Approve one simultaneous party per character for this MVP.
- [x] Approve basic roster visibility for members and full-sheet access only for the GM.
- [x] Approve no linked character for the creating GM in this MVP.
- [x] Approve 32-byte base64url invite tokens stored only as SHA-256 hashes.
- [x] Approve `/parties/join#<token>` with immediate fragment scrubbing and POST-body token transport.
- [x] Approve generic signed-out invite state with no party or invite-validity disclosure.
- [x] Approve typed internal auth-return state with no arbitrary return URL.
- [x] Approve one-GM, role/character-nullability, one-active-invite, and timestamp constraints.
- [x] Approve transactional create/regenerate/join with row locking and idempotent identical join.
- [x] Approve safe `400`/`401`/`403`/`404`/`409`/`429` semantics.
- [x] Approve Party join throttling, invite no-store/token redaction, and fail-closed GM access on top
  of the T-018 baseline.
- [x] Freeze exact Party API DTOs, database constraints, Party-specific limits, and security behavior
  after the T-017A investigation report.

## 2. Prepare child tasks and clean base

- [x] Review and integrate the existing validated T-015 mobile-menu follow-up (`0a724fb`, CI passed).
- [x] Review and integrate the T-016 documentation reset (`7f5e787`, CI passed).
- [x] Confirm clean main and passing CI at `3a327e2`.
- [x] Freeze T-017A backend requirements, design, checklist, and exact ownership in this task folder.
- [x] Freeze T-017B frontend requirements, design, checklist, and exact ownership in this task folder.
- [x] Create the two worktrees from the same clean base `3a327e2`.
- [x] Complete T-018 and rebase or recreate both Party worktrees from its verified commit.

## 3. T-017A backend party implementation

- [x] Add failing migration/repository tests first.
- [ ] Add failing Party join-throttling, invite no-store, and token-redaction tests first.
- [ ] Reuse the approved T-018 request, server, auth, cache, logging, and payload controls.
- [x] Add party, membership, and invite migration with constraints.
- [ ] Add failing create/list/invite/join/roster/GM-access handler tests first.
- [ ] Implement the smallest backend party package and routes.
- [ ] Cover 401, 403, 404, 409, duplicate membership, foreign character, cross-party GM, and expired
  invite behavior.
- [ ] Pass every merge-blocking authorization and race test below.
- [ ] Run migration, backend test, vet, build, and diff validation.

### Merge-blocking backend test contract

- [ ] Every Party endpoint returns `401` without a session.
- [ ] Party creation atomically creates exactly one GM membership.
- [ ] Failed GM-membership creation rolls back party creation.
- [ ] A member lists only parties they joined.
- [ ] A nonmember cannot distinguish another user's party from an unknown party.
- [ ] A player cannot generate or regenerate an invite.
- [ ] A GM in Party A cannot generate an invite for Party B.
- [ ] Regeneration leaves one non-revoked invite and rejects the previous token.
- [ ] PostgreSQL never stores the raw invite token.
- [ ] Invalid, malformed, expired, revoked, and replaced invites create no membership.
- [ ] A player joins only with a character they own.
- [ ] A foreign character returns `404` and creates no membership.
- [ ] A character linked elsewhere returns `409` and creates no membership.
- [ ] Repeating the identical successful join is idempotent.
- [ ] Concurrent duplicate joins create one membership only.
- [ ] Concurrent attempts to link one character to two parties produce one success and one conflict.
- [ ] A same-party player cannot open another player's full sheet.
- [ ] The managing GM can read a linked character.
- [ ] A GM from another party receives `404`.
- [ ] A managing GM cannot read an unlinked character through the Party endpoint.
- [ ] Party character endpoints expose no edit method.
- [ ] The existing owner endpoint still returns `404` for other users.
- [ ] Roster DTOs exclude email, owner IDs, token hashes, invite data, and full character payload.
- [ ] GM Character Reference fails closed on malformed or unsupported payloads.
- [ ] No response other than one-time invite creation, and no log, contains a raw invite token.

## 4. T-017B isolated frontend party feature

- [x] Add mocked party API helper tests first.
- [x] Add isolated create, join, list, roster, and party Character Reference page tests first.
- [x] Implement only `frontend/src/parties/` against the frozen contract.
- [x] Cover signed-out, loading, empty, success, validation, forbidden, conflict, and server-error
  states.
- [x] Prove the isolated invite-fragment helper scrubs the fragment and never places it in an API
  URL. Pre-React invocation remains T-017C work.
- [x] Prove signed-out invite UI reveals no invite validity or party information.
- [ ] Prove auth return uses typed internal state and cannot perform an open redirect.
- [ ] Apply no-store and no-referrer behavior to the invite flow.
- [x] Run focused and full frontend validation for the isolated Party feature.

## 5. T-017C central frontend integration

- [ ] Add route parser/serializer tests first.
- [ ] Add app integration tests for create, invite, auth return, join, party detail, and GM character
  navigation.
- [ ] Wire party routes through `App`.
- [ ] Replace the Home party placeholders with the real party list/actions.
- [ ] Preserve all existing account, character creation, profile, sample, and saved-reference flows.
- [ ] Run full frontend validation and narrow-width manual checks.

## 6. T-017D combined validation and deployment

- [ ] Run migration up/down on a disposable database.
- [ ] Run full backend and frontend checks.
- [ ] Run two-user local end-to-end smoke testing.
- [ ] Confirm all required 401/403 cases.
- [ ] Integrate branches in declared order and confirm CI.
- [ ] Apply the production migration and deploy.
- [ ] Run public GM/player party smoke testing, including refresh and invalid invite behavior.
- [ ] Update orchestrator-owned checklists, notes, worklog, current state, and GitHub planning.
