# T-026 Tasks: Bounded Level-Up MVP

Status: approved

- [x] Confirm T-024 is complete, merged, deployed, and publicly validated at
  `b942700a31af7efa22b0349018d692084b32965b`.
- [x] Record Marcela's explicit acceptance that T-026 implementation may miss the 20 July deadline.
- [x] Record strict T-023/T-026 ownership and T-026-first merge order.
- [ ] Confirm path, branch, clean status, and HEAD before editing.
- [ ] Read `AGENTS.md`, `PROJECT.md`, `CURRENT.md`, `CHECKS.md`, and this task folder.
- [ ] Report the parallel-work assessment before editing.
- [ ] Confirm no implementation work starts in main checkout.
- [ ] Confirm CharacterSheetV1 fields that will be updated, retained, confirmed, or rejected.
- [x] Confirm the all-12 SRD class, levels 1-5 cap is approved.
- [ ] Confirm the T-026 worker owns no T-023 or shared orchestration files before editing.

## Slice 1: rules data and backend update contract

- [ ] Add one canonical schema-validated SRD 5.1/2014 source for all 12 classes through level 5 and
  all SRD spells through spell level 3.
- [ ] Add snapshot ID, SHA-256, source URLs, import date, transformation notes, and CC-BY-4.0
  attribution.
- [ ] Add deterministic generation/checking for TypeScript and Go representations.
- [ ] Add schema, checksum, and frontend/Go parity tests proving equivalent rules.
- [ ] Do not add a live runtime rules API dependency.
- [ ] Add rules-data tests for all 12 classes and transitions 1 to 2, 2 to 3, 3 to 4, and 4 to 5.
- [ ] Add rules-data tests proving level 5 to 6 is unsupported.
- [ ] Add rules-data tests for cantrips/spells through level 3, class-list membership, known and
  prepared progression, replacement limits, Wizard spellbook additions, Pact Magic, and
  Paladin/Ranger half-caster progression.
- [ ] Add focused PATCH CORS tests for approved-origin preflight, unapproved origin, missing Origin
  with a credentialed unsafe request, credentials, and no wildcard.
- [ ] Update `backend/internal/server/cors.go` to advertise PATCH only for approved-origin
  preflights while preserving existing protections.
- [ ] Add backend tests for authenticated owner-scoped `PATCH /characters/{id}/level-up`.
- [ ] Add backend tests for malformed ID/body and forbidden request fields.
- [ ] Add backend tests proving foreign and unknown characters remain indistinguishable.
- [ ] Add backend tests proving Party GM read-only access cannot level up.
- [ ] Add backend tests for optimistic concurrency with `updatedAt`.
- [ ] Add backend tests proving stale foreign requests do not reveal ownership or existence.
- [ ] Add backend tests proving persisted owner, class, level, payload, and `updatedAt` are
  authoritative and loaded before transition validation.
- [ ] Add backend tests rejecting submitted source/target level, class name, complete replacement
  payload, unknown fields, and illegal changes outside the level-up change set.
- [ ] Add backend tests for exact public error codes and privacy-safe bodies.
- [ ] Add backend tests for current level 0, current level 5, current level above 5, target level
  above 5, multiclass, unsupported class, and illegal level jump.
- [ ] Add backend tests proving valid level-up persistence for each of the 12 classes for supported
  transitions.
- [ ] Add backend tests for missing earlier class and spell prerequisites: collect safely or block
  without inventing/overwriting choices.
- [ ] Add backend tests for exact CharacterSheetV1 provenance field mapping and bounds.
- [ ] Add backend tests proving top-level columns and CharacterSheetV1 payload update in one
  transaction.
- [ ] Add backend tests proving full resulting sheet validation before persistence.
- [ ] Add backend tests proving repository/database failure causes no partial update.
- [ ] Add backend tests proving Party membership link is preserved.
- [ ] Implement the owner-scoped level-up update endpoint.
- [ ] Implement repository transaction that locks and loads by owner ID before comparing
  `expectedUpdatedAt`.
- [ ] Derive the permitted transition and resulting sheet server-side from persisted state,
  canonical rules, and bounded decisions.
- [ ] Preserve every field outside the explicit level-up change set.
- [ ] Implement server-side level-up invariants for the levels 1-5 bounded MVP.
- [ ] Stop for review before Slice 2 if the backend/rules slice is split.

## Slice 2: frontend flow

- [ ] Add frontend owner-only `Level up` action.
- [ ] Ensure no Level-up action appears for Mara, signed-out saved reference, GM read-only Character
  Reference, unsupported class, multiclass character, malformed payload, or level 5+ character.
- [ ] Show a safe blocked state for unsupported class, multiclass, level outside 1-4, or invalid
  payload.
- [ ] Add guided level-up state machine.
- [ ] Audit and collect safely representable missing earlier prerequisites before target-level
  choices; otherwise show a clear blocked state.
- [ ] Show every suggested change with previous value, suggested value, reason, and editable
  override.
- [ ] Support fixed-average HP and manual rolled HP.
- [ ] Require current HP confirmation after max HP changes.
- [ ] Support subclass decisions at the correct levels for SRD classes.
- [ ] Support level-4 ASI allocation or manual feat note.
- [ ] Support learned, prepared, and replaced SRD spell decisions while retaining existing non-SRD
  spells unchanged.
- [ ] Support class-specific decision hooks, including fighting styles, expertise, invocations,
  metamagic, pact boon, and similar canonical-source choices.
- [ ] Retain AC, Speed, equipment, attacks, and exceptional/manual values unless the player reviews
  and overrides them.
- [ ] Preserve non-SRD existing content instead of replacing it.
- [ ] Add review screen showing every change before persistence.
- [ ] Prevent duplicate submission.
- [ ] Keep failures retryable without partial changes.
- [ ] Treat `409` conflict as a reload-required state without automatic retry.
- [ ] On success, show fixed safe confirmation `Character leveled up.` and render updated Character
  Reference.

## Validation

- [ ] Run focused backend validation.
- [ ] Run focused CORS/security validation.
- [ ] Run canonical schema/checksum/generated-output parity validation.
- [ ] Run focused frontend validation.
- [ ] Run complete frontend validation.
- [ ] Run complete backend validation.
- [ ] Run PostgreSQL-backed repository/server tests.
- [ ] Run browser checks at 320px, 390px, 720px, and desktop.
- [ ] Run PR CI.
- [ ] Verify Railway and Cloudflare deployment SHAs.
- [ ] Run public smoke for owner level-up, level-5 blocked state, Party-link preservation, and GM
  read-only absence of Level up.
- [ ] Run `git diff --check`.
- [ ] Stop for review before commit, push, PR, merge, deployment, or T-023 execution.
