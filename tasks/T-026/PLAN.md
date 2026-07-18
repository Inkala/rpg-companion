# T-026 Plan: Bounded Level-Up MVP

Status: approved

## Parallel-work assessment

- Classification: Red.
- Recommendation: one dedicated T-026 implementation worktree from the reconciled planning base.
  T-024 is integrated, and Marcela explicitly accepts that implementation may miss the 20 July
  deadline.
- Reason: T-026 touches owner Character Reference, character persistence, route orchestration,
  character-sheet validation, local SRD/rules data, spell/class decision UI, and mobile
  accessibility. T-024's Character Reference and App changes are now part of the integrated
  baseline.
- Expected owned files or folders: owner Character Reference route/components, character API client,
  character sheet mapping/validation, new level-up feature folder, backend character
  handler/repository/validation/server tests, PATCH CORS, canonical SRD rules data and deterministic
  generated representations, rules attribution docs, and T-026 docs.
- Shared files or dependencies: CharacterSheetV1, `updatedAt`, Party GM read-only reference route,
  saved-character API contract, Sonner/toast surface, app routing, and the integrated T-024
  quick-reference changes.

## Expected files

Likely frontend files:

- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/characters/SavedCharacterReferencePage.tsx`
- `frontend/src/characters/SavedCharacterReferencePage.test.tsx`
- `frontend/src/characters/CharacterReference.tsx`
- `frontend/src/characters/CharacterReference.test.tsx`
- `frontend/src/characters/characterSheet.ts`
- `frontend/src/characters/characterSheetValidation.ts`
- `frontend/src/characters/characterSheetValidation.test.ts`
- `frontend/src/characters/characterSheetToReference.ts`
- `frontend/src/characters/characterSheetToReference.test.ts`
- `frontend/src/characters/api.ts`
- `frontend/src/characters/api.test.ts`
- `frontend/src/characters/apiTypes.ts`
- `frontend/src/characters/characters.css`
- new `frontend/src/level-up/` folder for the guided flow, state machine, rules helpers, and tests.
- `frontend/src/rules/generated/levelUpRules.ts`
- `frontend/src/rules/generated/levelUpRules.test.ts`

Likely backend files:

- `backend/internal/characters/model.go`
- `backend/internal/characters/handler.go`
- `backend/internal/characters/handler_test.go`
- `backend/internal/characters/repository.go`
- `backend/internal/characters/repository_test.go`
- `backend/internal/characters/validation.go`
- `backend/internal/characters/validation_test.go`
- `backend/internal/characters/character_sheet_*_validation.go`
- `backend/internal/server/server.go`
- `backend/internal/server/server_test.go`
- `backend/internal/server/cors.go`
- new `backend/internal/rules/generated_level_up_rules.go`
- new `backend/internal/rules/generated_level_up_rules_test.go`
- new backend level-up service/rules files under `backend/internal/characters/` as required.

Documentation/data files:

- `docs/rules-data.md`
- `rules-data/srd-5.1-2014-levels-1-5.json`
- `rules-data/srd-5.1-2014-levels-1-5.schema.json`
- `rules-data/srd-5.1-2014-levels-1-5.sha256`
- `scripts/generate-level-up-rules.mjs`
- `tasks/T-026/*`

Additional files require approval before editing.

Strict non-owned files:

- `README.md`
- `docs/submission-checklist.md`
- `CURRENT.md`
- `WORKLOG.md`
- `BACKLOG.md`
- `tasks/T-023/`
- `frontend/src/parties/`
- `backend/internal/parties/`
- `frontend/src/accounts/`
- portrait-bank assets
- production/provider/CI configuration

T-023 may draft concurrently in its own worktree, but must not edit product code,
canonical/generated rules data, `docs/rules-data.md`, or `tasks/T-026/`.

Required merge order:

1. T-026 implementation, validation, deployment, and public smoke.
2. T-023 rebases onto final main, replaces all T-026 placeholders, reconciles final evidence, and
   merges last.

## Implementation slices

### Slice 1: local rules contract and backend update endpoint

- Confirm the implementation base contains T-024 SHA
  `b942700a31af7efa22b0349018d692084b32965b` or a descendant before editing.
- Add one schema-validated canonical SRD 5.1/2014 source for all 12 classes through level 5 and all
  SRD spells through spell level 3.
- Add deterministic generation/checking for TypeScript and Go representations, snapshot ID,
  SHA-256, and parity tests. Do not maintain independent rules tables.
- Add `docs/rules-data.md` attribution, source URLs, import date, transformation process, snapshot
  ID, and checksum.
- Add focused CORS/security tests first, then advertise PATCH only for approved-origin preflights
  while preserving credentialed-cookie and unsafe-origin protections.
- Add focused backend tests for:
  - authenticated owner-scoped `PATCH /characters/{id}/level-up`;
  - malformed ID/body errors;
  - forbidden request fields;
  - foreign and unknown indistinguishable `404`;
  - stale `expectedUpdatedAt` returning `409` only for owner-scoped characters;
  - level 5 and above returning `422`;
  - current levels below 1 returning `422`;
  - illegal level jumps returning `422`;
  - multiclass payloads returning `422`;
  - unsupported class names returning `422`;
  - each of the 12 SRD classes allowing 1 to 2, 2 to 3, 3 to 4, and 4 to 5 when payload is valid;
  - missing earlier class/spell prerequisites collected or blocked without invented choices;
  - canonical cantrip/spell membership through spell level 3, spells-known/prepared calculations,
    replacements, Wizard additions, Pact Magic, and half-caster progression;
  - persisted class, level, owner, and `updatedAt` being authoritative;
  - submitted class/level/full-payload metadata being rejected;
  - illegal changes outside the approved level-up change set being rejected;
  - deterministic values matching canonical rules unless an exact typed override is supplied;
  - top-level columns plus CharacterSheetV1 payload updating in one transaction;
  - complete resulting sheet validation before persistence;
  - no partial update on validation or repository failure;
  - Party membership link preservation;
  - Party GM read-only direct update attempt denied as owner-not-found.
- Implement repository transaction and handler route.
- Build the resulting CharacterSheetV1 server-side from persisted state, canonical rules, and
  bounded player decisions.
- Add server-side level-up invariants and exact V1 provenance mapping for the levels 1-5 contract.
- Stop for review before Slice 2 if time permits.

### Slice 2: frontend eligibility, decisions, review, and persistence

- Add API client and DTO types for `PATCH /characters/{id}/level-up`.
- Add frontend level-up eligibility and owner-only `Level up` action.
- Ensure no Level-up action appears for Mara, signed-out saved references, GM read-only references,
  malformed sheets, multiclass characters, or characters at level 5 or higher.
- Add guided decision flow:
  - missing earlier prerequisites;
  - HP;
  - current HP;
  - subclass when required;
  - ASI/manual feat note at level 4;
  - learned/prepared/replaced spells when required;
  - class-specific choices;
  - retained value confirmation for AC, Speed, attacks, equipment, and exceptional/manual values;
  - review.
- Add synchronous duplicate-submit lock.
- Handle retryable failures and stale conflict without partial client state corruption.
- On success, show `Character leveled up.` and render the updated Character Reference.
- Run focused, complete, browser, CI, deployment, and public smoke validation.
- Stop for review before commit, PR, merge, deployment, or T-023 execution.

Merge order: Slice 1 before Slice 2. If implemented as one urgent branch, keep commits logically
separate and validate the complete branch once.

## Backend DTO contract

Route:

```text
PATCH /characters/{id}/level-up
```

Request:

```ts
type LevelUpCharacterRequestDTO = {
  expectedUpdatedAt: string;
  hp: { mode: 'fixed-average' } | { mode: 'rolled'; roll: number };
  currentHp:
    | { mode: 'increase-by-gain' | 'retain' }
    | { mode: 'manual'; value: number };
  prerequisiteChoices: ClassChoiceInput[];
  subclass?: { source: 'srd'; index: string } | { source: 'manual'; name: string };
  abilityScoreImprovement?: AbilityScoreImprovementInput;
  spells?: LevelUpSpellChangesInput;
  classChoices: ClassChoiceInput[];
  overrides?: LevelUpOverrideInput;
  decisionSummary: string[];
};
```

Response:

```ts
type LevelUpCharacterResponseDTO = CharacterDTO;
```

`ClassChoiceInput`, spell inputs, ASI inputs, and overrides are the exact bounded unions defined in
`DESIGN.md`. The server loads the owner-scoped persisted character and derives class, source level,
target level, and resulting CharacterSheetV1. The request does not replace the character.

Forbidden request fields: `fromLevel`, `toLevel`, `className`, `character`, `referencePayload`,
`ownerSubjectId`, `id`, `createdAt`, `updatedAt`, Party IDs, invite tokens, arbitrary return URLs,
unknown fields, and user/profile identifiers. `decisionSummary` is bounded audit text only.

Public errors are defined in `DESIGN.md` and must be tested exactly.

## Adversarial test matrix

Backend:

- Unauthenticated request returns `401`.
- Malformed character ID returns `400` without echoing the ID.
- Unknown and foreign characters return byte-equivalent `404`.
- Party GM read-only character cannot be updated through the owner endpoint.
- Stale `expectedUpdatedAt` for an owned character returns `409` and leaves data unchanged.
- Stale timestamp for a foreign character remains indistinguishable from unknown.
- Owner scope is established before `expectedUpdatedAt` is compared.
- Persisted class and level determine the only permitted transition.
- Submitted class, level, or full-character payload fields fail exact-key validation.
- Current level 0, level 5, level 6, and level 20 cannot level up.
- Level jumps other than exactly +1 are rejected.
- Target levels above 5 are rejected.
- Multiclass payload is rejected.
- Unsupported/non-SRD class names are rejected.
- Non-SRD existing content is preserved when otherwise valid.
- Missing earlier domain/origin/patron/tradition/circle/style/Expertise/invocation/Metamagic/Pact
  Boon choices are collected when safely representable or blocked without persistence.
- Deterministic fields must match canonical rules unless the exact typed override is present.
- Fields outside the approved level-up change set remain unchanged.
- Invalid resulting top-level columns are rejected.
- Invalid resulting CharacterSheetV1 payload is rejected.
- Repository/database failure leaves original character unchanged.
- Party membership link remains attached to the same character ID after success.
- Error bodies do not expose owner IDs, Party IDs, invite tokens, payload fragments, or database
  details.
- Exact privacy tests verify response keys for success and error bodies.
- Approved-origin PATCH preflight succeeds and advertises PATCH with credentials.
- Unapproved-origin PATCH preflight, unsafe-origin PATCH, and credentialed PATCH without Origin are
  rejected before route execution.

Frontend:

- `Level up` appears only on owner saved Character Reference for supported current levels 1-4.
- No `Level up` action appears for Mara, signed-out state, invalid payload, GM read-only Party
  reference, multiclass characters, unsupported class, or level 5+ character.
- Draft increments exactly one level and never exposes a raw level field.
- Fixed-average HP suggestion is shown with previous value, suggested value, and reason.
- Manual rolled HP path validates entered increase.
- Current HP behavior requires confirmation.
- Subclass decision appears at the appropriate class level.
- Missing earlier prerequisite choices appear before the target-level decision; unrepresentable
  prerequisites produce a clear blocked state.
- ASI/manual feat decision appears when moving to level 4.
- Spell decision step appears for Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, and
  Wizard when the target level requires learned/prepared/replaced choices.
- Class-specific choice step appears for fighting style, expertise, invocations, metamagic, pact
  boon, or similar canonical-source choices.
- Review lists every changed and retained critical value.
- Duplicate submit calls the API once.
- Retry after recoverable failure reuses the same draft and does not apply partial changes.
- `409` conflict asks for reload and does not resubmit automatically.
- Success toast is exactly `Character leveled up.` and the updated Character Reference renders.
- Focus management, headings, form labels, error text, and controls work at 320px, 390px, 720px,
  and desktop.

Rules data:

- Unit tests cover each of the 12 classes at transitions 1 to 2, 2 to 3, 3 to 4, and 4 to 5.
- Unit tests prove level 5 to 6 is absent/unsupported.
- Schema validation rejects unknown fields, bad references, duplicate indexes, and out-of-bound
  levels.
- `node scripts/generate-level-up-rules.mjs --check` proves the canonical checksum and generated
  TypeScript/Go outputs are current.
- Frontend and Go tests assert the same snapshot ID, checksum, transition keys, spell counts,
  class-list memberships, slot tables, and choice IDs.
- Spell tests cover every SRD cantrip/spell through level 3, known/prepared counts, one-spell
  replacement limits, Wizard additions, Pact Magic, and Paladin/Ranger half-caster progression.
- Unit tests verify SRD subclass options and class-specific choices are canonical-source driven.
- Attribution records source URLs, import date, transformation process, snapshot ID, checksum, and
  CC-BY-4.0 attribution.

## Validation commands

Focused backend:

```sh
cd backend
go test -p 1 ./internal/server -run 'Test.*CORS|Test.*Origin|Test.*LevelUp'
go test -p 1 ./internal/characters ./internal/rules ./internal/server
```

Canonical rules:

```sh
node scripts/generate-level-up-rules.mjs --check
```

Focused frontend:

```sh
pnpm --dir frontend test -- Level SavedCharacterReference CharacterReference App api characterSheet rules
```

Complete:

```sh
node scripts/generate-level-up-rules.mjs --check
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
cd backend
go test -p 1 ./...
go vet ./...
go build ./...
git diff --check
```

PostgreSQL-backed character repository/server tests must run against a disposable PostgreSQL 17
database with an explicit `TEST_DATABASE_URL`, loopback-only exposure, and tmpfs storage. Evidence
must prove the level-up transaction, stale conflict, rollback, privacy, and Party-link tests ran
rather than skipped. Remove the disposable database afterward.

Browser:

```text
Owner saved Character Reference and Level-up flow at 320px, 390px, 720px, and desktop.
Confirm no Level-up action on Mara, GM read-only Character Reference, or level 5+ characters.
Check representative martial, prepared caster, known caster, Pact Magic, and ASI flows.
```

Release validation:

- PR CI: Frontend, Backend, Secret history, Cloudflare Pages.
- Railway deployment status and deployed SHA.
- Cloudflare Pages production deployment status and deployed SHA.
- Public frontend HTTP status.
- Backend `/healthz` HTTP status.
- Public smoke:
  - owner can level a saved supported character once;
  - level 5 character cannot level up;
  - Party-linked character remains linked after level-up;
  - GM read-only view has no Level-up action.

## Estimate

Minimum realistic implementation and release time: 6 focused days from the integrated T-024
baseline. This
assumes the canonical importer has no upstream data gaps and the V1 prerequisite/manual fallback
contract proves implementable without schema expansion.

Likely implementation and release time: 8 to 10 focused days including canonical rules and spell
data, deterministic generation/parity, PATCH CORS, server-authoritative validation, PostgreSQL
tests, frontend tests, browser QA at 320px/390px/720px/desktop, CI, deployment, and public smoke.

Schedule risk before 20 July: critical. Marcela explicitly accepts that implementation may miss the
deadline. T-023 drafts in parallel with placeholders, but final evidence reconciliation and merge
wait for T-026 deployment and public smoke.
