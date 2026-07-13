# T-017 Tasks: Party MVP vertical slice

Status: approved and in progress

Marcela approved the original contract on 2026-07-12 and approved continuing the reviewed
Security-amended contract on 2026-07-13. T-018 is integrated and verified. T-017A and T-017B are
complete and merged through PR #24 (`02b0bc8`) and PR #25 (`af592ec`).

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
- [x] Approve the security-preserving refresh rule: Party and GM Character Reference routes survive
  reload, while a scrubbed invite reload is safely unavailable and requires reopening the original
  shared link.

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
- [x] Add failing Party join-throttling, invite no-store, and token-redaction tests first.
- [x] Reuse the approved T-018 request, server, auth, cache, logging, and payload controls.
- [x] Add party, membership, and invite migration with constraints.
- [x] Add failing create/list/invite/join/roster/GM-access handler tests first.
- [x] Implement the smallest backend party package and routes.
- [x] Cover 401, 403, 404, 409, duplicate membership, foreign character, cross-party GM, and expired
  invite behavior.
- [x] Pass every merge-blocking authorization and race test below.
- [x] Run migration, backend test, vet, build, and diff validation.

### Merge-blocking backend test contract

- [x] Every Party endpoint returns `401` without a session.
- [x] Party creation atomically creates exactly one GM membership.
- [x] Failed GM-membership creation rolls back party creation.
- [x] A member lists only parties they joined.
- [x] A nonmember cannot distinguish another user's party from an unknown party.
- [x] A player cannot generate or regenerate an invite.
- [x] A GM in Party A cannot generate an invite for Party B.
- [x] Regeneration leaves one non-revoked invite and rejects the previous token.
- [x] PostgreSQL never stores the raw invite token.
- [x] Invalid, malformed, expired, revoked, and replaced invites create no membership.
- [x] A player joins only with a character they own.
- [x] A foreign character returns `404` and creates no membership.
- [x] A character linked elsewhere returns `409` and creates no membership.
- [x] Repeating the identical successful join is idempotent.
- [x] Concurrent duplicate joins create one membership only.
- [x] Concurrent attempts to link one character to two parties produce one success and one conflict.
- [x] A same-party player cannot open another player's full sheet.
- [x] The managing GM can read a linked character.
- [x] A GM from another party receives `404`.
- [x] A managing GM cannot read an unlinked character through the Party endpoint.
- [x] Party character endpoints expose no edit method.
- [x] The existing owner endpoint still returns `404` for other users.
- [x] Roster DTOs exclude email, owner IDs, token hashes, invite data, and full character payload.
- [x] GM Character Reference fails closed on malformed or unsupported payloads.
- [x] No response other than one-time invite creation, and no log, contains a raw invite token.

## 4. T-017B isolated frontend party feature

- [x] Add mocked party API helper tests first.
- [x] Add isolated create, join, list, roster, and party Character Reference page tests first.
- [x] Implement only `frontend/src/parties/` against the frozen contract.
- [x] Cover signed-out, loading, empty, success, validation, forbidden, conflict, and server-error
  states.
- [x] Prove the isolated invite-fragment helper scrubs the fragment and never places it in an API
  URL. Pre-React invocation remains T-017C work.
- [x] Prove signed-out invite UI reveals no invite validity or party information.
- [x] Prove auth return uses typed internal state and cannot perform an open redirect.
- [x] Apply no-store and no-referrer behavior to the invite flow.
- [x] Run focused and full frontend validation for the isolated Party feature.

## 5. T-017C central frontend integration

- [x] Add route parser/serializer tests first.
- [x] Add app integration tests for create, invite, auth return, join, party detail, and GM character
  navigation.
- [x] Wire party routes through `App`.
- [x] Replace the Home party placeholders with the real party list/actions.
- [x] Preserve all existing account, character creation, profile, sample, and saved-reference flows.
- [x] Run full frontend validation and narrow-width manual checks.

## 6. T-017D combined validation and deployment

- [ ] Run migration up/down on a disposable database.
- [ ] Run full backend and frontend checks.
- [ ] Run two-user local end-to-end smoke testing.
- [ ] Confirm all required 401/403 cases.
- [ ] Integrate branches in declared order and confirm CI.
- [ ] Apply the production migration and deploy.
- [ ] Run public GM/player party smoke testing, including refresh and invalid invite behavior.
- [ ] Update orchestrator-owned checklists, notes, worklog, current state, and GitHub planning.
