#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonicalPath = resolve(repositoryRoot, 'rules-data/srd-5.1-2014-levels-1-5.json');
const schemaPath = resolve(repositoryRoot, 'rules-data/srd-5.1-2014-levels-1-5.schema.json');
const checksumPath = resolve(repositoryRoot, 'rules-data/srd-5.1-2014-levels-1-5.sha256');
const typescriptPath = resolve(repositoryRoot, 'frontend/src/rules/generated/characterCreationRules.ts');
const goPath = resolve(repositoryRoot, 'backend/internal/rules/generated_character_creation_rules.go');
const checkMode = process.argv.includes('--check');
const importSourceIndex = process.argv.indexOf('--import-source');

const expectedRaceIndexes = [
  'dragonborn', 'dwarf', 'elf', 'gnome', 'half-elf', 'half-orc', 'halfling', 'human', 'tiefling',
];
const expectedSubraceIndexes = ['high-elf', 'hill-dwarf', 'lightfoot-halfling', 'rock-gnome'];
const expectedEquipmentCategories = [
  'adventuring-gear', 'armor', 'mounts-and-vehicles', 'tools', 'weapon',
];
const expectedEquipmentCounts = {
  'adventuring-gear': 116,
  armor: 13,
  'mounts-and-vehicles': 40,
  tools: 31,
  weapon: 37,
};
const expectedCalculationRuleIDs = [
  'ability-modifier',
  'armor-class-armor',
  'armor-class-unarmored',
  'initiative',
  'maximum-hit-points',
  'passive-perception',
  'proficiency-bonus',
  'spell-attack-bonus',
  'spell-save-dc',
  'walking-speed',
];
const expectedRaceChoices = [
  { id: 'dragonborn-draconic-ancestry', sourceOwnerType: 'race-trait', sourceOwnerIndex: 'draconic-ancestry', selectionCount: 1, optionType: 'race-trait', allowedOptionIndexes: ['draconic-ancestry-black', 'draconic-ancestry-blue', 'draconic-ancestry-brass', 'draconic-ancestry-bronze', 'draconic-ancestry-copper', 'draconic-ancestry-gold', 'draconic-ancestry-green', 'draconic-ancestry-red', 'draconic-ancestry-silver', 'draconic-ancestry-white'], boundedRule: null, optionValue: null, exclusivityConstraint: null },
  { id: 'dwarf-tool-proficiency', sourceOwnerType: 'race-trait', sourceOwnerIndex: 'tool-proficiency', selectionCount: 1, optionType: 'tool-proficiency', allowedOptionIndexes: ['brewers-supplies', 'masons-tools', 'smiths-tools'], boundedRule: null, optionValue: null, exclusivityConstraint: null },
  { id: 'half-elf-ability-bonuses', sourceOwnerType: 'race', sourceOwnerIndex: 'half-elf', selectionCount: 2, optionType: 'ability-bonus', allowedOptionIndexes: ['constitution', 'dexterity', 'intelligence', 'strength', 'wisdom'], boundedRule: null, optionValue: 1, exclusivityConstraint: 'distinct-options' },
  { id: 'half-elf-language', sourceOwnerType: 'race', sourceOwnerIndex: 'half-elf', selectionCount: 1, optionType: 'language', allowedOptionIndexes: ['abyssal', 'celestial', 'deep-speech', 'draconic', 'dwarvish', 'giant', 'gnomish', 'goblin', 'halfling', 'infernal', 'orc', 'primordial', 'sylvan', 'undercommon'], boundedRule: null, optionValue: null, exclusivityConstraint: null },
  { id: 'half-elf-skill-versatility', sourceOwnerType: 'race-trait', sourceOwnerIndex: 'skill-versatility', selectionCount: 2, optionType: 'skill-proficiency', allowedOptionIndexes: [], boundedRule: 'any-srd-skill-proficiency', optionValue: null, exclusivityConstraint: 'distinct-options' },
  { id: 'high-elf-cantrip', sourceOwnerType: 'race-trait', sourceOwnerIndex: 'high-elf-cantrip', selectionCount: 1, optionType: 'spell', allowedOptionIndexes: ['acid-splash', 'chill-touch', 'dancing-lights', 'fire-bolt', 'light', 'mage-hand', 'mending', 'message', 'minor-illusion', 'poison-spray', 'prestidigitation', 'ray-of-frost', 'shocking-grasp', 'true-strike'], boundedRule: null, optionValue: null, exclusivityConstraint: null },
  { id: 'high-elf-extra-language', sourceOwnerType: 'race-trait', sourceOwnerIndex: 'extra-language', selectionCount: 1, optionType: 'language', allowedOptionIndexes: [], boundedRule: 'any-srd-language-not-already-known', optionValue: null, exclusivityConstraint: null },
  { id: 'human-extra-language', sourceOwnerType: 'race', sourceOwnerIndex: 'human', selectionCount: 1, optionType: 'language', allowedOptionIndexes: ['abyssal', 'celestial', 'deep-speech', 'draconic', 'dwarvish', 'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'infernal', 'orc', 'primordial', 'sylvan', 'undercommon'], boundedRule: null, optionValue: null, exclusivityConstraint: null },
];
const levelUpBehaviorChecksum = 'a7420529fa665cfeadb7b00f5536d1f0fed5c5a5258bc5b1dd7f3a7bf7b59c57';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sorted = (values) => [...values].sort((left, right) => left.localeCompare(right));
const ensureUnique = (values, label) => {
  assert(values.every((value) => typeof value === 'string' && value.length > 0), `${label} contains a missing stable ID`);
  assert(new Set(values).size === values.length, `${label} contains duplicated stable IDs`);
};
const absoluteSourceUrl = (path) => `https://www.dnd5eapi.co${path}`;
const abilityNames = {
  str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma',
};
const toolCategoryIndexes = {
  "Artisan's Tools": 'artisans-tools',
  'Gaming Sets': 'gaming-sets',
  'Musical Instrument': 'musical-instruments',
  'Other Tools': 'other-tools',
};
const vehicleCategoryIndexes = {
  'Mounts and Other Animals': 'mounts-and-other-animals',
  'Tack, Harness, and Drawn Vehicles': 'tack-harness-and-drawn-vehicles',
  'Waterborne Vehicles': 'waterborne-vehicles',
};
const normalizeAbilityBonuses = (bonuses) => (bonuses ?? [])
  .map(({ ability_score: abilityScore, bonus }) => ({ ability: abilityNames[abilityScore.index], bonus }))
  .sort((left, right) => left.ability.localeCompare(right.ability));
const normalizeDamage = (damage) => damage ? {
  dice: damage.damage_dice,
  type: damage.damage_type.index,
} : null;
const normalizeRange = (range) => ({ normal: range?.normal ?? null, long: range?.long ?? null });
const normalizeSubtype = (index, name) => index && name ? { index, name } : null;
const sourceOptionIndexes = (choice, accessor) => sorted((choice?.from?.options ?? []).map(accessor).filter(Boolean));

const calculationRules = [
  { id: 'ability-modifier', description: 'Floor the ability score minus 10 divided by 2.' },
  { id: 'armor-class-armor', description: 'Apply selected canonical armor, its Dexterity rule, a canonical shield, and supported modifiers.' },
  { id: 'armor-class-unarmored', description: 'Apply one selected supported unarmored-defense formula and add a canonical equipped shield unless that formula prohibits shields.' },
  { id: 'initiative', description: 'Add the Dexterity modifier and supported initiative modifiers.' },
  { id: 'maximum-hit-points', description: 'Use the class hit die at level 1, approved later gains, and Constitution at every level with a minimum gain of 1.' },
  { id: 'passive-perception', description: 'Add 10, Wisdom modifier, Perception proficiency or expertise, and supported modifiers.' },
  { id: 'proficiency-bonus', description: 'Read proficiency bonus from the canonical single-class level record.' },
  { id: 'spell-attack-bonus', description: 'Add proficiency bonus and the canonical spellcasting ability modifier.' },
  { id: 'spell-save-dc', description: 'Add 8, proficiency bonus, and the canonical spellcasting ability modifier.' },
  { id: 'walking-speed', description: 'Use canonical Race walking speed and supported conditional modifiers.' },
];
const featureModifiers = [
  { id: 'barbarian-fast-movement-speed', sourceIndex: 'fast-movement', kind: 'speed-bonus', value: 10, formula: null, conditions: ['not-wearing-heavy-armor'] },
  { id: 'barbarian-unarmored-defense-ac', sourceIndex: 'barbarian-unarmored-defense', kind: 'armor-class-formula', value: null, formula: '10+dexterity-modifier+constitution-modifier', conditions: ['not-wearing-armor'] },
  { id: 'bard-expertise-skills', sourceIndex: 'bard-expertise-1', kind: 'skill-expertise-choice', value: 2, formula: 'selected-proficient-skills', conditions: [] },
  { id: 'bard-jack-of-all-trades-initiative', sourceIndex: 'jack-of-all-trades', kind: 'initiative-half-proficiency', value: null, formula: 'floor(proficiency-bonus/2)', conditions: ['initiative-not-proficient'] },
  { id: 'draconic-resilience-ac', sourceIndex: 'draconic-resilience', kind: 'armor-class-formula', value: null, formula: '13+dexterity-modifier', conditions: ['not-wearing-armor'] },
  { id: 'draconic-resilience-maximum-hit-points', sourceIndex: 'draconic-resilience', kind: 'maximum-hit-points-per-class-level', value: 1, formula: 'sorcerer-level', conditions: [] },
  { id: 'fighter-defense-style-ac', sourceIndex: 'fighter-fighting-style-defense', kind: 'armor-class-bonus', value: 1, formula: null, conditions: ['wearing-armor'] },
  { id: 'half-elf-skill-versatility', sourceIndex: 'skill-versatility', kind: 'skill-choice', value: 2, formula: null, conditions: [] },
  { id: 'half-orc-menacing', sourceIndex: 'menacing', kind: 'skill-proficiency', value: null, formula: 'intimidation', conditions: [] },
  { id: 'high-elf-keen-senses', sourceIndex: 'keen-senses', kind: 'skill-proficiency', value: null, formula: 'perception', conditions: [] },
  { id: 'hill-dwarf-dwarven-toughness-maximum-hit-points', sourceIndex: 'dwarven-toughness', kind: 'maximum-hit-points-per-character-level', value: 1, formula: 'character-level', conditions: [] },
  { id: 'lore-bonus-proficiencies', sourceIndex: 'bonus-proficiencies', kind: 'skill-choice', value: 3, formula: null, conditions: [] },
  { id: 'monk-unarmored-defense-ac', sourceIndex: 'monk-unarmored-defense', kind: 'armor-class-formula', value: null, formula: '10+dexterity-modifier+wisdom-modifier', conditions: ['not-wearing-armor', 'not-using-shield'] },
  { id: 'monk-unarmored-movement-speed', sourceIndex: 'unarmored-movement-1', kind: 'speed-bonus', value: 10, formula: null, conditions: ['not-wearing-armor', 'not-using-shield'] },
  { id: 'paladin-defense-style-ac', sourceIndex: 'fighting-style-defense', kind: 'armor-class-bonus', value: 1, formula: null, conditions: ['wearing-armor'] },
  { id: 'ranger-defense-style-ac', sourceIndex: 'ranger-fighting-style-defense', kind: 'armor-class-bonus', value: 1, formula: null, conditions: ['wearing-armor'] },
  { id: 'rogue-expertise-skills', sourceIndex: 'rogue-expertise-1', kind: 'skill-expertise-choice', value: 2, formula: 'selected-proficient-skills-or-thieves-tools', conditions: [] },
  { id: 'warlock-beguiling-influence-deception', sourceIndex: 'eldritch-invocation-beguiling-influence', kind: 'skill-proficiency', value: null, formula: 'deception', conditions: [] },
  { id: 'warlock-beguiling-influence-persuasion', sourceIndex: 'eldritch-invocation-beguiling-influence', kind: 'skill-proficiency', value: null, formula: 'persuasion', conditions: [] },
];

const normalizeRaceChoices = (source) => {
  const races = new Map(source.races.map((race) => [race.index, race]));
  const traits = new Map(source.traits.map((trait) => [trait.index, trait]));
  const halfElf = races.get('half-elf');
  const human = races.get('human');
  const ancestry = traits.get('draconic-ancestry');
  const highElfCantrip = traits.get('high-elf-cantrip');
  const choices = structuredClone(expectedRaceChoices);
  choices.find(({ id }) => id === 'half-elf-ability-bonuses').allowedOptionIndexes = sourceOptionIndexes(
    halfElf?.ability_bonus_options,
    (option) => abilityNames[option.ability_score?.index],
  );
  choices.find(({ id }) => id === 'half-elf-language').allowedOptionIndexes = sourceOptionIndexes(
    halfElf?.language_options,
    (option) => option.item?.index,
  );
  choices.find(({ id }) => id === 'human-extra-language').allowedOptionIndexes = sourceOptionIndexes(
    human?.language_options,
    (option) => option.item?.index,
  );
  choices.find(({ id }) => id === 'dragonborn-draconic-ancestry').allowedOptionIndexes = sourceOptionIndexes(
    ancestry?.trait_specific?.subtrait_options,
    (option) => option.item?.index,
  );
  choices.find(({ id }) => id === 'high-elf-cantrip').allowedOptionIndexes = sourceOptionIndexes(
    highElfCantrip?.trait_specific?.spell_options,
    (option) => option.item?.index,
  );
  assert(halfElf?.ability_bonus_options?.choose === 2, 'source Half-Elf ability choice count differs');
  assert(halfElf?.language_options?.choose === 1, 'source Half-Elf language choice count differs');
  assert(human?.language_options?.choose === 1, 'source Human language choice count differs');
  assert(ancestry?.trait_specific?.subtrait_options?.choose === 1, 'source Dragonborn ancestry choice count differs');
  assert(highElfCantrip?.trait_specific?.spell_options?.choose === 1, 'source High Elf cantrip choice count differs');
  assert(deepEqual(choices, expectedRaceChoices), 'source Race choice membership or fidelity differs from the exact supported SRD set');
  return choices;
};

const importCanonicalData = (sourcePath) => {
  const canonical = JSON.parse(readFileSync(canonicalPath, 'utf8'));
  const source = JSON.parse(readFileSync(resolve(sourcePath), 'utf8'));
  assert(deepEqual(sorted(source.races.map(({ index }) => index)), expectedRaceIndexes), 'source Race membership differs from the exact SRD set');
  assert(deepEqual(sorted(source.subraces.map(({ index }) => index)), expectedSubraceIndexes), 'source subrace membership differs from the exact supported SRD set');
  assert(source.equipment.length === 237, `source equipment count is ${source.equipment.length}, expected 237`);
  assert(source.traits.length === 38, `source Race trait count is ${source.traits.length}, expected 38`);
  assert(deepEqual(sorted(source.spells.map(({ index }) => index)), canonical.spells.map(({ index }) => index)), 'source bounded spell membership differs from the existing canonical set');

  canonical.metadata = {
    ...canonical.metadata,
    snapshotId: 'srd-5-1-2014-levels-1-5-2026-07-19',
    schemaVersion: 3,
    importedAt: '2026-07-19',
    transformation: 'Development-time deterministic import from the documented 2014 API. Preserves the T-026 classes, levels, features, spell membership, and bounded progression; adds the exact 9-Race and 4-subrace sets, 38 Race traits, 8 bounded Race and Race-trait creation choices, the complete 237-record SRD equipment catalog, complete details for the existing 169 spells through level 3, 10 calculation rules, and 19 supported always-on feature modifiers. Source fields are normalized, references resolved, arrays sorted by stable ID, schema validated, cross-runtime projections generated, and exact memberships and counts enforced.',
  };
  canonical.races = source.races.map((race) => ({
    index: race.index,
    name: race.name,
    speedFt: race.speed,
    ignoresHeavyArmorSpeedPenalty: race.index === 'dwarf',
    abilityBonuses: normalizeAbilityBonuses(race.ability_bonuses),
    languageIndexes: sorted((race.languages ?? []).map(({ index }) => index)),
    traitIndexes: sorted((race.traits ?? []).map(({ index }) => index)),
    subraceIndexes: sorted((race.subraces ?? []).map(({ index }) => index)),
    sourceUrl: absoluteSourceUrl(race.url),
  })).sort((left, right) => left.index.localeCompare(right.index));
  canonical.subraces = source.subraces.map((subrace) => ({
    index: subrace.index,
    name: subrace.name,
    raceIndex: subrace.race.index,
    description: subrace.desc.trim(),
    abilityBonuses: normalizeAbilityBonuses(subrace.ability_bonuses),
    traitIndexes: sorted((subrace.racial_traits ?? []).map(({ index }) => index)),
    sourceUrl: absoluteSourceUrl(subrace.url),
  })).sort((left, right) => left.index.localeCompare(right.index));
  canonical.raceTraits = source.traits.map((trait) => ({
    index: trait.index,
    name: trait.name,
    description: trait.desc.map((value) => value.trim()).filter(Boolean).join('\n\n'),
    raceIndexes: sorted((trait.races ?? []).map(({ index }) => index)),
    subraceIndexes: sorted((trait.subraces ?? []).map(({ index }) => index)),
    proficiencyIndexes: sorted((trait.proficiencies ?? []).map(({ index }) => index)),
    optionIndexes: sorted((trait.trait_specific?.subtrait_options?.from?.options ?? [])
      .map((option) => option.item?.index).filter(Boolean)),
    sourceUrl: absoluteSourceUrl(trait.url),
  })).sort((left, right) => left.index.localeCompare(right.index));
  canonical.raceChoices = normalizeRaceChoices(source);
  canonical.equipment = source.equipment.map((item) => ({
    index: item.index,
    name: item.name,
    categoryIndex: item.equipment_category.index,
    cost: { quantity: item.cost.quantity, unit: item.cost.unit },
    weight: item.weight ?? null,
    quantity: item.quantity ?? null,
    description: (item.desc ?? []).map((value) => value.trim()).filter(Boolean),
    special: (item.special ?? []).map((value) => value.trim()).filter(Boolean),
    contents: (item.contents ?? []).map(({ item: content, quantity }) => ({ index: content.index, quantity }))
      .sort((left, right) => left.index.localeCompare(right.index)),
    gear: normalizeSubtype(item.gear_category?.index, item.gear_category?.name),
    tool: normalizeSubtype(toolCategoryIndexes[item.tool_category], item.tool_category),
    vehicle: item.vehicle_category ? {
      categoryIndex: vehicleCategoryIndexes[item.vehicle_category],
      category: item.vehicle_category,
      speed: item.speed ? { quantity: item.speed.quantity, unit: item.speed.unit } : null,
      capacity: item.capacity ?? null,
    } : null,
    weapon: item.equipment_category.index === 'weapon' ? {
      category: item.weapon_category,
      rangeType: item.weapon_range,
      categoryRange: item.category_range,
      damage: normalizeDamage(item.damage),
      twoHandedDamage: normalizeDamage(item.two_handed_damage),
      range: normalizeRange(item.range),
      throwRange: normalizeRange(item.throw_range),
      propertyIndexes: sorted((item.properties ?? []).map(({ index }) => index)),
    } : null,
    armor: item.equipment_category.index === 'armor' ? {
      category: item.armor_category,
      baseArmorClass: item.armor_class.base,
      dexterityBonus: item.armor_class.dex_bonus,
      maximumDexterityBonus: item.armor_class.max_bonus ?? null,
      strengthMinimum: item.str_minimum,
      stealthDisadvantage: item.stealth_disadvantage,
      shieldBonus: item.armor_category === 'Shield' ? item.armor_class.base : 0,
    } : null,
    sourceUrl: absoluteSourceUrl(item.url),
  })).sort((left, right) => left.index.localeCompare(right.index));
  canonical.equipmentCategories = expectedEquipmentCategories.map((index) => {
    const records = canonical.equipment.filter(({ categoryIndex }) => categoryIndex === index);
    return {
      index,
      name: source.equipment.find(({ equipment_category: category }) => category.index === index).equipment_category.name,
      equipmentIndexes: records.map(({ index: equipmentIndex }) => equipmentIndex),
    };
  });
  const spellDetails = new Map(source.spells.map((spell) => [spell.index, spell]));
  canonical.spells = canonical.spells.map((spell) => {
    const details = spellDetails.get(spell.index);
    assert(details, `source is missing spell details for ${spell.index}`);
    return {
      index: spell.index,
      name: spell.name,
      level: spell.level,
      school: spell.school,
      castingTime: spell.castingTime,
      actionType: spell.actionType,
      range: spell.range,
      duration: spell.duration,
      concentration: spell.concentration,
      ritual: spell.ritual,
      components: spell.components,
      material: details.material?.trim() || null,
      description: details.desc.map((value) => value.trim()).filter(Boolean).join('\n\n'),
      higherLevel: details.higher_level.map((value) => value.trim()).filter(Boolean).join('\n\n') || null,
      summary: spell.summary,
      classIndexes: spell.classIndexes,
      subclassMemberships: spell.subclassMemberships,
      sourceUrl: spell.sourceUrl,
    };
  });
  canonical.calculationRules = calculationRules;
  canonical.featureModifiers = featureModifiers;
  writeFileSync(canonicalPath, `${JSON.stringify(canonical, null, 2)}\n`);
  process.stdout.write(`imported character-creation rules: ${canonical.races.length} races, ${canonical.subraces.length} subraces, ${canonical.equipment.length} equipment, ${canonical.spells.length} spells\n`);
};

if (importSourceIndex !== -1) {
  assert(!checkMode, '--import-source cannot be combined with --check');
  assert(process.argv[importSourceIndex + 1], '--import-source requires a JSON path');
  importCanonicalData(process.argv[importSourceIndex + 1]);
}

const canonicalText = readFileSync(canonicalPath, 'utf8');
const canonical = JSON.parse(canonicalText);
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const canonicalChecksum = createHash('sha256').update(canonicalText).digest('hex');

const resolveReference = (reference) => {
  if (!reference.startsWith('#/')) throw new Error(`unsupported schema reference ${reference}`);
  return reference.slice(2).split('/').reduce((value, segment) => value[segment.replaceAll('~1', '/').replaceAll('~0', '~')], schema);
};
const matchesType = (value, type) => {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  return typeof value === type;
};
const validateSchema = (value, rule, path = '$') => {
  if (rule.$ref) return validateSchema(value, resolveReference(rule.$ref), path);
  const errors = [];
  if (rule.oneOf) {
    const matches = rule.oneOf.map((candidate) => validateSchema(value, candidate, path)).filter((candidate) => candidate.length === 0);
    if (matches.length !== 1) errors.push(`${path} must match exactly one schema branch`);
    return errors;
  }
  if (rule.const !== undefined && !deepEqual(value, rule.const)) errors.push(`${path} must equal ${JSON.stringify(rule.const)}`);
  if (rule.enum && !rule.enum.some((candidate) => deepEqual(value, candidate))) errors.push(`${path} is not an allowed value`);
  if (rule.type) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type];
    if (!types.some((type) => matchesType(value, type))) {
      errors.push(`${path} must be ${types.join(' or ')}`);
      return errors;
    }
  }
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) errors.push(`${path} is too short`);
    if (rule.maxLength !== undefined && value.length > rule.maxLength) errors.push(`${path} is too long`);
    if (rule.pattern && !(new RegExp(rule.pattern)).test(value)) errors.push(`${path} does not match ${rule.pattern}`);
  }
  if (typeof value === 'number') {
    if (rule.minimum !== undefined && value < rule.minimum) errors.push(`${path} is below ${rule.minimum}`);
    if (rule.maximum !== undefined && value > rule.maximum) errors.push(`${path} is above ${rule.maximum}`);
  }
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems) errors.push(`${path} has too few items`);
    if (rule.maxItems !== undefined && value.length > rule.maxItems) errors.push(`${path} has too many items`);
    if (rule.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${path} must contain unique items`);
    if (rule.items) value.forEach((item, index) => errors.push(...validateSchema(item, rule.items, `${path}[${index}]`)));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const required of rule.required ?? []) {
      if (!Object.hasOwn(value, required)) errors.push(`${path}.${required} is required`);
    }
    if (rule.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(rule.properties ?? {}, key)) errors.push(`${path}.${key} is not allowed`);
      }
    }
    for (const [key, child] of Object.entries(rule.properties ?? {})) {
      if (Object.hasOwn(value, key)) errors.push(...validateSchema(value[key], child, `${path}.${key}`));
    }
  }
  return errors;
};

const schemaErrors = validateSchema(canonical, schema);
if (schemaErrors.length > 0) throw new Error(`canonical JSON schema validation failed:\n${schemaErrors.join('\n')}`);

const assertSortedUnique = (records, label) => {
  const indexes = records.map(({ index }) => index);
  ensureUnique(indexes, label);
  assert(deepEqual(indexes, sorted(indexes)), `${label} must be deterministically ordered by stable ID`);
};
assertSortedUnique(canonical.races, 'Race indexes');
assertSortedUnique(canonical.subraces, 'subrace indexes');
assertSortedUnique(canonical.raceTraits, 'Race trait indexes');
ensureUnique(canonical.raceChoices.map(({ id }) => id), 'Race choice IDs');
assert(deepEqual(canonical.raceChoices.map(({ id }) => id), sorted(canonical.raceChoices.map(({ id }) => id))), 'Race choices must be deterministically ordered by stable ID');
assertSortedUnique(canonical.equipmentCategories, 'equipment category indexes');
assertSortedUnique(canonical.equipment, 'equipment indexes');
assertSortedUnique(canonical.spells, 'spell indexes');
ensureUnique(canonical.calculationRules.map(({ id }) => id), 'calculation rule IDs');
ensureUnique(canonical.featureModifiers.map(({ id }) => id), 'feature modifier IDs');
assert(deepEqual(canonical.featureModifiers.map(({ id }) => id), sorted(canonical.featureModifiers.map(({ id }) => id))), 'feature modifiers must be deterministically ordered by stable ID');
assert(deepEqual(canonical.races.map(({ index }) => index), expectedRaceIndexes), 'Race membership differs from the exact SRD set');
assert(deepEqual(canonical.subraces.map(({ index }) => index), expectedSubraceIndexes), 'subrace membership differs from the exact supported SRD set');
assert(canonical.raceTraits.length === 38, `Race trait count is ${canonical.raceTraits.length}, expected 38`);
const halfElfAbilityChoice = canonical.raceChoices.find(({ id }) => id === 'half-elf-ability-bonuses');
assert(deepEqual(halfElfAbilityChoice, expectedRaceChoices.find(({ id }) => id === 'half-elf-ability-bonuses')), 'Half-Elf ability choice differs from the exact SRD rule');
assert(deepEqual(canonical.raceChoices, expectedRaceChoices), 'Race choice membership or fidelity differs from the exact supported SRD set');
assert(deepEqual(canonical.equipmentCategories.map(({ index }) => index), expectedEquipmentCategories), 'equipment category membership differs from the exact source set');
assert(canonical.equipment.length === 237, `equipment count is ${canonical.equipment.length}, expected 237`);
assert(canonical.spells.length === 169, `bounded spell count is ${canonical.spells.length}, expected 169`);
assert(deepEqual(canonical.calculationRules.map(({ id }) => id), expectedCalculationRuleIDs), 'calculation rule IDs or order changed');

const raceIndexes = new Set(canonical.races.map(({ index }) => index));
const subraceIndexes = new Set(canonical.subraces.map(({ index }) => index));
for (const race of canonical.races) {
  race.subraceIndexes.forEach((index) => assert(subraceIndexes.has(index), `Race ${race.index} references unknown subrace ${index}`));
}
for (const subrace of canonical.subraces) {
  assert(raceIndexes.has(subrace.raceIndex), `subrace ${subrace.index} references unknown Race ${subrace.raceIndex}`);
}
const raceTraitIndexes = new Set(canonical.raceTraits.map(({ index }) => index));
for (const race of canonical.races) {
  race.traitIndexes.forEach((index) => assert(raceTraitIndexes.has(index), `Race ${race.index} references unknown trait ${index}`));
}
for (const choice of canonical.raceChoices) {
  const ownerIndexes = choice.sourceOwnerType === 'race' ? raceIndexes : raceTraitIndexes;
  assert(ownerIndexes.has(choice.sourceOwnerIndex), `Race choice ${choice.id} references unknown ${choice.sourceOwnerType} ${choice.sourceOwnerIndex}`);
  assert(choice.allowedOptionIndexes.length > 0 || choice.boundedRule !== null, `Race choice ${choice.id} has no bounded options`);
  assert(choice.allowedOptionIndexes.length === 0 || choice.boundedRule === null, `Race choice ${choice.id} mixes explicit options with a bounded rule`);
  assert(deepEqual(choice.allowedOptionIndexes, sorted(choice.allowedOptionIndexes)), `Race choice ${choice.id} options are not deterministically ordered`);
}
for (const subrace of canonical.subraces) {
  subrace.traitIndexes.forEach((index) => assert(raceTraitIndexes.has(index), `subrace ${subrace.index} references unknown trait ${index}`));
}
for (const trait of canonical.raceTraits) {
  trait.raceIndexes.forEach((index) => assert(raceIndexes.has(index), `Race trait ${trait.index} references unknown Race ${index}`));
  trait.subraceIndexes.forEach((index) => assert(subraceIndexes.has(index), `Race trait ${trait.index} references unknown subrace ${index}`));
  trait.optionIndexes.forEach((index) => assert(raceTraitIndexes.has(index), `Race trait ${trait.index} references unknown option ${index}`));
}
const equipmentIndexes = new Set(canonical.equipment.map(({ index }) => index));
for (const category of canonical.equipmentCategories) {
  assert(category.equipmentIndexes.length === expectedEquipmentCounts[category.index], `equipment category ${category.index} count changed`);
  assert(deepEqual(category.equipmentIndexes, sorted(category.equipmentIndexes)), `equipment category ${category.index} is not deterministically ordered`);
  category.equipmentIndexes.forEach((index) => assert(equipmentIndexes.has(index), `equipment category ${category.index} references unknown equipment ${index}`));
}
for (const item of canonical.equipment) {
  const category = canonical.equipmentCategories.find(({ index }) => index === item.categoryIndex);
  assert(category?.equipmentIndexes.includes(item.index), `equipment ${item.index} is missing from category ${item.categoryIndex}`);
  item.contents.forEach(({ index }) => assert(equipmentIndexes.has(index), `equipment ${item.index} contains unknown equipment ${index}`));
}

const supportedModifierSources = new Set([
  ...canonical.raceTraits.map(({ index }) => index),
  ...canonical.classes.flatMap(({ levels }) => levels.flatMap(({ features }) => features.map(({ index }) => index))),
  ...canonical.classes.flatMap(({ subclasses }) => subclasses.flatMap(({ featuresByLevel }) => featuresByLevel.flatMap(({ features }) => features.map(({ index }) => index)))),
  ...canonical.classes.flatMap(({ choices }) => choices.flatMap(({ options }) => options.map(({ index }) => index))),
]);
for (const modifier of canonical.featureModifiers) {
  assert(supportedModifierSources.has(modifier.sourceIndex), `feature modifier ${modifier.id} references unknown canonical source ${modifier.sourceIndex}`);
}
const expectedModifier = (id) => featureModifiers.find((modifier) => modifier.id === id);
const actualModifier = (id) => canonical.featureModifiers.find((modifier) => modifier.id === id);
assert(deepEqual(actualModifier('barbarian-unarmored-defense-ac'), expectedModifier('barbarian-unarmored-defense-ac')), 'Barbarian Unarmored Defense shield compatibility differs from the exact SRD rule');
for (const id of [
  'barbarian-fast-movement-speed',
  'draconic-resilience-ac',
  'draconic-resilience-maximum-hit-points',
  'hill-dwarf-dwarven-toughness-maximum-hit-points',
]) {
  assert(deepEqual(actualModifier(id), expectedModifier(id)), `required supported feature modifier ${id} differs`);
}
assert(deepEqual(canonical.featureModifiers, featureModifiers), 'required supported feature modifiers differ');
assert(canonical.races.find(({ index }) => index === 'dwarf')?.ignoresHeavyArmorSpeedPenalty === true, 'Dwarf heavy-armor speed compatibility differs from the exact SRD rule');
assert(canonical.races.filter(({ index }) => index !== 'dwarf').every(({ ignoresHeavyArmorSpeedPenalty }) => ignoresHeavyArmorSpeedPenalty === false), 'non-Dwarf Race incorrectly ignores the heavy-armor speed penalty');

const legacySpells = canonical.spells.map((spell) => ({
  index: spell.index,
  name: spell.name,
  level: spell.level,
  school: spell.school,
  castingTime: spell.castingTime,
  actionType: spell.actionType,
  range: spell.range,
  duration: spell.duration,
  concentration: spell.concentration,
  ritual: spell.ritual,
  components: spell.components,
  summary: spell.summary,
  classIndexes: spell.classIndexes,
  subclassMemberships: spell.subclassMemberships,
  sourceUrl: spell.sourceUrl,
}));
const actualLevelUpBehaviorChecksum = createHash('sha256').update(JSON.stringify({
  supportedTransitions: canonical.supportedTransitions,
  classes: canonical.classes,
  spells: legacySpells,
})).digest('hex');
assert(actualLevelUpBehaviorChecksum === levelUpBehaviorChecksum, 'existing T-026 Level Up projection changed behaviorally');

const projection = {
  metadata: canonical.metadata,
  races: canonical.races,
  subraces: canonical.subraces,
  raceTraits: canonical.raceTraits,
  raceChoices: canonical.raceChoices,
  equipmentCategories: canonical.equipmentCategories,
  equipment: canonical.equipment,
  spells: canonical.spells,
  calculationRules: canonical.calculationRules,
  featureModifiers: canonical.featureModifiers,
};
const projectionText = `${JSON.stringify(projection, null, 2)}\n`;
assert(!projectionText.includes('`'), 'character creation projection cannot be embedded safely in Go');
const projectionChecksum = createHash('sha256').update(projectionText).digest('hex');
const equipmentByCategory = Object.fromEntries(canonical.equipmentCategories.map(({ index, equipmentIndexes: indexes }) => [index, indexes.length]));
const counts = {
  races: canonical.races.length,
  subraces: canonical.subraces.length,
  raceTraits: canonical.raceTraits.length,
  raceChoices: canonical.raceChoices.length,
  equipmentCategories: canonical.equipmentCategories.length,
  equipment: canonical.equipment.length,
  equipmentByCategory,
  spells: canonical.spells.length,
  calculationRules: canonical.calculationRules.length,
  featureModifiers: canonical.featureModifiers.length,
};
const expectedChecksumLine = `${canonicalChecksum}  srd-5.1-2014-levels-1-5.json\n`;
const typescriptOutput = `// Code generated by scripts/generate-character-creation-rules.mjs. DO NOT EDIT.\n` +
  `export const characterCreationRulesSnapshotId = ${JSON.stringify(canonical.metadata.snapshotId)};\n` +
  `export const characterCreationRulesChecksum = ${JSON.stringify(canonicalChecksum)};\n` +
  `export const characterCreationProjectionChecksum = ${JSON.stringify(projectionChecksum)};\n` +
  `export const characterCreationRuleCounts = ${JSON.stringify(counts, null, 2)} as const;\n` +
  `export const characterCreationRules = ${JSON.stringify(projection, null, 2)} as const;\n`;
const goOutput = `// Code generated by scripts/generate-character-creation-rules.mjs. DO NOT EDIT.\n` +
  `package rules\n\n` +
  `const CharacterCreationSnapshotID = ${JSON.stringify(canonical.metadata.snapshotId)}\n` +
  `const CharacterCreationRulesChecksum = ${JSON.stringify(canonicalChecksum)}\n` +
  `const CharacterCreationProjectionChecksum = ${JSON.stringify(projectionChecksum)}\n` +
  `const CharacterCreationJSON = \`${projectionText}\`\n`;
const outputs = [
  [checksumPath, expectedChecksumLine],
  [typescriptPath, typescriptOutput],
  [goPath, goOutput],
];

if (checkMode) {
  for (const [path, expected] of outputs) {
    let actual;
    try {
      actual = readFileSync(path, 'utf8');
    } catch {
      throw new Error(`generated output is missing: ${path}`);
    }
    if (actual !== expected) throw new Error(`generated output is stale or parity differs: ${path}`);
  }
  process.stdout.write(`character-creation rules check passed: ${canonical.metadata.snapshotId} ${canonicalChecksum} ${JSON.stringify(counts)}\n`);
} else {
  for (const [path, content] of outputs) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  process.stdout.write(`generated character-creation rules: ${canonical.metadata.snapshotId} ${canonicalChecksum} ${JSON.stringify(counts)}\n`);
}
