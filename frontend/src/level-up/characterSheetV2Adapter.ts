import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { levelUpRules } from '../rules/generated/levelUpRules';
import type { CharacterSheetV1, CharacterSheetFeature } from '../characters/characterSheet';
import type { CharacterSheetV2, CharacterV2DTO, RuleSelection } from '../characters/characterSheetV2';

const skillAbilities: Record<string, keyof CharacterSheetV2['abilityScores']['modifiers']> = {
  acrobatics: 'dexterity', 'animal handling': 'wisdom', arcana: 'intelligence', athletics: 'strength',
  deception: 'charisma', history: 'intelligence', insight: 'wisdom', intimidation: 'charisma',
  investigation: 'intelligence', medicine: 'wisdom', nature: 'intelligence', perception: 'wisdom',
  performance: 'charisma', persuasion: 'charisma', religion: 'intelligence',
  'sleight of hand': 'dexterity', stealth: 'dexterity', survival: 'wisdom',
};

export const characterSheetV2ToLevelUpAdapter = (
  sheet: CharacterSheetV2,
  character: CharacterV2DTO,
): CharacterSheetV1 => {
  const className = selectionName(sheet.identity.class, 'class');
  const subclass = sheet.identity.subclass ? selectionName(sheet.identity.subclass, 'subclass') : undefined;
  const race = selectionName(sheet.identity.race, 'race');
  const proficiency = sheet.combat.proficiencyBonus.value;
  const featureInputs: CharacterSheetFeature[] = sheet.features.map((feature) => ({
    id: feature.id,
    name: feature.name,
    category: feature.category,
    source: {
      rulesVersion: '2014',
      status: feature.source === 'srd' ? 'confirmed' : 'needs-confirmation',
      note: feature.source === 'manual' ? feature.provenance.note : undefined,
    },
    tags: [feature.source],
    summary: feature.description,
    includeInReference: true,
  }));
  for (const choice of sheet.ruleChoices) {
    for (const optionID of choice.optionIds) {
      if (featureInputs.some((feature) => feature.id === optionID)) continue;
      featureInputs.push({
        id: optionID,
        name: optionID,
        category: 'Class choice',
        source: { rulesVersion: '2014', status: 'confirmed' },
        tags: ['choice'],
        summary: 'Previously selected canonical character choice.',
        includeInReference: false,
      });
    }
  }

  return {
    schemaVersion: 'CharacterSheetV1',
    ruleset: { system: 'dnd5e', version: '2014', sourceStatus: 'audited-sample' },
    identity: {
      name: sheet.identity.name,
      ancestry: race,
      background: sheet.identity.background,
      classes: [{ name: className, level: sheet.identity.level, ...(subclass ? { subclass } : {}) }],
    },
    summary: {
      displayLine: `${race} ${className} - Level ${sheet.identity.level}`,
      supportingLine: [sheet.identity.gender, sheet.identity.background].join(' · '),
      landingConcept: sheet.summary.landingConcept,
      featuredAbilities: [...sheet.summary.featuredAbilities],
      referenceSections: [
        { id: 'actions', label: 'Actions', defaultOpen: true },
        { id: 'features', label: 'Features', defaultOpen: true },
        { id: 'spells', label: 'Spells', defaultOpen: sheet.spellcasting.spells.length > 0 },
      ],
    },
    abilities: { scores: Object.fromEntries(Object.entries(sheet.abilityScores.scores).map(([key, resolved]) => [key, resolved.value])) as CharacterSheetV1['abilities']['scores'] },
    combat: {
      hitPoints: { ...character.hitPoints, temporary: 0 },
      armorClass: { value: sheet.combat.armorClass.value },
      initiative: sheet.combat.initiative.value,
      speed: [{ type: 'walk', feet: sheet.combat.speedFt.value }],
      proficiencyBonus: proficiency,
      passivePerception: { value: sheet.combat.passivePerception.value },
      concentration: null,
    },
    proficiencies: {
      savingThrows: { values: [] },
      skills: sheet.proficiencies.skills.map((skill) => {
        const ability = skillAbilities[skill.name.trim().toLowerCase()] ?? 'wisdom';
        const multiplier = skill.rank === 'expertise' ? 2 : 1;
        return {
          name: skill.name,
          proficient: true,
          modifier: sheet.abilityScores.modifiers[ability] + proficiency * multiplier,
        };
      }),
      weapons: { values: [] }, armor: { values: [] }, tools: { values: [] }, languages: { values: [] },
    },
    actions: sheet.attacks.map((attack) => ({
      id: attack.id, name: attack.name, kind: 'attack', section: 'actions', actionType: 'action',
      attackBonus: attack.attackBonus.value, damage: attack.damage, summary: attack.damage.map((entry) => `${entry.dice} ${entry.type}`).join(', '), meta: [],
    })),
    features: featureInputs,
    spellcasting: sheet.spellcasting.ability === null ? null : {
      ability: sheet.spellcasting.ability,
      spellSaveDC: sheet.spellcasting.spellSaveDC === null ? null : { value: sheet.spellcasting.spellSaveDC.value },
      spellAttackBonus: sheet.spellcasting.spellAttackBonus === null ? null : { value: sheet.spellcasting.spellAttackBonus.value },
      slots: sheet.spellcasting.slots.map(({ level, max, used }) => ({ level, max, used })),
      spells: sheet.spellcasting.spells.map((spell) => ({
        id: spell.id, name: spell.name, level: spell.level,
        actionType: spell.castingTime, castingTime: spell.castingTime, duration: spell.duration,
        concentration: spell.concentration, summary: spell.description,
        meta: [spell.school, spell.range, ...spell.components],
        preparedOrKnown: spell.state === 'prepared' || spell.state === 'always-prepared' ? 'prepared' : 'known',
        source: { rulesVersion: '2014', status: spell.canonicalIndex === null ? 'needs-confirmation' : 'confirmed' },
      })),
    },
    equipment: {
      armor: { values: [] }, weapons: [], packsAndGear: { values: sheet.equipment.map((entry) => entry.source === 'manual' ? entry.name : entry.index) },
      tools: { values: [] }, languages: { values: [] }, currency: null,
    },
    personality: { traits: [], ideals: [], bonds: [], flaws: [], notes: sheet.other.map((entry) => `${entry.title}: ${entry.description}`) },
    audit: { source: 'CharacterSheetV2 Level Up adapter', needsConfirmation: [], rulesVersionWarnings: [], deferredCorrections: [] },
  };
};

const selectionName = (selection: RuleSelection, kind: 'race' | 'class' | 'subclass') => {
  if (selection.source === 'manual') return selection.name;
  if (kind === 'race') {
    return characterCreationRules.races.find((entry) => entry.index === selection.index)?.name ??
      characterCreationRules.subraces.find((entry) => entry.index === selection.index)?.name ?? selection.index;
  }
  if (kind === 'class') return levelUpRules.classes.find((entry) => entry.index === selection.index)?.name ?? selection.index;
  for (const classRule of levelUpRules.classes) {
    const subclass = classRule.subclasses.find((entry) => entry.index === selection.index);
    if (subclass) return subclass.name;
  }
  return selection.index;
};
