# T-026 Requirements: Bounded Level-Up MVP

Status: approved

## Goal

Add a bounded, owner-only Level-up MVP for saved single-class characters on the completed T-024
baseline.

Level-up is now considered a must-have submission feature, but it must remain bounded enough to
complete, validate, and deploy before the 20 July deadline.

## Product rationale

Hunin's level-up MVP focuses on levels 1 through 5, where new and occasional players encounter their
class identity, subclass, first Ability Score Improvement, and major early progression choices.
Higher-level progression is deferred to a future release.

## Product priority

1. T-024 is complete, merged, deployed, and publicly validated at
   `b942700a31af7efa22b0349018d692084b32965b`.
2. Implement, validate, deploy, and publicly smoke-test bounded T-026 Level-up MVP.
3. Draft T-023 in parallel, then rebase and complete it after T-026 reaches final main.
4. Keep full T-025, portrait integration, broad CRUD, Party administration, and multiclassing
   deferred.

The T-024 integration gate is satisfied. Marcela explicitly accepts that T-026 implementation may
miss the 20 July deadline. T-023 may draft in parallel under strict file ownership, but T-026 must
integrate first and T-023 must reconcile final evidence afterward.

## Parallel ownership and integration

T-026 owns product code, canonical/generated rules data, backend/frontend tests,
`docs/rules-data.md`, and `tasks/T-026/`.

T-026 must not edit `README.md`, `docs/submission-checklist.md`, `CURRENT.md`, `WORKLOG.md`,
`BACKLOG.md`, or `tasks/T-023/`.

Required merge order:

1. T-026 implementation, validation, deployment, and public smoke.
2. T-023 rebases onto final main, replaces all T-026 placeholders, reconciles final evidence, and
   merges last.

## Supported boundary

- Owner-only level-up.
- Saved characters only.
- Single-class characters only.
- All 12 SRD 5.1/2014 classes:
  - Barbarian;
  - Bard;
  - Cleric;
  - Druid;
  - Fighter;
  - Monk;
  - Paladin;
  - Ranger;
  - Rogue;
  - Sorcerer;
  - Warlock;
  - Wizard.
- Increase exactly one level at a time.
- Supported transitions only:
  - level 1 to 2;
  - level 2 to 3;
  - level 3 to 4;
  - level 4 to 5.
- Level 5 is the MVP cap.
- Existing characters above level 5 remain readable but cannot use Level up.
- D&D 5E 2014 and legally reusable SRD 5.1 content only.
- SRD subclasses and content only.
- Preserve non-SRD existing content without trying to automate it.
- Manual fallback for representable class/subclass choices or retained content absent from SRD 5.1.
  New spell selections are SRD-only.
- Preserve CharacterSheetV1 if it can safely represent the result.
- Preserve character IDs and Party links.

## Explicit exclusions

- No level reduction.
- No progression from level 5 to 6 or above.
- No multiclassing.
- No feats catalog.
- No homebrew automation.
- No paid-book content.
- No live runtime rules API.
- No character deletion.
- No general-purpose complete-sheet editor beyond what level-up requires.
- No Party administration changes.
- No profile/account management changes.
- No portrait-bank integration.
- No CharacterSheetV2.

## Support and safe failure

Manual character creation currently accepts arbitrary class names and levels. T-026 supports only
single-class characters matching one of the 12 SRD class names and current level 1, 2, 3, or 4.

The frontend must block persistence and show a friendly non-destructive message for:

- unsupported class names;
- multiclass characters;
- characters at level 5 or higher;
- characters below level 1;
- malformed or unsupported CharacterSheetV1 payloads;
- CharacterSheetV1 records whose current top-level columns and payload disagree;
- SRD data gaps that make the next level unsafe to suggest.

The backend must independently enforce the same constraints. A direct API call must never corrupt or
partially update a character.

## Automatic suggestions

Automatically update or suggest when deterministically supported:

- total level and class level;
- proficiency bonus;
- ability modifiers;
- initiative;
- Passive Perception;
- spell slots and available spell levels;
- spell save DC;
- spell attack bonus;
- SRD class features unlocked at the new level;
- fixed-average HP increase.

## Player decisions

- Fixed-average HP or manually entered rolled HP.
- Current HP handling after maximum HP changes.
- Subclass when the class requires it in levels 1 through 5 and no supported subclass exists yet.
- Ability Score Improvement allocation at level 4.
- Manual feat note instead of ASI, without implementing a feats catalog.
- New, learned, prepared, or replaced spells when the class rules require a decision.
- Class-specific choices, such as fighting style, expertise, invocations, metamagic, or pact boon.
- Confirmation of AC, Speed, attacks, equipment, current HP, and exceptional/manual values.

## Limitations

- Non-SRD options use manual entry or retained notes.
- Existing non-SRD content must be preserved and marked as retained/manual, not replaced.
- Do not silently overwrite an existing manual value.
- Every suggested change must show previous value, suggested value, reason, and editable override.
- Values need provenance such as generated, player-confirmed, manual override, retained non-SRD, or
  deferred.
- CharacterSheetV1 does not allow arbitrary new root or audit fields. T-026 must use only the
  existing `audit.source`, `audit.needsConfirmation`, `audit.rulesVersionWarnings`, and
  `audit.deferredCorrections` fields, existing audited-value `needsConfirmation` and `note` fields,
  and existing feature/spell `source.status` and `source.note` fields.
- No new root or audit field may be invented during implementation without renewed product-owner
  approval.
- A review screen must show every change before persistence.
- Existing-member linked-character replacement is deferred.

## Canonical rules-data requirements

- One canonical, versioned SRD 5.1/2014 JSON source must govern both frontend suggestions and
  backend validation.
- Independently maintained frontend and backend rules tables are forbidden.
- The canonical source must have a schema, snapshot/version identifier, source URLs, import date,
  transformation notes, CC-BY-4.0 attribution, and a committed SHA-256 checksum.
- A deterministic generator/check command must validate the canonical schema and produce or verify
  the TypeScript and Go representations.
- Frontend and backend tests must prove the generated representations expose the same snapshot ID,
  checksum, class transitions, spell progression, and choice identifiers.
- Production must not call the external rules API.

## Exact spell boundary

- The canonical source includes every SRD 5.1 cantrip and spell from spell level 0 through spell
  level 3, with class spell-list membership and the metadata needed to create a
  `CharacterSheetSpell`.
- It includes no spell above level 3 and no non-SRD spell.
- Full casters use the SRD levels 1-5 slot progression and can access spell levels 1, 2, and 3 at
  the applicable class levels.
- Paladin and Ranger use their SRD half-caster progression and access spell levels 1 and 2 through
  class level 5.
- Warlock uses Pact Magic slot count and active slot level, not the full-caster slot table.
- Bard, Ranger, Sorcerer, and Warlock use canonical spells-known counts and may replace at most one
  existing known spell when the 2014 class rule permits it.
- Cleric, Druid, Paladin, and Wizard use their canonical prepared-spell calculations. Subclass
  spells that are always prepared remain separate from the counted prepared selection.
- Wizard level-up adds exactly two eligible SRD Wizard spells to the spellbook. In
  CharacterSheetV1, Wizard spells with `preparedOrKnown: "known"` represent spellbook entries not
  currently prepared, while `preparedOrKnown: "prepared"` represents prepared spellbook entries.
- Existing non-SRD spells are retained with their current known/prepared state and audit metadata.
  T-026 cannot add or replace a spell with a new non-SRD spell.
- The flow must distinguish automatic slot changes, selected additions, optional replacements,
  retained spells, and prepared-set choices.

## Existing-character prerequisites

- Eligibility must inspect required class decisions from every earlier level, not only the target
  level.
- Missing prerequisite decisions include subclass/domain/origin/patron/tradition/circle, Fighting
  Style, Expertise, invocations, Metamagic, Pact Boon, and other canonical earlier class choices.
- If an earlier decision is missing and CharacterSheetV1 can represent it safely, the flow must
  collect it before the new-level decision and include it in review.
- If the missing prerequisite cannot be represented or validated safely, Level up must stop with a
  clear explanation and leave the character unchanged.
- The flow must never silently select, replace, or overwrite an earlier choice.
- Existing non-SRD choices are retained. Dependent automation is allowed only when the canonical
  rules source can validate the dependency; otherwise the dependent change uses a reviewed manual
  fallback or the flow blocks.

## Backend requirements

- Add `PATCH /characters/{id}/level-up` as an authenticated owner-scoped character update endpoint.
- Update `backend/internal/server/cors.go` so an approved-origin OPTIONS preflight advertises
  `PATCH`, while unapproved origins remain rejected.
- Preserve credentialed-cookie CORS, exact approved-origin reflection, missing-origin protection for
  cookie-authenticated unsafe requests, and unsafe-origin rejection.
- Foreign and unknown characters must remain indistinguishable.
- Party GMs remain read-only.
- Update top-level character columns and CharacterSheetV1 payload consistently in one transaction.
- Validate the complete resulting sheet before persistence.
- Protect against stale or duplicate updates using `expectedUpdatedAt` against persisted
  `updated_at` after owner scope is established.
- Load the persisted owner-scoped character first and derive current class, current level,
  ownership, current payload, and permitted target level from that record.
- Treat request `decisionSummary` as bounded audit text only. It does not authorize or determine a
  character change.
- Do not accept request `fromLevel`, `className`, or a complete resulting character payload as
  authoritative state.
- Apply only the explicitly approved level-up change set, validate every changed field against the
  canonical rules source, and preserve all other persisted fields byte-for-byte or semantically
  unchanged as appropriate.
- Reject mismatched class/level metadata, illegal field changes, incomplete decisions, and
  deterministic values that do not match the canonical result.
- The endpoint must not become an unrestricted character editing endpoint.
- Do not require a SQL migration unless investigation proves one is necessary.
- Preserve the existing Party membership link.
- Do not expose owner IDs, Party IDs, invite tokens, private payload fragments, or database details
  in level-up error responses.

## Backend public errors

- `401 authentication required`: no valid session.
- `400 character id must be a valid UUID`: malformed path ID.
- `400 level-up request validation failed`: malformed or invalid request body.
- `404 character not found`: unknown, foreign, or otherwise inaccessible owner character.
- `409 character changed; reload before leveling up`: stale `expectedUpdatedAt` for an owned
  character.
- `422 character cannot be leveled up by Hunin yet`: unsupported class, multiclass character,
  level outside the 1-4 transition range, illegal level jump, invalid resulting sheet, or unsupported
  rules data.
- `500 could not level up character`: generic persistence/server failure.

## Frontend requirements

- Add `Level up` to the owner Character Reference only.
- No Level-up action for Mara or GM read-only Character Reference.
- No Level-up action for characters at level 5 or higher.
- Use a guided step flow rather than exposing a raw level field.
- Prevent duplicate submission.
- Keep failures retryable without applying partial changes.
- On success, show fixed safe confirmation `Character leveled up.` and render the updated Character
  Reference.
- Preserve mobile accessibility and keyboard behavior.
- If the current character is unsupported, explain why and do not show a destructive or
  persistence-backed path.
- When a required earlier class decision is missing, collect it before the target-level choices or
  show a clear blocked state if safe collection is impossible.
