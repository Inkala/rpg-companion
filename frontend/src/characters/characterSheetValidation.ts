import type { CharacterSheetV1 } from './characterSheet';

type PlainObject = Record<string, unknown>;

const rulesVersions = ['2014', '2024', 'mixed', 'unknown'] as const;
const sourceStatuses = ['draft', 'audited-sample', 'needs-audit'] as const;
const featureStatuses = ['confirmed', 'needs-confirmation', 'deferred'] as const;
const abilityNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;

export const isCharacterSheetV1 = (value: unknown): value is CharacterSheetV1 => {
  try {
    return validateCharacterSheet(value);
  } catch {
    return false;
  }
};

const validateCharacterSheet = (value: unknown): boolean => {
  if (!hasExactKeys(value, [
    'schemaVersion', 'ruleset', 'identity', 'summary', 'abilities', 'combat',
    'proficiencies', 'actions', 'features', 'spellcasting', 'equipment', 'personality', 'audit',
  ])) {
    return false;
  }
  const structurallyValid = value.schemaVersion === 'CharacterSheetV1' &&
    validateRuleset(value.ruleset) &&
    validateIdentity(value.identity) &&
    validateSummary(value.summary) &&
    validateAbilities(value.abilities) &&
    validateCombat(value.combat) &&
    validateProficiencies(value.proficiencies) &&
    validateActions(value.actions) &&
    validateFeatures(value.features) &&
    (value.spellcasting === null || validateSpellcasting(value.spellcasting)) &&
    validateEquipment(value.equipment) &&
    validatePersonality(value.personality) &&
    validateAudit(value.audit);
  if (!structurallyValid) {
    return false;
  }

  return serializedJSONByteLength(value) <= 65_536;
};

const validateRuleset = (value: unknown): boolean => {
  return hasExactKeys(value, ['system', 'version', 'sourceStatus']) &&
    value.system === 'dnd5e' &&
    isEnum(value.version, rulesVersions) &&
    isEnum(value.sourceStatus, sourceStatuses);
};

const validateIdentity = (value: unknown): boolean => {
  if (!hasExactKeys(value, ['name', 'ancestry', 'background', 'classes'], ['alignment', 'concept'])) {
    return false;
  }
  return isText(value.name) && isText(value.ancestry) && isText(value.background) &&
    optionalText(value, 'alignment', 200) && optionalText(value, 'concept', 1000) &&
    isBoundedArray(value.classes, 1, 4, validateClass);
};

const validateClass = (value: unknown): boolean => {
  return hasExactKeys(value, ['name', 'level'], ['subclass']) &&
    isText(value.name, 200) && isInteger(value.level, 1, 20) &&
    optionalText(value, 'subclass', 200);
};

const validateAbilities = (value: unknown): boolean => {
  if (!hasExactKeys(value, ['scores'])) {
    return false;
  }
  const scores = value.scores;
  if (!hasExactKeys(scores, [...abilityNames])) {
    return false;
  }
  return abilityNames.every((ability) => isInteger(scores[ability], 1, 30));
};

const validateSummary = (value: unknown): boolean => {
  if (!hasExactKeys(
    value,
    ['displayLine', 'landingConcept', 'featuredAbilities', 'referenceSections'],
    ['supportingLine', 'portraitAssetId', 'portraitAlt'],
  )) {
    return false;
  }
  return isText(value.displayLine, 200) && isText(value.landingConcept, 1000) &&
    optionalText(value, 'supportingLine', 1000) &&
    optionalIdentifier(value, 'portraitAssetId') && optionalText(value, 'portraitAlt', 200) &&
    isStringArray(value.featuredAbilities, 16, 200) && validateReferenceSections(value.referenceSections);
};

const validateReferenceSections = (value: unknown): boolean => {
  if (!isBoundedArray(value, 0, 3, validateReferenceSection)) {
    return false;
  }
  return hasUnique(value.map((entry) => (entry as PlainObject).id));
};

const validateReferenceSection = (value: unknown): boolean => {
  return hasExactKeys(value, ['id', 'label', 'defaultOpen']) &&
    isEnum(value.id, ['actions', 'features', 'spells'] as const) &&
    isText(value.label, 200) && typeof value.defaultOpen === 'boolean';
};

const validateCombat = (value: unknown): boolean => {
  if (!hasExactKeys(value, [
    'hitPoints', 'armorClass', 'initiative', 'speed', 'proficiencyBonus',
    'passivePerception', 'concentration',
  ])) {
    return false;
  }
  return validateHitPoints(value.hitPoints) &&
    validateAuditedNumber(value.armorClass, 0, 100, true) &&
    isInteger(value.initiative, -100, 100) && validateSpeed(value.speed) &&
    isInteger(value.proficiencyBonus, 0, 20) &&
    validateAuditedNumber(value.passivePerception, 0, 100, false) &&
    (value.concentration === null || isText(value.concentration, 200));
};

const validateHitPoints = (value: unknown): boolean => {
  return hasExactKeys(value, ['current', 'max', 'temporary']) &&
    isInteger(value.current, 0, 9999) && isInteger(value.max, 0, 9999) &&
    isInteger(value.temporary, 0, 9999) && value.current <= value.max;
};

const validateAuditedNumber = (
  value: unknown,
  minimum: number,
  maximum: number,
  valueRequired: boolean,
): boolean => {
  if (!hasExactKeys(value, valueRequired ? ['value'] : [], ['value', 'needsConfirmation', 'note'])) {
    return false;
  }
  const valueValid = valueRequired
    ? isInteger(value.value, minimum, maximum)
    : optionalInteger(value, 'value', minimum, maximum);
  return valueValid &&
    optionalBoolean(value, 'needsConfirmation') && optionalText(value, 'note', 1000);
};

const validateSpeed = (value: unknown): boolean => {
  return Array.isArray(value) && value.length === 1 &&
    hasExactKeys(value[0], ['type', 'feet']) && value[0].type === 'walk' &&
    isInteger(value[0].feet, 0, 1000);
};

const validateProficiencies = (value: unknown): boolean => {
  if (!hasExactKeys(value, ['savingThrows', 'skills', 'weapons', 'armor', 'tools', 'languages'])) {
    return false;
  }
  return validateAuditedTextList(value.savingThrows) &&
    isBoundedArray(value.skills, 0, 30, validateSkill) &&
    validateAuditedTextList(value.weapons) && validateAuditedTextList(value.armor) &&
    validateAuditedTextList(value.tools) && validateAuditedTextList(value.languages);
};

const validateAuditedTextList = (value: unknown): boolean => {
  return hasExactKeys(value, ['values'], ['needsConfirmation', 'note']) &&
    isStringArray(value.values, 64, 200) && optionalBoolean(value, 'needsConfirmation') &&
    optionalText(value, 'note', 1000);
};

const validateSkill = (value: unknown): boolean => {
  return hasExactKeys(value, ['name', 'proficient', 'modifier'], ['needsConfirmation', 'note']) &&
    isText(value.name, 200) && typeof value.proficient === 'boolean' &&
    isInteger(value.modifier, -100, 100) && optionalBoolean(value, 'needsConfirmation') &&
    optionalText(value, 'note', 1000);
};

const validateActions = (value: unknown): boolean => {
  if (!isBoundedArray(value, 0, 32, validateAction)) {
    return false;
  }
  return hasUnique(value.map((entry) => (entry as PlainObject).id));
};

const validateAction = (value: unknown): boolean => {
  if (!hasExactKeys(
    value,
    ['id', 'name', 'kind', 'section', 'actionType', 'summary', 'meta'],
    ['attackBonus', 'damage', 'range', 'quickReference'],
  )) {
    return false;
  }
  return isIdentifier(value.id) && isText(value.name, 200) &&
    isEnum(value.kind, ['attack', 'ability', 'spell'] as const) && value.section === 'actions' &&
    isText(value.actionType, 200) && isText(value.summary, 1000) &&
    isStringArray(value.meta, 16, 200) && optionalInteger(value, 'attackBonus', -100, 100) &&
    optionalArray(value, 'damage', 8, validateDamage) && optionalRange(value, 'range') &&
    optionalQuickReference(value, 'quickReference');
};

const validateDamage = (value: unknown): boolean => {
  return hasExactKeys(value, ['dice', 'bonus', 'type']) &&
    isText(value.dice, 200) && isInteger(value.bonus, -100, 100) && isText(value.type, 200);
};

const optionalRange = (object: PlainObject, key: string): boolean => {
  if (isAbsent(object, key)) {
    return true;
  }
  const value = object[key];
  return hasExactKeys(value, ['normal', 'long']) &&
    isInteger(value.normal, 0, 10000) && isInteger(value.long, 0, 10000) &&
    value.long >= value.normal;
};

const validateFeatures = (value: unknown): boolean => {
  if (!isBoundedArray(value, 0, 64, validateFeature)) {
    return false;
  }
  return hasUnique(value.map((entry) => (entry as PlainObject).id));
};

const validateFeature = (value: unknown): boolean => {
  return hasExactKeys(
    value,
    ['id', 'name', 'category', 'source', 'tags', 'summary', 'includeInReference'],
    ['quickReference'],
  ) && isIdentifier(value.id) && isText(value.name, 200) && isText(value.category, 200) &&
    validateFeatureSource(value.source) && isStringArray(value.tags, 16, 200) &&
    isText(value.summary, 1000) && typeof value.includeInReference === 'boolean' &&
    optionalQuickReference(value, 'quickReference');
};

const validateFeatureSource = (value: unknown): boolean => {
  return hasExactKeys(value, ['rulesVersion', 'status'], ['note']) &&
    isEnum(value.rulesVersion, rulesVersions) && isEnum(value.status, featureStatuses) &&
    optionalText(value, 'note', 1000);
};

const optionalQuickReference = (object: PlainObject, key: string): boolean => {
  return isAbsent(object, key) || validateQuickReference(object[key]);
};

const validateQuickReference = (value: unknown): boolean => {
  return hasExactKeys(value, ['title', 'label', 'summary', 'metadata'], ['reminder', 'details']) &&
    isText(value.title, 200) && isText(value.label, 200) && isText(value.summary, 1000) &&
    isBoundedArray(value.metadata, 0, 16, validateMetadata) &&
    optionalNested(value, 'reminder', validateReminder) && optionalNested(value, 'details', validateDetails);
};

const validateMetadata = (value: unknown): boolean => {
  return hasExactKeys(value, ['label', 'value']) && isText(value.label, 200) && isText(value.value, 200);
};

const validateReminder = (value: unknown): boolean => {
  return hasExactKeys(value, ['heading', 'text']) && isText(value.heading, 200) && isText(value.text, 1000);
};

const validateDetails = (value: unknown): boolean => {
  return hasExactKeys(value, ['collapsedLabel', 'expandedLabel', 'text']) &&
    isText(value.collapsedLabel, 200) && isText(value.expandedLabel, 200) && isText(value.text, 1000);
};

const validateSpellcasting = (value: unknown): boolean => {
  if (!hasExactKeys(value, ['ability', 'spellSaveDC', 'spellAttackBonus', 'slots', 'spells'])) {
    return false;
  }
  return isEnum(value.ability, ['wisdom', 'intelligence', 'charisma'] as const) &&
    (value.spellSaveDC === null || validateAuditedNumber(value.spellSaveDC, 0, 100, false)) &&
    (value.spellAttackBonus === null || validateAuditedNumber(value.spellAttackBonus, -100, 100, false)) &&
    validateSlots(value.slots) && validateSpells(value.spells);
};

const validateSlots = (value: unknown): boolean => {
  if (!isBoundedArray(value, 0, 9, validateSlot)) {
    return false;
  }
  return hasUnique(value.map((entry) => (entry as PlainObject).level));
};

const validateSlot = (value: unknown): boolean => {
  return hasExactKeys(value, ['level', 'max', 'used']) &&
    isInteger(value.level, 1, 9) && isInteger(value.max, 0, 99) &&
    isInteger(value.used, 0, 99) && value.used <= value.max;
};

const validateSpells = (value: unknown): boolean => {
  if (!isBoundedArray(value, 0, 128, validateSpell)) {
    return false;
  }
  return hasUnique(value.map((entry) => (entry as PlainObject).id));
};

const validateSpell = (value: unknown): boolean => {
  return hasExactKeys(
    value,
    ['id', 'name', 'level', 'actionType', 'castingTime', 'duration', 'concentration', 'summary', 'meta', 'preparedOrKnown', 'source'],
    ['quickReference'],
  ) && isIdentifier(value.id) && isText(value.name, 200) && isInteger(value.level, 0, 9) &&
    isText(value.actionType, 200) && isText(value.castingTime, 200) && isText(value.duration, 200) &&
    typeof value.concentration === 'boolean' && isText(value.summary, 1000) &&
    isStringArray(value.meta, 16, 200) && isEnum(value.preparedOrKnown, ['prepared', 'known'] as const) &&
    validateFeatureSource(value.source) && optionalQuickReference(value, 'quickReference');
};

const validateEquipment = (value: unknown): boolean => {
  return hasExactKeys(value, ['armor', 'weapons', 'packsAndGear', 'tools', 'languages', 'currency']) &&
    validateAuditedTextList(value.armor) && isStringArray(value.weapons, 64, 200) &&
    validateAuditedTextList(value.packsAndGear) && validateAuditedTextList(value.tools) &&
    validateAuditedTextList(value.languages) && (value.currency === null || validateCurrency(value.currency));
};

const validateCurrency = (value: unknown): boolean => {
  if (!hasExactKeys(value, [], ['cp', 'sp', 'ep', 'gp', 'pp', 'needsConfirmation', 'note'])) {
    return false;
  }
  return ['cp', 'sp', 'ep', 'gp', 'pp'].every((key) => optionalInteger(value, key, 0, 1000000)) &&
    optionalBoolean(value, 'needsConfirmation') && optionalText(value, 'note', 1000);
};

const validatePersonality = (value: unknown): boolean => {
  return hasExactKeys(value, ['traits', 'ideals', 'bonds', 'flaws', 'notes']) &&
    ['traits', 'ideals', 'bonds', 'flaws', 'notes'].every((key) => isStringArray(value[key], 32, 1000));
};

const validateAudit = (value: unknown): boolean => {
  return hasExactKeys(value, ['source', 'needsConfirmation', 'rulesVersionWarnings', 'deferredCorrections']) &&
    isText(value.source, 1000) && isStringArray(value.needsConfirmation, 64, 1000) &&
    isStringArray(value.rulesVersionWarnings, 64, 1000) &&
    isStringArray(value.deferredCorrections, 64, 1000);
};

const hasExactKeys = (
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is PlainObject => {
  if (!isPlainObject(value)) {
    return false;
  }
  const keys = Reflect.ownKeys(value).filter((key) => Object.prototype.propertyIsEnumerable.call(value, key));
  if (keys.some((key) => typeof key !== 'string')) {
    return false;
  }
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => owns(value, key)) && keys.every((key) => allowed.has(key as string));
};

const isPlainObject = (value: unknown): value is PlainObject => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const owns = (object: PlainObject, key: string): boolean => Object.prototype.hasOwnProperty.call(object, key);

const isText = (value: unknown, maximumRunes?: number): value is string => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }
  return maximumRunes === undefined || [...value.trim()].length <= maximumRunes;
};

const optionalText = (object: PlainObject, key: string, maximumRunes: number): boolean => {
  return isAbsent(object, key) || isText(object[key], maximumRunes);
};

const isIdentifier = (value: unknown): value is string => {
  return typeof value === 'string' && value.length >= 1 && value.length <= 128 && /^[a-z0-9-]+$/u.test(value);
};

const optionalIdentifier = (object: PlainObject, key: string): boolean => {
  return isAbsent(object, key) || isIdentifier(object[key]);
};

const isInteger = (value: unknown, minimum: number, maximum: number): value is number => {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
};

const optionalInteger = (object: PlainObject, key: string, minimum: number, maximum: number): boolean => {
  return isAbsent(object, key) || isInteger(object[key], minimum, maximum);
};

const optionalBoolean = (object: PlainObject, key: string): boolean => {
  return isAbsent(object, key) || typeof object[key] === 'boolean';
};

const isBoundedArray = (
  value: unknown,
  minimum: number,
  maximum: number,
  validateEntry: (entry: unknown) => boolean,
): value is unknown[] => {
  return Array.isArray(value) && value.length >= minimum && value.length <= maximum && value.every(validateEntry);
};

const optionalArray = (
  object: PlainObject,
  key: string,
  maximum: number,
  validateEntry: (entry: unknown) => boolean,
): boolean => {
  return isAbsent(object, key) || isBoundedArray(object[key], 0, maximum, validateEntry);
};

const isStringArray = (value: unknown, maximumEntries: number, maximumRunes: number): boolean => {
  return isBoundedArray(value, 0, maximumEntries, (entry) => isText(entry, maximumRunes));
};

const optionalNested = (
  object: PlainObject,
  key: string,
  validate: (value: unknown) => boolean,
): boolean => {
  return isAbsent(object, key) || validate(object[key]);
};

const isAbsent = (object: PlainObject, key: string): boolean => {
  return !owns(object, key) || object[key] === undefined;
};

const hasUnique = (values: unknown[]): boolean => new Set(values).size === values.length;

const isEnum = <T extends string>(value: unknown, allowed: readonly T[]): value is T => {
  return typeof value === 'string' && allowed.includes(value as T);
};

const serializedJSONByteLength = (value: unknown): number => {
  if (value === null) {
    return 4;
  }
  if (typeof value === 'string') {
    return utf8Length(JSON.stringify(value));
  }
  if (typeof value === 'number') {
    return String(value).length;
  }
  if (typeof value === 'boolean') {
    return value ? 4 : 5;
  }
  if (Array.isArray(value)) {
    return 2 + Math.max(0, value.length - 1) + value.reduce(
      (total, entry) => total + serializedJSONByteLength(entry),
      0,
    );
  }

  const object = value as PlainObject;
  const entries = Object.keys(object).filter((key) => object[key] !== undefined);
  return 2 + Math.max(0, entries.length - 1) + entries.reduce((total, key) => {
    return total + utf8Length(JSON.stringify(key)) + 1 + serializedJSONByteLength(object[key]);
  }, 0);
};

const utf8Length = (value: string): number => new TextEncoder().encode(value).byteLength;
