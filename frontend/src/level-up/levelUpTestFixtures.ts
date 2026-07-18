import { buildGeneratedFighterCharacterSheet } from '../character-creation/generatedFighterBuilds';
import type { CharacterDTO } from '../characters/apiTypes';
import type {
  CharacterSheetFeature,
  CharacterSheetSpell,
  CharacterSheetV1,
} from '../characters/characterSheet';
import { levelUpRules } from '../rules/generated/levelUpRules';
import type { CanonicalClassRule, LevelUpPlan } from './stateMachine';
import {
  createLevelUpDraft,
  eligibleLevelUpSpells,
  isAlwaysPreparedLevelUpSpell,
  preparedLevelUpSpellCount,
  targetLevelUpChoiceRules,
  type CanonicalLevelUpSpell,
  type LevelUpDraft,
} from './LevelUpFlow';

const classRules = levelUpRules.classes as unknown as readonly CanonicalClassRule[];
const spells = levelUpRules.spells as unknown as readonly CanonicalLevelUpSpell[];

export const viableCharacterAt = (className: string, level: number): CharacterDTO => {
  const classRule = classRules.find((candidate) => candidate.name === className);
  if (!classRule) throw new Error(`Missing class fixture rule for ${className}.`);
  const sheet = structuredClone(buildGeneratedFighterCharacterSheet('strength-melee-fighter', `${className} Hero`));
  const subclass = level >= classRule.subclassDecisionLevel ? classRule.subclasses[0]?.name : undefined;
  sheet.identity.classes = [{ name: className, level, ...(subclass ? { subclass } : {}) }];
  sheet.summary.displayLine = `Human ${className} - Level ${level}`;
  sheet.summary.referenceSections = [
    { id: 'actions', label: 'Actions', defaultOpen: true },
    { id: 'features', label: 'Features', defaultOpen: false },
    { id: 'spells', label: 'Spells', defaultOpen: false },
  ];
  sheet.abilities.scores = {
    strength: 10, dexterity: 10, constitution: 10,
    intelligence: 10, wisdom: 10, charisma: 10,
  };
  sheet.combat.proficiencyBonus = classRule.levels[level - 1].proficiencyBonus;
  sheet.combat.initiative = 0;
  sheet.combat.hitPoints = { current: 20, max: 20, temporary: 0 };
  sheet.proficiencies.skills = standardSkills.map((name) => ({ name, proficient: true, modifier: sheet.combat.proficiencyBonus }));
  sheet.proficiencies.tools.values = ["Thieves' tools"];
  sheet.features = representedFeatures(classRule, level);
  sheet.spellcasting = representedSpellcasting(classRule, level);

  return {
    id: `22222222-2222-2222-2222-${String(classRules.indexOf(classRule) + 1).padStart(12, '0')}`,
    ownerSubjectId: '33333333-3333-3333-3333-333333333333',
    name: `${className} Hero`,
    className,
    subclassName: subclass ?? null,
    level,
    ancestry: 'Human',
    background: 'Sage',
    abilityScores: { ...sheet.abilities.scores },
    hitPoints: { current: 20, max: 20 },
    armorClass: sheet.combat.armorClass.value ?? 10,
    speedFt: sheet.combat.speed[0].feet,
    referencePayload: sheet,
    createdAt: '2026-07-07T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  };
};

export const completeDraftFor = (
  plan: LevelUpPlan,
  sheet: CharacterSheetV1,
): LevelUpDraft => {
  const draft = createLevelUpDraft(plan);
  draft.retainedConfirmed = true;
  if (plan.targetRule.abilityScoreImprovement) draft.abilityIncreases = { strength: 2 };

  const requiredChoices = [
    ...plan.missingPrerequisites.filter((item) => item.kind === 'class-choice').map((item) => ({ rule: item.rule, level: plan.fromLevel })),
    ...targetLevelUpChoiceRules(plan, sheet).map((rule) => ({ rule, level: plan.toLevel })),
  ];
  for (const { rule, level } of requiredChoices) {
    const count = rule.selectionCountByLevel[String(level)] ?? 0;
    const available = rule.options.filter((option) => (option.minimumLevel ?? 1) <= level && (option.requiredFeatureIndexes?.length ?? 0) === 0);
    draft.choices[rule.id] = available.length >= count
      ? { optionIds: available.slice(0, count).map((option) => option.index), manualNote: '' }
      : { optionIds: [], manualNote: `Reviewed ${rule.id} choice.` };
  }

  const progression = plan.targetRule.spellcasting;
  if (!progression) return draft;
  const existing = sheet.spellcasting?.spells ?? [];
  const existingIds = new Set(existing.map((spell) => spell.id));
  const eligible = eligibleLevelUpSpells(plan, sheet, draft);
  const currentCantripCount = existing.filter((spell) => spell.level === 0).length;
  const neededCantrips = Math.max(0, (progression.cantripsKnown ?? 0) - currentCantripCount);
  draft.spellAdditions.push(...eligible.filter((spell) => spell.level === 0 && !existingIds.has(spell.index)).slice(0, neededCantrips).map((spell) => spell.index));

  if (progression.mode === 'known' || progression.mode === 'pact-known') {
    const needed = Math.max(0, (progression.spellsKnown ?? 0) - existing.filter((spell) => spell.level > 0).length);
    draft.spellAdditions.push(...eligible.filter((spell) => spell.level > 0 && !existingIds.has(spell.index)).slice(0, needed).map((spell) => spell.index));
  }
  if (progression.mode === 'spellbook-prepared') {
    draft.wizardSpellbookAdditions = eligible
      .filter((spell) => spell.level > 0 && !existingIds.has(spell.index))
      .slice(0, progression.wizardSpellbookAdditions ?? 0)
      .map((spell) => spell.index);
  }
  if (progression.mode === 'prepared' || progression.mode === 'spellbook-prepared') {
    const additions = progression.mode === 'spellbook-prepared'
      ? draft.wizardSpellbookAdditions
      : eligible.filter((spell) => spell.level > 0 && !existingIds.has(spell.index)).map((spell) => spell.index);
    const preparedOptions = [
      ...existing.filter((spell) => spell.level > 0).map((spell) => spell.id),
      ...additions,
    ].filter((id) => !isAlwaysPreparedLevelUpSpell(id, plan, sheet, draft));
    draft.preparedSpellIds = [...new Set(preparedOptions)].slice(0, preparedLevelUpSpellCount(plan, sheet, draft));
    if (progression.mode === 'prepared') {
      draft.spellAdditions.push(...draft.preparedSpellIds.filter((id) => !existingIds.has(id)));
      draft.spellAdditions = [...new Set(draft.spellAdditions)];
    }
  }
  return draft;
};

const representedFeatures = (classRule: CanonicalClassRule, level: number): CharacterSheetFeature[] => {
  const features: CharacterSheetFeature[] = [];
  for (const choice of classRule.choices) {
    if (choice.fromLevel > level) continue;
    const count = choice.selectionCountByLevel[String(level)] ?? 0;
    if (choice.options.length === 0) {
      features.push(canonicalFeature(choice.id, choice.id, `${classRule.name} choice`));
      continue;
    }
    features.push(...choice.options.slice(0, count).map((option) => canonicalFeature(option.index, option.name, `${classRule.name} choice`)));
  }
  const subclass = classRule.subclasses[0];
  if (level >= classRule.subclassDecisionLevel) {
    for (const featureLevel of subclass?.featuresByLevel ?? []) {
      if (featureLevel.level <= level) features.push(...featureLevel.features.map((feature) => canonicalFeature(feature.index, feature.name, `${subclass.name} feature`)));
    }
  }
  return features;
};

const representedSpellcasting = (classRule: CanonicalClassRule, level: number): CharacterSheetV1['spellcasting'] => {
  const progression = classRule.levels[level - 1].spellcasting;
  if (!progression) return null;
  const classSpells = spells.filter((spell) => spell.classIndexes.includes(classRule.index));
  const cantrips = classSpells.filter((spell) => spell.level === 0).slice(0, progression.cantripsKnown ?? 0);
  let leveledCount = 0;
  if (progression.mode === 'known' || progression.mode === 'pact-known') leveledCount = progression.spellsKnown ?? 0;
  if (progression.mode === 'prepared') leveledCount = Math.max(1, level);
  if (progression.mode === 'spellbook-prepared') leveledCount = 6 + (level - 1) * 2;
  const leveled = classSpells.filter((spell) => spell.level > 0 && progression.availableSpellLevels.includes(spell.level)).slice(0, leveledCount);
  return {
    ability: progression.ability as 'wisdom' | 'intelligence' | 'charisma',
    spellSaveDC: { value: 10, needsConfirmation: false, note: 'Canonical fixture.' },
    spellAttackBonus: { value: 2, needsConfirmation: false, note: 'Canonical fixture.' },
    slots: progression.mode === 'pact-known'
      ? [{ level: progression.pactSlotLevel ?? 1, max: progression.pactSlots ?? 0, used: 0 }]
      : (progression.slots ?? []).flatMap((maximum, index) => maximum > 0 ? [{ level: index + 1, max: maximum, used: 0 }] : []),
    spells: [...cantrips, ...leveled].map((spell) => representedSpell(spell, progression.mode === 'known' || progression.mode === 'pact-known' ? 'known' : 'prepared')),
  };
};

const representedSpell = (spell: CanonicalLevelUpSpell, preparedOrKnown: CharacterSheetSpell['preparedOrKnown']): CharacterSheetSpell => ({
  id: spell.index,
  name: spell.name,
  level: spell.level,
  actionType: 'Action',
  castingTime: '1 action',
  duration: 'Instantaneous',
  concentration: false,
  summary: 'Canonical test spell.',
  meta: [],
  preparedOrKnown,
  source: { rulesVersion: '2014', status: 'confirmed' },
});

const canonicalFeature = (id: string, name: string, category: string): CharacterSheetFeature => ({
  id, name, category,
  source: { rulesVersion: '2014', status: 'confirmed' },
  tags: [], summary: 'Represented canonical feature.', includeInReference: true,
});

const standardSkills = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History',
  'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception',
  'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival',
];
