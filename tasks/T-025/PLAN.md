# T-025 Plan: Structured Character Creation and Derived Values

Status: approved

Spell-progression correction status: approved. The following work is part of the existing Slice 2
contract and Slice 4 implementation, not a new sixth slice. Slice 4 resumes only after the canonical
and V2 spell contracts are reconciled.

## Objective

Deliver rules-assisted CharacterSheetV2 creation while preserving V1 display compatibility, the
deployed T-026 Level up foundation, ordinary Character Reference navigation, and T-028 invite
continuation.

## Sequential implementation slices

Each slice stops for review before commit or the next slice.

### Slice 1: Extend the canonical SRD foundation

- Extend the existing T-026 JSON and schema with Race, the complete SRD 5.1 equipment catalog,
  armor/shield rules, complete spell description, material components, and supported derived-effect
  metadata.
- Preserve equipment source identifiers, categories, weight, cost, weapon properties, damage,
  armor data, and other reusable source fields where available.
- Preserve snapshot identity, checksums, deterministic ordering, source URLs, import date,
  transformation record, and CC-BY-4.0 attribution.
- Add deterministic TypeScript and Go creation projections from the same JSON.
- Add schema, record-count, checksum, freshness, and cross-runtime parity tests.
- Update `docs/rules-data.md` without creating a second snapshot.

Estimate: 2 to 3 focused days.

### Slice 2: CharacterSheetV2 and calculation contracts

- Add the V2 domain, request, response, provenance, and structured-section types.
- Add unified bounded `ruleChoices` for Race and class decisions.
- Add calculated-base versus imported-final ability-score inputs.
- Add exact defense, calculated-attack, spell, feature, subclass, and HP-progression contracts.
- Add bounded manual Race, manual Class, and combined manual identity validation paths.
- Add an exact lossless canonical/manual persisted-feature union.
- Add frontend and Go calculation helpers driven by generated rules.
- Add strict V2 parsers and validators with nested exact-union key parity.
- Correct canonical Wizard level 1 with six initial spellbook selections and use exact
  mode-specific `none`, `known`, `prepared`, `pact-known`, and `spellbook-prepared` request unions.
- Replace the trusted final spell-list input with bounded cantrip, per-level learned/replacement,
  prepared-set, and Wizard spellbook decisions that the server can reconstruct.
- Persist validated spell decision history beside the resolved display collection so complete-sheet
  validation and Level up can reproduce the same result.
- Keep V1 and Mara compatibility tests green.
- Prove imported scores and other overrides survive source-input changes until explicitly reset.
- Prove Reset to calculated requires usable base scores and valid canonical Race choices.

Estimate: 2 to 4 focused days.

### Slice 3: Server-authoritative V2 persistence

- Extend `POST /characters` to dispatch legacy V1 and new V2 requests safely.
- Build the complete V2 payload on the backend from bounded inputs.
- Map Race to the existing internal `ancestry` column without exposing that term in V2 UI/DTOs.
- Validate canonical choices, calculations, provenance, complete payload, and top-level parity.
- Add exact-key privacy tests and disposable PostgreSQL JSONB round-trip tests.
- Extend owner and Party-GM read validation to V1/V2.
- Confirm no migration is required.

Estimate: 2 to 3 focused days.

### Slice 4: Structured creation UI

- Replace free-text Class and Race fields with canonical dropdowns and `Other` fallbacks.
- Add conditional Subclass and required Gender.
- Remove Concept, Notes, and Current HP.
- Implement ability, HP progression, proficiency, combat calculation, and override controls.
- Implement repeatable Attacks, Spells, Features and traits, Equipment, and Other sections.
- Add one review step showing all resolved values and provenance.
- Migrate guided Fighter presets to V2 without changing their recommendation behavior.
- Implement mode-specific spell decisions rather than a universal state dropdown. Do not infer,
  preselect, or fabricate learned spells, replacements, spellbook additions, or prepared choices.
- Correct the recorded 44px HP controls, stable feature keys, semantic ability-mode grouping,
  persistent desktop step navigation, restrained live announcements, and long native-select
  overflow regressions.

Estimate: 4 to 6 focused days.

### Slice 5: Reference, Level up, and integration completion

- Render V2 in owner and Party-GM Character Reference while preserving V1 and Mara.
- Adapt T-026 Level up to preserve V2-only content and provenance.
- Preserve ordinary saved-reference navigation as a regression.
- Preserve invite-launched automatic Party joining, retry-only joins, stale-result handling, and
  token privacy as regressions.
- Run complete browser, frontend, backend, PostgreSQL, privacy, accessibility, CI, deployment, and
  public smoke validation.

Estimate: 3 to 5 focused days.

## Expected file ownership

### Canonical rules and documentation

- `rules-data/srd-5.1-2014-levels-1-5.json`
- `rules-data/srd-5.1-2014-levels-1-5.schema.json`
- `rules-data/srd-5.1-2014-levels-1-5.sha256`
- `scripts/generate-level-up-rules.mjs`
- `scripts/generate-character-creation-rules.mjs` (new)
- `docs/rules-data.md`
- `frontend/src/rules/generated/levelUpRules.ts`
- `frontend/src/rules/generated/levelUpRules.test.ts`
- `frontend/src/rules/generated/characterCreationRules.ts` (new)
- `frontend/src/rules/generated/characterCreationRules.test.ts` (new)
- `backend/internal/rules/generated_level_up_rules.go`
- `backend/internal/rules/generated_level_up_rules_test.go`
- `backend/internal/rules/generated_character_creation_rules.go` (new)
- `backend/internal/rules/generated_character_creation_rules_test.go` (new)
- `backend/internal/rules/character_creation_rules.go` (new)

### Frontend creation and integration

- `frontend/src/character-creation/CharacterCreationPage.tsx`
- `frontend/src/character-creation/CharacterCreationPage.test.tsx`
- `frontend/src/character-creation/characterCreation.css`
- `frontend/src/character-creation/characterCreationTypes.ts`
- `frontend/src/character-creation/generatedFighterBuilds.ts`
- `frontend/src/character-creation/generatedFighterBuilds.test.ts`
- `frontend/src/character-creation/manualCharacterEntry.ts`
- `frontend/src/character-creation/manualCharacterEntry.test.ts`
- `frontend/src/character-creation/characterSheetV2Draft.ts` (new)
- `frontend/src/character-creation/characterSheetV2Draft.test.ts` (new)
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`

### Frontend character and Level up contracts

- `frontend/src/characters/api.ts`
- `frontend/src/characters/api.test.ts`
- `frontend/src/characters/apiTypes.ts`
- `frontend/src/characters/characterSheet.ts`
- `frontend/src/characters/characterSheetValidation.ts`
- `frontend/src/characters/characterSheetValidation.test.ts`
- `frontend/src/characters/characterSheetToReference.ts`
- `frontend/src/characters/characterSheetToReference.test.ts`
- `frontend/src/characters/CharacterReference.tsx`
- `frontend/src/characters/CharacterReference.test.tsx`
- `frontend/src/characters/CharacterReferenceSection.tsx`
- `frontend/src/characters/ReferenceItemRow.tsx`
- `frontend/src/characters/SavedCharacterReferencePage.tsx`
- `frontend/src/characters/SavedCharacterReferencePage.test.tsx`
- `frontend/src/characters/CharacterSummaryCard.tsx`
- `frontend/src/characters/CharacterSummaryCard.test.tsx`
- `frontend/src/characters/types.ts`
- `frontend/src/characters/characters.css`
- `frontend/src/characters/maraCharacterSheet.ts` only for compatibility typing if required
- `frontend/src/features/home/SignedInHomeContent.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/level-up/LevelUpFlow.tsx`
- `frontend/src/level-up/LevelUpFlow.test.tsx`
- `frontend/src/level-up/stateMachine.ts`
- `frontend/src/level-up/stateMachine.test.ts`
- `frontend/src/level-up/levelUpTestFixtures.ts`

### Backend character contract

- `backend/internal/characters/model.go`
- `backend/internal/characters/handler.go`
- `backend/internal/characters/handler_test.go`
- `backend/internal/characters/repository.go`
- `backend/internal/characters/repository_test.go`
- `backend/internal/characters/validation.go`
- `backend/internal/characters/validation_test.go`
- `backend/internal/characters/character_sheet_validation.go`
- `backend/internal/characters/character_sheet_validation_test.go`
- `backend/internal/characters/character_sheet_v2_validation.go` (new)
- `backend/internal/characters/character_sheet_v2_validation_test.go` (new)
- `backend/internal/characters/character_sheet_v2_identity_validation.go` (new)
- `backend/internal/characters/character_sheet_v2_identity_validation_test.go` (new)
- `backend/internal/characters/character_sheet_v2_combat_validation.go` (new)
- `backend/internal/characters/character_sheet_v2_combat_validation_test.go` (new)
- `backend/internal/characters/character_sheet_v2_content_validation.go` (new)
- `backend/internal/characters/character_sheet_v2_content_validation_test.go` (new)
- `backend/internal/characters/level_up.go`
- `backend/internal/characters/level_up_test.go`
- `backend/internal/server/server_test.go` for V1/V2 route regression only

No migration file is expected. If one becomes necessary, implementation stops for renewed approval.

### Spell-progression correction ownership

The correction is expected to touch only the existing T-025 ownership areas, principally:

- `rules-data/srd-5.1-2014-levels-1-5.json`;
- `rules-data/srd-5.1-2014-levels-1-5.schema.json`;
- `rules-data/srd-5.1-2014-levels-1-5.sha256`;
- `scripts/generate-level-up-rules.mjs` and its focused tests;
- `scripts/generate-character-creation-rules.mjs` and its focused tests;
- generated TypeScript and Go level-up/creation rule projections and parity tests;
- `frontend/src/characters/characterSheetV2.ts`;
- `frontend/src/characters/characterSheetV2Validation.ts`;
- `frontend/src/characters/characterSheetV2Calculations.ts` and focused V2 tests;
- `backend/internal/characters/character_sheet_v2.go`;
- `backend/internal/characters/character_sheet_v2_validation.go`;
- `backend/internal/characters/character_sheet_v2_calculations.go` and focused V2 tests;
- `frontend/src/character-creation/characterSheetV2Draft.ts` and its tests;
- `frontend/src/character-creation/StructuredCharacterCreation.tsx` and focused creation tests;
- the existing character handler/model tests only where request dispatch or exact response parsing
  must change.

No SQL migration, provider, Party, T-023, or deployment file belongs to this correction.

## Test matrix

### Rules and calculations

- schema, checksum, generated freshness, deterministic sorting, exact record counts, and TS/Go
  parity;
- all 12 classes and conditional subclass levels, including Ranger Hunter;
- every Race speed and manual Race fallback;
- calculated base scores plus canonical fixed Race bonuses;
- Half-Elf selects two distinct available +1 ability bonuses;
- canonical subrace bonuses are applied exactly once;
- imported final scores are not modified by Race bonuses and survive Race changes;
- Reset to calculated resolves from usable base scores and current valid Race choices;
- invalid, duplicate, unavailable, wrong-owner, wrong-count, and failed-prerequisite rule choices;
- manual Race receives no invented ability-score automation;
- frontend and Go final-score calculation parity;
- armor defense requires equipped canonical armor and optional equipped canonical shield;
- unarmored defense retains and validates the selected compatible formula and shield policy;
- manual defense requires an AC value and reason and ignores equipment automation;
- calculated attack bonus uses the selected Strength, Dexterity, or supported spellcasting ability
  and the explicit proficiency flag;
- manual attack bonus persists its bounded value and reason, and no ability is inferred from a name;
- canonical and manual spells persist every approved display field, explicit state, and provenance;
- Wizard level 1 requires six distinct level-1 Wizard spellbook choices;
- every Wizard level from 2 through N requires exactly two legal additions;
- Wizard prepared IDs are a formula-bounded subset of the reconstructed spellbook;
- known and Pact-known Classes record exact initial selections, later learned deltas, and at most
  the canonical replacements at each eligible level;
- every replacement validates level, prior removal ID, addition, membership, availability,
  uniqueness, and the canonical limit;
- prepared Classes validate final prepared count while canonical always-prepared subclass spells
  are derived and excluded from that count;
- Pact Magic and half-caster start levels, known/prepared behavior, slots, and available levels are
  validated independently;
- non-spellcasters reject class spell progression, while validated Race grants remain derivable;
- manual/imported spell choices carry complete display data and an import reason, occupy normal
  limits, and cannot silently alter slots or become always-prepared;
- frontend and Go reconstruction, exact-union parsing, and final resolved spell output remain in
  parity;
- prepared spell IDs reference server-reconstructed stored spells;
- canonical Race, Class, and Subclass feature ownership and level availability, including rejection
  of valid indexes from the wrong owner;
- canonical subclass timing, required selection, cross-Class rejection, and Ranger Hunter;
- level-N HP progression has exactly levels 2 through N with no missing, duplicate, or future gain;
- nested union variants reject unknown and cross-variant keys even when values are empty or zero;
- complete saved-sheet revalidation covers abilities/modifiers, proficiency, Initiative, Passive
  Perception, Speed, HP, AC, spell calculations/slots, prepared IDs, attacks, and features;
- manual Race with canonical Class accepts imported scores and required Speed override, preserves
  canonical Class automation, and rejects Race automation;
- manual Class derives universal proficiency, requires maximum-HP override, accepts supported
  defense modes, rejects Class/Subclass automation, and requires the exact `none` spellcasting
  variant;
- combined manual Race/Class requires imported scores plus Speed and maximum-HP overrides;
- missing required manual-identity inputs fail without persistence;
- canonical/manual feature unions round-trip exact IDs, categories, display fields, provenance, and
  nested keys in TypeScript and Go;
- proficiency and ability modifiers at boundaries;
- Initiative and Passive Perception with none, proficiency, expertise, supported modifiers, and
  overrides;
- level-1 and later HP, fixed/rolled/manual modes, Constitution changes, minimum gain, and current
  HP default;
- armor, Dexterity cap, shield, supported unarmored formulas, multiple defense modes, and overrides;
- spell save DC, spell attack, slots, class filtering, subclass membership, and spells through level
  3;
- source changes preserve imported and manual-override values.

### Backend and PostgreSQL

- authenticated V2 creation succeeds and persists top-level/V2 JSONB parity;
- guest creation is rejected and owner comes only from session;
- malformed schema, unknown SRD indexes, illegal subclass timing, invalid manual fallbacks, invalid
  spell membership, impossible slots, and inconsistent calculations fail without a row;
- exact V2 response keys exclude owner ID, email, Party, and invite data;
- generic database errors remain safe;
- V1 create/read and Mara validation remain green;
- owner and Party-GM read accept valid V2 while foreign/unknown privacy remains unchanged;
- Party membership links remain untouched;
- failed insert or validation produces no partial persistence.

### Frontend

- Class, Race, conditional Subclass, and Gender keyboard behavior;
- no Concept, Notes, or Current HP creation controls;
- `Other` requires bounded manual input and is not presented as SRD;
- spell dropdown filtering and automatic metadata population;
- mode-specific spell editors collect exact cantrip, known, replacement, prepared, Pact, and Wizard
  spellbook decisions without exposing impossible states;
- HP method and rolled controls meet 44px, ability mode uses a fieldset/legend, canonical feature
  keys are stable, dynamic changes announce politely, and long native selects do not overflow;
- repeatable Attack, Feature, Equipment, and Other rows;
- provenance labels, override persistence, reset-to-calculated, and review output;
- first-invalid focus follows rendered document order;
- duplicate-save lock and safe retry;
- ordinary save reaches the complete Character Reference;
- invite save joins exactly once, join Retry never creates again, and stale invite results are
  ignored;
- V1, V2, Mara, owner, and GM-read-only reference rendering;
- T-026 Level up remains available and correct for eligible V2 characters.

### Browser and accessibility

- exact 320px, 390px, 720px, and desktop inner widths;
- no horizontal overflow, clipped helper text, or unusable repeatable rows;
- 44px controls, visible focus, semantic fieldsets/lists, labelled dropdowns, associated errors,
  and non-color provenance;
- screen-reader announcements for dynamic subclass availability and validation summaries;
- guest preview, authenticated ordinary save, and invite-launched save/join smoke tests.
- repeat the final browser pass from a fresh server after edits stop; include Cleric level 3 feature
  rendering and long closed-select values at 320px.

### Exact spell-progression regression names

TypeScript adds the following focused cases, with equivalent fixtures shared by the Go tests:

- `projectsWizardInitialSpellbookAndReplacementLimits`;
- `reconstructsWizardInitialSixSpellbookChoices`;
- `requiresTwoWizardAdditionsForEveryLaterLevel`;
- `requiresWizardPreparedSpellsToBeSpellbookSubset`;
- `reconstructsKnownSpellLearningAtEverySupportedLevel`;
- `validatesKnownSpellReplacementHistory`;
- `validatesPreparedCountExcludingAlwaysPreparedSpells`;
- `validatesPactMagicSpellAndSlotProgression`;
- `validatesHalfCasterSpellStartAndAvailability`;
- `rejectsSpellDecisionsForNonSpellcasters`;
- `boundsManualImportedSpellSelections`;
- `rejectsTamperedFinalSpellState`;
- `matchesGoSpellReconstructionFixtures`;
- `acceptsMinimumSpellDecisionsForEveryClassAndLevelOneThroughFive`.

Go adds the corresponding exported tests:

- `TestProjectWizardInitialSpellbookAndReplacementLimits`;
- `TestReconstructWizardInitialSixSpellbookChoices`;
- `TestRequireTwoWizardAdditionsForEveryLaterLevel`;
- `TestRequireWizardPreparedSpellsToBeSpellbookSubset`;
- `TestReconstructKnownSpellLearningAtEverySupportedLevel`;
- `TestValidateKnownSpellReplacementHistory`;
- `TestValidatePreparedCountExcludingAlwaysPreparedSpells`;
- `TestValidatePactMagicSpellAndSlotProgression`;
- `TestValidateHalfCasterSpellStartAndAvailability`;
- `TestRejectSpellDecisionsForNonSpellcasters`;
- `TestBoundManualImportedSpellSelections`;
- `TestRejectTamperedFinalSpellState`;
- `TestMatchTypeScriptSpellReconstructionFixtures`;
- `TestAcceptMinimumSpellDecisionsForEveryClassAndLevelOneThroughFive`.

Replacement fixtures cover the allowed zero-or-one choice and reject excessive count, wrong level,
missing prior removal, duplicate removal/addition IDs, same-spell replacement, wrong Class,
unavailable spell level, and duplicate final membership. Prepared fixtures cover formula boundaries,
automatic subclass grants, and exclusion of always-prepared spells from the normal count.

## Validation commands

```text
node scripts/generate-level-up-rules.mjs --check
node scripts/generate-character-creation-rules.mjs --check

cd backend
go test -p 1 ./internal/rules ./internal/characters ./internal/server
TEST_DATABASE_URL='<disposable PostgreSQL 17 URL>' go test -p 1 ./internal/characters ./internal/server
go test -p 1 ./...
go vet ./...
go build ./...

pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend audit --audit-level high
pnpm --dir frontend typecheck
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend build

git diff --check
git status --short --branch
```

Disposable PostgreSQL must use tmpfs and loopback-only exposure and be removed afterward.

## Integration order

1. Confirm implementation base contains T-026 and T-028 merge
   `e0ac1e450849e5c751ba71b396e8c11b4545d0b0`. Do not claim T-028 production smoke until its
   rollout report is confirmed.
2. Merge and deploy T-025 only after all five slices pass review.
3. Run public creation, Character Reference, Level up, and invite smoke tests.
4. Rebase T-023 onto final main, replace its T-025 evidence placeholders, and merge T-023 last.
