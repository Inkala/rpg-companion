import type { AbilityScores } from './characterSheet';

export type AbilityScoresDTO = AbilityScores;
export type AbilityName = keyof AbilityScoresDTO;

export type RuleSelection =
  | { source: 'srd'; index: string }
  | { source: 'manual'; name: string };

export type ValueProvenance =
  | { kind: 'calculated'; ruleId: string }
  | { kind: 'manual-override'; reason: string }
  | { kind: 'imported'; note?: string };

export type ResolvedValue<T> = { value: T; provenance: ValueProvenance };

export type RuleChoiceInput = {
  ruleId: string;
  optionIds: string[];
  manualNote?: string;
};

export type AbilityScoreInput =
  | { mode: 'calculated'; base: AbilityScoresDTO }
  | { mode: 'imported'; values: AbilityScoresDTO; reason: string };

export type CharacterSkillInput = {
  name: string;
  rank: 'proficient' | 'expertise';
};

export type CharacterProficienciesInput = {
  perception: 'none' | 'proficient' | 'expertise';
  skills: CharacterSkillInput[];
};

export type HitPointLevelGain =
  | { level: number; mode: 'fixed-average' }
  | { level: number; mode: 'rolled'; roll: number };

export type HitPointProgressionInput = {
  levelGains: HitPointLevelGain[];
  maximumOverride?: { value: number; reason: string };
};

export type DefenseInput =
  | { mode: 'armor'; armorIndex: string; shieldIndex?: string }
  | { mode: 'unarmored'; formulaId: 'standard-unarmored' | 'barbarian-unarmored-defense' | 'monk-unarmored-defense' | 'draconic-resilience'; shieldIndex?: string }
  | { mode: 'manual'; armorClass: number; reason: string };

export type CharacterCombatInput = {
  defense: DefenseInput;
  initiativeOverride?: { value: number; reason: string };
  passivePerceptionOverride?: { value: number; reason: string };
  speedOverride?: { value: number; reason: string };
};

export type CharacterAttackInput = {
  id: string;
  name: string;
  attackBonus:
    | { mode: 'calculated'; ability: 'strength' | 'dexterity' | 'spellcasting'; proficient: boolean }
    | { mode: 'manual-override'; value: number; reason: string };
  damage: Array<{ dice: string; bonus: number; type: string }>;
};

export type SpellSelectionInput =
  | { id: string; source: 'srd'; index: string }
  | {
    source: 'manual';
    id: string;
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
    importReason: string;
  };

export type CharacterSpellState = 'known' | 'prepared' | 'spellbook' | 'always-prepared';

export type SpellReplacementInput = { removeSpellId: string; add: SpellSelectionInput };
export type KnownSpellLevelInput = {
  level: number;
  learned: SpellSelectionInput[];
  replacements: SpellReplacementInput[];
};
export type CharacterSpellSlotOverride = { level: number; max: number; reason: string };
export type CharacterSpellcastingInput =
  | { mode: 'none' }
  | { mode: 'known'; cantrips: SpellSelectionInput[]; levels: KnownSpellLevelInput[]; slotOverride?: CharacterSpellSlotOverride[] }
  | { mode: 'prepared'; cantrips: SpellSelectionInput[]; prepared: SpellSelectionInput[]; slotOverride?: CharacterSpellSlotOverride[] }
  | { mode: 'pact-known'; cantrips: SpellSelectionInput[]; levels: KnownSpellLevelInput[]; slotOverride?: CharacterSpellSlotOverride[] }
  | {
    mode: 'spellbook-prepared';
    cantrips: SpellSelectionInput[];
    initialSpellbook: SpellSelectionInput[];
    additions: Array<{ level: number; spells: SpellSelectionInput[] }>;
    preparedSpellIds: string[];
    slotOverride?: CharacterSpellSlotOverride[];
  };

export type CharacterFeatureInput =
  | { source: 'srd'; index: string }
  | { source: 'manual'; id: string; name: string; category: string; description: string };

export type CharacterEquipmentInput =
  | { source: 'srd'; index: string; quantity: number; equipped: boolean }
  | { source: 'manual'; id: string; name: string; category: string; quantity: number; equipped: boolean };

export type CreateCharacterV2RequestDTO = {
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
  proficiencies: CharacterProficienciesInput;
  hitPointProgression: HitPointProgressionInput;
  combat: CharacterCombatInput;
  ruleChoices: RuleChoiceInput[];
  attacks: CharacterAttackInput[];
  spellcasting: CharacterSpellcastingInput;
  features: CharacterFeatureInput[];
  equipment: CharacterEquipmentInput[];
  other: Array<{ id: string; title: string; description: string }>;
};

export type ResolvedAbilityScores = {
  scores: { [K in AbilityName]: ResolvedValue<number> };
  modifiers: { [K in AbilityName]: number };
};

export type CharacterSheetV2Spell = {
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
  state: CharacterSpellState;
  provenance: ValueProvenance;
};

export type CharacterSheetV2Feature =
  | {
    id: string;
    source: 'srd';
    canonicalIndex: string;
    ownerKind: 'race' | 'class' | 'subclass';
    name: string;
    category: string;
    description: string;
    provenance: { kind: 'calculated'; ruleId: string };
  }
  | {
    id: string;
    source: 'manual';
    canonicalIndex: null;
    name: string;
    category: string;
    description: string;
    provenance: { kind: 'imported'; note?: string };
  };

export type CharacterSheetV2 = {
  schemaVersion: 'CharacterSheetV2';
  ruleset: {
    system: 'dnd5e';
    version: '2014';
    snapshotId: string;
  };
  creationSource: 'guided' | 'manual-transfer';
  identity: CreateCharacterV2RequestDTO['identity'];
  abilityScores: ResolvedAbilityScores & { input: AbilityScoreInput };
  proficiencies: CharacterProficienciesInput;
  hitPointProgression: HitPointProgressionInput & { maximum: ResolvedValue<number> };
  combat: {
    defense: DefenseInput;
    proficiencyBonus: ResolvedValue<number>;
    initiative: ResolvedValue<number>;
    passivePerception: ResolvedValue<number>;
    speedFt: ResolvedValue<number>;
    armorClass: ResolvedValue<number>;
  };
  ruleChoices: RuleChoiceInput[];
  attacks: Array<Omit<CharacterAttackInput, 'attackBonus'> & {
    attackBonus: ResolvedValue<number>;
    attackBonusInput: { ability: 'strength' | 'dexterity' | 'spellcasting'; proficient: boolean } | null;
  }>;
  spellcasting: CharacterSheetV2Spellcasting;
  features: CharacterSheetV2Feature[];
  equipment: CharacterEquipmentInput[];
  other: Array<{ id: string; title: string; description: string }>;
  summary: CharacterSheetV2Summary;
};

export type CharacterSheetV2Spellcasting = {
  decisionHistory: CharacterSpellcastingInput;
  ability: 'intelligence' | 'wisdom' | 'charisma' | null;
  spellSaveDC: ResolvedValue<number> | null;
  spellAttackBonus: ResolvedValue<number> | null;
  slots: Array<{ level: number; max: number; used: number; provenance: ValueProvenance }>;
  availableSpellLevels: number[];
  spells: CharacterSheetV2Spell[];
  preparedSpellIds: string[];
  alwaysPreparedSpellIds: string[];
};

export type CharacterSheetV2Summary = {
  displayLine: string;
  landingConcept: string;
  featuredAbilities: string[];
  referenceSections: Array<{
    id: 'actions' | 'features' | 'spells' | 'equipment' | 'other';
    label: string;
    defaultOpen: boolean;
  }>;
};

export type CharacterV2DTO = {
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

export type CharacterV2SummaryDTO = {
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
  portraitAssetId?: string;
  portraitAlt?: string;
  featuredAbilities: string[];
  landingConcept: string;
  updatedAt: string;
};

export type CharacterCalculationInput = {
  id: string;
  classIndex: string;
  subclassIndex: string | null;
  level: number;
  race: RuleSelection;
  subraceIndex: string | null;
  abilityScores: AbilityScoreInput;
  ruleChoices: RuleChoiceInput[];
  proficiencies: CharacterProficienciesInput;
  hitPointProgression: HitPointProgressionInput;
  defense: DefenseInput;
  equipment: CharacterEquipmentInput[];
};

export type CharacterCalculationOutput = {
  id: string;
  finalAbilityScores: AbilityScoresDTO;
  abilityModifiers: AbilityScoresDTO;
  proficiencyBonus: number;
  initiative: number;
  passivePerception: number;
  speedFt: number;
  maximumHitPoints: number;
  armorClass: number;
  spellcasting: null | {
    ability: 'intelligence' | 'wisdom' | 'charisma';
    spellSaveDC: number;
    spellAttackBonus: number;
    slots: number[];
    availableSpellLevels: number[];
  };
};
