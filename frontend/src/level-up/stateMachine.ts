import type { SavedCharacterDTO } from '../characters/apiTypes';
import type {
  CharacterSheetFeature,
  CharacterSheetV1,
} from '../characters/characterSheet';
import { isCharacterSheetV1 } from '../characters/characterSheetValidation';
import { isCharacterSheetV2 } from '../characters/characterSheetV2Validation';
import type { CharacterSheetV2, CharacterV2DTO } from '../characters/characterSheetV2';
import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { levelUpRules } from '../rules/generated/levelUpRules';
import { characterSheetV2ToLevelUpAdapter } from './characterSheetV2Adapter';

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
  | { eligible: true; sheet: CharacterSheetV1; classRule: CanonicalClassRule; schemaVersion: 'CharacterSheetV1' | 'CharacterSheetV2' }
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
  boundedRule?: string | null;
  requiredSubclassIndex?: string;
  options: readonly CanonicalChoiceOption[];
};

export type LevelUpChoiceSelections = Readonly<Record<string, {
  optionIds: readonly string[];
  manualNote: string;
}>>;

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
  schemaVersion: 'CharacterSheetV1' | 'CharacterSheetV2';
  sourceSheetV2?: CharacterSheetV2;
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

const srdSkillChoiceOptions: readonly CanonicalChoiceOption[] = [
  'acrobatics', 'animal-handling', 'arcana', 'athletics', 'deception', 'history', 'insight',
  'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance',
  'persuasion', 'religion', 'sleight-of-hand', 'stealth', 'survival',
].map((skill) => ({
  index: `skill-${skill}`,
  name: `Skill: ${skill.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')}`,
}));

const canonicalClasses = levelUpRules.classes.map((classRule) => {
  const choices = [...classRule.choices] as CanonicalChoiceRule[];
  for (const creationChoice of characterCreationRules.classChoices) {
    const boundedRule = 'boundedRule' in creationChoice ? creationChoice.boundedRule : null;
    const optionSource = 'optionSource' in creationChoice ? creationChoice.optionSource : null;
    if (creationChoice.classIndex !== classRule.index ||
        boundedRule === 'ability-score-improvement-or-srd-feat' ||
        choices.some((choice) => choice.id === creationChoice.id)) {
      continue;
    }
    const options = boundedRule === 'any-srd-skill-proficiency'
      ? srdSkillChoiceOptions
      : creationChoice.options;
    choices.push({
      id: creationChoice.id,
      fromLevel: creationChoice.fromLevel,
      allowManual: creationChoice.allowManual,
      selectionCountByLevel: creationChoice.selectionCountByLevel,
      optionSource,
      boundedRule,
      ...('requiredSubclassIndex' in creationChoice
        ? { requiredSubclassIndex: creationChoice.requiredSubclassIndex }
        : {}),
      options,
    });
  }
  return { ...classRule, choices } as unknown as CanonicalClassRule;
});

export const getLevelUpEligibility = (character: SavedCharacterDTO): LevelUpEligibility => {
  if ('ownerSubjectId' in character && character.ownerSubjectId === null) {
    return { eligible: false, reason: 'not-owner' };
  }
  const rawSheet = character.referencePayload;
  let sheet: CharacterSheetV1;
  let schemaVersion: 'CharacterSheetV1' | 'CharacterSheetV2';
  if (isCharacterSheetV1(rawSheet)) {
    sheet = rawSheet;
    schemaVersion = 'CharacterSheetV1';
  } else if (isCharacterSheetV2(rawSheet) && 'schemaVersion' in character && character.schemaVersion === 'CharacterSheetV2') {
    sheet = characterSheetV2ToLevelUpAdapter(rawSheet, character as CharacterV2DTO);
    schemaVersion = 'CharacterSheetV2';
  } else {
    return { eligible: false, reason: 'malformed-sheet' };
  }
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
  return { eligible: true, sheet, classRule, schemaVersion };
};

export const levelUpStepsFor = (character: SavedCharacterDTO): LevelUpStep[] => {
  const eligibility = getLevelUpEligibility(character);
  if (!eligibility.eligible) {
    return [];
  }
  return buildLevelUpPlan(character, eligibility.sheet).steps;
};

export const buildLevelUpPlan = (
  character: SavedCharacterDTO,
  sheet: CharacterSheetV1,
): LevelUpPlan => {
  const fromLevel = sheet.identity.classes[0].level;
  const toLevel = fromLevel + 1;
  const classRule = canonicalClasses.find((candidate) =>
    candidate.name.toLowerCase() === sheet.identity.classes[0].name.trim().toLowerCase(),
  );
  if (!classRule || character.level !== fromLevel || character.className.trim().toLowerCase() !== classRule.name.toLowerCase()) {
    throw new Error('Character is not eligible for level up.');
  }
  const currentRule = classRule.levels.find((level) => level.level === fromLevel);
  const targetRule = classRule.levels.find((level) => level.level === toLevel);
  if (!currentRule || !targetRule) {
    throw new Error('Canonical level transition is unavailable.');
  }
  const missingPrerequisites = auditMissingPrerequisites(
    classRule,
    sheet,
    fromLevel,
  );
  const blocked = missingPrerequisites.find((item) => !item.representable);
  const steps: LevelUpStep[] = ['decision-prerequisites', 'decision-hp'];
  const hasSubclass = Boolean(sheet.identity.classes[0].subclass || character.subclassName);
  if (toLevel >= classRule.subclassDecisionLevel && !hasSubclass &&
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
  if (classRule.choices.some((choice) =>
    choice.fromLevel <= toLevel &&
    choiceAppliesToSubclass(choice, classRule, sheet, toLevel) &&
    !missingPrerequisiteIds.has(choice.id) &&
    !choiceAlreadyPresent(sheet.features, choice, toLevel),
  )) {
    steps.push('decision-class-specific');
  }
  steps.push('decision-confirm-retained', 'review');

  return {
    schemaVersion: 'schemaVersion' in character && character.schemaVersion === 'CharacterSheetV2'
      ? 'CharacterSheetV2'
      : 'CharacterSheetV1',
    ...('schemaVersion' in character && character.schemaVersion === 'CharacterSheetV2' && isCharacterSheetV2(character.referencePayload)
      ? { sourceSheetV2: character.referencePayload }
      : {}),
    classRule,
    fromLevel,
    toLevel,
    currentRule,
    targetRule,
    fixedAverageHp: classRule.fixedAverageHp,
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
    if (choice.fromLevel > currentLevel || !choiceAppliesToSubclass(choice, classRule, sheet, currentLevel) || choiceAlreadyPresent(sheet.features, choice, currentLevel)) {
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

const choiceAppliesToSubclass = (
  choice: CanonicalChoiceRule,
  classRule: CanonicalClassRule,
  sheet: CharacterSheetV1,
  level: number,
) => {
  if (!choice.requiredSubclassIndex) return true;
  const selected = sheet.identity.classes[0].subclass?.trim().toLowerCase();
  const required = classRule.subclasses.find((subclass) => subclass.index === choice.requiredSubclassIndex);
  if (selected) return selected === required?.name.toLowerCase();
  return level >= classRule.subclassDecisionLevel && classRule.subclasses.length === 1 && required !== undefined;
};

export const optionsForChoice = (
  choice: CanonicalChoiceRule,
  sheet: CharacterSheetV1,
  targetLevel: number,
  activeFeatureIndexes?: readonly string[],
): CanonicalChoiceOption[] => {
  const representedSkillIds = new Set(
    sheet.proficiencies.skills
      .filter((skill) => skill.proficient)
      .map((skill) => `skill-${slugify(skill.name)}`),
  );
  const hasThievesTools = sheet.proficiencies.tools.values.some(
    (tool) => tool.trim().toLowerCase() === "thieves' tools",
  );
  const activeFeatures = new Set(activeFeatureIndexes ?? sheet.features.map((feature) => feature.id));
  return choice.options.filter((option) => {
    if ((option.minimumLevel ?? 1) > targetLevel) {
      return false;
    }
    if (!(option.requiredFeatureIndexes ?? []).every((index) => activeFeatures.has(index))) {
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

export const activeFeatureIndexesForLevelUpChoices = (
  classRule: CanonicalClassRule,
  sheet: CharacterSheetV1,
  selections: LevelUpChoiceSelections,
) => {
  const overriddenOptionIDs = new Set(classRule.choices
    .filter((choice) => Object.hasOwn(selections, choice.id))
    .flatMap((choice) => choice.options.map((option) => option.index)));
  return [
    ...sheet.features.map((feature) => feature.id).filter((id) => !overriddenOptionIDs.has(id)),
    ...Object.values(selections).flatMap((selection) => selection.optionIds),
  ];
};

export const reconcileLevelUpChoiceSelections = (
  classRule: CanonicalClassRule,
  sheet: CharacterSheetV1,
  targetLevel: number,
  selections: LevelUpChoiceSelections,
): Record<string, { optionIds: string[]; manualNote: string }> => {
  let current: Record<string, { optionIds: string[]; manualNote: string }> = Object.fromEntries(Object.entries(selections).map(([id, selection]) => [id, {
    optionIds: [...selection.optionIds],
    manualNote: selection.manualNote,
  }]));
  let changed = true;
  while (changed) {
    changed = false;
    const activeFeatures = activeFeatureIndexesForLevelUpChoices(classRule, sheet, current);
    const next: Record<string, { optionIds: string[]; manualNote: string }> = { ...current };
    for (const choice of classRule.choices) {
      const selection = current[choice.id];
      if (!selection) continue;
      const allowed = new Set(optionsForChoice(choice, sheet, targetLevel, activeFeatures).map((option) => option.index));
      const optionIds = selection.optionIds.filter((id) => allowed.has(id));
      if (optionIds.length !== selection.optionIds.length) changed = true;
      next[choice.id] = { optionIds, manualNote: selection.manualNote };
    }
    current = next;
  }
  return current;
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
