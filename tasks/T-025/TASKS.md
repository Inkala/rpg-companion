# T-025 Tasks: Structured Character Creation and Derived Values

Status: approved

Spell-progression correction status: approved. Do not resume or commit Slice 4 until its Slice 2/3
contract impact is reconciled.

## Approval and implementation gate

- [x] Marcela approves the levels 1 through 5 V2 creation boundary.
- [x] Marcela approves importing the complete SRD 5.1 equipment catalog into the existing canonical
  snapshot.
- [x] Marcela approves current HP defaulting to resolved maximum HP for new characters.
- [x] T-026 rules foundation is deployed.
- [x] T-028 is integrated on `origin/main` at
  `e0ac1e450849e5c751ba71b396e8c11b4545d0b0`.
- [ ] Record T-028 production smoke only after its rollout report is confirmed.
- [ ] Create one dedicated T-025 worktree from a main revision containing T-026 and T-028.

## Slice 1: canonical SRD extension

- [ ] Extend the existing canonical JSON with Race, the complete SRD equipment catalog,
  armor/shield rules, supported modifier data, and complete spell-detail data.
- [ ] Preserve stable equipment identifiers, categories, weight, cost, weapon properties, damage,
  armor data, and other reusable source fields where available.
- [ ] Prove manual equipment cannot silently affect calculated statistics.
- [ ] Extend the existing JSON Schema and checksum.
- [ ] Preserve source URLs, import date, transformation record, snapshot identity, and CC-BY-4.0
  attribution.
- [ ] Generate frontend and Go creation projections from the same canonical JSON.
- [ ] Add schema, parity, checksum, freshness, deterministic-order, and record-count tests.
- [ ] Update `docs/rules-data.md`.
- [ ] Stop for review before commit or Slice 2.

## Slice 2: CharacterSheetV2 contracts and calculations

### Blocking spell-progression amendment

- [x] Obtain approval for the mode-specific spell-progression correction.
- [ ] Add canonical `initialSpellbookSpells`, with Wizard level 1 equal to six and every other level
  equal to zero.
- [ ] Correct initial-acquisition replacement limits and validate canonical spell-mode invariants.
- [ ] Replace final spell-list input with exact `none`, `known`, `prepared`, `pact-known`, and
  `spellbook-prepared` unions.
- [ ] Add exact cantrip selections, per-level learned spells, per-level replacements, Wizard initial
  spellbook, Wizard additions, and final prepared decisions.
- [ ] Persist the validated decision history and reconstruct final spell display entries on the
  server.
- [ ] Keep slot projection and slot overrides independent from spell selection.
- [ ] Reject client-supplied or tampered final canonical spell state.
- [ ] Test Wizard initial six-spell selection and exactly two additions at each later level.
- [ ] Test Wizard prepared subset and prepared formula.
- [ ] Test known spells selected at every supported level and exact learned deltas.
- [ ] Test replacement count, level, prior removal, addition, membership, availability, and
  duplication in TypeScript and Go.
- [ ] Test prepared counts and always-prepared exclusions.
- [ ] Test Pact Magic known spells, replacements, slot count, and slot level.
- [ ] Test Paladin and Ranger half-caster start levels, availability, and mode behavior.
- [ ] Test non-spellcaster rejection while retaining separately derived Race grants.
- [ ] Test manual/imported spell fields, reasons, normal count participation, and inability to alter
  slots or claim always-prepared status.
- [ ] Test frontend/Go canonical data, reconstruction, and final-state parity.
- [ ] Test authoritative reconstruction and tampered final-state rejection.
- [ ] Test the valid minimum spell decisions for every Class at every level from 1 through 5.

- [ ] Add exact V2 creation, saved, domain, structured-section, and provenance types.
- [ ] Replace class-only choices with unified bounded Race/class `ruleChoices`.
- [ ] Add calculated-base and imported-final ability-score input modes.
- [ ] Add exact conditional defense unions and persisted AC source inputs.
- [ ] Add explicit attack ability/proficiency inputs and bounded manual attack overrides.
- [ ] Add fully populated persisted canonical/manual spell and feature contracts.
- [ ] Add bounded manual Race, manual Class, and combined fallback contracts.
- [ ] Add the exact lossless canonical/manual persisted-feature union.
- [ ] Add exact subclass timing and level-N HP progression contracts.
- [ ] Add strict frontend and Go V2 parsing and validation.
- [ ] Implement generated-rule calculations and override preservation.
- [ ] Test calculated base scores plus fixed Race bonuses.
- [ ] Test Half-Elf selects two distinct available +1 bonuses and rejects duplicates.
- [ ] Test canonical subrace bonuses are applied exactly once.
- [ ] Test imported final scores are unchanged and survive Race changes.
- [ ] Test Reset to calculated requires usable base scores and valid Race choices.
- [ ] Test invalid, duplicate, unavailable, wrong-owner, wrong-count, and failed-prerequisite rule
  choices.
- [ ] Test manual Race receives no invented automation.
- [ ] Test frontend and Go ability-score calculation parity.
- [ ] Test armor, shield, unarmored-formula, manual-defense, equipped-item, and inert-manual-equipment
  validation.
- [ ] Test Strength, Dexterity, spellcasting, proficiency, manual override, and no-name-inference
  attack-bonus behavior.
- [ ] Test complete canonical/manual spell fields, explicit state, higher-level/material text, and
  prepared-ID references.
- [ ] Test canonical Race/Class/Subclass feature ownership, level availability, resolved display
  fields, and provenance.
- [ ] Test subclass null-before, required-at/after, cross-Class rejection, and Ranger Hunter.
- [ ] Test exact level-2-through-N HP gains and reject missing, duplicate, level-1, or future gains.
- [ ] Test TypeScript/Go exact nested-union key parity, including empty and zero-valued extra fields.
- [ ] Test complete persisted-sheet revalidation of every authoritative derived value and retained
  source input.
- [ ] Test manual Race with canonical Class builds with imported scores and Speed override, preserves
  Class automation, and rejects Race automation.
- [ ] Test manual Class derives universal proficiency, requires maximum-HP override, supports valid
  defense, rejects Class/Subclass automation, and requires the exact `none` spellcasting variant.
- [ ] Test combined manual Race/Class builds only with imported scores, Speed override, and
  maximum-HP override.
- [ ] Test missing manual-identity imports or overrides fail safely without persistence.
- [ ] Test manual feature ID, category, description, and provenance round-trip exactly in TypeScript
  and Go, including exact-key and persisted-sheet parity.
- [ ] Add V1/V2 discriminated parsing and Mara compatibility tests.
- [ ] Stop for review before commit or Slice 3.

## Slice 3: backend persistence and privacy

- [ ] Extend authenticated `POST /characters` for the versioned V2 request without trusting a full
  client-built payload.
- [ ] Build and validate V2 server-side from canonical choices and bounded manual inputs.
- [ ] Persist top-level fields and V2 JSONB atomically with current HP equal to maximum HP.
- [ ] Extend owner and Party-GM read validation to V1/V2.
- [ ] Add exact-key privacy, authorization, rollback, and PostgreSQL round-trip tests.
- [ ] Confirm no SQL migration is required or stop for renewed approval.
- [ ] Stop for review before commit or Slice 4.

## Slice 4: structured creation UI

- [ ] Add Class, Race, conditional Subclass, and required Gender dropdowns.
- [ ] Replace visible Ancestry with Race.
- [ ] Remove Concept, Notes, and Current HP from creation.
- [ ] Add calculated values, visible provenance, overrides, and Reset to calculated.
- [ ] Add structured Attacks, Spells, spell slots, Features and traits, Equipment, and Other.
- [ ] Populate SRD spell metadata from the local generated rules.
- [ ] Convert guided Fighter presets and manual entry to V2.
- [ ] Add a complete review step.
- [ ] Replace the universal spell-state dropdown with the approved mode-specific decision UI.
- [ ] Make HP method and rolled-HP controls at least 44px.
- [ ] Use stable canonical feature IDs as React keys and prove Cleric level 3 has no duplicate key.
- [ ] Group Calculated versus Imported ability mode in a semantic fieldset with a legend.
- [ ] Implement persistent desktop creation-step navigation without obstructing zoom or mobile.
- [ ] Add restrained accessible live announcements for spell, equipment, override, and relevant
  Other changes.
- [ ] Prevent long closed-select values from causing horizontal overflow at 320px while retaining
  accessible native controls.
- [ ] Repeat browser validation from a fresh server after implementation edits stop.
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
