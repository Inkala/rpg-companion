import { describe, expect, it } from 'vitest';
import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { levelUpRules } from '../rules/generated/levelUpRules';
import type { CharacterSpellcastingInput, SpellSelectionInput } from './characterSheetV2';
import { reconstructSpellcastingV2 } from './characterSheetV2SpellProgression';

const srd = (index: string): SpellSelectionInput => ({ id: `spell-${index}`, source: 'srd', index });

describe('authoritative CharacterSheetV2 spell progression', () => {
  it('reconstructsWizardInitialSixSpellbookChoices', () => {
    const input: CharacterSpellcastingInput = {
      mode: 'spellbook-prepared',
      cantrips: ['fire-bolt', 'light', 'mage-hand'].map(srd),
      initialSpellbook: ['burning-hands', 'charm-person', 'detect-magic', 'identify', 'magic-missile', 'sleep'].map(srd),
      additions: [],
      preparedSpellIds: ['spell-burning-hands', 'spell-magic-missile', 'spell-sleep', 'spell-detect-magic'],
    };
    const result = reconstructSpellcastingV2({ classIndex: 'wizard', subclassIndex: null, level: 1, abilityModifier: 3, input });
    expect(result.spells.filter(({ state }) => state === 'spellbook')).toHaveLength(6);
    expect(result.preparedSpellIds).toEqual(input.preparedSpellIds);
  });

  it('requiresTwoWizardAdditionsForEveryLaterLevel', () => {
    const input: CharacterSpellcastingInput = {
      mode: 'spellbook-prepared',
      cantrips: ['fire-bolt', 'light', 'mage-hand'].map(srd),
      initialSpellbook: ['burning-hands', 'charm-person', 'detect-magic', 'identify', 'magic-missile', 'sleep'].map(srd),
      additions: [{ level: 2, spells: ['blur', 'invisibility'].map(srd) }],
      preparedSpellIds: ['spell-burning-hands', 'spell-magic-missile', 'spell-sleep', 'spell-detect-magic', 'spell-blur'],
    };
    expect(() => reconstructSpellcastingV2({ classIndex: 'wizard', subclassIndex: 'evocation', level: 3, abilityModifier: 2, input })).toThrow(/level 2 through 3/i);
  });

  it('validatesKnownSpellReplacementHistory', () => {
    const input: CharacterSpellcastingInput = {
      mode: 'known',
      cantrips: ['dancing-lights', 'light'].map(srd),
      levels: [
        { level: 1, learned: ['charm-person', 'cure-wounds', 'detect-magic', 'thunderwave'].map(srd), replacements: [] },
        { level: 2, learned: ['heroism'].map(srd), replacements: [{ removeSpellId: 'spell-charm-person', add: srd('healing-word') }] },
      ],
    };
    const result = reconstructSpellcastingV2({ classIndex: 'bard', subclassIndex: null, level: 2, abilityModifier: 3, input });
    expect(result.spells.map(({ id }) => id)).not.toContain('spell-charm-person');
    expect(result.spells.map(({ id }) => id)).toContain('spell-healing-word');
  });

  it('rejectsSpellDecisionsForNonSpellcasters', () => {
    expect(reconstructSpellcastingV2({ classIndex: 'fighter', subclassIndex: null, level: 5, abilityModifier: 0, input: { mode: 'none' } })).toMatchObject({ spells: [], preparedSpellIds: [], alwaysPreparedSpellIds: [] });
    expect(() => reconstructSpellcastingV2({ classIndex: 'fighter', subclassIndex: null, level: 5, abilityModifier: 0, input: { mode: 'known', cantrips: [], levels: [] } })).toThrow(/none/i);
  });

  it('separatesPreparedChoicesFromAutomaticSubclassSpells', () => {
    const input: CharacterSpellcastingInput = {
      mode: 'prepared',
      cantrips: ['guidance', 'light', 'sacred-flame'].map(srd),
      prepared: ['command', 'detect-evil-and-good', 'guiding-bolt', 'healing-word'].map(srd),
    };
    const result = reconstructSpellcastingV2({ classIndex: 'cleric', subclassIndex: 'life', level: 1, abilityModifier: 3, input });
    expect(result.preparedSpellIds).toHaveLength(4);
    expect(result.alwaysPreparedSpellIds).toEqual(['automatic-bless', 'automatic-cure-wounds']);
    expect(result.spells.filter(({ state }) => state === 'always-prepared')).toHaveLength(2);
  });

  it('rejectsLifeDomainSpellsAsOrdinaryPreparedSelections', () => {
    const input: CharacterSpellcastingInput = {
      mode: 'prepared',
      cantrips: ['guidance', 'light', 'sacred-flame'].map(srd),
      prepared: ['bless', 'command', 'guiding-bolt', 'healing-word'].map(srd),
    };
    expect(() => reconstructSpellcastingV2({
      classIndex: 'cleric', subclassIndex: 'life', level: 1, abilityModifier: 3, input,
    })).toThrow(/duplicates/i);
  });

  it('keepsRaceGrantedCantripsSeparateFromClassProgression', () => {
    const result = reconstructSpellcastingV2({ classIndex: 'fighter', subclassIndex: null, level: 1, abilityModifier: 0, input: { mode: 'none' }, raceGrantedCantripIndexes: ['fire-bolt'] });
    expect(result.spells).toEqual([expect.objectContaining({ id: 'race-high-elf-cantrip-fire-bolt', canonicalIndex: 'fire-bolt', state: 'known', provenance: { kind: 'calculated', ruleId: 'high-elf-cantrip' } })]);
  });

  it('rejectsCanonicalDuplicatesEvenWhenClientIDsDiffer', () => {
    const input: CharacterSpellcastingInput = {
      mode: 'known',
      cantrips: [{ id: 'first-light', source: 'srd', index: 'light' }, { id: 'second-light', source: 'srd', index: 'light' }],
      levels: [{ level: 1, learned: ['charm-person', 'cure-wounds', 'detect-magic', 'thunderwave'].map(srd), replacements: [] }],
    };
    expect(() => reconstructSpellcastingV2({ classIndex: 'bard', subclassIndex: null, level: 1, abilityModifier: 0, input })).toThrow(/duplicates/i);
  });

  it('rejectsClassSelectionsThatDuplicateRaceGrantedCantrips', () => {
    const input: CharacterSpellcastingInput = {
      mode: 'known',
      cantrips: ['fire-bolt', 'light', 'mage-hand', 'prestidigitation'].map(srd),
      levels: [{ level: 1, learned: ['burning-hands', 'charm-person'].map(srd), replacements: [] }],
    };
    expect(() => reconstructSpellcastingV2({ classIndex: 'sorcerer', subclassIndex: null, level: 1, abilityModifier: 0, input, raceGrantedCantripIndexes: ['fire-bolt'] })).toThrow(/duplicates/i);
  });

  it('resolvesAlwaysPreparedSubclassSpellsOutsideTheBaseClassList', () => {
    const input: CharacterSpellcastingInput = {
      mode: 'prepared',
      cantrips: ['druidcraft', 'guidance'].map(srd),
      prepared: [srd('cure-wounds')],
    };
    const result = reconstructSpellcastingV2({
      classIndex: 'druid', subclassIndex: 'land', level: 3, abilityModifier: -3, input,
      activeFeatureIds: ['circle-of-the-land-swamp'],
    });
    expect(result.alwaysPreparedSpellIds).toEqual(['automatic-acid-arrow', 'automatic-darkness']);
  });

  it('acceptsMinimumValidDecisionsForEveryCanonicalClassThroughLevelFive', () => {
    let checked = 0;
    for (const selectedClass of levelUpRules.classes) {
      for (const level of selectedClass.levels) {
        const input = minimumSpellcastingInput(selectedClass.index, level.level);
        expect(() => reconstructSpellcastingV2({ classIndex: selectedClass.index, subclassIndex: null, level: level.level, abilityModifier: -10, input })).not.toThrow();
        checked += 1;
      }
    }
    expect(checked).toBe(levelUpRules.classes.length * 5);
  });

  it('enforcesWizardCantripCountsAndPreparedSpellbookSubsets', () => {
    const valid = minimumSpellcastingInput('wizard', 1);
    if (valid.mode !== 'spellbook-prepared') throw new Error('Wizard fixture mode changed');
    expect(() => reconstructSpellcastingV2({ classIndex: 'wizard', subclassIndex: null, level: 1, abilityModifier: -10, input: { ...valid, cantrips: valid.cantrips.slice(0, 2) } })).toThrow(/cantrips/i);
    expect(() => reconstructSpellcastingV2({ classIndex: 'wizard', subclassIndex: null, level: 1, abilityModifier: -10, input: { ...valid, preparedSpellIds: ['spell-not-in-spellbook'] } })).toThrow(/subset/i);
  });

  it('rejectsInvalidKnownSpellDecisionHistoriesAndReplacements', () => {
    const base: CharacterSpellcastingInput = {
      mode: 'known', cantrips: ['dancing-lights', 'light'].map(srd),
      levels: [
        { level: 1, learned: ['charm-person', 'cure-wounds', 'detect-magic', 'thunderwave'].map(srd), replacements: [] },
        { level: 2, learned: ['heroism'].map(srd), replacements: [] },
      ],
    };
    if (base.mode !== 'known') throw new Error('Bard fixture mode changed');
    const contexts = { classIndex: 'bard', subclassIndex: null, level: 2, abilityModifier: 0 };
    const invalid = [
      { ...base, levels: [...base.levels, { level: 3, learned: [], replacements: [] }] },
      { ...base, levels: [base.levels[0], { ...base.levels[1], learned: [srd('shatter')] }] },
      { ...base, levels: [base.levels[0], { ...base.levels[1], replacements: [{ removeSpellId: 'spell-unknown', add: srd('healing-word') }] }] },
      { ...base, levels: [base.levels[0], { ...base.levels[1], replacements: [{ removeSpellId: 'spell-charm-person', add: srd('magic-missile') }] }] },
      { ...base, levels: [{ ...base.levels[0], replacements: [{ removeSpellId: 'spell-charm-person', add: srd('healing-word') }] }, base.levels[1]] },
    ];
    invalid.forEach((input) => expect(() => reconstructSpellcastingV2({ ...contexts, input })).toThrow());
  });

  it('rejectsSameSpellReplacementInTypeScriptAndGo', () => {
    const input: CharacterSpellcastingInput = {
      mode: 'known', cantrips: ['dancing-lights', 'light'].map(srd),
      levels: [
        { level: 1, learned: ['charm-person', 'cure-wounds', 'detect-magic', 'thunderwave'].map(srd), replacements: [] },
        { level: 2, learned: ['heroism'].map(srd), replacements: [{ removeSpellId: 'spell-charm-person', add: srd('charm-person') }] },
      ],
    };
    expect(() => reconstructSpellcastingV2({ classIndex: 'bard', subclassIndex: null, level: 2, abilityModifier: 0, input }))
      .toThrow('replacement must add a distinct new spell');
  });

  it('appliesSequentialReplacementsToTheResultOfEarlierLevels', () => {
    const input: CharacterSpellcastingInput = {
      mode: 'known', cantrips: ['dancing-lights', 'light'].map(srd),
      levels: [
        { level: 1, learned: ['charm-person', 'cure-wounds', 'detect-magic', 'thunderwave'].map(srd), replacements: [] },
        { level: 2, learned: ['heroism'].map(srd), replacements: [{ removeSpellId: 'spell-charm-person', add: srd('healing-word') }] },
        { level: 3, learned: ['shatter'].map(srd), replacements: [{ removeSpellId: 'spell-healing-word', add: srd('hold-person') }] },
      ],
    };
    const result = reconstructSpellcastingV2({ classIndex: 'bard', subclassIndex: 'lore', level: 3, abilityModifier: 0, input });
    expect(result.spells.map((spell) => spell.id)).toEqual(expect.arrayContaining(['spell-hold-person', 'spell-shatter']));
    expect(result.spells.map((spell) => spell.id)).not.toEqual(expect.arrayContaining(['spell-charm-person', 'spell-healing-word']));
  });

  it('enforcesPreparedFormulaAndManualSpellMetadataWithinNormalCounts', () => {
    const prepared: CharacterSpellcastingInput = { mode: 'prepared', cantrips: ['guidance', 'light', 'sacred-flame'].map(srd), prepared: ['command', 'guiding-bolt', 'healing-word'].map(srd) };
    expect(() => reconstructSpellcastingV2({ classIndex: 'cleric', subclassIndex: null, level: 1, abilityModifier: 3, input: prepared })).toThrow(/exactly 4/i);
    const manual: SpellSelectionInput = {
      id: 'manual-one', source: 'manual', name: 'Transferred Spell', level: 1, school: 'Evocation', castingTime: '1 action', range: '30 feet', components: ['V'],
      duration: 'Instantaneous', concentration: false, ritual: false, description: 'A complete imported spell.', importReason: '',
    };
    const known: CharacterSpellcastingInput = { mode: 'known', cantrips: ['dancing-lights', 'light'].map(srd), levels: [{ level: 1, learned: [manual, srd('cure-wounds'), srd('detect-magic'), srd('thunderwave')], replacements: [] }] };
    expect(() => reconstructSpellcastingV2({ classIndex: 'bard', subclassIndex: null, level: 1, abilityModifier: 0, input: known })).toThrow(/reason/i);
    manual.importReason = 'Transferred from a paper sheet.';
    expect(reconstructSpellcastingV2({ classIndex: 'bard', subclassIndex: null, level: 1, abilityModifier: 0, input: known }).spells.some(({ id }) => id === 'manual-one')).toBe(true);
  });

  it('usesFiendExpandedEligibilityWithinWarlockKnownLimitsAndPreservesPactSlots', () => {
    const input: CharacterSpellcastingInput = {
      mode: 'pact-known', cantrips: ['eldritch-blast', 'mage-hand'].map(srd),
      levels: [{ level: 1, learned: ['burning-hands', 'command'].map(srd), replacements: [] }],
    };
    const result = reconstructSpellcastingV2({ classIndex: 'warlock', subclassIndex: 'fiend', level: 1, abilityModifier: 0, input });
    expect(result.spells.filter(({ level }) => level > 0)).toHaveLength(2);
    expect(levelUpRules.classes.find(({ index }) => index === 'warlock')?.levels[0].spellcasting).toMatchObject({ mode: 'pact-known', pactSlots: 1, pactSlotLevel: 1 });
  });
});

const minimumSpellcastingInput = (classIndex: string, targetLevel: number): CharacterSpellcastingInput => {
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === classIndex);
  const target = selectedClass?.levels.find(({ level }) => level === targetLevel)?.spellcasting;
  if (!selectedClass || !target) return { mode: 'none' };
  const cantrips = availableCanonicalSpells(classIndex, targetLevel, true).slice(0, target.cantripsKnown ?? 0).map(srd);
  if (target.mode === 'prepared') return { mode: 'prepared', cantrips, prepared: availableCanonicalSpells(classIndex, targetLevel, false).slice(0, 1).map(srd) };
  if (target.mode === 'known' || target.mode === 'pact-known') {
    const used = new Set<string>();
    let previousKnown = 0;
    const levels = selectedClass.levels.filter(({ level, spellcasting }) => level <= targetLevel && spellcasting !== null).map((levelRule) => {
      const known = levelRule.spellcasting?.spellsKnown ?? 0;
      const learned = availableCanonicalSpells(classIndex, levelRule.level, false).filter((index) => !used.has(index)).slice(0, Math.max(0, known - previousKnown));
      learned.forEach((index) => used.add(index));
      previousKnown = known;
      return { level: levelRule.level, learned: learned.map(srd), replacements: [] };
    });
    return { mode: target.mode, cantrips, levels };
  }
  const used = new Set(availableCanonicalSpells(classIndex, 1, false).slice(0, 6));
  const initialSpellbook = [...used].map(srd);
  const additions = selectedClass.levels.filter(({ level }) => level >= 2 && level <= targetLevel).map(({ level }) => {
    const indexes = availableCanonicalSpells(classIndex, level, false).filter((index) => !used.has(index)).slice(0, 2);
    indexes.forEach((index) => used.add(index));
    return { level, spells: indexes.map(srd) };
  });
  return { mode: 'spellbook-prepared', cantrips, initialSpellbook, additions, preparedSpellIds: [initialSpellbook[0].id] };
};

const availableCanonicalSpells = (classIndex: string, classLevel: number, cantrip: boolean): string[] => {
  const availableLevels = levelUpRules.classes.find(({ index }) => index === classIndex)?.levels.find(({ level }) => level === classLevel)?.spellcasting?.availableSpellLevels ?? [];
  return characterCreationRules.spells.filter((spell) => (spell.classIndexes as readonly string[]).includes(classIndex) &&
    (spell.level === 0) === cantrip && (cantrip || (availableLevels as readonly number[]).includes(spell.level))).map(({ index }) => index);
};
