import type { CharacterV2DTO } from './characterSheetV2';

export type AbilityScoresDTO = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

export type HitPointsDTO = {
  current: number;
  max: number;
};

export type CharacterDTO = {
  id: string;
  ownerSubjectId: string | null;
  name: string;
  className: string;
  subclassName: string | null;
  level: number;
  ancestry: string;
  background: string;
  abilityScores: AbilityScoresDTO;
  hitPoints: HitPointsDTO;
  armorClass: number;
  speedFt: number;
  referencePayload: unknown;
  createdAt: string;
  updatedAt: string;
};

export type SavedCharacterDTO = CharacterDTO | CharacterV2DTO;

export type CreateCharacterRequestDTO = {
  name: string;
  className: string;
  subclassName: string | null;
  level: number;
  ancestry: string;
  background: string;
  abilityScores: AbilityScoresDTO;
  hitPoints: HitPointsDTO;
  armorClass: number;
  speedFt: number;
  referencePayload: unknown;
};

export type CharacterSummaryDTO = {
  id: string;
  name: string;
  className: string;
  subclassName: string | null;
  level: number;
  ancestry: string;
  background: string;
  hitPoints: HitPointsDTO;
  armorClass: number;
  speedFt: number;
  portraitAssetId?: string | null;
  portraitAlt?: string | null;
  featuredAbilities?: string[];
  landingConcept?: string;
  updatedAt: string;
};

export type CharacterListResponse = {
  characters: CharacterSummaryDTO[];
};

export type AbilityName = keyof AbilityScoresDTO;

export type LevelUpClassChoiceInput = {
  ruleId: string;
  optionIds: string[];
  manualNote?: string;
};

export type LevelUpSpellChoiceInput = {
  source: 'srd';
  index: string;
};

export type LevelUpCharacterRequestDTO = {
  expectedUpdatedAt: string;
  hp: { mode: 'fixed-average' } | { mode: 'rolled'; roll: number };
  currentHp:
    | { mode: 'increase-by-gain' | 'retain' }
    | { mode: 'manual'; value: number };
  prerequisiteChoices: LevelUpClassChoiceInput[];
  subclass?:
    | { source: 'srd'; index: string }
    | { source: 'manual'; name: string };
  abilityScoreImprovement?:
    | { mode: 'ability-scores'; increases: Partial<Record<AbilityName, 1 | 2>> }
    | { mode: 'feat-note'; note: string };
  spells?: {
    additions: LevelUpSpellChoiceInput[];
    replacements: Array<{
      removeSpellId: string;
      add: LevelUpSpellChoiceInput;
    }>;
    preparedSpellIds: string[];
    wizardSpellbookAdditions: LevelUpSpellChoiceInput[];
  };
  classChoices: LevelUpClassChoiceInput[];
  overrides?: {
    proficiencyBonus?: number;
    initiative?: number;
    passivePerception?: number;
    spellSaveDC?: number;
    spellAttackBonus?: number;
  };
  decisionSummary: string[];
};
