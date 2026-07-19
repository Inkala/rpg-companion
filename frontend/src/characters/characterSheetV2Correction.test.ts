import { describe, expect, it } from 'vitest';

import type { CreateCharacterV2RequestDTO } from './characterSheetV2';
import { buildCharacterSheetV2 } from './characterSheetV2Calculations';
import {
  isCharacterSheetV2,
  isCreateCharacterV2Request,
} from './characterSheetV2Validation';

describe('corrected CharacterSheetV2 request contract', () => {
  it('accepts exact defense variants and rejects missing, incompatible, cross-variant, and inert manual equipment', () => {
    const manual = correctedFighterRequest();
    expect(isCreateCharacterV2Request(manual)).toBe(true);

    const armor = correctedFighterRequest();
    armor.combat.defense = { mode: 'armor', armorIndex: 'chain-mail', shieldIndex: 'shield' };
    armor.equipment = [
      { source: 'srd', index: 'chain-mail', quantity: 1, equipped: true },
      { source: 'srd', index: 'shield', quantity: 1, equipped: true },
    ];
    expect(isCreateCharacterV2Request(armor)).toBe(true);

    const unarmored = correctedFighterRequest(3);
    unarmored.combat.defense = { mode: 'unarmored', formulaId: 'standard-unarmored' };
    expect(isCreateCharacterV2Request(unarmored)).toBe(true);

    for (const invalid of [
      withDefense(armor, { mode: 'armor', armorIndex: 'shield' }),
      withDefense(armor, { mode: 'armor', armorIndex: 'chain-mail', shieldIndex: 'chain-mail' }),
      withDefense(armor, { mode: 'armor', armorIndex: 'plate-armor' }),
      withDefense(unarmored, { mode: 'unarmored', formulaId: 'monk-unarmored-defense' }),
      withDefense({ ...unarmored, equipment: [{ source: 'srd', index: 'chain-mail', quantity: 1, equipped: true }] }, { mode: 'unarmored', formulaId: 'standard-unarmored' }),
      withDefense({ ...armor, equipment: [{ source: 'manual', id: 'chain-mail', name: 'Chain Mail', category: 'Other', quantity: 1, equipped: true }] }, { mode: 'armor', armorIndex: 'chain-mail' }),
      withDefense(manual, { mode: 'manual', armorClass: 14, reason: 'Transferred.', armorIndex: '' }),
    ]) expect(isCreateCharacterV2Request(invalid)).toBe(false);
  });

  it('requires deterministic attack inputs, one damage expression, and supported spellcasting ability', () => {
    const request = correctedFighterRequest();
    expect(isCreateCharacterV2Request(request)).toBe(true);
    expect(buildCharacterSheetV2(request).attacks[0]).toMatchObject({
      attackBonus: { value: 5, provenance: { kind: 'calculated', ruleId: 'attack-bonus' } },
      attackBonusInput: { ability: 'strength', proficient: true },
    });

    const dexterity = correctedFighterRequest();
    dexterity.attacks[0].attackBonus = { mode: 'calculated', ability: 'dexterity', proficient: false };
    expect(buildCharacterSheetV2(dexterity).attacks[0].attackBonus.value).toBe(2);

    const manual = correctedFighterRequest();
    manual.attacks[0].attackBonus = { mode: 'manual-override', value: 7, reason: 'Campaign weapon.' };
    expect(buildCharacterSheetV2(manual).attacks[0]).toMatchObject({
      attackBonus: { value: 7, provenance: { kind: 'manual-override', reason: 'Campaign weapon.' } },
      attackBonusInput: null,
    });

    const invalidSpellcasting = correctedFighterRequest();
    invalidSpellcasting.attacks[0].attackBonus = { mode: 'calculated', ability: 'spellcasting', proficient: true };
    expect(isCreateCharacterV2Request(invalidSpellcasting)).toBe(false);
    const noDamage = correctedFighterRequest();
    noDamage.attacks[0].damage = [];
    expect(isCreateCharacterV2Request(noDamage)).toBe(false);
  });

  it('populates complete canonical and manual spells and validates persisted prepared entry IDs', () => {
    const request = correctedWizardRequest();
    expect(isCreateCharacterV2Request(request)).toBe(true);
    const sheet = buildCharacterSheetV2(request);
    expect(sheet.spellcasting?.spells[0]).toMatchObject({
      id: 'spell-magic-missile',
      canonicalIndex: 'magic-missile',
      name: 'Magic Missile',
      materialComponent: null,
      concentration: false,
      ritual: false,
      state: 'prepared',
      provenance: { kind: 'calculated', ruleId: 'spell-canonical' },
    });
    expect(sheet.spellcasting?.spells[0].description.length).toBeGreaterThan(100);
    expect(isCharacterSheetV2(sheet)).toBe(true);

    const missingPrepared = structuredClone(sheet);
    missingPrepared.spellcasting!.preparedSpellIds = ['magic-missile'];
    expect(isCharacterSheetV2(missingPrepared)).toBe(false);
    const alteredCanonical = structuredClone(sheet);
    alteredCanonical.spellcasting!.spells[0].range = 'Self';
    expect(isCharacterSheetV2(alteredCanonical)).toBe(false);

    const manual = correctedWizardRequest();
    manual.spellcasting!.spells = [{
      id: 'spell-custom', source: 'manual', name: 'Custom Spark', level: 1, school: 'Evocation',
      castingTime: '1 action', range: '30 feet', components: ['V', 'S'], materialComponent: 'A copper wire',
      duration: 'Instantaneous', concentration: false, ritual: false, description: 'A bounded custom effect.',
      higherLevelText: 'The effect grows by one die.', state: 'prepared',
    }];
    manual.spellcasting!.preparedSpellIds = ['spell-custom'];
    const manualSheet = buildCharacterSheetV2(manual);
    expect(manualSheet.spellcasting?.spells[0]).toMatchObject({
      id: 'spell-custom', canonicalIndex: null, materialComponent: 'A copper wire',
      higherLevelText: 'The effect grows by one die.', provenance: { kind: 'imported' },
    });
  });

  it('rejects canonical features owned by another identity or unavailable level and persists resolved feature data', () => {
    const request = correctedFighterRequest();
    const sheet = buildCharacterSheetV2(request);
    expect(sheet.features[0]).toMatchObject({
      canonicalIndex: 'second-wind', name: 'Second Wind', category: 'class',
      provenance: { kind: 'calculated', ruleId: 'feature-canonical' },
    });
    expect(sheet.features[0].description.length).toBeGreaterThan(50);

    const wrongClass = correctedRangerRequest(3);
    wrongClass.features = [{ source: 'srd', index: 'improved-critical' }];
    expect(isCreateCharacterV2Request(wrongClass)).toBe(false);
    const futureLevel = correctedFighterRequest();
    futureLevel.features = [{ source: 'srd', index: 'action-surge-1-use' }];
    expect(isCreateCharacterV2Request(futureLevel)).toBe(false);
  });

  it('enforces subclass timing, ownership, and Ranger Hunter coverage', () => {
    const early = correctedFighterRequest();
    early.identity.subclass = { source: 'srd', index: 'champion' };
    expect(isCreateCharacterV2Request(early)).toBe(false);
    const missing = correctedFighterRequest(3);
    missing.identity.subclass = null;
    expect(isCreateCharacterV2Request(missing)).toBe(false);
    const wrong = correctedFighterRequest(3);
    wrong.identity.subclass = { source: 'srd', index: 'hunter' };
    expect(isCreateCharacterV2Request(wrong)).toBe(false);
    expect(isCreateCharacterV2Request(correctedRangerRequest(3))).toBe(true);
  });

  it('requires exact ordered level 2 through N HP gains and class-bounded rolls', () => {
    const valid = correctedFighterRequest(3);
    expect(isCreateCharacterV2Request(valid)).toBe(true);
    for (const gains of [
      [{ level: 2, mode: 'fixed-average' }],
      [{ level: 2, mode: 'fixed-average' }, { level: 2, mode: 'fixed-average' }],
      [{ level: 1, mode: 'fixed-average' }, { level: 2, mode: 'fixed-average' }],
      [{ level: 3, mode: 'fixed-average' }, { level: 2, mode: 'fixed-average' }],
      [{ level: 2, mode: 'fixed-average' }, { level: 4, mode: 'fixed-average' }],
      [{ level: 2, mode: 'rolled', roll: 11 }, { level: 3, mode: 'fixed-average' }],
    ]) {
      const request = correctedFighterRequest(3) as unknown as Record<string, unknown>;
      (request.hitPointProgression as Record<string, unknown>).levelGains = gains;
      expect(isCreateCharacterV2Request(request)).toBe(false);
    }
  });

  it.each([
    ['RuleSelection', (request: Record<string, unknown>) => ((request.identity as Record<string, unknown>).race = { source: 'srd', index: 'human', name: '' })],
    ['AbilityScoreInput', (request: Record<string, unknown>) => (request.abilityScores = { mode: 'calculated', base: scores(10), values: null })],
    ['DefenseInput', (request: Record<string, unknown>) => (((request.combat as Record<string, unknown>).defense) = { mode: 'manual', armorClass: 10, reason: 'Transfer.', shieldIndex: '' })],
    ['HitPointLevelGain', (request: Record<string, unknown>) => (((request.hitPointProgression as Record<string, unknown>).levelGains) = [{ level: 2, mode: 'fixed-average', roll: 0 }, { level: 3, mode: 'fixed-average' }])],
    ['AttackBonusInput', (request: Record<string, unknown>) => (((request.attacks as Array<Record<string, unknown>>)[0].attackBonus) = { mode: 'calculated', ability: 'strength', proficient: false, value: 0 })],
    ['CharacterSpellInput', (request: Record<string, unknown>) => (((request.spellcasting as Record<string, unknown>).spells as Array<Record<string, unknown>>)[0].name = '')],
    ['CharacterFeatureInput', (request: Record<string, unknown>) => ((request.features as Array<Record<string, unknown>>)[0].id = '')],
    ['CharacterEquipmentInput', (request: Record<string, unknown>) => ((request.equipment as Array<Record<string, unknown>>)[0] = { source: 'manual', id: 'gear', name: 'Gear', category: 'Other', quantity: 1, equipped: false, index: null })],
  ])('rejects %s cross-variant keys even with empty, false, zero, or null values', (_, mutate) => {
    const request = correctedWizardRequest() as unknown as Record<string, unknown>;
    mutate(request);
    expect(isCreateCharacterV2Request(request)).toBe(false);
  });
});

describe('corrected CharacterSheetV2 saved consistency', () => {
  it('rederives every authoritative value and uses field-specific calculated provenance', () => {
    const sheet = buildCharacterSheetV2(correctedWizardRequest());
    expect(sheet.combat.proficiencyBonus.provenance).toEqual({ kind: 'calculated', ruleId: 'proficiency-bonus' });
    expect(sheet.combat.initiative.provenance).toEqual({ kind: 'calculated', ruleId: 'initiative' });
    expect(sheet.combat.armorClass.provenance).toEqual({ kind: 'manual-override', reason: 'Transferred armor class.' });
    expect(isCharacterSheetV2(sheet)).toBe(true);

    const mutations: Array<(value: typeof sheet) => void> = [
      (value) => { value.abilityScores.scores.strength.value += 1; },
      (value) => { value.abilityScores.modifiers.strength += 1; },
      (value) => { value.combat.proficiencyBonus.value += 1; },
      (value) => { value.combat.initiative.value += 1; },
      (value) => { value.combat.passivePerception.value += 1; },
      (value) => { value.combat.speedFt.value += 5; },
      (value) => { value.hitPointProgression.maximum.value += 1; },
      (value) => { value.attacks[0].attackBonus.value += 1; },
      (value) => { value.spellcasting!.spellSaveDC.value += 1; },
      (value) => { value.spellcasting!.spellAttackBonus.value += 1; },
      (value) => { value.spellcasting!.availableSpellLevels = []; },
      (value) => { value.spellcasting!.slots[0].max += 1; },
      (value) => { value.spellcasting!.preparedSpellIds = ['missing-entry']; },
      (value) => { value.features[0].canonicalIndex = 'second-wind'; },
    ];
    for (const mutate of mutations) {
      const invalid = structuredClone(sheet);
      mutate(invalid);
      expect(isCharacterSheetV2(invalid)).toBe(false);
    }
    const crossProvenance = structuredClone(sheet) as unknown as Record<string, unknown>;
    const combat = crossProvenance.combat as Record<string, unknown>;
    ((combat.proficiencyBonus as Record<string, unknown>).provenance as Record<string, unknown>).note = null;
    expect(isCharacterSheetV2(crossProvenance)).toBe(false);
  });
});

describe('final manual identity and lossless feature fallbacks', () => {
  it('builds a manual Race with canonical Class only from imported scores and Speed override', () => {
    const request = manualRaceRequest();
    expect(isCreateCharacterV2Request(request)).toBe(true);
    const sheet = buildCharacterSheetV2(request);
    expect(sheet.abilityScores.scores.strength).toEqual({
      value: 15, provenance: { kind: 'imported', note: 'Transferred final scores.' },
    });
    expect(sheet.combat.speedFt).toEqual({
      value: 35, provenance: { kind: 'manual-override', reason: 'Custom lineage speed.' },
    });
    expect(sheet.features[0]).toMatchObject({
      id: 'second-wind', source: 'srd', canonicalIndex: 'second-wind', ownerKind: 'class',
    });
  });

  it('rejects a manual Race without imported scores or Speed override', () => {
    const missingScores = manualRaceRequest();
    missingScores.abilityScores = { mode: 'calculated', base: scores(10) };
    expect(isCreateCharacterV2Request(missingScores)).toBe(false);
    expect(() => buildCharacterSheetV2(missingScores)).toThrow();
    const missingSpeed = manualRaceRequest();
    delete missingSpeed.combat.speedOverride;
    expect(isCreateCharacterV2Request(missingSpeed)).toBe(false);
    expect(() => buildCharacterSheetV2(missingSpeed)).toThrow();
  });

  it('builds a manual Class with universal proficiency and authoritative maximum HP', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildCharacterSheetV2(manualClassRequest(level)).combat.proficiencyBonus.value).toBe(2);
    }
    const request = manualClassRequest(5);
    expect(isCreateCharacterV2Request(request)).toBe(true);
    const sheet = buildCharacterSheetV2(request);
    expect(sheet.combat.proficiencyBonus).toEqual({
      value: 3, provenance: { kind: 'calculated', ruleId: 'proficiency-bonus' },
    });
    expect(sheet.hitPointProgression.maximum).toEqual({
      value: 41, provenance: { kind: 'manual-override', reason: 'Transferred maximum HP.' },
    });
    expect(sheet.hitPointProgression.levelGains).toEqual([]);
    expect(sheet.spellcasting).toBeNull();
  });

  it('rejects missing or forbidden manual Class automation', () => {
    const missingHP = manualClassRequest();
    delete missingHP.hitPointProgression.maximumOverride;
    expect(isCreateCharacterV2Request(missingHP)).toBe(false);

    const canonicalChoice = manualClassRequest();
    canonicalChoice.ruleChoices.push({ ruleId: 'fighter-fighting-style', optionIds: ['fighter-fighting-style-archery'] });
    expect(isCreateCharacterV2Request(canonicalChoice)).toBe(false);

    const canonicalFeature = manualClassRequest();
    canonicalFeature.features = [{ source: 'srd', index: 'second-wind' }];
    expect(isCreateCharacterV2Request(canonicalFeature)).toBe(false);

    const spellcasting = manualClassRequest();
    spellcasting.spellcasting = { spells: [], preparedSpellIds: [] };
    expect(isCreateCharacterV2Request(spellcasting)).toBe(false);

    const classFormula = manualClassRequest();
    classFormula.combat.defense = { mode: 'unarmored', formulaId: 'barbarian-unarmored-defense' };
    expect(isCreateCharacterV2Request(classFormula)).toBe(false);
  });

  it('requires every fallback for a combined manual Race and manual Class', () => {
    const request = manualClassRequest();
    request.identity.race = { source: 'manual', name: 'Custom lineage' };
    request.abilityScores = { mode: 'imported', values: scores(12), reason: 'Transferred final scores.' };
    request.combat.speedOverride = { value: 35, reason: 'Custom lineage speed.' };
    request.ruleChoices = [];
    expect(isCreateCharacterV2Request(request)).toBe(true);
    expect(isCharacterSheetV2(buildCharacterSheetV2(request))).toBe(true);
    for (const mutate of [
      (value: CreateCharacterV2RequestDTO) => { value.abilityScores = { mode: 'calculated', base: scores(10) }; },
      (value: CreateCharacterV2RequestDTO) => { delete value.combat.speedOverride; },
      (value: CreateCharacterV2RequestDTO) => { delete value.hitPointProgression.maximumOverride; },
    ]) {
      const invalid = structuredClone(request);
      mutate(invalid);
      expect(isCreateCharacterV2Request(invalid)).toBe(false);
    }
  });

  it('round-trips exact manual feature identity and category', () => {
    const request = correctedFighterRequest();
    request.features = [{
      source: 'manual', id: 'custom-heritage', name: 'Ancestral Memory',
      category: 'Heritage Gift', description: 'Recall one carefully bounded ancestral memory.',
    }];
    const sheet = buildCharacterSheetV2(request);
    expect(sheet.features[0]).toEqual({
      id: 'custom-heritage', source: 'manual', canonicalIndex: null, name: 'Ancestral Memory',
      category: 'Heritage Gift', description: 'Recall one carefully bounded ancestral memory.',
      provenance: { kind: 'imported' },
    });
    expect(isCharacterSheetV2(sheet)).toBe(true);
    const extra = structuredClone(sheet) as unknown as Record<string, unknown>;
    (extra.features as Array<Record<string, unknown>>)[0].ownerKind = null;
    expect(isCharacterSheetV2(extra)).toBe(false);
  });
});

const correctedFighterRequest = (level = 1): CreateCharacterV2RequestDTO => ({
  schemaVersion: 'CharacterSheetV2', creationSource: 'guided',
  identity: {
    name: 'Ari', gender: 'Other', race: { source: 'srd', index: 'human' }, background: 'Soldier',
    class: { source: 'srd', index: 'fighter' }, level,
    subclass: level >= 3 ? { source: 'srd', index: 'champion' } : null,
  },
  abilityScores: { mode: 'calculated', base: { strength: 15, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 8 } },
  proficiencies: { perception: 'none', skills: [] },
  hitPointProgression: { levelGains: Array.from({ length: level - 1 }, (_, index) => ({ level: index + 2, mode: 'fixed-average' as const })) },
  combat: { defense: { mode: 'manual', armorClass: 14, reason: 'Transferred armor class.' } },
  ruleChoices: [
    { ruleId: 'human-extra-language', optionIds: ['dwarvish'] },
    { ruleId: 'fighter-fighting-style', optionIds: ['fighter-fighting-style-archery'] },
  ],
  attacks: [{
    id: 'longsword', name: 'Longsword', attackBonus: { mode: 'calculated', ability: 'strength', proficient: true },
    damage: [{ dice: '1d8', bonus: 3, type: 'slashing' }],
  }],
  spellcasting: null,
  features: [{ source: 'srd', index: 'second-wind' }],
  equipment: [], other: [],
});

const correctedWizardRequest = (): CreateCharacterV2RequestDTO => ({
  ...correctedFighterRequest(),
  identity: {
    ...correctedFighterRequest().identity,
    background: 'Sage', class: { source: 'srd', index: 'wizard' }, subclass: null,
  },
  ruleChoices: [{ ruleId: 'human-extra-language', optionIds: ['dwarvish'] }],
  attacks: [{
    id: 'fire-bolt', name: 'Fire Bolt', attackBonus: { mode: 'calculated', ability: 'spellcasting', proficient: true },
    damage: [{ dice: '1d10', bonus: 0, type: 'fire' }],
  }],
  spellcasting: {
    spells: [{ id: 'spell-magic-missile', source: 'srd', index: 'magic-missile', state: 'prepared' }],
    preparedSpellIds: ['spell-magic-missile'],
  },
  features: [{ source: 'srd', index: 'spellcasting-wizard' }],
});

const correctedRangerRequest = (level: number): CreateCharacterV2RequestDTO => ({
  ...correctedFighterRequest(level),
  identity: {
    ...correctedFighterRequest(level).identity,
    class: { source: 'srd', index: 'ranger' },
    subclass: level >= 3 ? { source: 'srd', index: 'hunter' } : null,
  },
  ruleChoices: [
    { ruleId: 'human-extra-language', optionIds: ['dwarvish'] },
    { ruleId: 'ranger-favored-enemy', optionIds: [], manualNote: 'Dragons.' },
    { ruleId: 'ranger-natural-explorer', optionIds: [], manualNote: 'Forest.' },
    ...(level >= 2 ? [{ ruleId: 'ranger-fighting-style', optionIds: ['ranger-fighting-style-archery'] }] : []),
  ],
  spellcasting: level >= 2 ? { spells: [], preparedSpellIds: [] } : null,
  features: level >= 3 ? [{ source: 'srd', index: 'hunters-prey' }] : [],
});

const manualRaceRequest = (): CreateCharacterV2RequestDTO => {
  const request = correctedFighterRequest();
  request.identity.race = { source: 'manual', name: 'Custom lineage' };
  request.abilityScores = {
    mode: 'imported', values: { strength: 15, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 8 },
    reason: 'Transferred final scores.',
  };
  request.combat.speedOverride = { value: 35, reason: 'Custom lineage speed.' };
  request.ruleChoices = [{ ruleId: 'fighter-fighting-style', optionIds: ['fighter-fighting-style-archery'] }];
  return request;
};

const manualClassRequest = (level = 1): CreateCharacterV2RequestDTO => {
  const request = correctedFighterRequest(level);
  request.identity.class = { source: 'manual', name: 'Warden' };
  request.identity.subclass = null;
  request.hitPointProgression = {
    levelGains: [], maximumOverride: { value: level === 5 ? 41 : 12, reason: 'Transferred maximum HP.' },
  };
  request.combat.defense = { mode: 'unarmored', formulaId: 'standard-unarmored' };
  request.ruleChoices = [{ ruleId: 'human-extra-language', optionIds: ['dwarvish'] }];
  request.features = [];
  request.spellcasting = null;
  return request;
};

const withDefense = (request: CreateCharacterV2RequestDTO, defense: unknown): unknown => {
  const value = structuredClone(request) as unknown as Record<string, unknown>;
  (value.combat as Record<string, unknown>).defense = defense;
  return value;
};

const scores = (value: number) => ({
  strength: value, dexterity: value, constitution: value,
  intelligence: value, wisdom: value, charisma: value,
});
