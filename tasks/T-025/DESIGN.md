# T-025 Design: Structured Character Creation and Derived Values

Status: approved

## Parallel-work assessment

- Classification: Red.
- Recommendation: one dedicated worktree after T-028, with sequential review stops.
- Reason: T-025 changes the canonical rules source, generated frontend and Go rules, the saved sheet
  version, character creation, backend validation, Character Reference, and T-026 V2
  compatibility. Parallel product changes in those areas would create semantic conflicts.
- Expected owned files or folders: `rules-data/`, the SRD generators and generated rules,
  `frontend/src/character-creation/`, relevant `frontend/src/characters/` and
  `frontend/src/level-up/` files, `backend/internal/characters/`, rules tests, and focused App tests.
- Shared files or dependencies: T-026 canonical rules and Level up, T-028 invite continuation,
  Character Reference rendering, Party GM read-only access, and T-023 final evidence.

## Certain current-data findings

### T-026 data that can be reused unchanged

The deployed canonical snapshot supplies:

- all 12 SRD classes;
- levels 1 through 5, hit die, fixed-average HP, proficiency, ASI flags, class features, and bounded
  class choices;
- one SRD subclass per class and each subclass decision level, including Ranger Hunter;
- full-caster, half-caster, Pact Magic, known/prepared/replacement, and Wizard spellbook progression;
- 169 SRD cantrips and spells through spell level 3;
- spell name, level, school, casting time, range, component codes, duration, concentration, ritual,
  class membership, subclass membership, and normalized summary;
- deterministic schema, checksum, TypeScript generation, Go generation, and attribution checks.

### Data T-025 must add to the same source

The snapshot does not currently contain races, the equipment catalog, structured armor formulas,
or machine-readable non-spell modifiers. T-025 therefore extends the same JSON and schema with:

- race and supported subrace records;
- the complete SRD 5.1 equipment catalog, including weapons, armor, shields, adventuring gear,
  tools, packs, mounts and vehicles, and other source categories;
- stable equipment source identifiers, category metadata, weight, cost, weapon properties, damage,
  armor data, and other reusable fields where available;
- machine-readable derived-stat effects for supported class, subclass, and race features;
- complete normalized spell description/effect and material-component text where present;
- stable calculation rule IDs.

It must not create a second JSON authority.

## Schema decision

CharacterSheetV2 is required for newly created characters.

CharacterSheetV1 is insufficient because it has no Gender, uses `ancestry`, stores Initiative and
proficiency as unaudited numbers, cannot express consistent calculated/manual/imported provenance,
does not store spell school/range/components/full effect, has no equipped armor or shield contract,
and has no dedicated structured Other section.

V2 keeps enough familiar section names for the shared Character Reference mapper, but is a distinct
validated schema. Existing V1 payloads are never rewritten merely by reading them.

## Canonical generation design

1. Extend `rules-data/srd-5.1-2014-levels-1-5.json` and its JSON Schema.
2. Preserve one snapshot ID, checksum, source list, import date, and transformation record for the
   complete canonical file.
3. Keep `scripts/generate-level-up-rules.mjs` validating T-026 invariants.
4. Add a deterministic character-creation generator that reads the same JSON and emits only the
   race, equipment, spell-detail, and derived-rule projections needed by each runtime.
5. Add parity tests proving the TypeScript and Go projections share snapshot ID, checksum, indexes,
   calculation rule IDs, and expected record counts.
6. Update `docs/rules-data.md` and README attribution only in the authorized integration task. T-023
   owns the evaluator-facing README and still merges last.

## Shared primitives

```ts
type RuleSelection =
  | { source: 'srd'; index: string }
  | { source: 'manual'; name: string };

type ValueProvenance =
  | { kind: 'calculated'; ruleId: string }
  | { kind: 'manual-override'; reason: string }
  | { kind: 'imported'; note?: string };

type ResolvedValue<T> = {
  value: T;
  provenance: ValueProvenance;
};

type RuleChoiceInput = {
  ruleId: string;
  optionIds: string[];
  manualNote?: string;
};

type AbilityScoreInput =
  | {
      mode: 'calculated';
      base: AbilityScoresDTO;
    }
  | {
      mode: 'imported';
      values: AbilityScoresDTO;
      reason: string;
    };

type DefenseInput =
  | {
      mode: 'armor';
      armorIndex: string;
      shieldIndex?: string;
    }
  | {
      mode: 'unarmored';
      formulaId: string;
      shieldIndex?: string;
    }
  | {
      mode: 'manual';
      armorClass: number;
      reason: string;
    };

type AttackBonusInput =
  | {
      mode: 'calculated';
      ability: 'strength' | 'dexterity' | 'spellcasting';
      proficient: boolean;
    }
  | {
      mode: 'manual-override';
      value: number;
      reason: string;
    };
```

Manual reasons and notes are length-bounded, plain text, and never interpreted as rules.

## Exact creation DTO

`POST /characters` continues to be the authenticated persistence route. The handler accepts the
legacy V1 request for compatibility and the following versioned V2 request. New T-025 frontend
saves send only V2.

```ts
type CreateCharacterV2RequestDTO = {
  schemaVersion: 'CharacterSheetV2';
  creationSource: 'guided' | 'manual-transfer';
  identity: {
    name: string;
    gender: 'Male' | 'Female' | 'Other';
    race: RuleSelection;
    background: string;
    class: RuleSelection;
    level: number;
    subclass: RuleSelection | null;
  };
  abilityScores: AbilityScoreInput;
  proficiencies: {
    perception: 'none' | 'proficient' | 'expertise';
    skills: Array<{ name: string; rank: 'proficient' | 'expertise' }>;
  };
  hitPointProgression: {
    levelGains: Array<
      | { level: number; mode: 'fixed-average' }
      | { level: number; mode: 'rolled'; roll: number }
    >;
    maximumOverride?: { value: number; reason: string };
  };
  combat: {
    defense: DefenseInput;
    initiativeOverride?: { value: number; reason: string };
    passivePerceptionOverride?: { value: number; reason: string };
    speedOverride?: { value: number; reason: string };
  };
  ruleChoices: RuleChoiceInput[];
  attacks: CharacterAttackInput[];
  spellcasting: CharacterSpellcastingInput | null;
  features: CharacterFeatureInput[];
  equipment: CharacterEquipmentInput[];
  other: Array<{ id: string; title: string; description: string }>;
};
```

The request contains source inputs and explicit decisions. It does not contain owner identity,
current HP, a complete resulting CharacterSheetV2, or authoritative calculated values.

`ruleChoices` carries both Race and class decisions. The backend validates each rule ID against its
canonical owner, selected Race/Class and level, prerequisites, selection count, distinct options,
allowed option IDs, and manual-fallback policy. A choice belonging to another Race or class is
invalid even when its option ID exists elsewhere.

For `abilityScores.mode === 'calculated'`, the server resolves final scores from `base` plus fixed
Race/subrace bonuses and validated selectable Race bonuses. For `imported`, `values` are already
final: the server records imported provenance and does not apply Race bonuses again. Imported
values survive Race and rule-choice changes until the player explicitly selects Reset to
calculated. Reset requires retained usable base scores and a currently valid canonical Race choice
set. Manual or unsupported Races never receive invented bonuses.

### Structured request items

```ts
type CharacterAttackInput = {
  id: string;
  name: string;
  attackBonus: AttackBonusInput;
  damage: Array<{ dice: string; bonus: number; type: string }>;
};

type CharacterSpellInput =
  | {
      id: string;
      source: 'srd';
      index: string;
      state: 'known' | 'prepared' | 'spellbook' | 'always-prepared';
    }
  | {
      id: string;
      source: 'manual';
      name: string;
      level: number;
      school: string;
      castingTime: string;
      range: string;
      components: string[];
      materialComponent?: string;
      duration: string;
      concentration: boolean;
      ritual: boolean;
      description: string;
      higherLevelText?: string;
      state: 'known' | 'prepared' | 'spellbook' | 'always-prepared';
    };

type CharacterSpellcastingInput = {
  spells: CharacterSpellInput[];
  preparedSpellIds: string[];
  slotOverride?: Array<{ level: number; max: number; reason: string }>;
};

type CharacterFeatureInput =
  | { source: 'srd'; index: string }
  | { source: 'manual'; id: string; name: string; category: string; description: string };

type CharacterEquipmentInput =
  | { source: 'srd'; index: string; quantity: number; equipped: boolean }
  | {
      source: 'manual';
      id: string;
      name: string;
      category: string;
      quantity: number;
      equipped: boolean;
    };

type CharacterSheetV2Attack = {
  id: string;
  name: string;
  attackBonus: ResolvedValue<number>;
  attackBonusInput:
    | { ability: 'strength' | 'dexterity' | 'spellcasting'; proficient: boolean }
    | null;
  damage: Array<{ dice: string; bonus: number; type: string }>;
};

type CharacterSheetV2Spell = {
  id: string;
  canonicalIndex: string | null;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string[];
  materialComponent: string | null;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  higherLevelText: string | null;
  state: 'known' | 'prepared' | 'spellbook' | 'always-prepared';
  provenance: ValueProvenance;
};

type CharacterSheetV2Feature = {
  canonicalIndex: string | null;
  name: string;
  category: 'race' | 'class' | 'subclass' | 'manual';
  description: string;
  provenance: ValueProvenance;
};
```

Canonical spell inputs are resolved into every `CharacterSheetV2Spell` field from generated rules.
Manual spell inputs provide the same visible fields and persist imported provenance. Prepared spell
IDs must reference IDs in the persisted spell collection.

Canonical feature indexes are valid only when their generated owner and availability match the
selected Race, Class, Subclass, and level. The persisted feature retains both its canonical index
and resolved display data. A valid index from another owner or unavailable level is rejected.

## Exact saved DTO

The server derives and validates the sheet, stores top-level searchable values plus the V2 JSONB
payload in one create operation, and returns:

```ts
type CharacterV2DTO = {
  id: string;
  schemaVersion: 'CharacterSheetV2';
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  className: string;
  subclassName: string | null;
  level: number;
  race: string;
  background: string;
  abilityScores: AbilityScoresDTO;
  hitPoints: { current: number; max: number };
  armorClass: number;
  speedFt: number;
  referencePayload: CharacterSheetV2;
  createdAt: string;
  updatedAt: string;
};
```

The exact V2 response omits owner ID, email, account data, Party data, and invite data. Internally,
the existing `ancestry` database column stores the resolved Race display name until a separately
approved query need justifies a migration.

The owner list response uses one version-neutral summary shape for V1 and V2 records:

```ts
type CharacterSummaryDTO = {
  id: string;
  name: string;
  className: string;
  subclassName: string | null;
  level: number;
  race: string;
  background: string;
  hitPoints: { current: number; max: number };
  armorClass: number;
  speedFt: number;
  portraitAssetId?: string | null;
  portraitAlt?: string | null;
  featuredAbilities: string[];
  landingConcept: string;
  updatedAt: string;
};
```

For a V1 record, the backend maps its persisted `ancestry` value to `race`. The old storage and V1
payload names remain compatibility details and are not shown to players.

## CharacterSheetV2 shape

V2 contains:

- versioned rules and snapshot identity;
- structured identity with Gender, Race selection, single Class selection, and conditional
  Subclass selection;
- ability scores plus calculated modifiers;
- resolved combat values using `ResolvedValue<T>`, plus the validated `DefenseInput` needed to
  reproduce Armor Class;
- proficiencies, including the information required for Passive Perception;
- structured attacks;
- spellcasting values, slots by spell level, and fully populated spells;
- canonical and manual features;
- structured equipment;
- dedicated Other entries;
- summary/reference configuration required by Home and Character Reference.

Concept and free-form Notes are absent from creation. `landingConcept` remains a server-derived
summary presentation field so existing character cards retain useful copy without accepting a
Concept input.

## Calculation engine

The frontend shows immediate suggestions from generated TypeScript rules. The backend repeats every
authoritative calculation from generated Go rules and rejects mismatches or invalid choices.

- Final ability scores: base values plus canonical fixed and selected Race/subrace bonuses in
  calculated mode, or unchanged final values in imported mode.
- Ability modifier: `floor((score - 10) / 2)`.
- Proficiency: canonical class-level record for the single total level.
- Initiative: Dexterity modifier plus machine-readable supported modifiers.
- Passive Perception: 10 + Wisdom modifier + zero, one, or two times proficiency + supported
  modifiers.
- Speed: canonical Race speed plus supported feature modifiers whose conditions are satisfied.
- Maximum HP: level-1 hit-die maximum + Constitution modifier, plus each later approved gain and
  Constitution modifier, minimum 1 per level.
- AC: selected armor base formula, Dexterity cap, equipped shield, and supported feature modifiers,
  or a documented unarmored formula. The player selects the active formula if several are legal.
- Attack bonus: the selected Strength, Dexterity, or supported spellcasting modifier, plus
  proficiency only when requested, unless a bounded manual override is supplied.
- Spell save DC: 8 + proficiency + spellcasting ability modifier.
- Spell attack bonus: proficiency + spellcasting ability modifier.

An override remains active when inputs change. The UI shows the new suggestion beside it and offers
an explicit Reset to calculated action.

## Backend design

- Decode V1 or V2 by the versioned request shape.
- Obtain owner ID only from the authenticated session.
- Validate every Race and class rule choice against generated Go rules, including rule owner,
  availability, prerequisites, selection count, distinctness, options, and manual policy.
- Enforce canonical subclass timing: `null` before the decision level and exactly one compatible
  SRD or bounded manual selection at or after it.
- Resolve calculated final ability scores on the server. Preserve imported final scores without
  applying Race bonuses again.
- Require exactly one HP gain for every level from 2 through the selected level.
- Validate each defense union variant and require canonical armor/shield selections to match
  equipped canonical equipment. Manual equipment remains inert.
- Calculate attack bonuses only from the explicit ability/proficiency input, never from attack
  names.
- Resolve canonical spells and features into complete persisted display data while validating
  membership, ownership, and level availability.
- Build CharacterSheetV2 server-side. Never trust a client-supplied full payload.
- Reject unknown or cross-variant keys at every nested union boundary, including empty and
  zero-valued fields. TypeScript and Go validators must enforce equivalent exact-key rules.
- Validate the complete V2 envelope and top-level parity before `Repository.Create`. Recalculate
  every authoritative derived value from retained inputs, verify prepared spell IDs reference
  stored spells, and verify attack provenance and canonical feature ownership.
- Persist top-level fields and JSONB in the existing insert. No partial write is possible.
- Preserve generic database errors and existing authorization behavior.
- Extend owner and Party-GM read validation to a strict V1/V2 union.
- Add exact-key V2 response tests and repository JSONB round-trip tests.
- Do not add a migration unless implementation proves the current columns or JSONB limit cannot
  safely represent V2. Stop for renewed approval before adding one.

## Frontend state model

1. Choose guided or manual entry.
2. Collect Basics: name, Gender, Race, Class, level, conditional Subclass, background.
3. Collect calculated base scores or imported final scores, Race/class rule choices, and
   proficiency decisions.
4. Show calculated combat suggestions and override controls.
5. Collect Attacks, Spells, Features and traits, Equipment, and Other.
6. Review all selections, calculations, provenance, and manual fallbacks.
7. Save once through the existing synchronous lock.
8. On ordinary success, preserve navigation to the saved Character Reference.
9. On invite success, preserve the T-021/T-028 automatic Party join state machine.

First-invalid focus, error announcements, dynamic-field focus behavior, and mobile layout follow the
existing creation accessibility contract.

## Compatibility design

- The parser returns a discriminated V1/V2 domain union based on `referencePayload.schemaVersion`.
- V1 mapping and Mara fixtures remain unchanged except for user-facing `Race` labels.
- V2 mapping populates the same Character Reference shell with Attacks, Spells, Features and traits,
  Equipment, and Other sections.
- Party GM read-only retrieval validates and renders both versions.
- Character summaries continue extracting stable summary keys from either payload.
- T-026 Level up receives a V2 adapter that applies its bounded decisions without deleting V2-only
  data or provenance. T-025 cannot ship with Level up visible but unusable for newly created V2
  characters.

## Responsive design

- Desktop: persistent step navigation and two-column form groups where labels and help remain clear.
- 720px: one or two columns according to content width, never compressed tables.
- 390px and 320px: one column, full-width form controls, wrapped provenance text, and 44px actions.
- Repeating sections use semantic fieldsets and lists, not table layouts.
- Review content wraps without horizontal scrolling.

## Migration decision

No SQL migration is planned. V2 uses the existing top-level character columns and JSONB payload.
Race maps internally to the existing `ancestry` column. Gender and structured content remain in
the versioned payload because no approved list, filter, or query requirement needs separate columns.

## Estimate

- Canonical rules extension and generated parity: 2 to 3 focused days.
- V2 contracts, calculations, validation, and compatibility mappers: 2 to 4 days.
- Backend V2 creation, privacy, and PostgreSQL coverage: 2 to 3 days.
- Frontend structured creation and review: 4 to 6 days.
- Character Reference, T-026 V2 compatibility, responsive browser QA, CI, deployment, and public
  smoke: 3 to 5 days.

Realistic total: 13 to 21 focused implementation days, excluding review pauses. The prior 4 to 7
day estimate is no longer credible for the confirmed scope.

## Approved bounded decisions

- New CharacterSheetV2 creation supports levels 1 through 5 only. Class, subclass, and spell
  selections must be legal at the selected level. Existing V1 characters outside this range remain
  readable.
- The existing canonical rules source gains the complete SRD 5.1 equipment catalog. Manual `Other`
  entries remain available, but only equipment with supported machine-readable rules may affect a
  derived value.
- Current HP is absent from creation input. The server persists current HP equal to the resolved
  maximum HP after calculation or an explicit maximum-HP override.
- Subclass availability and requirement depend on class and level. Hunter is the SRD Ranger
  subclass. No subclass is required before its class receives one, and unsupported content uses the
  bounded manual fallback.
- Ordinary save and invite-launched creation behavior are regression gates. They are not new
  navigation or Party implementations in T-025.
