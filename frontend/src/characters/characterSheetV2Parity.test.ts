import { describe, expect, it } from 'vitest';

import fixture from '../../../testdata/character-sheet-v2-parity.json';
import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { levelUpRules } from '../rules/generated/levelUpRules';
import type { CharacterCalculationInput, CharacterCalculationOutput, CreateCharacterV2RequestDTO } from './characterSheetV2';
import { buildCharacterSheetV2, calculateCharacterV2 } from './characterSheetV2Calculations';
import { isCharacterSheetV2, isCreateCharacterV2Request } from './characterSheetV2Validation';

describe('CharacterSheetV2 shared TypeScript/Go parity fixture', () => {
  it('pins the canonical snapshot and every required coverage axis', () => {
    expect(fixture.snapshotId).toBe(characterCreationRules.metadata.snapshotId);
    expect(fixture.coverage.classIndexes).toEqual(levelUpRules.classes.map((entry) => entry.index));
    expect(fixture.coverage.levels).toEqual([1, 2, 3, 4, 5]);
    expect(fixture.coverage.raceIndexes).toEqual(characterCreationRules.races.map((entry) => entry.index));
    expect(fixture.coverage.subraceIndexes).toEqual(characterCreationRules.subraces.map((entry) => entry.index));
    expect(fixture.coverage.abilityModes).toEqual(['calculated', 'imported']);
    expect(fixture.coverage.defenseVariants).toEqual(['armor', 'unarmored', 'manual']);
    expect(fixture.coverage.casterTypes).toEqual(['full', 'half', 'pact', 'none']);
    expect(fixture.coverage.featureModifierIds).toEqual(characterCreationRules.featureModifiers.map((entry) => entry.id));
  });

  it('produces byte-equivalent normalized outputs for shared calculation cases', () => {
    for (const entry of fixture.cases) {
      const actual = calculateCharacterV2(entry.input as CharacterCalculationInput);
      expect(actual, entry.input.id).toEqual(entry.expected);
      expect(JSON.stringify(actual), entry.input.id).toBe(JSON.stringify(entry.expected));
    }
  });

  it('covers all twelve classes at every level and preserves canonical spell progression', () => {
    for (const classIndex of fixture.coverage.classIndexes) {
      for (const level of fixture.coverage.levels) {
        const classRule = levelUpRules.classes.find((entry) => entry.index === classIndex);
        const levelRule = classRule?.levels.find((entry) => entry.level === level);
        const result = calculateCharacterV2(matrixInput(classIndex, level));
        expect(result.proficiencyBonus).toBe(levelRule?.proficiencyBonus);
        expect(result.spellcasting?.slots ?? null).toEqual(levelRule?.spellcasting === null
          ? null
          : levelRule?.spellcasting.mode === 'pact-known'
            ? pactSlots(levelRule.spellcasting.pactSlots, levelRule.spellcasting.pactSlotLevel)
            : levelRule?.spellcasting.slots);
        expect(result.spellcasting?.availableSpellLevels ?? null).toEqual(
          levelRule?.spellcasting?.availableSpellLevels ?? null,
        );
      }
    }
  });

  it('executes every canonical Race and supported subrace without double-applying bonuses', () => {
    for (const raceIndex of fixture.coverage.raceIndexes) {
      const race = characterCreationRules.races.find((entry) => entry.index === raceIndex)!;
      const result = calculateCharacterV2({
        ...matrixInput('fighter', 1),
        id: raceIndex,
        race: { source: 'srd', index: raceIndex },
        ruleChoices: raceIndex === 'half-elf'
          ? [{ ruleId: 'half-elf-ability-bonuses', optionIds: ['strength', 'wisdom'] }]
          : [],
      });
      expect(result.speedFt).toBe(race.speedFt);
      for (const bonus of race.abilityBonuses) expect(result.finalAbilityScores[bonus.ability]).toBe(10 + bonus.bonus);
    }
    for (const subraceIndex of fixture.coverage.subraceIndexes) {
      const subrace = characterCreationRules.subraces.find((entry) => entry.index === subraceIndex)!;
      const result = calculateCharacterV2({
        ...matrixInput('fighter', 1), id: subraceIndex,
        race: { source: 'srd', index: subrace.raceIndex }, subraceIndex,
      });
      for (const ability of ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const) {
        const raceBonus = characterCreationRules.races.find((entry) => entry.index === subrace.raceIndex)?.abilityBonuses
          .find((bonus) => bonus.ability === ability)?.bonus ?? 0;
        const subraceBonus = subrace.abilityBonuses.find((bonus) => bonus.ability === ability)?.bonus ?? 0;
        expect(result.finalAbilityScores[ability]).toBe(10 + raceBonus + subraceBonus);
      }
    }
  });

  it('shares the corrected defense, attack, spell, feature, subclass, HP, and union contract with Go', () => {
    const request = fixture.contractCase.input as CreateCharacterV2RequestDTO;
    expect(isCreateCharacterV2Request(request)).toBe(true);
    const sheet = buildCharacterSheetV2(request);
    expect(isCharacterSheetV2(sheet)).toBe(true);
    expect({
      defense: sheet.combat.defense,
      proficiencyBonus: sheet.combat.proficiencyBonus,
      armorClass: sheet.combat.armorClass,
      attack: {
        id: sheet.attacks[0].id, attackBonus: sheet.attacks[0].attackBonus,
        attackBonusInput: sheet.attacks[0].attackBonusInput, damage: sheet.attacks[0].damage,
      },
      spell: sheet.spellcasting?.spells[0],
      preparedSpellIds: sheet.spellcasting?.preparedSpellIds,
      feature: sheet.features[0], subclass: sheet.identity.subclass,
      hitPointLevelGains: sheet.hitPointProgression.levelGains,
    }).toEqual(fixture.contractCase.expected);
    expect(fixture.contractCase.invalidUnionKeys).toEqual([
      'RuleSelection', 'AbilityScoreInput', 'DefenseInput', 'HitPointLevelGain',
      'AttackBonusInput', 'CharacterSpellInput', 'CharacterFeatureInput', 'CharacterEquipmentInput',
    ]);
  });

  it('shares every final manual identity fallback and lossless feature projection with Go', () => {
    for (const entry of fixture.fallbackCases) {
      const request = entry.input as CreateCharacterV2RequestDTO;
      expect(isCreateCharacterV2Request(request), entry.id).toBe(true);
      const sheet = buildCharacterSheetV2(request);
      expect(isCharacterSheetV2(sheet), entry.id).toBe(true);
      expect({
        proficiencyBonus: sheet.combat.proficiencyBonus.value,
        maximumHitPoints: sheet.hitPointProgression.maximum.value,
        speedFt: sheet.combat.speedFt.value,
        armorClass: sheet.combat.armorClass.value,
        spellcasting: sheet.spellcasting,
        featureIds: sheet.features.map((feature) => feature.id),
        featureSources: sheet.features.map((feature) => feature.source),
        featureCategories: sheet.features.map((feature) => feature.category),
      }, entry.id).toEqual(entry.expected);
    }
  });
});

const matrixInput = (classIndex: string, level: number): CharacterCalculationInput => ({
  id: `${classIndex}-${level}`,
  classIndex,
  subclassIndex: null,
  level,
  race: { source: 'srd', index: 'human' },
  subraceIndex: null,
  abilityScores: {
    mode: 'calculated',
    base: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
  },
  ruleChoices: [],
  proficiencies: { perception: 'none', skills: [] },
  hitPointProgression: {
    levelGains: Array.from({ length: Math.max(0, level - 1) }, (_, index) => ({
      level: index + 2,
      mode: 'fixed-average' as const,
    })),
  },
  defense: { mode: 'manual', armorClass: 10, reason: 'Fixture.' },
  equipment: [],
});

const pactSlots = (count: number | undefined, level: number | undefined): number[] => {
  const slots = [0, 0, 0];
  if (count && level) slots[level - 1] = count;
  return slots;
};

const _outputContract: CharacterCalculationOutput | null = null;
void _outputContract;
