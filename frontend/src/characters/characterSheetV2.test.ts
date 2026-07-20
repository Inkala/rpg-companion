import { describe, expect, it } from 'vitest';

import { maraCharacterSheet } from './maraCharacterSheet';
import {
  isCharacterSheetV2,
  isCreateCharacterV2Request,
  parseCharacterSheetDocument,
  validateRuleChoices,
} from './characterSheetV2Validation';
import {
  abilityModifier,
  buildCharacterSheetV2,
  calculateCharacterV2,
  resolveCalculatedValue,
  resetAbilityScoresToCalculated,
  resetToCalculated,
} from './characterSheetV2Calculations';
import type { CharacterSheetV2, CreateCharacterV2RequestDTO } from './characterSheetV2';

describe('CharacterSheetV2 contract', () => {
  it('keeps Mara valid through the strict discriminated parser', () => {
    expect(parseCharacterSheetDocument(maraCharacterSheet)?.schemaVersion).toBe('CharacterSheetV1');
    expect(parseCharacterSheetDocument({ schemaVersion: 'CharacterSheetV3' })).toBeNull();
  });

  it('rejects an incomplete V2 creation request', () => {
    expect(isCreateCharacterV2Request({ schemaVersion: 'CharacterSheetV2' })).toBe(false);
  });

  it('accepts the exact creation request and saved V2 contracts', () => {
    expect(isCreateCharacterV2Request(validRequest())).toBe(true);
    const sheet = validSheet();
    expect(isCharacterSheetV2(sheet)).toBe(true);
    expect(parseCharacterSheetDocument(sheet)?.schemaVersion).toBe('CharacterSheetV2');
  });

  it('rejects unknown fields, malformed unions, unsafe text, excessive arrays, duplicate IDs, and invalid dice', () => {
    const unknown = { ...validRequest(), ownerId: 'must-not-be-client-controlled' };
    expect(isCreateCharacterV2Request(unknown)).toBe(false);

    const malformedUnion = structuredClone(validRequest()) as Record<string, unknown>;
    malformedUnion.abilityScores = {
      mode: 'calculated',
      base: scores(10),
      values: scores(11),
    };
    expect(isCreateCharacterV2Request(malformedUnion)).toBe(false);

    const oversized = structuredClone(validRequest());
    oversized.identity.name = 'x'.repeat(201);
    expect(isCreateCharacterV2Request(oversized)).toBe(false);

    const excessive = structuredClone(validRequest());
    excessive.other = Array.from({ length: 33 }, (_, index) => ({ id: `other-${index}`, title: 'Other', description: 'Safe.' }));
    expect(isCreateCharacterV2Request(excessive)).toBe(false);

    const duplicated = structuredClone(validRequest());
    duplicated.equipment = [
      { source: 'srd', index: 'rope-hempen-50-feet', quantity: 1, equipped: false },
      { source: 'srd', index: 'rope-hempen-50-feet', quantity: 2, equipped: false },
    ];
    expect(isCreateCharacterV2Request(duplicated)).toBe(false);

    const invalidDice = structuredClone(validRequest());
    invalidDice.attacks = [{ id: 'bad-dice', name: 'Bad dice', attackBonus: { mode: 'calculated', ability: 'strength', proficient: true }, damage: [{ dice: '1d6+2', bonus: 0, type: 'piercing' }] }];
    expect(isCreateCharacterV2Request(invalidDice)).toBe(false);

    const inconsistent = validSheet();
    inconsistent.abilityScores.modifiers.strength = 7;
    expect(isCharacterSheetV2(inconsistent)).toBe(false);
  });

  it('validates bounded rule choices against canonical ownership', () => {
    expect(validateRuleChoices({
      raceIndex: 'half-elf',
      subraceIndex: null,
      classIndex: 'fighter',
      level: 1,
      choices: [{
        ruleId: 'half-elf-ability-bonuses',
        optionIds: ['strength', 'wisdom'],
      }],
    })).toEqual([]);
  });

  it('rejects wrong owner, count, duplicates, unavailable options, level, prerequisites, and manual policy', () => {
    const base = { raceIndex: 'human', subraceIndex: null, classIndex: 'fighter', level: 1 };
    expect(validateRuleChoices({ ...base, choices: [{ ruleId: 'half-elf-ability-bonuses', optionIds: ['strength', 'wisdom'] }] })).toContain('half-elf-ability-bonuses belongs to another Race');
    expect(validateRuleChoices({ ...base, choices: [{ ruleId: 'fighter-fighting-style', optionIds: [] }] }).join(' ')).toContain('exactly 1');
    expect(validateRuleChoices({ ...base, choices: [{ ruleId: 'fighter-fighting-style', optionIds: ['fighter-fighting-style-defense', 'fighter-fighting-style-defense'] }] }).join(' ')).toContain('duplicate');
    expect(validateRuleChoices({
      raceIndex: 'half-elf', subraceIndex: null, classIndex: 'fighter', level: 1,
      choices: [{ ruleId: 'half-elf-ability-bonuses', optionIds: ['strength', 'strength'] }],
    }).join(' ')).toContain('duplicate');
    expect(validateRuleChoices({ ...base, choices: [{ ruleId: 'fighter-fighting-style', optionIds: ['fighting-style-defense'] }] }).join(' ')).toContain('unavailable');
    expect(validateRuleChoices({ ...base, classIndex: 'paladin', level: 1, choices: [{ ruleId: 'paladin-fighting-style', optionIds: ['fighting-style-defense'] }] }).join(' ')).toContain('unavailable at level 1');
    expect(validateRuleChoices({
      raceIndex: 'human', subraceIndex: null, classIndex: 'warlock', level: 5,
      choices: [{
        ruleId: 'warlock-eldritch-invocations',
        optionIds: ['eldritch-invocation-thirsting-blade', 'eldritch-invocation-agonizing-blast', 'eldritch-invocation-armor-of-shadows'],
      }],
    }).join(' ')).toContain('unmet prerequisite');
    expect(validateRuleChoices({
      raceIndex: 'human', subraceIndex: null, classIndex: 'ranger', level: 1,
      choices: [{ ruleId: 'ranger-favored-enemy', optionIds: ['dragon'], manualNote: 'Dragon.' }],
    }).join(' ')).toContain('manual note');
    expect(validateRuleChoices({
      raceIndex: 'human', subraceIndex: null, classIndex: 'ranger', level: 1,
      choices: [{ ruleId: 'ranger-favored-enemy', optionIds: [], manualNote: 'Dragon.' }],
    })).toEqual([]);
  });
});

describe('CharacterSheetV2 calculations', () => {
  it('floors negative ability modifiers', () => {
    expect(abilityModifier(9)).toBe(-1);
    expect(abilityModifier(1)).toBe(-5);
  });

  it('calculates a canonical Half-Elf Fighter without inventing manual data', () => {
    const result = calculateCharacterV2({
      id: 'half-elf-fighter',
      classIndex: 'fighter',
      subclassIndex: null,
      level: 1,
      race: { source: 'srd', index: 'half-elf' },
      subraceIndex: null,
      abilityScores: {
        mode: 'calculated',
        base: { strength: 15, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 8 },
      },
      ruleChoices: [
        { ruleId: 'half-elf-ability-bonuses', optionIds: ['strength', 'wisdom'] },
        { ruleId: 'half-elf-language', optionIds: ['dwarvish'] },
        { ruleId: 'half-elf-skill-versatility', optionIds: ['skill-perception', 'skill-stealth'] },
        { ruleId: 'fighter-fighting-style', optionIds: ['fighter-fighting-style-defense'] },
      ],
      proficiencies: { perception: 'proficient', skills: [] },
      hitPointProgression: { levelGains: [] },
      defense: { mode: 'armor', armorIndex: 'chain-mail', shieldIndex: 'shield' },
      equipment: [
        { source: 'srd', index: 'chain-mail', quantity: 1, equipped: true },
        { source: 'srd', index: 'shield', quantity: 1, equipped: true },
      ],
    });

    expect(result.finalAbilityScores).toEqual({
      strength: 16, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 13, charisma: 10,
    });
    expect(result.armorClass).toBe(19);
  });

  it('preserves overrides while exposing a new calculated suggestion', () => {
    expect(resolveCalculatedValue(17, { value: 15, reason: 'Transferred from paper.' })).toEqual({
      resolved: { value: 15, provenance: { kind: 'manual-override', reason: 'Transferred from paper.' } },
      calculatedSuggestion: 17,
    });
    expect(resetToCalculated({ calculatedValue: 17, canReset: false })).toBeNull();
    expect(resetToCalculated({ calculatedValue: 17, canReset: true })).toEqual({
      value: 17,
      provenance: { kind: 'calculated', ruleId: 'character-sheet-v2' },
    });
  });

  it('resets ability scores only with retained base scores and valid current canonical choices', () => {
    const input = {
      ...baseCalculation(),
      race: { source: 'srd' as const, index: 'half-elf' },
      ruleChoices: [{ ruleId: 'half-elf-ability-bonuses', optionIds: ['strength', 'wisdom'] }],
    };
    expect(resetAbilityScoresToCalculated(input)).toBeNull();
    expect(resetAbilityScoresToCalculated({ ...input, retainedBase: scores(10), ruleChoices: [] })).toBeNull();
    expect(resetAbilityScoresToCalculated({ ...input, retainedBase: scores(10) })).toEqual({
      strength: 11, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 11, charisma: 12,
    });
  });

  it('never automates a manual Race and ignores manual equipment', () => {
    const canonical = baseCalculation();
    const withManualEquipment = calculateCharacterV2({
      ...canonical,
      equipment: [{ source: 'manual', id: 'plate-armor', name: 'Plate Armor', category: 'Other', quantity: 1, equipped: true }],
    });
    expect(withManualEquipment.armorClass).toBe(10);
    expect(() => calculateCharacterV2({ ...canonical, race: { source: 'manual', name: 'Custom lineage' } })).toThrow('manual Race');
    const request = validRequest();
    request.identity.race = { source: 'manual', name: 'Custom lineage' };
    request.ruleChoices = [{ ruleId: 'fighter-fighting-style', optionIds: ['fighter-fighting-style-archery'] }];
    expect(isCreateCharacterV2Request(request)).toBe(false);
    request.abilityScores = { mode: 'imported', values: scores(10), reason: 'Transferred.' };
    request.combat.speedOverride = { value: 30, reason: 'Transferred Race speed.' };
    expect(isCreateCharacterV2Request(request)).toBe(true);
  });

  it('keeps imported scores unchanged across Race changes and applies minimum-one rolled HP gains', () => {
    const imported = baseCalculation();
    expect(calculateCharacterV2(imported).finalAbilityScores).toEqual(scores(10));
    expect(calculateCharacterV2({ ...imported, race: { source: 'srd', index: 'tiefling' } }).finalAbilityScores).toEqual(scores(10));
    const fragileWizard = calculateCharacterV2({
      ...baseCalculation(), classIndex: 'wizard', level: 2,
      abilityScores: { mode: 'imported', values: { ...scores(10), constitution: 1 }, reason: 'Transferred.' },
      hitPointProgression: { levelGains: [{ level: 2, mode: 'rolled', roll: 1 }] },
    });
    expect(fragileWizard.maximumHitPoints).toBe(2);
  });

  it('applies heavy-armor speed, Dwarf, Fast Movement, Monk shield, and explicit formula rules', () => {
    const heavy = calculateCharacterV2({
      ...baseCalculation(),
      classIndex: 'fighter',
      race: { source: 'srd', index: 'human' },
      abilityScores: { mode: 'calculated', base: { ...scores(10), strength: 8 } },
      defense: { mode: 'armor', armorIndex: 'plate-armor' },
      equipment: [{ source: 'srd', index: 'plate-armor', quantity: 1, equipped: true }],
    });
    expect(heavy.speedFt).toBe(20);
    const dwarf = calculateCharacterV2({
      ...baseCalculation(),
      classIndex: 'fighter',
      race: { source: 'srd', index: 'dwarf' },
      abilityScores: { mode: 'calculated', base: { ...scores(10), strength: 8 } },
      defense: { mode: 'armor', armorIndex: 'plate-armor' },
      equipment: [{ source: 'srd', index: 'plate-armor', quantity: 1, equipped: true }],
    });
    expect(dwarf.speedFt).toBe(25);
    expect(() => calculateCharacterV2({
      ...baseCalculation(), classIndex: 'monk', level: 2,
      hitPointProgression: { levelGains: [{ level: 2, mode: 'fixed-average' }] },
      defense: { mode: 'unarmored', shieldIndex: 'shield', formulaId: 'monk-unarmored-defense' },
      equipment: [{ source: 'srd', index: 'shield', quantity: 1, equipped: true }],
    })).toThrow('unavailable');
    expect(() => calculateCharacterV2({
      ...baseCalculation(), classIndex: 'barbarian', defense: { mode: 'unarmored', formulaId: 'barbarian-unarmored-defense' },
    })).not.toThrow();
  });
});

const scores = (value: number) => ({
  strength: value,
  dexterity: value,
  constitution: value,
  intelligence: value,
  wisdom: value,
  charisma: value,
});

const validRequest = (): CreateCharacterV2RequestDTO => ({
  schemaVersion: 'CharacterSheetV2',
  creationSource: 'guided',
  identity: {
    name: 'Ari', gender: 'Other', race: { source: 'srd', index: 'human' }, background: 'Sage',
    class: { source: 'srd', index: 'fighter' }, level: 1, subclass: null,
  },
  abilityScores: { mode: 'calculated', base: scores(10) },
  proficiencies: { perception: 'none', skills: [] },
  hitPointProgression: { levelGains: [] },
  combat: { defense: { mode: 'manual', armorClass: 10, reason: 'Transferred value.' } },
  ruleChoices: [
    { ruleId: 'human-extra-language', optionIds: ['dwarvish'] },
    { ruleId: 'fighter-fighting-style', optionIds: ['fighter-fighting-style-archery'] },
  ],
  attacks: [], spellcasting: { mode: 'none' }, features: [], equipment: [], other: [],
});

const validSheet = (): CharacterSheetV2 => buildCharacterSheetV2(validRequest());

const baseCalculation = () => ({
  id: 'base', classIndex: 'fighter', subclassIndex: null, level: 1,
  race: { source: 'srd' as const, index: 'human' }, subraceIndex: null,
  abilityScores: { mode: 'imported' as const, values: scores(10), reason: 'Transferred.' },
  ruleChoices: [], proficiencies: { perception: 'none' as const, skills: [] },
  hitPointProgression: { levelGains: [] },
  defense: { mode: 'manual' as const, armorClass: 10, reason: 'Transferred.' }, equipment: [],
});
