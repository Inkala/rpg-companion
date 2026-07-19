import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { levelUpRules } from '../rules/generated/levelUpRules';
import type { CharacterSheetV1 } from './characterSheet';
import type {
  AbilityScoreInput,
  CharacterSheetV2,
  CreateCharacterV2RequestDTO,
  RuleChoiceInput,
} from './characterSheetV2';
import { isCharacterSheetV1 } from './characterSheetValidation';
import { buildCharacterSheetV2 } from './characterSheetV2Calculations';

type PlainObject = Record<string, unknown>;

export type RuleChoiceValidationContext = {
  raceIndex: string | null;
  subraceIndex: string | null;
  classIndex: string | null;
  level: number;
  choices: RuleChoiceInput[];
  requireComplete?: boolean;
};

const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;
const skillOptions = [
  'skill-acrobatics', 'skill-animal-handling', 'skill-arcana', 'skill-athletics', 'skill-deception',
  'skill-history', 'skill-insight', 'skill-intimidation', 'skill-investigation', 'skill-medicine',
  'skill-nature', 'skill-perception', 'skill-performance', 'skill-persuasion', 'skill-religion',
  'skill-sleight-of-hand', 'skill-stealth', 'skill-survival',
];
const languageOptions = [
  'abyssal', 'celestial', 'common', 'deep-speech', 'draconic', 'dwarvish', 'elvish', 'giant',
  'gnomish', 'goblin', 'halfling', 'infernal', 'orc', 'primordial', 'sylvan', 'undercommon',
];

export const parseCharacterSheetDocument = (value: unknown): CharacterSheetV1 | CharacterSheetV2 | null => {
  if (!isObject(value) || typeof value.schemaVersion !== 'string') return null;
  if (value.schemaVersion === 'CharacterSheetV1') return isCharacterSheetV1(value) ? value : null;
  if (value.schemaVersion === 'CharacterSheetV2') return isCharacterSheetV2(value) ? value : null;
  return null;
};

export const isCreateCharacterV2Request = (value: unknown): value is CreateCharacterV2RequestDTO => {
  try {
    if (!exact(value, [
      'schemaVersion', 'creationSource', 'identity', 'abilityScores', 'proficiencies',
      'hitPointProgression', 'combat', 'ruleChoices', 'attacks', 'spellcasting', 'features',
      'equipment', 'other',
    ])) return false;
    if (value.schemaVersion !== 'CharacterSheetV2' || !oneOf(value.creationSource, ['guided', 'manual-transfer'])) return false;
    if (!validateIdentity(value.identity) || !validateAbilityScoreInput(value.abilityScores) ||
      !validateProficiencies(value.proficiencies) || !validateHitPointProgression(value.hitPointProgression) ||
      !validateCombatInput(value.combat) || !array(value.ruleChoices, 0, 32, validateRuleChoice) ||
      !unique(value.ruleChoices.map((choice) => (choice as PlainObject).ruleId)) ||
      !array(value.attacks, 0, 32, validateAttack) || !unique(value.attacks.map((attack) => (attack as PlainObject).id)) ||
      !(value.spellcasting === null || validateSpellcastingInput(value.spellcasting)) ||
      !array(value.features, 0, 64, validateFeature) || !unique(value.features.map(inputID)) ||
      !array(value.equipment, 0, 128, validateEquipment) || !unique(value.equipment.map(inputID)) ||
      !array(value.other, 0, 32, validateOther) || !unique(value.other.map((entry) => (entry as PlainObject).id))) return false;

    const identity = value.identity as PlainObject;
    const race = identity.race as PlainObject;
    const selectedClass = identity.class as PlainObject;
    const subclass = identity.subclass as PlainObject | null;
    const raceContext = race.source === 'srd' ? canonicalRaceContext(race.index as string) : null;
    const choiceErrors = validateRuleChoices({
      raceIndex: raceContext?.raceIndex ?? null,
      subraceIndex: raceContext?.subraceIndex ?? null,
      classIndex: selectedClass.source === 'srd' ? selectedClass.index as string : null,
      level: identity.level as number,
      choices: value.ruleChoices as RuleChoiceInput[],
      requireComplete: true,
    });
    if (choiceErrors.length > 0 || (race.source === 'manual' && (value.abilityScores as AbilityScoreInput).mode !== 'imported')) return false;
    if (!canonicalSelectionsResolve(identity) || !spellcastingMatchesIdentity(
      value.spellcasting,
      selectedClass.source === 'srd' ? selectedClass.index as string : null,
      subclass?.source === 'srd' ? subclass.index as string : null,
      identity.level as number,
    ) || !validateRequestSemantics(value as unknown as CreateCharacterV2RequestDTO)) return false;
    return jsonBytes(value) <= 131_072;
  } catch {
    return false;
  }
};

export const isCharacterSheetV2 = (value: unknown): value is CharacterSheetV2 => {
  try {
    if (!exact(value, [
      'schemaVersion', 'ruleset', 'creationSource', 'identity', 'abilityScores', 'proficiencies',
      'hitPointProgression', 'combat', 'ruleChoices', 'attacks', 'spellcasting', 'features',
      'equipment', 'other', 'summary',
    ])) return false;
    if (value.schemaVersion !== 'CharacterSheetV2' || !validateRuleset(value.ruleset) ||
      !oneOf(value.creationSource, ['guided', 'manual-transfer']) || !validateIdentity(value.identity) ||
      !validateResolvedAbilityScores(value.abilityScores) || !validateProficiencies(value.proficiencies) ||
      !validateResolvedHP(value.hitPointProgression) || !validateResolvedCombat(value.combat) ||
      !array(value.ruleChoices, 0, 32, validateRuleChoice) || !unique(value.ruleChoices.map((choice) => (choice as PlainObject).ruleId)) ||
      !array(value.attacks, 0, 32, validateResolvedAttack) || !unique(value.attacks.map((attack) => (attack as PlainObject).id)) ||
      !(value.spellcasting === null || validateResolvedSpellcasting(value.spellcasting)) ||
      !array(value.features, 0, 64, validateResolvedFeature) || !unique(value.features.map(inputID)) ||
      !array(value.equipment, 0, 128, validateEquipment) || !unique(value.equipment.map(inputID)) ||
      !array(value.other, 0, 32, validateOther) || !unique(value.other.map((entry) => (entry as PlainObject).id)) ||
      !validateSummary(value.summary)) return false;
    const identity = value.identity as PlainObject;
    const selectedClass = identity.class as PlainObject;
    const subclass = identity.subclass as PlainObject | null;
    return canonicalSelectionsResolve(identity) && spellcastingMatchesIdentity(
      value.spellcasting,
      selectedClass.source === 'srd' ? selectedClass.index as string : null,
      subclass?.source === 'srd' ? subclass.index as string : null,
      identity.level as number,
    ) && validateResolvedAbilityConsistency(value as unknown as CharacterSheetV2) &&
      validateSavedConsistency(value as unknown as CharacterSheetV2) && jsonBytes(value) <= 262_144;
  } catch {
    return false;
  }
};

export const validateRuleChoices = (context: RuleChoiceValidationContext): string[] => {
  const errors: string[] = [];
  if (!Number.isInteger(context.level) || context.level < 1 || context.level > 5) return ['level is outside supported rules'];
  if (!unique(context.choices.map((choice) => choice.ruleId))) errors.push('rule choice IDs must be unique');
  const race = context.raceIndex ? characterCreationRules.races.find((entry) => entry.index === context.raceIndex) : undefined;
  const subrace = context.subraceIndex
    ? characterCreationRules.subraces.find((entry) => entry.index === context.subraceIndex)
    : undefined;
  const selectedClass = context.classIndex ? levelUpRules.classes.find((entry) => entry.index === context.classIndex) : undefined;
  const traitIndexes = new Set([...(race?.traitIndexes ?? []), ...(subrace?.traitIndexes ?? [])]);
  const activeFeatures = new Set<string>();
  for (const level of selectedClass?.levels ?? []) {
    if (level.level <= context.level) level.features.forEach((feature) => activeFeatures.add(feature.index));
  }
  context.choices.flatMap((choice) => choice.optionIds).forEach((option) => activeFeatures.add(option));

  if (context.requireComplete) {
    for (const raceChoice of characterCreationRules.raceChoices) {
      const owned = raceChoice.sourceOwnerType === 'race'
        ? raceChoice.sourceOwnerIndex === race?.index
        : traitIndexes.has(raceChoice.sourceOwnerIndex);
      if (owned && !context.choices.some((choice) => choice.ruleId === raceChoice.id)) {
        errors.push(`${raceChoice.id} is required for a complete canonical Race`);
      }
    }
    for (const classChoice of selectedClass?.choices ?? []) {
      const count = classChoice.selectionCountByLevel[String(context.level) as keyof typeof classChoice.selectionCountByLevel] ?? 0;
      if (context.level >= classChoice.fromLevel && count > 0 && !context.choices.some((choice) => choice.ruleId === classChoice.id)) {
        errors.push(`${classChoice.id} is required for a complete canonical Class`);
      }
    }
  }

  for (const choice of context.choices) {
    const raceChoice = characterCreationRules.raceChoices.find((entry) => entry.id === choice.ruleId);
    const classChoice = selectedClass?.choices.find((entry) => entry.id === choice.ruleId);
    if (!raceChoice && !classChoice) {
      errors.push(`${choice.ruleId} does not belong to the selected Race or Class`);
      continue;
    }
    if (raceChoice) {
      const ownsChoice = raceChoice.sourceOwnerType === 'race'
        ? raceChoice.sourceOwnerIndex === race?.index
        : traitIndexes.has(raceChoice.sourceOwnerIndex);
      if (!ownsChoice) errors.push(`${choice.ruleId} belongs to another Race`);
      validateSelection(choice, raceChoice.selectionCount, raceChoice.allowedOptionIndexes, raceChoice.boundedRule, false, errors);
      if (raceChoice.exclusivityConstraint === 'distinct-options' && !unique(choice.optionIds)) {
        errors.push(`${choice.ruleId} requires distinct options`);
      }
      if (raceChoice.boundedRule === 'any-srd-language-not-already-known') {
        const known = new Set<string>(race?.languageIndexes ?? []);
        if (choice.optionIds.some((option) => known.has(option))) errors.push(`${choice.ruleId} must add a new language`);
      }
    }
    if (classChoice) {
      const count = classChoice.selectionCountByLevel[String(context.level) as keyof typeof classChoice.selectionCountByLevel] ?? 0;
      if (context.level < classChoice.fromLevel) errors.push(`${choice.ruleId} is unavailable at level ${context.level}`);
      validateSelection(choice, count, classChoice.options.map((option) => option.index), null, classChoice.allowManual, errors);
      for (const optionID of choice.optionIds) {
        const option = classChoice.options.find((candidate) => candidate.index === optionID);
        const prerequisiteOption = option as undefined | { minimumLevel?: number; requiredFeatureIndexes?: readonly string[] };
        if (prerequisiteOption && ((prerequisiteOption.minimumLevel ?? 1) > context.level ||
          (prerequisiteOption.requiredFeatureIndexes ?? []).some((required) => !activeFeatures.has(required)))) {
          errors.push(`${optionID} has an unmet prerequisite`);
        }
      }
    }
  }
  return errors;
};

const validateSelection = (
  choice: RuleChoiceInput,
  count: number,
  allowed: readonly string[],
  boundedRule: string | null,
  allowManual: boolean,
  errors: string[],
) => {
  const manualOnly = allowed.length === 0 && boundedRule === null && allowManual;
  if (manualOnly) {
    if (choice.optionIds.length !== 0 || !text(choice.manualNote, 1000)) {
      errors.push(`${choice.ruleId} requires a bounded manual note`);
    }
    return;
  }
  if (choice.optionIds.length !== count) errors.push(`${choice.ruleId} must select exactly ${count}`);
  if (!unique(choice.optionIds)) errors.push(`${choice.ruleId} contains duplicate options`);
  const bounded = boundedRule === 'any-srd-skill-proficiency' ? skillOptions
    : boundedRule === 'any-srd-language-not-already-known' ? languageOptions : allowed;
  if (choice.optionIds.some((option) => !bounded.includes(option))) errors.push(`${choice.ruleId} contains an unavailable option`);
  if (choice.manualNote !== undefined && (!allowManual || !text(choice.manualNote, 1000))) {
    errors.push(`${choice.ruleId} does not allow that manual choice`);
  }
};

const validateIdentity = (value: unknown): boolean => exact(value, [
  'name', 'gender', 'race', 'background', 'class', 'level', 'subclass',
]) && text(value.name, 200) && oneOf(value.gender, ['Male', 'Female', 'Other']) &&
  validateSelectionUnion(value.race) && text(value.background, 200) && validateSelectionUnion(value.class) &&
  integer(value.level, 1, 5) && (value.subclass === null || validateSelectionUnion(value.subclass));

const validateSelectionUnion = (value: unknown): boolean =>
  (exact(value, ['source', 'index']) && value.source === 'srd' && identifier(value.index)) ||
  (exact(value, ['source', 'name']) && value.source === 'manual' && text(value.name, 200));

const validateAbilityScoreInput = (value: unknown): value is AbilityScoreInput =>
  (exact(value, ['mode', 'base']) && value.mode === 'calculated' && validateAbilityScores(value.base)) ||
  (exact(value, ['mode', 'values', 'reason']) && value.mode === 'imported' && validateAbilityScores(value.values) && text(value.reason, 1000));

const validateAbilityScores = (value: unknown): boolean => exact(value, [...abilities]) &&
  abilities.every((ability) => integer(value[ability], 1, 30));

const validateProficiencies = (value: unknown): boolean => exact(value, ['perception', 'skills']) &&
  oneOf(value.perception, ['none', 'proficient', 'expertise']) && array(value.skills, 0, 32, (skill) =>
    exact(skill, ['name', 'rank']) && identifier(skill.name) && oneOf(skill.rank, ['proficient', 'expertise'])) &&
  unique((value.skills as PlainObject[]).map((skill) => skill.name));

const validateHitPointProgression = (value: unknown): boolean => exact(value, ['levelGains'], ['maximumOverride']) &&
  array(value.levelGains, 0, 4, (gain) =>
    (exact(gain, ['level', 'mode']) && integer(gain.level, 2, 5) && gain.mode === 'fixed-average') ||
    (exact(gain, ['level', 'mode', 'roll']) && integer(gain.level, 2, 5) && gain.mode === 'rolled' && integer(gain.roll, 1, 20))) &&
  unique((value.levelGains as PlainObject[]).map((gain) => gain.level)) &&
  optional(value, 'maximumOverride', (override) => exact(override, ['value', 'reason']) && integer(override.value, 1, 9999) && text(override.reason, 1000));

const validateDefense = (value: unknown): boolean =>
  (exact(value, ['mode', 'armorIndex'], ['shieldIndex']) && value.mode === 'armor' && identifier(value.armorIndex) && optional(value, 'shieldIndex', identifier)) ||
  (exact(value, ['mode', 'formulaId'], ['shieldIndex']) && value.mode === 'unarmored' &&
    oneOf(value.formulaId, ['standard-unarmored', 'barbarian-unarmored-defense', 'monk-unarmored-defense', 'draconic-resilience']) &&
    optional(value, 'shieldIndex', identifier)) ||
  (exact(value, ['mode', 'armorClass', 'reason']) && value.mode === 'manual' && integer(value.armorClass, 0, 100) && text(value.reason, 1000));

const validateCombatInput = (value: unknown): boolean => exact(value, ['defense'], [
  'initiativeOverride', 'passivePerceptionOverride', 'speedOverride',
]) && validateDefense(value.defense) &&
  optional(value, 'initiativeOverride', (override) => validateOverride(override, -100, 100)) &&
  optional(value, 'passivePerceptionOverride', (override) => validateOverride(override, 0, 100)) &&
  optional(value, 'speedOverride', (override) => validateOverride(override, 0, 1000));

const validateOverride = (value: unknown, minimum: number, maximum: number): boolean =>
  exact(value, ['value', 'reason']) && integer(value.value, minimum, maximum) && text(value.reason, 1000);

const validateRuleChoice = (value: unknown): boolean => exact(value, ['ruleId', 'optionIds'], ['manualNote']) &&
  identifier(value.ruleId) && array(value.optionIds, 0, 32, identifier) && unique(value.optionIds) && optional(value, 'manualNote', (note) => text(note, 1000));

const validateAttack = (value: unknown): boolean => exact(value, ['id', 'name', 'attackBonus', 'damage']) &&
  identifier(value.id) && text(value.name, 200) && (
    (exact(value.attackBonus, ['mode', 'ability', 'proficient']) && value.attackBonus.mode === 'calculated' &&
      oneOf(value.attackBonus.ability, ['strength', 'dexterity', 'spellcasting']) && typeof value.attackBonus.proficient === 'boolean') ||
    (exact(value.attackBonus, ['mode', 'value', 'reason']) && value.attackBonus.mode === 'manual-override' &&
      integer(value.attackBonus.value, -100, 100) && text(value.attackBonus.reason, 1000))
  ) && array(value.damage, 1, 8, (damage) => exact(damage, ['dice', 'bonus', 'type']) &&
    typeof damage.dice === 'string' && /^\d{1,2}d\d{1,3}$/u.test(damage.dice) && integer(damage.bonus, -100, 100) && text(damage.type, 200));

const validateSpellcastingInput = (value: unknown): boolean => {
  if (!exact(value, ['spells', 'preparedSpellIds'], ['slotOverride']) ||
    !array(value.spells, 0, 128, validateSpell) || !array(value.preparedSpellIds, 0, 128, identifier)) return false;
  const spells = value.spells as unknown[];
  const preparedSpellIds = value.preparedSpellIds as string[];
  return unique(spells.map((spell) => (spell as PlainObject).id)) && unique(preparedSpellIds) &&
    preparedSpellIds.every((id) => spells.some((spell) => (spell as PlainObject).id === id)) &&
    optional(value, 'slotOverride', (slots) => array(slots, 0, 3, (slot) => exact(slot, ['level', 'max', 'reason']) &&
      integer(slot.level, 1, 3) && integer(slot.max, 0, 99) && text(slot.reason, 1000)) && unique(slots.map((slot) => (slot as PlainObject).level)));
};

const validateSpell = (value: unknown): boolean => {
  if (exact(value, ['id', 'source', 'index', 'state'])) {
    return identifier(value.id) && value.source === 'srd' && identifier(value.index) && oneOf(value.state, ['known', 'prepared', 'spellbook', 'always-prepared']) &&
      characterCreationRules.spells.some((spell) => spell.index === value.index);
  }
  return exact(value, ['source', 'id', 'name', 'level', 'school', 'castingTime', 'range', 'components', 'duration', 'concentration', 'ritual', 'description', 'state'], ['materialComponent', 'higherLevelText']) &&
    value.source === 'manual' && identifier(value.id) && text(value.name, 200) && integer(value.level, 0, 3) &&
    text(value.school, 200) && text(value.castingTime, 200) && text(value.range, 200) && array(value.components, 0, 3, (entry) => text(entry, 20)) &&
    optional(value, 'materialComponent', (entry) => text(entry, 1000)) && text(value.duration, 200) && typeof value.concentration === 'boolean' &&
    typeof value.ritual === 'boolean' && text(value.description, 10000) && optional(value, 'higherLevelText', (entry) => text(entry, 5000)) &&
    oneOf(value.state, ['known', 'prepared', 'spellbook', 'always-prepared']);
};

const validateFeature = (value: unknown): boolean =>
  (exact(value, ['source', 'index']) && value.source === 'srd' && identifier(value.index) && canonicalFeature(value.index as string)) ||
  (exact(value, ['source', 'id', 'name', 'category', 'description']) && value.source === 'manual' && identifier(value.id) &&
    text(value.name, 200) && text(value.category, 200) && text(value.description, 5000));

const validateEquipment = (value: unknown): boolean =>
  (exact(value, ['source', 'index', 'quantity', 'equipped']) && value.source === 'srd' && identifier(value.index) &&
    integer(value.quantity, 1, 999) && typeof value.equipped === 'boolean' && characterCreationRules.equipment.some((entry) => entry.index === value.index)) ||
  (exact(value, ['source', 'id', 'name', 'category', 'quantity', 'equipped']) && value.source === 'manual' && identifier(value.id) &&
    text(value.name, 200) && text(value.category, 200) && integer(value.quantity, 1, 999) && typeof value.equipped === 'boolean');

const validateOther = (value: unknown): boolean => exact(value, ['id', 'title', 'description']) &&
  identifier(value.id) && text(value.title, 200) && text(value.description, 5000);

const validateRuleset = (value: unknown): boolean => exact(value, ['system', 'version', 'snapshotId']) &&
  value.system === 'dnd5e' && value.version === '2014' && value.snapshotId === characterCreationRules.metadata.snapshotId;

const validateResolvedAbilityScores = (value: unknown): boolean => {
  if (!exact(value, ['input', 'scores', 'modifiers']) || !validateAbilityScoreInput(value.input) ||
    !exact(value.scores, [...abilities]) || !exact(value.modifiers, [...abilities])) return false;
  const scores = value.scores as PlainObject;
  const modifiers = value.modifiers as PlainObject;
  return abilities.every((ability) => validateResolvedNumber(scores[ability], 1, 30)) &&
    abilities.every((ability) => integer(modifiers[ability], -10, 10));
};

const validateResolvedAbilityConsistency = (sheet: CharacterSheetV2): boolean => {
  const scoreValues = Object.fromEntries(abilities.map((ability) => [ability, sheet.abilityScores.scores[ability].value])) as Record<typeof abilities[number], number>;
  if (!abilities.every((ability) => sheet.abilityScores.modifiers[ability] === Math.floor((scoreValues[ability] - 10) / 2))) return false;
  if (sheet.abilityScores.input.mode === 'imported') {
    const importedValues = sheet.abilityScores.input.values;
    return abilities.every((ability) => scoreValues[ability] === importedValues[ability] &&
      sheet.abilityScores.scores[ability].provenance.kind === 'imported');
  }
  const expected = { ...sheet.abilityScores.input.base };
  if (sheet.identity.race.source === 'srd') {
    const context = canonicalRaceContext(sheet.identity.race.index);
    const race = characterCreationRules.races.find((entry) => entry.index === context?.raceIndex);
    const subrace = characterCreationRules.subraces.find((entry) => entry.index === context?.subraceIndex);
    for (const bonus of [...(race?.abilityBonuses ?? []), ...(subrace?.abilityBonuses ?? [])]) expected[bonus.ability] += bonus.bonus;
    const selectable = sheet.ruleChoices.find((choice) => choice.ruleId === 'half-elf-ability-bonuses');
    for (const ability of selectable?.optionIds ?? []) expected[ability as typeof abilities[number]] += 1;
  }
  return abilities.every((ability) => scoreValues[ability] === expected[ability] &&
    sheet.abilityScores.scores[ability].provenance.kind === 'calculated');
};

const validateResolvedHP = (value: unknown): boolean => exact(value, ['levelGains', 'maximum'], ['maximumOverride']) &&
  validateHitPointProgression({ levelGains: value.levelGains, ...(owns(value, 'maximumOverride') ? { maximumOverride: value.maximumOverride } : {}) }) &&
  validateResolvedNumber(value.maximum, 1, 9999);

const validateResolvedCombat = (value: unknown): boolean => exact(value, ['defense', 'proficiencyBonus', 'initiative', 'passivePerception', 'speedFt', 'armorClass']) &&
  validateDefense(value.defense) && validateResolvedNumber(value.proficiencyBonus, 2, 6) && validateResolvedNumber(value.initiative, -100, 100) &&
  validateResolvedNumber(value.passivePerception, 0, 100) && validateResolvedNumber(value.speedFt, 0, 1000) && validateResolvedNumber(value.armorClass, 0, 100);

const validateResolvedNumber = (value: unknown, minimum: number, maximum: number): boolean => exact(value, ['value', 'provenance']) &&
  integer(value.value, minimum, maximum) && validateProvenance(value.provenance);

const validateProvenance = (value: unknown): boolean =>
  (exact(value, ['kind', 'ruleId']) && value.kind === 'calculated' && identifier(value.ruleId)) ||
  (exact(value, ['kind', 'reason']) && value.kind === 'manual-override' && text(value.reason, 1000)) ||
  (exact(value, ['kind'], ['note']) && value.kind === 'imported' && optional(value, 'note', (note) => text(note, 1000)));

const validateResolvedAttack = (value: unknown): boolean => exact(value, ['id', 'name', 'attackBonus', 'attackBonusInput', 'damage']) &&
  identifier(value.id) && text(value.name, 200) && validateResolvedNumber(value.attackBonus, -100, 100) &&
  (value.attackBonusInput === null || (exact(value.attackBonusInput, ['ability', 'proficient']) &&
    oneOf(value.attackBonusInput.ability, ['strength', 'dexterity', 'spellcasting']) && typeof value.attackBonusInput.proficient === 'boolean')) &&
  array(value.damage, 1, 8, (damage) => exact(damage, ['dice', 'bonus', 'type']) && typeof damage.dice === 'string' &&
    /^\d{1,2}d\d{1,3}$/u.test(damage.dice) && integer(damage.bonus, -100, 100) && text(damage.type, 200));

const validateResolvedSpellcasting = (value: unknown): boolean => exact(value, [
  'ability', 'spellSaveDC', 'spellAttackBonus', 'slots', 'availableSpellLevels', 'spells', 'preparedSpellIds',
]) && oneOf(value.ability, ['intelligence', 'wisdom', 'charisma']) && validateResolvedNumber(value.spellSaveDC, 0, 100) &&
  validateResolvedNumber(value.spellAttackBonus, -100, 100) && array(value.slots, 0, 3, (slot) => exact(slot, ['level', 'max', 'used', 'provenance']) &&
    integer(slot.level, 1, 3) && integer(slot.max, 0, 99) && integer(slot.used, 0, 99) && (slot.used as number) <= (slot.max as number) && validateProvenance(slot.provenance)) &&
  unique(value.slots.map((slot) => (slot as PlainObject).level)) && array(value.availableSpellLevels, 0, 3, (level) => integer(level, 1, 3)) &&
  unique(value.availableSpellLevels) && array(value.spells, 0, 128, validateResolvedSpell) &&
  unique(value.spells.map((spell) => (spell as PlainObject).id)) && array(value.preparedSpellIds, 0, 128, identifier) && unique(value.preparedSpellIds) &&
  (value.preparedSpellIds as string[]).every((id) => (value.spells as PlainObject[]).some((spell) => spell.id === id));

const validateResolvedSpell = (value: unknown): boolean => exact(value, [
  'id', 'canonicalIndex', 'name', 'level', 'school', 'castingTime', 'range', 'components', 'materialComponent',
  'duration', 'concentration', 'ritual', 'description', 'higherLevelText', 'state', 'provenance',
]) && identifier(value.id) && (value.canonicalIndex === null || identifier(value.canonicalIndex)) && text(value.name, 200) &&
  integer(value.level, 0, 3) && text(value.school, 200) && text(value.castingTime, 200) && text(value.range, 200) &&
  array(value.components, 0, 3, (entry) => text(entry, 20)) && (value.materialComponent === null || text(value.materialComponent, 1000)) &&
  text(value.duration, 200) && typeof value.concentration === 'boolean' && typeof value.ritual === 'boolean' &&
  text(value.description, 10000) && (value.higherLevelText === null || text(value.higherLevelText, 5000)) &&
  oneOf(value.state, ['known', 'prepared', 'spellbook', 'always-prepared']) && validateProvenance(value.provenance);

const validateResolvedFeature = (value: unknown): boolean =>
  (exact(value, ['id', 'source', 'canonicalIndex', 'ownerKind', 'name', 'category', 'description', 'provenance']) &&
    identifier(value.id) && value.source === 'srd' && identifier(value.canonicalIndex) && value.id === value.canonicalIndex &&
    oneOf(value.ownerKind, ['race', 'class', 'subclass']) && text(value.name, 200) && text(value.category, 200) &&
    text(value.description, 10000) && exact(value.provenance, ['kind', 'ruleId']) &&
    value.provenance.kind === 'calculated' && identifier(value.provenance.ruleId)) ||
  (exact(value, ['id', 'source', 'canonicalIndex', 'name', 'category', 'description', 'provenance']) &&
    identifier(value.id) && value.source === 'manual' && value.canonicalIndex === null &&
    text(value.name, 200) && text(value.category, 200) && text(value.description, 10000) &&
    exact(value.provenance, ['kind'], ['note']) && value.provenance.kind === 'imported' &&
    optional(value.provenance, 'note', (note) => text(note, 1000)));

const validateSummary = (value: unknown): boolean => exact(value, ['displayLine', 'landingConcept', 'featuredAbilities', 'referenceSections']) &&
  text(value.displayLine, 200) && text(value.landingConcept, 1000) && array(value.featuredAbilities, 0, 16, (entry) => text(entry, 200)) &&
  array(value.referenceSections, 0, 5, (section) => exact(section, ['id', 'label', 'defaultOpen']) &&
    oneOf(section.id, ['actions', 'features', 'spells', 'equipment', 'other']) && text(section.label, 200) && typeof section.defaultOpen === 'boolean') &&
  unique((value.referenceSections as PlainObject[]).map((section) => section.id));

const validateRequestSemantics = (request: CreateCharacterV2RequestDTO): boolean => {
  const manualRace = request.identity.race.source === 'manual';
  const manualClass = request.identity.class.source === 'manual';
  if (manualRace && (request.abilityScores.mode !== 'imported' || request.combat.speedOverride === undefined)) return false;
  if (manualClass && (request.hitPointProgression.maximumOverride === undefined ||
    request.hitPointProgression.levelGains.length !== 0 || request.spellcasting !== null ||
    request.attacks.some((attack) => attack.attackBonus.mode === 'calculated' && attack.attackBonus.ability === 'spellcasting'))) return false;
  const classIndex = request.identity.class.source === 'srd' ? request.identity.class.index : null;
  const classRule = classIndex ? levelUpRules.classes.find((entry) => entry.index === classIndex) : undefined;
  if (classIndex && !classRule) return false;
  if (classRule) {
    const decisionReached = request.identity.level >= classRule.subclassDecisionLevel;
    if (decisionReached !== (request.identity.subclass !== null)) return false;
  }
  const subclassIndex = request.identity.subclass?.source === 'srd' ? request.identity.subclass.index : null;
  if (subclassIndex && (!classRule || !classRule.subclasses.some((entry) => entry.index === subclassIndex))) return false;
  const gains = request.hitPointProgression.levelGains;
  if (classRule && (gains.length !== request.identity.level - 1 || gains.some((gain, index) => gain.level !== index + 2))) return false;
  if (classRule && gains.some((gain) => gain.mode === 'rolled' && gain.roll > classRule.hitDie)) return false;
  if (request.attacks.some((attack) => attack.attackBonus.mode === 'calculated' && attack.attackBonus.ability === 'spellcasting' &&
    (!classRule || classRule.levels.find((entry) => entry.level === request.identity.level)?.spellcasting === null))) return false;
  const equipped = new Set(request.equipment.flatMap((entry) => entry.source === 'srd' && entry.equipped ? [entry.index] : []));
  const defense = request.combat.defense;
  if (defense.mode === 'armor') {
    const armor = characterCreationRules.equipment.find((entry) => entry.index === defense.armorIndex);
    if (!equipped.has(defense.armorIndex) || !armor?.armor || armor.armor.category === 'Shield') return false;
    if (defense.shieldIndex) {
      const shield = characterCreationRules.equipment.find((entry) => entry.index === defense.shieldIndex);
      if (!equipped.has(defense.shieldIndex) || shield?.armor?.category !== 'Shield') return false;
    }
  }
  if (defense.mode === 'unarmored') {
    if (request.equipment.some((entry) => {
      if (entry.source !== 'srd' || !entry.equipped) return false;
      const armor = characterCreationRules.equipment.find((item) => item.index === entry.index)?.armor;
      return armor !== null && armor !== undefined && armor.category !== 'Shield';
    })) return false;
    if (defense.shieldIndex) {
      const shield = characterCreationRules.equipment.find((entry) => entry.index === defense.shieldIndex);
      if (!equipped.has(defense.shieldIndex) || shield?.armor?.category !== 'Shield') return false;
    }
    if (defense.formulaId === 'monk-unarmored-defense' && (classRule?.index !== 'monk' || defense.shieldIndex !== undefined)) return false;
    if (defense.formulaId === 'barbarian-unarmored-defense' && classRule?.index !== 'barbarian') return false;
    if (defense.formulaId === 'draconic-resilience' && !(classRule?.index === 'sorcerer' && request.identity.subclass?.source === 'srd' && request.identity.subclass.index === 'draconic')) return false;
  }
  const context = request.identity.race.source === 'srd' ? canonicalRaceContext(request.identity.race.index) : null;
  const race = characterCreationRules.races.find((entry) => entry.index === context?.raceIndex);
  const subrace = characterCreationRules.subraces.find((entry) => entry.index === context?.subraceIndex);
  const traits = new Set<string>([...(race?.traitIndexes ?? []), ...(subrace?.traitIndexes ?? [])]);
  const classFeatures = new Set<string>((classRule?.levels ?? []).filter((entry) => entry.level <= request.identity.level).flatMap((entry) => entry.features.map((feature) => feature.index)));
  const subclass = subclassIndex ? classRule?.subclasses.find((entry) => entry.index === subclassIndex) : undefined;
  const subclassFeatures = new Set<string>((subclass?.featuresByLevel ?? []).filter((entry) => entry.level <= request.identity.level).flatMap((entry) => entry.features.map((feature) => feature.index)));
  return request.features.every((feature) => feature.source === 'manual' || traits.has(feature.index) || classFeatures.has(feature.index) || subclassFeatures.has(feature.index));
};

const validateSavedConsistency = (sheet: CharacterSheetV2): boolean => {
  try {
    const request: CreateCharacterV2RequestDTO = {
      schemaVersion: 'CharacterSheetV2', creationSource: sheet.creationSource, identity: structuredClone(sheet.identity),
      abilityScores: structuredClone(sheet.abilityScores.input), proficiencies: structuredClone(sheet.proficiencies),
      hitPointProgression: {
        levelGains: structuredClone(sheet.hitPointProgression.levelGains),
        ...(sheet.hitPointProgression.maximumOverride ? { maximumOverride: structuredClone(sheet.hitPointProgression.maximumOverride) } : {}),
      },
      combat: {
        defense: structuredClone(sheet.combat.defense),
        ...(sheet.combat.initiative.provenance.kind === 'manual-override' ? { initiativeOverride: { value: sheet.combat.initiative.value, reason: sheet.combat.initiative.provenance.reason } } : {}),
        ...(sheet.combat.passivePerception.provenance.kind === 'manual-override' ? { passivePerceptionOverride: { value: sheet.combat.passivePerception.value, reason: sheet.combat.passivePerception.provenance.reason } } : {}),
        ...(sheet.combat.speedFt.provenance.kind === 'manual-override' ? { speedOverride: { value: sheet.combat.speedFt.value, reason: sheet.combat.speedFt.provenance.reason } } : {}),
      },
      ruleChoices: structuredClone(sheet.ruleChoices),
      attacks: sheet.attacks.map((attack) => ({ id: attack.id, name: attack.name, damage: structuredClone(attack.damage),
        attackBonus: attack.attackBonusInput
          ? { mode: 'calculated', ...attack.attackBonusInput }
          : { mode: 'manual-override', value: attack.attackBonus.value, reason: attack.attackBonus.provenance.kind === 'manual-override' ? attack.attackBonus.provenance.reason : 'Imported attack.' },
      })),
      spellcasting: sheet.spellcasting ? {
        spells: sheet.spellcasting.spells.map((spell) => spell.canonicalIndex
          ? { id: spell.id, source: 'srd', index: spell.canonicalIndex, state: spell.state }
          : { id: spell.id, source: 'manual', name: spell.name, level: spell.level, school: spell.school,
            castingTime: spell.castingTime, range: spell.range, components: [...spell.components],
            ...(spell.materialComponent ? { materialComponent: spell.materialComponent } : {}), duration: spell.duration,
            concentration: spell.concentration, ritual: spell.ritual, description: spell.description,
            ...(spell.higherLevelText ? { higherLevelText: spell.higherLevelText } : {}), state: spell.state }),
        preparedSpellIds: [...sheet.spellcasting.preparedSpellIds],
        slotOverride: sheet.spellcasting.slots.filter((slot) => slot.provenance.kind === 'manual-override').map((slot) => ({
          level: slot.level, max: slot.max, reason: slot.provenance.kind === 'manual-override' ? slot.provenance.reason : '',
        })),
      } : null,
      features: sheet.features.map((feature) => feature.source === 'srd'
        ? { source: 'srd', index: feature.canonicalIndex }
        : { source: 'manual', id: feature.id, name: feature.name, category: feature.category, description: feature.description }),
      equipment: structuredClone(sheet.equipment), other: structuredClone(sheet.other),
    };
    const expected = buildCharacterSheetV2(request);
    const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
    return same(sheet.abilityScores, expected.abilityScores) && same(sheet.hitPointProgression, expected.hitPointProgression) &&
      same(sheet.combat, expected.combat) && same(sheet.attacks, expected.attacks) && same(sheet.features, expected.features) &&
      same(sheet.spellcasting?.ability, expected.spellcasting?.ability) && same(sheet.spellcasting?.spellSaveDC, expected.spellcasting?.spellSaveDC) &&
      same(sheet.spellcasting?.spellAttackBonus, expected.spellcasting?.spellAttackBonus) && same(sheet.spellcasting?.availableSpellLevels, expected.spellcasting?.availableSpellLevels) &&
      same(sheet.spellcasting?.spells, expected.spellcasting?.spells) && same(sheet.spellcasting?.preparedSpellIds, expected.spellcasting?.preparedSpellIds) &&
      same(sheet.spellcasting?.slots.map(slotSource), expected.spellcasting?.slots.map(slotSource));
  } catch {
    return false;
  }
};

const slotSource = (slot: { level: number; max: number; provenance: unknown }) => ({
  level: slot.level, max: slot.max, provenance: slot.provenance,
});

const canonicalSelectionsResolve = (identity: PlainObject): boolean => {
  const race = identity.race as PlainObject;
  const selectedClass = identity.class as PlainObject;
  const subclass = identity.subclass as PlainObject | null;
  if (race.source === 'srd' && !canonicalRaceContext(race.index as string)) return false;
  const classRule = selectedClass.source === 'srd' ? levelUpRules.classes.find((entry) => entry.index === selectedClass.index) : undefined;
  if (selectedClass.source === 'srd' && !classRule) return false;
  if (subclass && classRule && (identity.level as number) < classRule.subclassDecisionLevel) return false;
  if (subclass?.source === 'srd' && (!classRule || !classRule.subclasses.some((entry) => entry.index === subclass.index) || (identity.level as number) < classRule.subclassDecisionLevel)) return false;
  return true;
};

const spellcastingMatchesIdentity = (
  value: unknown,
  classIndex: string | null,
  subclassIndex: string | null,
  level: number,
): boolean => {
  if (classIndex === null) return value === null;
  const classRule = levelUpRules.classes.find((entry) => entry.index === classIndex);
  const spellcasting = classRule?.levels.find((entry) => entry.level === level)?.spellcasting ?? null;
  if (spellcasting === null) return value === null;
  if (!isObject(value)) return false;
  return (value.spells as unknown[]).every((candidate) => {
    if (!isObject(candidate)) return false;
    const canonicalIndex = typeof candidate.canonicalIndex === 'string' ? candidate.canonicalIndex
      : candidate.source === 'srd' ? candidate.index : null;
    if (canonicalIndex === null) return true;
    const spell = characterCreationRules.spells.find((entry) => entry.index === canonicalIndex);
    if (!spell || (spell.level > 0 && !(spellcasting.availableSpellLevels as readonly number[]).includes(spell.level))) return false;
    return (spell.classIndexes as readonly string[]).includes(classIndex) || spell.subclassMemberships.some((membership) =>
      membership.classIndex === classIndex && membership.subclassIndex === subclassIndex && membership.classLevel <= level);
  });
};

const canonicalRaceContext = (index: string): { raceIndex: string; subraceIndex: string | null } | null => {
  if (characterCreationRules.races.some((entry) => entry.index === index)) return { raceIndex: index, subraceIndex: null };
  const subrace = characterCreationRules.subraces.find((entry) => entry.index === index);
  return subrace ? { raceIndex: subrace.raceIndex, subraceIndex: subrace.index } : null;
};

const canonicalFeature = (index: string): boolean => levelUpRules.classes.some((entry) =>
  entry.levels.some((level) => level.features.some((feature) => feature.index === index)) ||
  entry.subclasses.some((subclass) => subclass.featuresByLevel.some((level) => level.features.some((feature) => feature.index === index)))) ||
  characterCreationRules.raceTraits.some((trait) => trait.index === index);

const inputID = (value: unknown): unknown => isObject(value) ? value.source === 'srd' ? value.index ?? value.id : value.id : undefined;
const owns = (value: PlainObject, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const isObject = (value: unknown): value is PlainObject => typeof value === 'object' && value !== null && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const exact = (value: unknown, required: readonly string[], optionalKeys: readonly string[] = []): value is PlainObject => {
  if (!isObject(value)) return false;
  const keys = Reflect.ownKeys(value).filter((key) => Object.prototype.propertyIsEnumerable.call(value, key));
  const allowed = new Set([...required, ...optionalKeys]);
  return keys.every((key) => typeof key === 'string' && allowed.has(key)) && required.every((key) => owns(value, key));
};
const text = (value: unknown, maximum: number): value is string => typeof value === 'string' && value.trim() !== '' && [...value.trim()].length <= maximum;
const identifier = (value: unknown): value is string => typeof value === 'string' && value.length >= 1 && value.length <= 128 && /^[a-z0-9-]+$/u.test(value);
const integer = (value: unknown, minimum: number, maximum: number): value is number => Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T => typeof value === 'string' && allowed.includes(value as T);
const array = <T = unknown>(value: unknown, minimum: number, maximum: number, validate: (entry: unknown) => boolean): value is T[] =>
  Array.isArray(value) && value.length >= minimum && value.length <= maximum && value.every(validate);
const optional = (value: PlainObject, key: string, validate: (entry: unknown) => boolean): boolean => !owns(value, key) || validate(value[key]);
const unique = (values: readonly unknown[]): boolean => new Set(values).size === values.length;
const jsonBytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).byteLength;
