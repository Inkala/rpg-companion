# T-025 Tasks: Structured Character Creation and Derived Values

Status: approved

## Approval and implementation gate

- [x] Marcela approves the levels 1 through 5 V2 creation boundary.
- [x] Marcela approves importing the complete SRD 5.1 equipment catalog into the existing canonical
  snapshot.
- [x] Marcela approves current HP defaulting to resolved maximum HP for new characters.
- [x] T-026 rules foundation is deployed.
- [x] T-028 is integrated on `origin/main` at
  `e0ac1e450849e5c751ba71b396e8c11b4545d0b0`.
- [x] Record T-028 production smoke only after its rollout report is confirmed.
- [x] Create one dedicated T-025 worktree from a main revision containing T-026 and T-028.

## Slice 1: canonical SRD extension

- [x] Extend the existing canonical JSON with Race, the complete SRD equipment catalog,
  armor/shield rules, supported modifier data, and complete spell-detail data.
- [x] Preserve stable equipment identifiers, categories, weight, cost, weapon properties, damage,
  armor data, and other reusable source fields where available.
- [x] Prove manual equipment cannot silently affect calculated statistics.
- [x] Extend the existing JSON Schema and checksum.
- [x] Preserve source URLs, import date, transformation record, snapshot identity, and CC-BY-4.0
  attribution.
- [x] Generate frontend and Go creation projections from the same canonical JSON.
- [x] Add schema, parity, checksum, freshness, deterministic-order, and record-count tests.
- [x] Update `docs/rules-data.md`.
- [x] Stop for review before commit or Slice 2.

## Slice 2: CharacterSheetV2 contracts and calculations

- [x] Add exact V2 creation, saved, domain, structured-section, and provenance types.
- [x] Replace class-only choices with unified bounded Race/class `ruleChoices`.
- [x] Add calculated-base and imported-final ability-score input modes.
- [x] Add exact conditional defense unions and persisted AC source inputs.
- [x] Add explicit attack ability/proficiency inputs and bounded manual attack overrides.
- [x] Add fully populated persisted canonical/manual spell and feature contracts.
- [x] Add bounded manual Race, manual Class, and combined fallback contracts.
- [x] Add the exact lossless canonical/manual persisted-feature union.
- [x] Add exact subclass timing and level-N HP progression contracts.
- [x] Add strict frontend and Go V2 parsing and validation.
- [x] Implement generated-rule calculations and override preservation.
- [x] Test calculated base scores plus fixed Race bonuses.
- [x] Test Half-Elf selects two distinct available +1 bonuses and rejects duplicates.
- [x] Test canonical subrace bonuses are applied exactly once.
- [x] Test imported final scores are unchanged and survive Race changes.
- [x] Test Reset to calculated requires usable base scores and valid Race choices.
- [x] Test invalid, duplicate, unavailable, wrong-owner, wrong-count, and failed-prerequisite rule
  choices.
- [x] Test manual Race receives no invented automation.
- [x] Test frontend and Go ability-score calculation parity.
- [x] Test armor, shield, unarmored-formula, manual-defense, equipped-item, and inert-manual-equipment
  validation.
- [x] Test Strength, Dexterity, spellcasting, proficiency, manual override, and no-name-inference
  attack-bonus behavior.
- [x] Test complete canonical/manual spell fields, explicit state, higher-level/material text, and
  prepared-ID references.
- [x] Test canonical Race/Class/Subclass feature ownership, level availability, resolved display
  fields, and provenance.
- [x] Test subclass null-before, required-at/after, cross-Class rejection, and Ranger Hunter.
- [x] Test exact level-2-through-N HP gains and reject missing, duplicate, level-1, or future gains.
- [x] Test TypeScript/Go exact nested-union key parity, including empty and zero-valued extra fields.
- [x] Test complete persisted-sheet revalidation of every authoritative derived value and retained
  source input.
- [x] Test manual Race with canonical Class builds with imported scores and Speed override, preserves
  Class automation, and rejects Race automation.
- [x] Test manual Class derives universal proficiency, requires maximum-HP override, supports valid
  defense, rejects Class/Subclass automation, and requires null spellcasting.
- [x] Test combined manual Race/Class builds only with imported scores, Speed override, and
  maximum-HP override.
- [x] Test missing manual-identity imports or overrides fail safely without persistence.
- [x] Test manual feature ID, category, description, and provenance round-trip exactly in TypeScript
  and Go, including exact-key and persisted-sheet parity.
- [x] Add V1/V2 discriminated parsing and Mara compatibility tests.
- [x] Stop for review before commit or Slice 3.

## Slice 3: backend persistence and privacy

- [x] Extend authenticated `POST /characters` for the versioned V2 request without trusting a full
  client-built payload.
- [x] Build and validate V2 server-side from canonical choices and bounded manual inputs.
- [x] Persist top-level fields and V2 JSONB atomically with current HP equal to maximum HP.
- [x] Extend owner and Party-GM read validation to V1/V2.
- [x] Add exact-key privacy, authorization, rollback, and PostgreSQL round-trip tests.
- [x] Confirm no SQL migration is required or stop for renewed approval.
- [x] Stop for review before commit or Slice 4.

## Slice 4: structured creation UI

- [ ] Add Class, Race, conditional Subclass, and required Gender dropdowns.
- [ ] Replace visible Ancestry with Race.
- [ ] Remove Concept, Notes, and Current HP from creation.
- [ ] Add calculated values, visible provenance, overrides, and Reset to calculated.
- [ ] Add structured Attacks, Spells, spell slots, Features and traits, Equipment, and Other.
- [ ] Populate SRD spell metadata from the local generated rules.
- [ ] Convert guided Fighter presets and manual entry to V2.
- [ ] Add a complete review step.
- [ ] Stop for review before commit or Slice 5.

## Slice 5: reference and integration completion

- [ ] Render V2 in owner and GM-read-only Character Reference.
- [ ] Preserve V1 and Mara rendering.
- [ ] Adapt T-026 Level up to preserve valid V2 data and provenance.
- [ ] Regression-test ordinary save navigation instead of reimplementing it.
- [ ] Regression-test T-028 invite-launched automatic join, retry-only join, stale-result handling,
  and token privacy.
- [ ] Run focused and complete frontend/backend validation.
- [ ] Run disposable PostgreSQL validation.
- [ ] Run accessibility and browser QA at 320px, 390px, 720px, and desktop.
- [ ] Run CI, deployment, and public smoke validation.
- [ ] Stop for final review before PR, merge, or deployment.

## Coordination

- [ ] Do not edit T-023 evaluator documentation during T-025 implementation.
- [ ] After T-025 deployment, provide final SHA, CI, deployment, screenshots, test count, and smoke
  evidence to T-023.
- [ ] T-023 rebases and merges last.
