# T-017 Tasks: Party MVP vertical slice

Status: approved

Approved by Marcela on 2026-07-12. Security-sensitive implementation must incorporate any P0
findings from the dedicated Security review before backend changes begin.

## 1. Approve product and security contract

- [x] Approve invite delivery as a copied opaque shareable link with no email/SMS provider.
- [x] Approve seven-day reusable invite expiration and regeneration invalidating the old link.
- [x] Approve atomic join with one owned saved character.
- [x] Approve one simultaneous party per character for this MVP.
- [x] Approve basic roster visibility for members and full-sheet access only for the GM.
- [x] Approve no linked character for the creating GM in this MVP.
- [x] Freeze API routes, DTOs, status codes, and security behavior, subject only to P0 Security review
  corrections.

## 2. Prepare child tasks and clean base

- [x] Review and integrate the existing validated T-015 mobile-menu follow-up (`0a724fb`, CI passed).
- [x] Review and integrate the T-016 documentation reset (`7f5e787`, CI passed).
- [ ] Confirm clean main and passing CI.
- [ ] Create T-017A backend requirements/design/tasks with exact ownership.
- [ ] Create T-017B frontend feature requirements/design/tasks with exact ownership.
- [ ] Create the two worktrees from the same clean base.

## 3. T-017A backend party implementation

- [ ] Add failing migration/repository tests first.
- [ ] Add party, membership, and invite migration with constraints.
- [ ] Add failing create/list/invite/join/roster/GM-access handler tests first.
- [ ] Implement the smallest backend party package and routes.
- [ ] Cover 401, 403, 404, 409, duplicate membership, foreign character, cross-party GM, and expired
  invite behavior.
- [ ] Run migration, backend test, vet, build, and diff validation.

## 4. T-017B isolated frontend party feature

- [ ] Add mocked party API helper tests first.
- [ ] Add isolated create, join, list, roster, and party Character Reference page tests first.
- [ ] Implement only `frontend/src/parties/` against the frozen contract.
- [ ] Cover signed-out, loading, empty, success, validation, forbidden, conflict, and server-error
  states.
- [ ] Run focused and full frontend validation.

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
