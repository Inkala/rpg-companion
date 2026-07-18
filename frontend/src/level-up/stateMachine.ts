import type { CharacterDTO } from '../characters/apiTypes';
import type {
  CharacterSheetFeature,
  CharacterSheetV1,
} from '../characters/characterSheet';
import { isCharacterSheetV1 } from '../characters/characterSheetValidation';
import { levelUpRules } from '../rules/generated/levelUpRules';

export type LevelUpStep =
  | 'decision-prerequisites'
  | 'decision-hp'
  | 'decision-subclass'
  | 'decision-asi'
  | 'decision-spells'
  | 'decision-class-specific'
  | 'decision-confirm-retained'
  | 'review';

export type LevelUpEligibilityReason =
  | 'not-owner'
  | 'malformed-sheet'
  | 'multiclass'
  | 'unsupported-class'
  | 'level-cap'
  | 'level-mismatch'
  | 'ruleset-mismatch';

export type LevelUpEligibility =
  | { eligible: true; sheet: CharacterSheetV1; classRule: CanonicalClassRule }
  | { eligible: false; reason: LevelUpEligibilityReason };

export type CanonicalChoiceOption = {
  index: string;
  name: string;
  minimumLevel?: number;
  requiredFeatureIndexes?: readonly string[];
};

export type CanonicalChoiceRule = {
  id: string;
  fromLevel: number;
  allowManual: boolean;
  selectionCountByLevel: Readonly<Record<string, number>>;
  optionSource: string | null;
  options: readonly CanonicalChoiceOption[];
};

export type CanonicalSpellcastingRule = {
  mode: 'known' | 'prepared' | 'pact-known' | 'spellbook-prepared';
  ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
  cantripsKnown?: number | null;
  spellsKnown?: number | null;
  preparedFormula?: string | null;
  replacementLimit: number;
  wizardSpellbookAdditions?: number;
  slots?: readonly number[];
  pactSlots?: number;
  pactSlotLevel?: number;
  availableSpellLevels: readonly number[];
};

export type CanonicalClassLevel = {
  level: number;
  proficiencyBonus: number;
  abilityScoreImprovement: boolean;
  features: readonly { index: string; name: string; summary: string }[];
  spellcasting: CanonicalSpellcastingRule | null;
};

export type CanonicalClassRule = {
  index: string;
  name: string;
  hitDie: number;
  fixedAverageHp: number;
  spellcastingAbility: string | null;
  subclassDecisionLevel: number;
  subclasses: readonly {
    index: string;
    name: string;
    flavor: string;
    featuresByLevel: readonly {
      level: number;
      features: readonly { index: string; name: string; summary: string }[];
    }[];
  }[];
  choices: readonly CanonicalChoiceRule[];
  levels: readonly CanonicalClassLevel[];
};

export type MissingPrerequisite =
  | {
      kind: 'subclass';
      id: string;
      label: string;
      representable: true;
    }
  | {
      kind: 'class-choice';
      id: string;
      label: string;
      rule: CanonicalChoiceRule;
      representable: boolean;
      reason?: string;
    }
  | {
      kind: 'spellbook';
      id: string;
      label: string;
      representable: false;
      reason: string;
    };

export type LevelUpPlan = {
  classRule: CanonicalClassRule;
  fromLevel: number;
  toLevel: number;
  currentRule: CanonicalClassLevel;
  targetRule: CanonicalClassLevel;
  fixedAverageHp: number;
  steps: LevelUpStep[];
  missingPrerequisites: MissingPrerequisite[];
  blockedReason: string | null;
};

const canonicalClasses = levelUpRules.classes as unknown as readonly CanonicalClassRule[];

export const getLevelUpEligibility = (character: CharacterDTO): LevelUpEligibility => {
  if (character.ownerSubjectId === null) {
    return { eligible: false, reason: 'not-owner' };
  }
  if (!isCharacterSheetV1(character.referencePayload)) {
    return { eligible: false, reason: 'malformed-sheet' };
  }
  const sheet = character.referencePayload;
  if (sheet.identity.classes.length !== 1) {
    return { eligible: false, reason: 'multiclass' };
  }
  const classEntry = sheet.identity.classes[0];
  const classRule = canonicalClasses.find(
    (candidate) => candidate.name.toLowerCase() === classEntry.name.trim().toLowerCase(),
  );
  if (!classRule) {
    return { eligible: false, reason: 'unsupported-class' };
  }
  if (classEntry.level >= 5) {
    return { eligible: false, reason: 'level-cap' };
  }
  if (classEntry.level < 1 || character.level !== classEntry.level ||
      character.className.trim().toLowerCase() !== classRule.name.toLowerCase()) {
    return { eligible: false, reason: 'level-mismatch' };
  }
  if (sheet.ruleset.system !== 'dnd5e' || sheet.ruleset.version !== '2014') {
    return { eligible: false, reason: 'ruleset-mismatch' };
  }
  return { eligible: true, sheet, classRule };
};

export const levelUpStepsFor = (character: CharacterDTO): LevelUpStep[] => {
  const eligibility = getLevelUpEligibility(character);
  if (!eligibility.eligible) {
    return [];
  }
  return buildLevelUpPlan(character, eligibility.sheet).steps;
};

export const buildLevelUpPlan = (
  character: CharacterDTO,
  sheet: CharacterSheetV1,
): LevelUpPlan => {
  const eligibility = getLevelUpEligibility({ ...character, referencePayload: sheet });
  if (!eligibility.eligible) {
    throw new Error(`Character is not eligible for level up: ${eligibility.reason}`);
  }
  const fromLevel = sheet.identity.classes[0].level;
  const toLevel = fromLevel + 1;
  const currentRule = eligibility.classRule.levels.find((level) => level.level === fromLevel);
  const targetRule = eligibility.classRule.levels.find((level) => level.level === toLevel);
  if (!currentRule || !targetRule) {
    throw new Error('Canonical level transition is unavailable.');
  }
  const missingPrerequisites = auditMissingPrerequisites(
    eligibility.classRule,
    sheet,
    fromLevel,
  );
  const blocked = missingPrerequisites.find((item) => !item.representable);
  const steps: LevelUpStep[] = ['decision-prerequisites', 'decision-hp'];
  const hasSubclass = Boolean(sheet.identity.classes[0].subclass || character.subclassName);
  if (toLevel >= eligibility.classRule.subclassDecisionLevel && !hasSubclass &&
      !missingPrerequisites.some((item) => item.kind === 'subclass')) {
    steps.push('decision-subclass');
  }
  if (targetRule.abilityScoreImprovement) {
    steps.push('decision-asi');
  }
  if (targetRule.spellcasting !== null) {
    steps.push('decision-spells');
  }
  const missingPrerequisiteIds = new Set(
    missingPrerequisites
      .filter((item) => item.kind === 'class-choice')
      .map((item) => item.id),
  );
  if (eligibility.classRule.choices.some((choice) =>
    choice.fromLevel <= toLevel &&
    !missingPrerequisiteIds.has(choice.id) &&
    !choiceAlreadyPresent(sheet.features, choice, toLevel),
  )) {
    steps.push('decision-class-specific');
  }
  steps.push('decision-confirm-retained', 'review');

  return {
    classRule: eligibility.classRule,
    fromLevel,
    toLevel,
    currentRule,
    targetRule,
    fixedAverageHp: eligibility.classRule.fixedAverageHp,
    steps,
    missingPrerequisites,
    blockedReason: blocked && 'reason' in blocked
      ? blocked.reason ?? 'An earlier required choice cannot be represented safely.'
      : null,
  };
};

export const auditMissingPrerequisites = (
  classRule: CanonicalClassRule,
  sheet: CharacterSheetV1,
  currentLevel: number,
): MissingPrerequisite[] => {
  const missing: MissingPrerequisite[] = [];
  if (currentLevel >= classRule.subclassDecisionLevel && !sheet.identity.classes[0].subclass) {
    missing.push({
      kind: 'subclass',
      id: `${classRule.index}-subclass`,
      label: classRule.subclasses[0]?.flavor ?? 'Subclass',
      representable: true,
    });
  }
  for (const choice of classRule.choices) {
    if (choice.fromLevel > currentLevel || choiceAlreadyPresent(sheet.features, choice, currentLevel)) {
      continue;
    }
    const availableOptions = optionsForChoice(choice, sheet, currentLevel);
    const required = choice.selectionCountByLevel[String(currentLevel)] ?? 0;
    const representable = availableOptions.length >= required || choice.allowManual;
    missing.push({
      kind: 'class-choice',
      id: choice.id,
      label: humanizeRuleId(choice.id),
      rule: choice,
      representable,
      ...(representable ? {} : {
        reason: `${humanizeRuleId(choice.id)} cannot be reconstructed safely from this character sheet.`,
      }),
    });
  }
  if (classRule.index === 'wizard' && currentLevel >= 1) {
    const expectedSpellbookSize = 6 + (currentLevel - 1) * 2;
    const representedLeveledSpells = sheet.spellcasting?.spells.filter((spell) => spell.level > 0).length ?? 0;
    if (representedLeveledSpells < expectedSpellbookSize) {
      missing.push({
        kind: 'spellbook',
        id: 'wizard-spellbook-history',
        label: 'Earlier Wizard spellbook choices',
        representable: false,
        reason: 'Earlier Wizard spellbook choices are missing and cannot be reconstructed safely.',
      });
    }
  }
  return missing;
};

export const optionsForChoice = (
  choice: CanonicalChoiceRule,
  sheet: CharacterSheetV1,
  targetLevel: number,
): CanonicalChoiceOption[] => {
  const representedSkillIds = new Set(
    sheet.proficiencies.skills
      .filter((skill) => skill.proficient)
      .map((skill) => `skill-${slugify(skill.name)}`),
  );
  const hasThievesTools = sheet.proficiencies.tools.values.some(
    (tool) => tool.trim().toLowerCase() === "thieves' tools",
  );
  return choice.options.filter((option) => {
    if ((option.minimumLevel ?? 1) > targetLevel) {
      return false;
    }
    if (choice.optionSource === 'represented-proficient-skills') {
      return representedSkillIds.has(option.index);
    }
    if (choice.optionSource === 'represented-proficient-skills-or-thieves-tools') {
      return representedSkillIds.has(option.index) ||
        (option.index === 'thieves-tools' && hasThievesTools);
    }
    return true;
  });
};

export const choiceAlreadyPresent = (
  features: readonly CharacterSheetFeature[],
  choice: CanonicalChoiceRule,
  level: number,
) => {
  if (features.some((feature) => feature.id === choice.id)) {
    return true;
  }
  const optionIds = new Set(choice.options.map((option) => option.index));
  const matched = features.filter((feature) =>
    optionIds.has(feature.id) || choice.options.some((option) =>
      featureMatchesCanonicalChoiceOption(feature, option),
    ),
  ).length;
  return matched >= (choice.selectionCountByLevel[String(level)] ?? 0);
};

const featureMatchesCanonicalChoiceOption = (
  feature: CharacterSheetFeature,
  option: CanonicalChoiceOption,
) => {
  const separator = option.name.indexOf(':');
  if (separator < 0) return false;
  const category = option.name.slice(0, separator).trim();
  const name = option.name.slice(separator + 1).trim();
  return feature.source.rulesVersion === '2014' &&
    feature.source.status === 'confirmed' &&
    feature.category.trim().toLowerCase() === category.toLowerCase() &&
    feature.name.trim().toLowerCase() === name.toLowerCase();
};

export const abilityModifier = (score: number) => Math.floor((score - 10) / 2);

export const preparedSpellCount = (
  formula: string | null | undefined,
  abilityScore: number,
  classLevel: number,
) => {
  const modifier = abilityModifier(abilityScore);
  if (formula === 'max(1,abilityModifier+floor(classLevel/2))') {
    return Math.max(1, modifier + Math.floor(classLevel / 2));
  }
  return Math.max(1, modifier + classLevel);
};

export const humanizeRuleId = (id: string) => id
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
