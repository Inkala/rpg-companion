import { describe, expect, it } from 'vitest';
import { buildCharacterSheetV2 } from '../characters/characterSheetV2Calculations';
import type { SpellSelectionInput } from '../characters/characterSheetV2';
import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { levelUpRules } from '../rules/generated/levelUpRules';
import {
  availableSpellsForDraft,
  availableRuleChoicesForDraft,
  availableSubclassesForDraft,
  buildCreateCharacterV2Request,
  classOptions,
  createStructuredCharacterDraft,
  raceOptions,
  reconcileStructuredDraft,
  validateStructuredCharacterDraft,
} from './characterSheetV2Draft';

describe('CharacterSheetV2 creation draft', () => {
  it('manualTransferRequiresExplicitRaceAndClassSelection', () => {
    const draft = createStructuredCharacterDraft('manual-transfer');

    expect(draft.raceKey).toBe('');
    expect(draft.classKey).toBe('');
    expect(draft.levelGains).toEqual([]);
    expect(draft.ruleChoices).toEqual([]);
    expect(draft.spellcasting).toEqual({ mode: 'none' });
    expect(validateStructuredCharacterDraft(draft)).toEqual(expect.arrayContaining([
      { field: 'raceKey', message: 'Race is required.' },
      { field: 'classKey', message: 'Class is required.' },
    ]));
  });

  it('exposes every canonical Class and Race option plus Other', () => {
    expect(classOptions).toHaveLength(14);
    expect(classOptions[0]).toEqual({ value: '', label: 'Choose Class' });
    expect(classOptions.at(-1)).toEqual({ value: 'manual', label: 'Other' });
    expect(raceOptions.some((option) => option.label === 'Hill Dwarf')).toBe(true);
    expect(raceOptions.at(-1)).toEqual({ value: 'manual', label: 'Other' });
  });

  it('offers Hunter only when Ranger reaches its subclass level', () => {
    const draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'ranger';
    draft.level = 2;
    expect(availableSubclassesForDraft(draft)).toEqual([]);
    draft.level = 3;
    expect(availableSubclassesForDraft(draft)).toContainEqual({ value: 'hunter', label: 'Hunter' });
    expect(reconcileStructuredDraft(draft).subclassKey).toBe('');
  });

  it('leaves every canonical Race and Class decision unresolved until the player chooses', () => {
    const draft = createStructuredCharacterDraft('manual-transfer');
    draft.raceKey = 'half-elf';
    draft.classKey = 'ranger';
    draft.level = 3;
    const reconciled = reconcileStructuredDraft(draft);
    const required = availableRuleChoicesForDraft(reconciled);

    expect(reconciled.subclassKey).toBe('');
    expect(required.map((choice) => choice.id)).toEqual(expect.arrayContaining([
      'half-elf-ability-bonuses', 'half-elf-skill-versatility',
      'ranger-favored-enemy', 'ranger-natural-explorer', 'ranger-fighting-style',
    ]));
    expect(reconciled.ruleChoices).toEqual(required.map((choice) => ({ ruleId: choice.id, optionIds: [] })));
    expect(reconciled.ruleChoices.every((choice) => !('manualNote' in choice))).toBe(true);
    expect(validateStructuredCharacterDraft(reconciled).map((error) => error.field)).toEqual(
      expect.arrayContaining(required.map((choice) => `ruleChoices.${choice.id}`)),
    );
  });

  it('never invents manual notes for Ranger choices and accepts an explicit bounded note', () => {
    const draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'ranger';
    draft.level = 1;
    const reconciled = reconcileStructuredDraft(draft);
    expect(reconciled.ruleChoices).toContainEqual({ ruleId: 'ranger-favored-enemy', optionIds: [] });
    expect(reconciled.ruleChoices).not.toContainEqual(expect.objectContaining({ manualNote: expect.any(String) }));
    reconciled.ruleChoices = reconciled.ruleChoices.map((choice) => choice.ruleId === 'ranger-favored-enemy'
      ? { ...choice, manualNote: 'Giants, copied from the source character sheet.' }
      : choice.ruleId === 'ranger-natural-explorer'
        ? { ...choice, manualNote: 'Forest, copied from the source character sheet.' }
        : choice);
    expect(validateStructuredCharacterDraft(reconciled).map((error) => error.field)).not.toContain('ruleChoices.ranger-favored-enemy');
  });

  it('requires bounded manual identity fallbacks and creates no invented automation', () => {
    const draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'manual';
    draft.raceKey = 'manual';
    draft.importedReason = '';
    expect(validateStructuredCharacterDraft(draft).map((error) => error.field)).toEqual(
      expect.arrayContaining(['manualClassName', 'manualRaceName', 'importedReason', 'maximumOverride.enabled', 'speedOverride.enabled']),
    );
  });

  it('accepts a complete combined manual Race and Class with an optional null Subclass', () => {
    let draft = createStructuredCharacterDraft('manual-transfer');
    draft.raceKey = 'manual';
    draft.classKey = 'manual';
    draft = reconcileStructuredDraft(draft);
    draft.name = 'Imported Hero';
    draft.gender = 'Other';
    draft.manualRaceName = 'Skyborn';
    draft.manualClassName = 'Warden';
    draft.speedOverride = { enabled: true, value: 35, reason: 'Imported Race speed.' };
    draft.maximumOverride = { enabled: true, value: 14, reason: 'Imported Class maximum HP.' };
    expect(draft.subclassKey).toBe('');
    expect(validateStructuredCharacterDraft(draft)).toEqual([]);
    expect(buildCreateCharacterV2Request(draft)).toMatchObject({
      identity: { race: { source: 'manual', name: 'Skyborn' }, class: { source: 'manual', name: 'Warden' }, subclass: null },
      spellcasting: { mode: 'none' },
      combat: { speedOverride: { value: 35, reason: 'Imported Race speed.' } },
    });
  });

  it('keeps manual Class levels 2 through 5 free of canonical gains and automation', () => {
    for (const level of [2, 3, 4, 5]) {
      let draft = createStructuredCharacterDraft('manual-transfer');
      draft.raceKey = 'human';
      draft.classKey = 'manual';
      draft.level = level;
      draft = reconcileStructuredDraft(draft);
      expect(draft.levelGains).toEqual([]);
      expect(draft.ruleChoices.map((choice) => choice.ruleId)).toEqual(['human-extra-language']);
      expect(draft.spellcasting).toEqual({ mode: 'none' });
      expect(draft.subclassKey).toBe('');
    }
  });

  it('clears incompatible defense state and never creates empty equipment entries', () => {
    const draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'monk';
    draft.defense = { mode: 'unarmored', armorIndex: 'chain-mail', shieldIndex: 'shield', formulaId: 'barbarian-unarmored-defense', armorClass: 18, reason: 'stale' };
    draft.equipment = [
      { source: 'srd', index: 'chain-mail', quantity: 1, equipped: true },
      { source: 'srd', index: 'shield', quantity: 1, equipped: true },
    ];
    const reconciled = reconcileStructuredDraft(draft);
    expect(reconciled.defense).toMatchObject({ mode: 'unarmored', armorIndex: '', shieldIndex: '', formulaId: 'standard-unarmored', reason: '' });
    expect(reconciled.equipment.every((entry) => entry.source === 'manual' || entry.index !== '')).toBe(true);
    expect(reconciled.equipment.every((entry) => !entry.equipped)).toBe(true);
  });

  it('builds the guided Fighter preset after the player completes unresolved bounded decisions', () => {
    const draft = createStructuredCharacterDraft('guided', 'strength-melee-fighter');
    draft.name = 'Aldren Vale';
    draft.gender = 'Male';
    draft.ruleChoices = draft.ruleChoices.map((choice) => choice.ruleId === 'human-extra-language'
      ? { ...choice, optionIds: ['elvish'] }
      : choice.ruleId === 'fighter-fighting-style'
        ? { ...choice, optionIds: ['fighter-fighting-style-defense'] }
        : choice);
    const request = buildCreateCharacterV2Request(draft);
    expect(request.schemaVersion).toBe('CharacterSheetV2');
    expect(request).not.toHaveProperty('currentHp');
    expect(request).not.toHaveProperty('referencePayload');
    const sheet = buildCharacterSheetV2(request);
    expect(sheet.combat.armorClass.value).toBe(19);
    expect(sheet.hitPointProgression.maximum.value).toBe(12);
    expect(sheet.combat.proficiencyBonus.value).toBe(2);
  });

  it('doesNotPreselectHumanLanguageInGuidedCreation', () => {
    for (const build of ['strength-melee-fighter', 'dexterity-archer-fighter'] as const) {
      const draft = createStructuredCharacterDraft('guided', build);
      expect(draft.ruleChoices.find((choice) => choice.ruleId === 'human-extra-language')).toEqual({
        ruleId: 'human-extra-language',
        optionIds: [],
      });
      expect(draft.ruleChoices.find((choice) => choice.ruleId === 'fighter-fighting-style')).toEqual({
        ruleId: 'fighter-fighting-style',
        optionIds: [],
      });
      expect(draft.perception).toBe('none');
      expect(validateStructuredCharacterDraft(draft).map((error) => error.field)).toEqual(expect.arrayContaining([
        'ruleChoices.human-extra-language',
        'ruleChoices.fighter-fighting-style',
      ]));
    }
  });

  it('doesNotPreselectFightingStyleInManualTransfer', () => {
    const draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'fighter';
    const reconciled = reconcileStructuredDraft(draft);
    expect(reconciled.ruleChoices.find((choice) => choice.ruleId === 'fighter-fighting-style')).toEqual({
      ruleId: 'fighter-fighting-style',
      optionIds: [],
    });
    expect(validateStructuredCharacterDraft(reconciled)).toContainEqual({
      field: 'ruleChoices.fighter-fighting-style',
      message: 'Fighter Fighting Style requires exactly 1 selection.',
    });
  });

  it('setsOnlyQuestionnaireAuthorizedGuidedDecisions', () => {
    for (const build of ['strength-melee-fighter', 'dexterity-archer-fighter'] as const) {
      const draft = createStructuredCharacterDraft('guided', build);
      expect(draft.ruleChoices.every((choice) => choice.optionIds.length === 0)).toBe(true);
      expect(draft.perception).toBe('none');
      expect(draft.subclassKey).toBe('');
      expect(draft.spellcasting).toEqual({ mode: 'none' });
    }
  });

  it('usesTwoWarlockInvocationsAtLevelFourAndThreeAtLevelFive', () => {
    const counts = [1, 2, 3, 4, 5].map((level) => {
      let draft = createStructuredCharacterDraft('manual-transfer');
      draft.classKey = 'warlock';
      draft.level = level;
      draft.subclassKey = 'fiend';
      draft = reconcileStructuredDraft(draft);
      return availableRuleChoicesForDraft(draft)
        .find((choice) => choice.id === 'warlock-eldritch-invocations')?.count ?? 0;
    });

    expect(counts).toEqual([0, 2, 2, 2, 3]);
  });

  it('filtersClassChoiceOptionsByMinimumLevel', () => {
    let draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'warlock';
    draft.level = 4;
    draft.subclassKey = 'fiend';
    draft = reconcileStructuredDraft(draft);

    const invocations = availableRuleChoicesForDraft(draft).find((choice) => choice.id === 'warlock-eldritch-invocations')!;
    expect(invocations.options.map((option) => option.value)).not.toEqual(expect.arrayContaining([
      'eldritch-invocation-mire-the-mind',
      'eldritch-invocation-one-with-shadows',
      'eldritch-invocation-sign-of-ill-omen',
      'eldritch-invocation-thirsting-blade',
    ]));
  });

  it('filtersClassChoiceOptionsByRequiredFeature', () => {
    let draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'warlock';
    draft.level = 5;
    draft.subclassKey = 'fiend';
    draft = reconcileStructuredDraft(draft);
    const options = () => availableRuleChoicesForDraft(draft)
      .find((choice) => choice.id === 'warlock-eldritch-invocations')!.options.map((option) => option.value);

    expect(options()).not.toContain('eldritch-invocation-book-of-ancient-secrets');
    draft.ruleChoices = draft.ruleChoices.map((choice) => choice.ruleId === 'warlock-pact-boon'
      ? { ...choice, optionIds: ['pact-of-the-tome'] }
      : choice);
    expect(options()).toContain('eldritch-invocation-book-of-ancient-secrets');
    expect(options()).not.toContain('eldritch-invocation-thirsting-blade');
  });

  it('clearsInvocationWhenPactBoonChanges', () => {
    let draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'warlock';
    draft.level = 5;
    draft.subclassKey = 'fiend';
    draft = reconcileStructuredDraft(draft);
    draft.ruleChoices = draft.ruleChoices.map((choice) => choice.ruleId === 'warlock-pact-boon'
      ? { ...choice, optionIds: ['pact-of-the-blade'] }
      : choice.ruleId === 'warlock-eldritch-invocations'
        ? { ...choice, optionIds: ['eldritch-invocation-thirsting-blade', 'eldritch-invocation-devils-sight', 'eldritch-invocation-armor-of-shadows'] }
        : choice);
    draft = reconcileStructuredDraft(draft);
    draft.ruleChoices = draft.ruleChoices.map((choice) => choice.ruleId === 'warlock-pact-boon'
      ? { ...choice, optionIds: ['pact-of-the-chain'] }
      : choice);

    const reconciled = reconcileStructuredDraft(draft);
    expect(reconciled.ruleChoices.find((choice) => choice.ruleId === 'warlock-eldritch-invocations')?.optionIds).toEqual([
      'eldritch-invocation-devils-sight',
      'eldritch-invocation-armor-of-shadows',
    ]);
  });

  it('matrixAssertsIndependentExpectedDecisionCountsByClassAndLevel', () => {
    const expected: Record<string, Array<Record<string, number>>> = {
      barbarian: [{}, {}, {}, { 'barbarian-ability-score-improvement-1': 1 }, { 'barbarian-ability-score-improvement-1': 1 }],
      bard: [{}, {}, { 'bard-expertise': 2, 'college-of-lore-bonus-proficiencies': 3 }, { 'bard-expertise': 2, 'college-of-lore-bonus-proficiencies': 3, 'bard-ability-score-improvement-1': 1 }, { 'bard-expertise': 2, 'college-of-lore-bonus-proficiencies': 3, 'bard-ability-score-improvement-1': 1 }],
      cleric: [{}, {}, {}, { 'cleric-ability-score-improvement-1': 1 }, { 'cleric-ability-score-improvement-1': 1 }],
      druid: [{}, { 'circle-of-the-land-bonus-cantrip': 1 }, { 'druid-land-circle': 1, 'circle-of-the-land-bonus-cantrip': 1 }, { 'druid-land-circle': 1, 'circle-of-the-land-bonus-cantrip': 1, 'druid-ability-score-improvement-1': 1 }, { 'druid-land-circle': 1, 'circle-of-the-land-bonus-cantrip': 1, 'druid-ability-score-improvement-1': 1 }],
      fighter: [{ 'fighter-fighting-style': 1 }, { 'fighter-fighting-style': 1 }, { 'fighter-fighting-style': 1 }, { 'fighter-fighting-style': 1, 'fighter-ability-score-improvement-1': 1 }, { 'fighter-fighting-style': 1, 'fighter-ability-score-improvement-1': 1 }],
      monk: [{}, {}, {}, { 'monk-ability-score-improvement-1': 1 }, { 'monk-ability-score-improvement-1': 1 }],
      paladin: [{}, { 'paladin-fighting-style': 1 }, { 'paladin-fighting-style': 1 }, { 'paladin-fighting-style': 1, 'paladin-ability-score-improvement-1': 1 }, { 'paladin-fighting-style': 1, 'paladin-ability-score-improvement-1': 1 }],
      ranger: [{ 'ranger-favored-enemy': 1, 'ranger-natural-explorer': 1 }, { 'ranger-favored-enemy': 1, 'ranger-natural-explorer': 1, 'ranger-fighting-style': 1 }, { 'ranger-favored-enemy': 1, 'ranger-natural-explorer': 1, 'ranger-fighting-style': 1, 'hunter-hunters-prey': 1 }, { 'ranger-favored-enemy': 1, 'ranger-natural-explorer': 1, 'ranger-fighting-style': 1, 'hunter-hunters-prey': 1, 'ranger-ability-score-improvement-1': 1 }, { 'ranger-favored-enemy': 1, 'ranger-natural-explorer': 1, 'ranger-fighting-style': 1, 'hunter-hunters-prey': 1, 'ranger-ability-score-improvement-1': 1 }],
      rogue: [{ 'rogue-expertise': 2 }, { 'rogue-expertise': 2 }, { 'rogue-expertise': 2 }, { 'rogue-expertise': 2, 'rogue-ability-score-improvement-1': 1 }, { 'rogue-expertise': 2, 'rogue-ability-score-improvement-1': 1 }],
      sorcerer: [{ 'draconic-ancestor': 1 }, { 'draconic-ancestor': 1 }, { 'sorcerer-metamagic': 2, 'draconic-ancestor': 1 }, { 'sorcerer-metamagic': 2, 'draconic-ancestor': 1, 'sorcerer-ability-score-improvement-1': 1 }, { 'sorcerer-metamagic': 2, 'draconic-ancestor': 1, 'sorcerer-ability-score-improvement-1': 1 }],
      warlock: [{}, { 'warlock-eldritch-invocations': 2 }, { 'warlock-eldritch-invocations': 2, 'warlock-pact-boon': 1 }, { 'warlock-eldritch-invocations': 2, 'warlock-pact-boon': 1, 'warlock-ability-score-improvement-1': 1 }, { 'warlock-eldritch-invocations': 3, 'warlock-pact-boon': 1, 'warlock-ability-score-improvement-1': 1 }],
      wizard: [{}, {}, {}, { 'wizard-ability-score-improvement-1': 1 }, { 'wizard-ability-score-improvement-1': 1 }],
    };
    for (const classRule of levelUpRules.classes) {
      for (let level = 1; level <= 5; level += 1) {
        let draft = createStructuredCharacterDraft('manual-transfer');
        draft.classKey = classRule.index;
        draft.level = level;
        draft.subclassKey = level >= classRule.subclassDecisionLevel ? classRule.subclasses[0].index : '';
        draft = reconcileStructuredDraft(draft);
        expect(Object.fromEntries(availableRuleChoicesForDraft(draft).map((choice) => [choice.id, choice.count])), `${classRule.index}:${level}`)
          .toEqual(expected[classRule.index][level - 1]);
      }
    }
  });

  it('requiresEveryCanonicalPlayerDecisionForEachClassAndLevel', () => {
    const requiredAtLevel = new Map<string, string[]>([
      ['barbarian:4', ['barbarian-ability-score-improvement-1']],
      ['bard:3:lore', ['bard-expertise', 'college-of-lore-bonus-proficiencies']],
      ['bard:4:lore', ['bard-ability-score-improvement-1']],
      ['cleric:4:life', ['cleric-ability-score-improvement-1']],
      ['druid:2:land', ['circle-of-the-land-bonus-cantrip']],
      ['druid:4:land', ['druid-ability-score-improvement-1']],
      ['fighter:4:champion', ['fighter-ability-score-improvement-1']],
      ['monk:4:open-hand', ['monk-ability-score-improvement-1']],
      ['paladin:4:devotion', ['paladin-ability-score-improvement-1']],
      ['ranger:3:hunter', ['hunter-hunters-prey']],
      ['ranger:4:hunter', ['ranger-ability-score-improvement-1']],
      ['rogue:4:thief', ['rogue-ability-score-improvement-1']],
      ['sorcerer:1:draconic', ['draconic-ancestor']],
      ['sorcerer:4:draconic', ['sorcerer-ability-score-improvement-1']],
      ['warlock:4:fiend', ['warlock-ability-score-improvement-1']],
      ['wizard:4:evocation', ['wizard-ability-score-improvement-1']],
    ]);
    for (const [context, expected] of requiredAtLevel) {
      const [classKey, rawLevel, subclassKey = ''] = context.split(':');
      let draft = createStructuredCharacterDraft('manual-transfer');
      draft.classKey = classKey;
      draft.level = Number(rawLevel);
      draft.subclassKey = subclassKey;
      draft = reconcileStructuredDraft(draft);
      const ids = availableRuleChoicesForDraft(draft).map((choice) => choice.id);
      expect(ids, context).toEqual(expect.arrayContaining(expected));
      expect(validateStructuredCharacterDraft(draft).map((error) => error.field), context).toEqual(
        expect.arrayContaining(expected.map((id) => `ruleChoices.${id}`)),
      );
    }
  });

  it('requiresSupportedSubraceWhenCanonicalRaceNeedsOne', () => {
    for (const raceKey of ['dwarf', 'elf', 'gnome', 'halfling']) {
      const draft = createStructuredCharacterDraft('manual-transfer');
      draft.raceKey = raceKey;
      expect(validateStructuredCharacterDraft(reconcileStructuredDraft(draft))).toContainEqual({
        field: 'raceKey',
        message: 'Choose a supported subrace for this Race.',
      });
    }
    const draft = createStructuredCharacterDraft('manual-transfer');
    draft.raceKey = 'hill-dwarf';
    expect(validateStructuredCharacterDraft(reconcileStructuredDraft(draft)).some((error) => error.field === 'raceKey')).toBe(false);
  });

  it('buildsCompleteMinimumRequestForEverySupportedRaceClassAndLevel', () => {
    const supportedRaceKeys = [
      ...characterCreationRules.races.filter((race) => race.subraceIndexes.length === 0).map((race) => race.index),
      ...characterCreationRules.subraces.map((subrace) => subrace.index),
    ];
    let built = 0;
    for (const raceKey of supportedRaceKeys) {
      for (const classRule of levelUpRules.classes) {
        for (let level = 1; level <= 5; level += 1) {
          const draft = completeMinimumDraft(raceKey, classRule.index, level);
          const errors = validateStructuredCharacterDraft(draft);
          expect(errors, `${raceKey}/${classRule.index}/${level}`).toEqual([]);
          const request = buildCreateCharacterV2Request(draft);
          expect(buildCharacterSheetV2(request).identity.level).toBe(level);
          built += 1;
        }
      }
    }
    expect(built).toBe(540);
  });

  it('appliesLevelFourASIAndKeepsTheLandBonusCantripSeparateFromPreparedSpells', () => {
    const fighterDraft = completeMinimumDraft('human', 'fighter', 4);
    fighterDraft.abilityMode = 'calculated';
    fighterDraft.baseScores = { strength: 15, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 8 };
    const fighter = buildCharacterSheetV2(buildCreateCharacterV2Request(fighterDraft));
    expect(fighter.abilityScores.scores.strength.value).toBe(18);
    expect(fighter.abilityScores.scores.dexterity.value).toBe(15);

    const druidDraft = completeMinimumDraft('human', 'druid', 2);
    const landChoice = druidDraft.ruleChoices.find((choice) => choice.ruleId === 'circle-of-the-land-bonus-cantrip');
    expect(landChoice?.optionIds).toHaveLength(1);
    const druid = buildCharacterSheetV2(buildCreateCharacterV2Request(druidDraft));
    expect(druid.spellcasting?.spells).toContainEqual(expect.objectContaining({
      id: `class-circle-of-the-land-cantrip-${landChoice?.optionIds[0]}`,
      canonicalIndex: landChoice?.optionIds[0],
      state: 'known',
      provenance: { kind: 'calculated', ruleId: 'circle-of-the-land-bonus-cantrip' },
    }));
    expect(druid.spellcasting?.preparedSpellIds).not.toContain(`class-circle-of-the-land-cantrip-${landChoice?.optionIds[0]}`);
  });

  it('unequipsPreviousArmorWhenArmorSelectionChanges', () => {
    const draft = createStructuredCharacterDraft('manual-transfer');
    draft.defense = { ...draft.defense, mode: 'armor', armorIndex: 'chain-mail' };
    draft.equipment = [
      { source: 'srd', index: 'chain-mail', quantity: 1, equipped: true },
      { source: 'manual', id: 'manual-chain', name: 'Inherited chain', category: 'Armor', quantity: 1, equipped: true },
    ];
    draft.defense.armorIndex = 'leather-armor';
    draft.equipment.push({ source: 'srd', index: 'leather-armor', quantity: 1, equipped: true });
    const reconciled = reconcileStructuredDraft(draft);
    expect(reconciled.equipment).not.toContainEqual(expect.objectContaining({ source: 'srd', index: 'chain-mail' }));
    expect(reconciled.equipment).toContainEqual(expect.objectContaining({ source: 'srd', index: 'leather-armor', equipped: true }));
    expect(reconciled.equipment).toContainEqual(expect.objectContaining({ source: 'manual', id: 'manual-chain', equipped: true }));
  });

  it('unequipsShieldWhenShieldSelectionIsCleared', () => {
    const draft = createStructuredCharacterDraft('manual-transfer');
    draft.defense = { ...draft.defense, mode: 'armor', armorIndex: 'leather-armor', shieldIndex: '' };
    draft.equipment = [
      { source: 'srd', index: 'leather-armor', quantity: 1, equipped: true },
      { source: 'srd', index: 'shield', quantity: 1, equipped: true },
    ];
    const reconciled = reconcileStructuredDraft(draft);
    expect(reconciled.equipment).not.toContainEqual(expect.objectContaining({ source: 'srd', index: 'shield' }));
  });

  it('clearsSelectedDefenseWhenEquipmentIsRemoved', () => {
    const draft = createStructuredCharacterDraft('guided');
    draft.equipment = draft.equipment.filter((entry) => entry.source !== 'srd' || entry.index !== 'chain-mail');
    const reconciled = reconcileStructuredDraft(draft);
    expect(reconciled.defense.armorIndex).toBe('');
    expect(reconciled.equipment).not.toContainEqual(expect.objectContaining({ source: 'srd', index: 'chain-mail' }));
  });

  it('clearsSelectedDefenseWhenEquipmentIsUnequipped', () => {
    const draft = createStructuredCharacterDraft('guided');
    draft.equipment = draft.equipment.map((entry) => entry.source === 'srd' && entry.index === 'chain-mail'
      ? { ...entry, equipped: false }
      : entry.source === 'srd' && entry.index === 'shield' ? { ...entry, equipped: false } : entry);
    const reconciled = reconcileStructuredDraft(draft);
    expect(reconciled.defense).toMatchObject({ armorIndex: '', shieldIndex: '' });
    expect(reconciled.equipment).not.toContainEqual(expect.objectContaining({ source: 'srd', index: 'chain-mail', equipped: true }));
    expect(reconciled.equipment).not.toContainEqual(expect.objectContaining({ source: 'srd', index: 'shield', equipped: true }));
  });

  it('removes incompatible canonical defenses for armor clearing, formula changes, manual defense, and Monk', () => {
    for (const mode of ['unarmored', 'manual'] as const) {
      const draft = createStructuredCharacterDraft('manual-transfer');
      draft.classKey = 'monk';
      draft.defense = mode === 'manual'
        ? { mode, armorIndex: 'chain-mail', shieldIndex: 'shield', formulaId: 'monk-unarmored-defense', armorClass: 15, reason: 'Imported.' }
        : { mode, armorIndex: 'chain-mail', shieldIndex: 'shield', formulaId: 'monk-unarmored-defense', armorClass: 10, reason: '' };
      draft.equipment = [
        { source: 'srd', index: 'chain-mail', quantity: 1, equipped: true },
        { source: 'srd', index: 'shield', quantity: 1, equipped: true },
      ];
      const reconciled = reconcileStructuredDraft(draft);
      expect(reconciled.equipment).toEqual([]);
      expect(reconciled.defense.armorIndex).toBe('');
      expect(reconciled.defense.shieldIndex).toBe('');
    }
    const stale = createStructuredCharacterDraft('manual-transfer');
    stale.classKey = 'fighter';
    stale.defense = { ...stale.defense, mode: 'unarmored', formulaId: 'barbarian-unarmored-defense' };
    expect(reconcileStructuredDraft(stale).defense.formulaId).toBe('standard-unarmored');
  });

  it('clearsPreparedIdsWhenSpellbookEntriesAreRemoved', () => {
    let draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'wizard';
    draft = reconcileStructuredDraft(draft);
    if (draft.spellcasting.mode !== 'spellbook-prepared') throw new Error('Wizard draft mode changed');
    draft.spellcasting.initialSpellbook = [
      { id: 'spell-magic-missile', source: 'srd', index: 'magic-missile' },
      { id: 'spell-shield', source: 'srd', index: 'shield' },
    ];
    draft.spellcasting.preparedSpellIds = ['spell-magic-missile', 'spell-shield'];
    draft.spellcasting.initialSpellbook = draft.spellcasting.initialSpellbook.filter((spell) => spell.id !== 'spell-shield');
    const reconciled = reconcileStructuredDraft(draft);
    expect(reconciled.spellcasting).toMatchObject({ preparedSpellIds: ['spell-magic-missile'] });
  });

  it('clearsOrSurfacesUnavailableSlotOverridesAfterLevelReduction', () => {
    let draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'wizard';
    draft.level = 5;
    draft = reconcileStructuredDraft(draft);
    draft.slotOverride = [{ level: 3, max: 2, reason: 'Imported slots.' }];
    draft.level = 1;
    const reconciled = reconcileStructuredDraft(draft);
    expect(reconciled.slotOverride).toEqual([]);
    expect(validateStructuredCharacterDraft(reconciled).some((error) => error.field.startsWith('slotOverride.3'))).toBe(false);
  });

  it('filters spells by Class and available spell level', () => {
    const draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'wizard';
    draft.level = 1;
    const spells = availableSpellsForDraft(draft);
    expect(spells.some((spell) => spell.index === 'magic-missile')).toBe(true);
    expect(spells.some((spell) => spell.level > 1)).toBe(false);
    draft.level = 5;
    expect(availableSpellsForDraft(draft).some((spell) => spell.level === 3)).toBe(true);
  });

  it('excludesActiveAlwaysPreparedSpellsButKeepsExpandedSpellsEligible', () => {
    let lifeCleric = createStructuredCharacterDraft('manual-transfer');
    lifeCleric.classKey = 'cleric';
    lifeCleric.subclassKey = 'life';
    lifeCleric = reconcileStructuredDraft(lifeCleric);
    expect(availableSpellsForDraft(lifeCleric).map((spell) => spell.index)).not.toEqual(expect.arrayContaining(['bless', 'cure-wounds']));

    let landDruid = createStructuredCharacterDraft('manual-transfer');
    landDruid.classKey = 'druid';
    landDruid.level = 3;
    landDruid.subclassKey = 'land';
    landDruid = reconcileStructuredDraft(landDruid);
    landDruid.ruleChoices = landDruid.ruleChoices.map((choice) => choice.ruleId === 'druid-land-circle'
      ? { ...choice, optionIds: ['circle-of-the-land-swamp'] }
      : choice);
    expect(availableSpellsForDraft(landDruid).map((spell) => spell.index)).not.toEqual(expect.arrayContaining(['acid-arrow', 'darkness']));

    let fiendWarlock = createStructuredCharacterDraft('manual-transfer');
    fiendWarlock.classKey = 'warlock';
    fiendWarlock.subclassKey = 'fiend';
    fiendWarlock = reconcileStructuredDraft(fiendWarlock);
    expect(availableSpellsForDraft(fiendWarlock).map((spell) => spell.index)).toEqual(expect.arrayContaining(['burning-hands', 'command']));
  });

  it('removes spell inputs when a Class change makes spellcasting unsupported', () => {
    let draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'wizard';
    draft = reconcileStructuredDraft(draft);
    if (draft.spellcasting.mode !== 'spellbook-prepared') throw new Error('Wizard draft mode changed');
    draft.spellcasting.initialSpellbook = [{ source: 'manual', id: 'imported-spell', name: 'Paper spell', level: 1, school: 'custom', castingTime: '1 action', range: '30 feet', components: ['V'], duration: 'Instantaneous', concentration: false, ritual: false, description: 'Imported spell description.', importReason: 'Transferred.' }];
    draft.classKey = 'fighter';
    expect(reconcileStructuredDraft(draft).spellcasting).toEqual({ mode: 'none' });
  });

  it('removesManualSpellAboveAvailableLevelAfterLevelReduction', () => {
    let draft = createStructuredCharacterDraft('manual-transfer');
    draft.classKey = 'wizard';
    draft.level = 5;
    draft = reconcileStructuredDraft(draft);
    if (draft.spellcasting.mode !== 'spellbook-prepared') throw new Error('Wizard draft mode changed');
    draft.spellcasting.additions[3].spells = [{ source: 'manual', id: 'manual-level-three', name: 'Imported level three', level: 3, school: 'custom', castingTime: '1 action', range: '30 feet', components: ['V'], duration: 'Instantaneous', concentration: false, ritual: false, description: 'Imported description.', importReason: 'Transferred.' }];
    draft.spellcasting.initialSpellbook = [{ source: 'manual', id: 'manual-level-one', name: 'Imported level one', level: 1, school: 'custom', castingTime: '1 action', range: '30 feet', components: ['V'], duration: 'Instantaneous', concentration: false, ritual: false, description: 'Imported description.', importReason: 'Transferred.' }];
    draft.level = 1;
    const reconciled = reconcileStructuredDraft(draft);
    if (reconciled.spellcasting.mode !== 'spellbook-prepared') throw new Error('Wizard draft mode changed');
    expect(reconciled.spellcasting.initialSpellbook).toContainEqual(expect.objectContaining({ id: 'manual-level-one', name: 'Imported level one' }));
    expect(reconciled.spellcasting.additions).toEqual([]);
    expect(JSON.stringify(reconciled.spellcasting)).not.toContain('manual-level-three');
  });

  it('mapsSameSpellReplacementToTheExactReplacementControl', () => {
    const draft = completeMinimumDraft('human', 'bard', 2);
    if (draft.spellcasting.mode !== 'known') throw new Error('Bard draft mode changed');
    const removed = draft.spellcasting.levels[0].learned[0];
    draft.spellcasting.levels[1].replacements = [{ removeSpellId: removed.id, add: structuredClone(removed) }];

    expect(validateStructuredCharacterDraft(draft)).toContainEqual({
      field: 'spellcasting.known.level-2.replacement.add',
      message: 'Replacement spell must be different from the removed spell.',
    });
  });
});

const completeMinimumDraft = (raceKey: string, classKey: string, level: number) => {
  let draft = createStructuredCharacterDraft('manual-transfer');
  draft.name = `${raceKey}-${classKey}-${level}`;
  draft.gender = 'Other';
  draft.raceKey = raceKey;
  draft.classKey = classKey;
  draft.level = level;
  const classRule = levelUpRules.classes.find((entry) => entry.index === classKey)!;
  draft.subclassKey = level >= classRule.subclassDecisionLevel ? classRule.subclasses[0].index : '';
  draft = reconcileStructuredDraft(draft);
  const availableChoices = availableRuleChoicesForDraft(draft);
  draft.ruleChoices = draft.ruleChoices.map((entry) => {
    const choice = availableChoices.find((candidate) => candidate.id === entry.ruleId)!;
    return choice.allowManual && choice.options.length === 0
      ? { ...entry, manualNote: `Explicit ${choice.label} choice.` }
      : { ...entry, optionIds: choice.options.slice(0, choice.count).map((option) => option.value) };
  });
  fillMinimumSpellDecisions(draft);
  return draft;
};

const fillMinimumSpellDecisions = (draft: ReturnType<typeof createStructuredCharacterDraft>) => {
  const input = draft.spellcasting;
  if (input.mode === 'none') return;
  const classRule = levelUpRules.classes.find((entry) => entry.index === draft.classKey)!;
  const target = classRule.levels.find((entry) => entry.level === draft.level)!.spellcasting!;
  const reservedCantrips = new Set(draft.ruleChoices.flatMap((choice) =>
    ['high-elf-cantrip', 'circle-of-the-land-bonus-cantrip'].includes(choice.ruleId) ? choice.optionIds : []));
  input.cantrips = pickSpells(draft, draft.level, 0, target.cantripsKnown ?? 0, reservedCantrips);
  const used = new Set<string>();
  const automatic = new Set<string>(characterCreationRules.spells.filter((spell) => spell.subclassMemberships.some((membership) =>
    membership.kind === 'always-prepared' && membership.classIndex === draft.classKey && membership.subclassIndex === draft.subclassKey && membership.classLevel <= draft.level)).map((spell) => spell.index));
  if (input.mode === 'known' || input.mode === 'pact-known') {
    input.levels.forEach((decision, index) => {
      const casting = classRule.levels.find((entry) => entry.level === decision.level)!.spellcasting!;
      const previous = index === 0 ? 0 : classRule.levels.find((entry) => entry.level === input.levels[index - 1].level)!.spellcasting!.spellsKnown ?? 0;
      decision.learned = pickSpells(draft, decision.level, null, Math.max(0, (casting.spellsKnown ?? 0) - previous), used);
      decision.learned.forEach((spell) => { if (spell.source === 'srd') used.add(spell.index); });
      decision.replacements = [];
    });
  } else if (input.mode === 'prepared') {
    const wanted = preparedCount(draft, 'preparedFormula' in target ? target.preparedFormula : null);
    input.prepared = pickSpells(draft, draft.level, null, wanted, automatic);
  } else {
    input.initialSpellbook = pickSpells(draft, 1, 1, 6, used);
    input.initialSpellbook.forEach((spell) => { if (spell.source === 'srd') used.add(spell.index); });
    input.additions.forEach((addition) => {
      addition.spells = pickSpells(draft, addition.level, null, 2, used);
      addition.spells.forEach((spell) => { if (spell.source === 'srd') used.add(spell.index); });
    });
    input.preparedSpellIds = [...input.initialSpellbook, ...input.additions.flatMap((entry) => entry.spells)]
      .filter((spell) => spell.source !== 'srd' || !automatic.has(spell.index))
      .slice(0, preparedCount(draft, 'preparedFormula' in target ? target.preparedFormula : null)).map((spell) => spell.id);
  }
};

const pickSpells = (
  draft: ReturnType<typeof createStructuredCharacterDraft>,
  acquisitionLevel: number,
  exactLevel: number | null,
  count: number,
  excluded: Set<string>,
): SpellSelectionInput[] => availableSpellsForDraft(draft, acquisitionLevel)
  .filter((spell) => (exactLevel === null ? spell.level > 0 : spell.level === exactLevel) && !excluded.has(spell.index))
  .slice(0, count).map((spell) => ({ id: `spell-${spell.index}`, source: 'srd' as const, index: spell.index }));

const preparedCount = (draft: ReturnType<typeof createStructuredCharacterDraft>, formula: string | null) => {
  const ability = levelUpRules.classes.find((entry) => entry.index === draft.classKey)!.spellcastingAbility!;
  const score = draft.importedScores[ability];
  const modifier = Math.floor((score - 10) / 2);
  return formula === 'max(1,abilityModifier+floor(classLevel/2))'
    ? Math.max(1, modifier + Math.floor(draft.level / 2))
    : Math.max(1, modifier + draft.level);
};
