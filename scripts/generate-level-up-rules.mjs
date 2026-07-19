#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonicalPath = resolve(repositoryRoot, 'rules-data/srd-5.1-2014-levels-1-5.json');
const schemaPath = resolve(repositoryRoot, 'rules-data/srd-5.1-2014-levels-1-5.schema.json');
const checksumPath = resolve(repositoryRoot, 'rules-data/srd-5.1-2014-levels-1-5.sha256');
const typescriptPath = resolve(repositoryRoot, 'frontend/src/rules/generated/levelUpRules.ts');
const goPath = resolve(repositoryRoot, 'backend/internal/rules/generated_level_up_rules.go');
const checkMode = process.argv.includes('--check');

const canonicalText = readFileSync(canonicalPath, 'utf8');
const canonical = JSON.parse(canonicalText);
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const checksum = createHash('sha256').update(canonicalText).digest('hex');

const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
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

const ensureUnique = (values, label) => {
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicate values`);
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const schemaErrors = validateSchema(canonical, schema);
if (schemaErrors.length > 0) throw new Error(`canonical JSON schema validation failed:\n${schemaErrors.join('\n')}`);

const expectedClasses = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
assert(deepEqual(canonical.classes.map((item) => item.index), expectedClasses), 'canonical class indexes or order changed');
assert(deepEqual(canonical.supportedTransitions, [
  { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 },
]), 'supported transitions must be exactly 1 to 2 through 4 to 5');
assert(!canonical.supportedTransitions.some(({ from, to }) => from === 5 || to === 6), 'level 5 to 6 must remain unsupported');

const classIndexes = new Set(expectedClasses);
const subclassIndexes = new Set();
const featureIndexes = new Set();
const optionIndexes = new Set();
const choiceIDs = [];
for (const classRule of canonical.classes) {
  assert(classRule.fixedAverageHp === Math.floor(classRule.hitDie / 2) + 1, `${classRule.index} fixed-average HP is incorrect`);
  assert(deepEqual(classRule.levels.map((level) => level.level), [1, 2, 3, 4, 5]), `${classRule.index} level progression is incomplete`);
  assert(deepEqual(classRule.levels.map((level) => level.proficiencyBonus), [2, 2, 2, 2, 3]), `${classRule.index} proficiency progression is incorrect`);
  assert(deepEqual(classRule.levels.map((level) => level.abilityScoreImprovement), [false, false, false, true, false]), `${classRule.index} ASI marker must occur only at level 4`);
  classRule.subclasses.forEach((subclass) => {
    subclassIndexes.add(subclass.index);
    subclass.featuresByLevel.flatMap((entry) => entry.features).forEach((feature) => featureIndexes.add(feature.index));
  });
  classRule.levels.flatMap((entry) => entry.features).forEach((feature) => featureIndexes.add(feature.index));
  classRule.choices.forEach((choice) => {
    choiceIDs.push(choice.id);
    ensureUnique(choice.options.map((option) => option.index), `${choice.id} options`);
    choice.options.forEach((option) => optionIndexes.add(option.index));
  });
}
ensureUnique(choiceIDs, 'choice IDs');
for (const requiredChoice of ['fighter-fighting-style', 'bard-expertise', 'ranger-favored-enemy', 'ranger-natural-explorer', 'sorcerer-metamagic', 'warlock-eldritch-invocations', 'warlock-pact-boon']) {
  assert(choiceIDs.includes(requiredChoice), `missing required choice ID ${requiredChoice}`);
}
const knownRuleReferences = new Set([...featureIndexes, ...optionIndexes]);
for (const classRule of canonical.classes) {
  for (const choice of classRule.choices) {
    for (const option of choice.options) {
      for (const reference of option.requiredFeatureIndexes ?? []) {
        assert(knownRuleReferences.has(reference), `${choice.id} option ${option.index} has unknown prerequisite ${reference}`);
      }
    }
  }
}

ensureUnique(canonical.spells.map((spell) => spell.index), 'spell indexes');
assert(deepEqual(canonical.spells.map((spell) => spell.index), canonical.spells.map((spell) => spell.index).toSorted()), 'spell indexes must be sorted');
const spellCounts = [0, 1, 2, 3].map((level) => canonical.spells.filter((spell) => spell.level === level).length);
assert(deepEqual(spellCounts, [24, 49, 54, 42]), `unexpected spell counts by level: ${spellCounts.join(',')}`);
const membershipCounts = Object.fromEntries(expectedClasses.map((index) => [index, 0]));
for (const spell of canonical.spells) {
  assert(spell.level >= 0 && spell.level <= 3, `spell ${spell.index} is outside level 0 through 3`);
  spell.classIndexes.forEach((classIndex) => {
    assert(classIndexes.has(classIndex), `spell ${spell.index} references unknown class ${classIndex}`);
    membershipCounts[classIndex]++;
  });
  spell.subclassMemberships.forEach((membership) => {
    assert(classIndexes.has(membership.classIndex), `spell ${spell.index} references unknown subclass class ${membership.classIndex}`);
    assert(subclassIndexes.has(membership.subclassIndex), `spell ${spell.index} references unknown subclass ${membership.subclassIndex}`);
    membership.requiredFeatureIndexes.forEach((reference) => assert(knownRuleReferences.has(reference), `spell ${spell.index} references unknown subclass feature ${reference}`));
  });
}
assert(deepEqual(membershipCounts, {
  barbarian: 0, bard: 62, cleric: 58, druid: 52, fighter: 0, monk: 0,
  paladin: 25, ranger: 31, rogue: 0, sorcerer: 72, warlock: 35, wizard: 100,
}), `class spell membership changed: ${JSON.stringify(membershipCounts)}`);

const byClass = Object.fromEntries(canonical.classes.map((item) => [item.index, item]));
const standardSlots = [[2, 0, 0], [3, 0, 0], [4, 2, 0], [4, 3, 0], [4, 3, 2]];
for (const classIndex of ['bard', 'cleric', 'druid', 'sorcerer', 'wizard']) {
  assert(deepEqual(byClass[classIndex].levels.map((level) => level.spellcasting.slots), standardSlots), `${classIndex} full-caster slots changed`);
}
const halfCasterSlots = [[0, 0, 0], [2, 0, 0], [3, 0, 0], [3, 0, 0], [4, 2, 0]];
for (const classIndex of ['paladin', 'ranger']) {
  assert(deepEqual(byClass[classIndex].levels.map((level) => level.spellcasting?.slots ?? [0, 0, 0]), halfCasterSlots), `${classIndex} half-caster slots changed`);
}
assert(deepEqual(byClass.warlock.levels.map((level) => [level.spellcasting.pactSlots, level.spellcasting.pactSlotLevel]), [[1, 1], [2, 1], [2, 2], [2, 2], [2, 3]]), 'Warlock Pact Magic changed');
assert(deepEqual(byClass.wizard.levels.map((level) => level.spellcasting.wizardSpellbookAdditions), [0, 2, 2, 2, 2]), 'Wizard spellbook additions changed');
for (const classIndex of ['bard', 'ranger', 'sorcerer', 'warlock']) {
  assert(byClass[classIndex].levels.filter((level) => level.spellcasting).every((level) => level.spellcasting.replacementLimit === 1), `${classIndex} replacement limit changed`);
}

const expectedChecksumLine = `${checksum}  srd-5.1-2014-levels-1-5.json\n`;
const levelUpProjection = {
  metadata: canonical.metadata,
  supportedTransitions: canonical.supportedTransitions,
  classes: canonical.classes,
  spells: canonical.spells.map((spell) => ({
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
  })),
};
const levelUpProjectionText = `${JSON.stringify(levelUpProjection, null, 2)}\n`;
const levelUpProjectionChecksum = createHash('sha256').update(levelUpProjectionText).digest('hex');
const typescriptOutput = `// Code generated by scripts/generate-level-up-rules.mjs. DO NOT EDIT.\n` +
  `export const levelUpRulesSnapshotId = ${JSON.stringify(canonical.metadata.snapshotId)};\n` +
  `export const levelUpRulesChecksum = ${JSON.stringify(checksum)};\n` +
  `export const levelUpProjectionChecksum = ${JSON.stringify(levelUpProjectionChecksum)};\n` +
  `export const levelUpRules = ${JSON.stringify(levelUpProjection, null, 2)} as const;\n`;
const goOutput = `// Code generated by scripts/generate-level-up-rules.mjs. DO NOT EDIT.\n` +
  `package rules\n\n` +
  `const SnapshotID = ${JSON.stringify(canonical.metadata.snapshotId)}\n` +
  `const Checksum = ${JSON.stringify(checksum)}\n` +
  `const ProjectionChecksum = ${JSON.stringify(levelUpProjectionChecksum)}\n` +
  `const CanonicalJSON = \`${levelUpProjectionText}\`\n`;

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
    if (actual !== expected) throw new Error(`generated output is stale: ${path}`);
  }
  process.stdout.write(`level-up rules check passed: ${canonical.metadata.snapshotId} ${checksum}\n`);
} else {
  for (const [path, content] of outputs) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  process.stdout.write(`generated level-up rules: ${canonical.metadata.snapshotId} ${checksum}\n`);
}
