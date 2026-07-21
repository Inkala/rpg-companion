# T-025 Requirements: Structured Character Creation and Derived Values

Status: approved

## Goal

Replace the free-text CharacterSheetV1 creation contract with structured, rules-assisted character
creation. Reuse the deployed T-026 SRD 5.1/2014 rules foundation, preserve existing CharacterSheetV1
records, and keep ordinary-save and Party-invite outcomes unchanged.

## Implementation gate and task order

- T-028 must be integrated before T-025 implementation starts. This prerequisite is satisfied on
  `origin/main` by merge commit `e0ac1e450849e5c751ba71b396e8c11b4545d0b0`.
- T-025 must branch from a main revision containing the deployed T-026 and T-028 work.
- T-023 may draft in parallel, but it must rebase after T-025, replace final evidence placeholders,
  and merge last.
- T-028 merge is confirmed. This checkpoint does not claim T-028 production smoke evidence before
  its rollout report is confirmed.
- T-025 is approved for implementation through its five sequential review slices.

## Creation scope

- Show Class as a dropdown containing the 12 SRD 5.1 classes plus `Other`.
- Show Race as a dropdown containing the normalized SRD 5.1 races plus `Other`.
- Replace visible `Ancestry` terminology with `Race` throughout creation and new CharacterSheetV2
  presentation.
- Show Subclass only when the selected class reaches its subclass decision level.
- Hunter is the SRD Ranger subclass/archetype.
- Offer only SRD 5.1/2014 subclasses as automated choices. `Other` reveals a bounded manual name
  input.
- For a canonical Class, Subclass must be `null` before the canonical subclass decision level.
- At or after that level, exactly one compatible SRD subclass or bounded manual `Other` selection is
  required. A subclass owned by another Class is invalid.
- Gender is required and uses the exact closed values `Male`, `Female`, and `Other`.
- Remove Concept, Notes, and Current HP from character creation.
- New characters start with current HP equal to calculated or overridden maximum HP.
- New CharacterSheetV2 creation supports levels 1 through 5 only, matching the canonical T-026
  progression data. Level selection must respect the supported class, subclass, and spell rules.
  Existing CharacterSheetV1 characters above or outside this range remain readable. T-025 does not
  add structured creation above level 5.
- Preserve both entry modes. Guided Fighter presets and manual entry must produce the same saved
  CharacterSheetV2 contract.

## Rules authority

- Extend, do not replace or duplicate, the T-026 canonical file
  `rules-data/srd-5.1-2014-levels-1-5.json`.
- Keep the committed schema, snapshot identifier, checksum, deterministic generation checks,
  TypeScript output, Go output, source URLs, import date, transformation record, and CC-BY-4.0
  attribution.
- Production must not call a live rules API.
- Automated content is limited to legally reusable SRD 5.1/2014 material.
- Non-SRD and unsupported choices use explicit manual or `Other` inputs and never masquerade as
  canonical SRD data.

## Additional canonical data required

The deployed T-026 snapshot already supplies all 12 classes, class levels 1 through 5, hit dice,
fixed-average HP, proficiency bonuses, subclass decision levels and SRD subclasses, class features,
class choices, spell progression, class spell membership, and 169 cantrips/spells through spell
level 3.

T-025 must extend that same source with:

- SRD race indexes, names, base walking speed, ability bonuses, languages, traits, and any supported
  subrace relationship needed for deterministic values;
- the complete SRD 5.1 equipment catalog used by creation, including weapons, armor, shields,
  adventuring gear, tools, packs, mounts and vehicles, and every other equipment category present
  in the source;
- stable equipment source identifiers, category metadata, weight, cost, weapon properties, damage,
  armor data, and other reusable SRD fields where available;
- armor category, base AC, Dexterity contribution and cap, Strength requirement, shield bonus, and
  equipped-state metadata;
- machine-readable supported class-feature modifiers for AC, Speed, Initiative, and skill-based
  derived values;
- full normalized SRD spell description/effect text and any material-component text needed by the
  structured spell display;
- stable rule identifiers for every calculation and generated provenance record.

## Dropdown and manual fallback behavior

- A canonical selection stores `{ source: "srd", index }` and resolves its display data from the
  committed snapshot.
- `Other` stores `{ source: "manual", name }` and requires a non-empty bounded name.
- A manual class or race never receives automation that depends on unknown rules. Affected values
  require an imported or manual-override value with an explanation.
- Subclass options are filtered by class and level. Changing either input clears an incompatible
  unconfirmed subclass, but must not silently discard a confirmed manual choice.
- Spell options are filtered by canonical class membership, subclass membership, character level,
  and available spell levels. Manual spells remain available for non-SRD content.
- Equipment options use the complete local SRD catalog plus `Other` for non-SRD,
  campaign-specific, or unsupported equipment.
- Only structured equipment with supported machine-readable rules may affect calculated attacks,
  AC, Speed, or another derived value. Manual equipment never changes a calculated statistic
  silently.
- Every dropdown has a visible label, keyboard operation, a description/help affordance, and a
  programmatically associated error.

## Manual Race and Class fallback

### Manual Race with canonical Class

- Ability-score input must use imported final values with a bounded reason.
- Speed must use a manual override with a bounded reason.
- The server applies no canonical Race or subrace bonuses, traits, choices, features, or other Race
  automation.
- Canonical Class calculations and canonical Class spellcasting may still run when their other
  required inputs are valid.
- Race features must be manual entries with imported provenance.

### Manual Class

- Proficiency bonus still derives from total level using the universal 2014 level progression.
- Maximum HP requires a bounded manual override and reason because the class Hit Die is unknown.
- The server applies no canonical Class, Subclass, feature, choice, or spell-progression automation.
- Canonical armor defense, the universal standard-unarmored formula, or manual defense remains
  available when its normal inputs are valid. Class-owned unarmored formulas are unavailable.
- Class and Subclass features must be manual entries with imported provenance.
- Canonical Class choices and canonical Class/Subclass features are invalid.
- Subclass is either `null` or a bounded manual name and receives no automation.
- In the current bounded V2 contract, `spellcasting` must be `null` for a manual Class. Automated
  spellcasting remains unavailable unless a separately approved imported spellcasting contract is
  added later.

### Manual Race and manual Class

- Both sets of requirements apply together: imported final ability scores, manual Speed with a
  reason, manual maximum HP with a reason, and no invented Race or Class rules.
- Missing required imported values or overrides fail validation without persistence.

## Rule choices and ability-score input

- CharacterSheetV2 creation uses one bounded `ruleChoices` collection for both Race and class
  decisions. Each entry contains a canonical `ruleId`, distinct selected `optionIds`, and an
  optional bounded `manualNote` only when that rule permits a manual fallback.
- The backend validates every rule ID, its Race or class owner, availability at the selected level,
  prerequisites, selection count, distinctness, allowed options, and manual-fallback policy.
- Ability-score input is explicitly one of:
  - `calculated`: base scores to which the server applies canonical fixed Race/subrace bonuses and
    validated selectable Race bonuses;
  - `imported`: final transferred values plus a bounded reason. Canonical Race bonuses are not
    applied again.
- Imported scores receive imported provenance and remain unchanged when Race or another source
  input changes. They change only when the player edits the imported values or explicitly selects
  Reset to calculated.
- Reset to calculated requires usable base scores and valid canonical Race choices.
- Manual or unsupported Races receive no invented ability bonuses. They require imported values or
  an explicitly supported manual rule path.
- Ability modifiers always derive from the resolved final scores.
- The frontend may display base score, Race contribution, and final score during review, but the
  backend remains authoritative for the result.

## Derived values and provenance

Automatically calculate every value supported deterministically by the structured inputs:

- final ability scores from base scores plus validated canonical Race choices when the input mode
  is `calculated`;
- proficiency bonus from total level;
- ability modifiers using `floor((score - 10) / 2)`;
- Initiative from Dexterity plus supported modifiers;
- Passive Perception from Wisdom, Perception proficiency or expertise, and supported modifiers;
- walking Speed from Race plus supported modifiers;
- maximum HP from class hit die, Constitution modifier, level, and the approved fixed, rolled, or
  manual HP choices;
- AC from equipped armor, shield, Dexterity limits, supported class features, and an explicit
  defense-mode choice when more than one valid formula exists;
- spell save DC and spell attack bonus from the canonical spellcasting ability and proficiency;
- spell slots and available spell levels from the T-026 class progression.

Each persisted derived value uses exactly one provenance state:

- `calculated`: produced by a named canonical rule and its current inputs;
- `manual-override`: deliberately entered instead of the suggested calculation, with a bounded
  reason;
- `imported`: transferred from an existing sheet when the source inputs are incomplete or outside
  the SRD contract.

The UI must show the current provenance. A source-input change may update a calculated value, but
must preserve a manual override or imported value until the player explicitly resets it to the
calculated suggestion.

## HP contract

- Level 1 maximum HP is the class hit-die maximum plus Constitution modifier, with a minimum gain of
  1 HP.
- For each level after 1, the player chooses the canonical fixed average or enters a bounded rolled
  result. A manual maximum-HP override is available for imported or exceptional sheets.
- For a level-N character, `levelGains` contains exactly one entry for every level from 2 through N,
  in level order. Missing, duplicate, level-1, or future entries are invalid.
- Constitution applies at every character level.
- Current HP is not entered during creation. The server persists current HP equal to the resolved
  maximum HP.

## Defense calculation inputs

- Armor mode requires one canonical armor index and may include one canonical shield index.
- Each selected armor or shield index must correspond to an equipped canonical equipment entry in
  the same request. Manual equipment is inert and cannot satisfy this requirement.
- Unarmored mode requires one supported canonical formula ID. When several formulas are legal, the
  selected formula is retained. It may include a canonical equipped shield only when that formula
  permits one, and it cannot include equipped armor as the AC source.
- Manual mode requires a bounded AC value and reason. It does not apply canonical armor, shield, or
  unarmored calculations.
- The persisted CharacterSheetV2 retains the validated defense mode, armor index, shield index,
  unarmored formula ID, or manual override needed to reproduce and verify AC later.

## Structured content

### Attacks

Each attack stores:

- name;
- attack bonus with provenance and retained source input;
- one or more damage expressions containing dice, numeric bonus, and damage type.

A calculated attack bonus requires an explicit selected ability (`strength`, `dexterity`, or
`spellcasting`) and whether proficiency applies. The server never infers an ability from the attack
name. `spellcasting` is valid only when the character has a supported spellcasting ability. An
exceptional attack uses a bounded manual override value and reason.

### Spells

- SRD spells are selected from the class and level-filtered local dropdown.
- Selecting an SRD spell fills its name, level, school, casting time, range, components, duration,
  material component when present, concentration/ritual flags, complete normalized
  description/effect, and higher-level text when present.
- Spell slots are stored separately by spell level.
- Known, prepared, spellbook, subclass, and Pact Magic states remain explicit.
- Manual spell entry requires the same visible fields: name, level, school, casting time, range,
  components, optional material component, duration, concentration, ritual, complete description,
  optional higher-level text, and explicit spell state. It uses imported provenance.

### Features and traits

- Canonical Race, Class, and Subclass features use SRD indexes and generated descriptions. The
  backend rejects a globally valid feature owned by another Race, Class, Subclass, or unavailable
  level.
- Persisted canonical features retain index, resolved name, category, complete description, and
  calculated provenance for Character Reference rendering and later validation.
- Manual features store a bounded name, category, and description with imported provenance.
- Persisted manual features retain the original stable entry ID and original user-entered category.
  The server must not invent a replacement ID or replace that category with `manual`.

### Equipment

- Equipment entries store a canonical index or manual name, category, quantity, and equipped state.
- Armor and shield selections provide the structured inputs for AC.

### Other

- `Other` is a dedicated repeatable section with a bounded title and description.
- It is not the removed general Notes field.

## Compatibility

- CharacterSheetV2 is required for new T-025 saves. CharacterSheetV1 cannot represent required
  Gender, Race naming, structured spell details, equipped armor inputs, a dedicated Other section,
  or consistent per-value provenance.
- Existing CharacterSheetV1 records remain readable and render through the existing compatibility
  mapper.
- Mara remains CharacterSheetV1 and must keep dedicated regression coverage.
- No automatic V1-to-V2 rewrite or edit migration is included.
- The existing PostgreSQL `ancestry` column may continue storing the normalized Race display value
  internally. User-facing V2 DTOs and UI use `race`.
- No SQL migration is expected because the versioned full sheet remains in `reference_payload`
  JSONB and the current top-level columns can retain their existing storage role. Implementation
  must stop for renewed approval if investigation proves a migration necessary.
- Party GM read-only Character Reference and owner Character Reference must both accept V1 and V2.
- T-026 level-up must either accept valid V2 sheets through level 5 or suppress Level up for V2 with
  a truthful explanation. The implementation plan requires V2 level-up compatibility before T-025
  can ship.

## Save and invite behavior

- Ordinary save navigation to the complete saved Character Reference is already implemented. It is
  a regression requirement, not a new navigation implementation.
- Invite-launched creation must preserve automatic Party joining with the returned character ID.
- The existing synchronous save lock, fixed `Character saved.` toast, retry-only Party join,
  stale-invite handling, token privacy, and no-duplicate-character guarantees remain unchanged.

## Security and privacy

- Character creation remains authenticated for persistence. Guest preview does not save.
- The backend obtains owner identity from the authenticated session and never accepts it from the
  request.
- The server validates canonical indexes, manual fallback bounds, deterministic calculations,
  overrides, provenance, and the complete server-built CharacterSheetV2 before persistence.
- TypeScript and Go validators enforce exact keys for every nested discriminated-union variant.
  Fields belonging to another variant are rejected even when empty, false, or zero-valued.
- Complete persisted-sheet validation rederives and verifies final abilities and modifiers,
  proficiency, Initiative, Passive Perception, Speed, maximum HP, Armor Class, spell DC, spell
  attack bonus, available spell levels and slots, prepared-spell references, attack-bonus
  provenance, and canonical feature ownership from the retained source inputs.
- Exact-key response tests must prove that owner IDs, emails, Party data, invite credentials, and
  unrelated account data are absent from the new V2 response.
- Generic database errors and existing owner/GM authorization boundaries remain unchanged.

## Accessibility and responsive requirements

- Creation remains desktop-first but fully usable at 320px, 390px, 720px, and desktop widths.
- No horizontal overflow is allowed.
- Labels, helper text, errors, provenance, and required state must not rely on color alone.
- First-invalid focus follows document order after error rendering.
- All controls are keyboard operable, have visible focus, and meet the 44px target requirement.
- Dynamic subclass, override, spell, and equipment controls announce meaningful changes without
  causing disruptive focus movement.

## Out of scope

- Character editing or deletion outside creation and T-026's bounded Level up flow.
- Profile editing or account deletion.
- Party editing, deletion, member removal, or existing-member character replacement.
- Multiclassing, levels above the approved T-026 rules boundary, a feat catalog, homebrew
  automation, and paid-book content.
- Portrait-bank integration.
- A live production dependency on the D&D 5e API.
