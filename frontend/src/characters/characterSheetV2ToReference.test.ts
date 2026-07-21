import { describe, expect, it } from 'vitest';
import {
  availableRuleChoicesForDraft,
  buildCreateCharacterV2Request,
  createStructuredCharacterDraft,
  reconcileStructuredDraft,
  type StructuredCharacterDraft,
} from '../character-creation/characterSheetV2Draft';
import { buildCharacterSheetV2 } from './characterSheetV2Calculations';
import { characterSheetV2ToReference } from './characterSheetV2ToReference';
import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { buildTestWizardCharacterSheetV2 } from './characterSheetV2TestFixtures';
import { isCharacterSheetV2 } from './characterSheetV2Validation';

describe('CharacterSheetV2 Character Reference mapping', () => {
  it('maps identity, abilities, combat, attacks, features, equipment, and Other without losing content', () => {
    const draft = createStructuredCharacterDraft('guided');
    draft.gender = 'Female';
    draft.other = [{ id: 'oath', title: 'Oath', description: 'Protect the village at every cost.' }];
    const sheet = buildCharacterSheetV2(buildCreateCharacterV2Request(completeChoices(draft)));
    const reference = characterSheetV2ToReference(sheet, { current: 7, max: 12 });

    expect(reference.name).toBe('Aldren Vale');
    expect(reference.identity).toContain('Human');
    expect(reference.identity).toContain('Fighter 1');
    expect(reference.supportingIdentity).toContain('Female');
    expect(reference.supportingIdentity).toContain('Soldier');
    expect(reference.stats.hitPoints).toEqual({ current: 7, max: 12 });
    expect(reference.stats.secondary.map((stat) => stat.label)).toEqual(expect.arrayContaining([
      'Initiative', 'Passive Perception', 'Proficiency',
    ]));

    const abilities = reference.sections.find((section) => section.id === 'abilities');
    expect(abilities?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Strength', hint: expect.stringContaining('+') }),
    ]));
    expect(reference.sections.find((section) => section.id === 'actions')?.items[0]).toMatchObject({
      name: 'Longsword',
      meta: expect.arrayContaining(['Atk +5', '1d8 +3 slashing']),
    });
    expect(reference.sections.find((section) => section.id === 'equipment')?.items).toEqual(
      expect.arrayContaining([expect.objectContaining({
        name: 'Chain Mail', hint: expect.stringContaining('Equipped'),
        quickReference: expect.objectContaining({ details: expect.objectContaining({ text: expect.stringContaining('Base AC') }) }),
      })]),
    );
    expect(reference.sections.find((section) => section.id === 'other')?.items[0]).toMatchObject({
      name: 'Oath',
      hint: 'Protect the village at every cost.',
      quickReference: expect.objectContaining({ details: expect.objectContaining({ text: 'Protect the village at every cost.' }) }),
    });
    const feature = reference.sections.find((section) => section.id === 'features')?.items[0];
    expect(feature?.quickReference?.details?.text).toEqual(expect.any(String));
    expect(feature?.quickReference?.details?.text).not.toMatch(/Details planned/i);
  });

  it('preserves explicit manual Race, Class, and subclass identity without inventing canonical fallbacks', () => {
    const initial = createStructuredCharacterDraft('guided');
    initial.gender = 'Other';
    const draft = completeChoices(initial);
    const sheet = buildCharacterSheetV2(buildCreateCharacterV2Request(draft));
    sheet.identity.race = { source: 'manual', name: 'Skyfolk' };
    sheet.identity.class = { source: 'manual', name: 'Runesmith' };
    sheet.identity.subclass = { source: 'manual', name: 'Cloud Archive' };

    const reference = characterSheetV2ToReference(sheet, { current: 10, max: 10 });

    expect(reference.identity).toBe('Skyfolk · Runesmith 1 · Cloud Archive');
    expect(reference.identity).not.toContain('Human');
    expect(reference.identity).not.toContain('Fighter');
  });

  it('maps complete spell metadata, automatic state, slots, and descriptions to Quick Reference', () => {
    const draft = createStructuredCharacterDraft('guided');
    draft.gender = 'Other';
    const sheet = buildCharacterSheetV2(buildCreateCharacterV2Request(completeChoices(reconcileStructuredDraft(draft))));
    const guidingBolt = characterCreationRules.spells.find((spell) => spell.index === 'guiding-bolt')!;
    sheet.spellcasting = {
      decisionHistory: { mode: 'prepared', cantrips: [], prepared: [] },
      ability: 'wisdom',
      spellSaveDC: { value: 12, provenance: { kind: 'calculated', ruleId: 'spell-save-dc' } },
      spellAttackBonus: { value: 4, provenance: { kind: 'calculated', ruleId: 'spell-attack-bonus' } },
      slots: [{ level: 1, max: 2, used: 0, provenance: { kind: 'calculated', ruleId: 'spell-slots' } }],
      availableSpellLevels: [1],
      spells: [{
        id: guidingBolt.index, canonicalIndex: guidingBolt.index, name: guidingBolt.name,
        level: guidingBolt.level, school: guidingBolt.school, castingTime: guidingBolt.castingTime,
        range: guidingBolt.range, components: [...guidingBolt.components], materialComponent: guidingBolt.material,
        duration: guidingBolt.duration, concentration: guidingBolt.concentration, ritual: guidingBolt.ritual,
        description: guidingBolt.description, higherLevelText: guidingBolt.higherLevel,
        state: 'prepared', provenance: { kind: 'calculated', ruleId: 'spell-canonical' },
      }],
      preparedSpellIds: [guidingBolt.index],
      alwaysPreparedSpellIds: [],
    };
    const reference = characterSheetV2ToReference(sheet, { current: 10, max: 10 });
    const spells = reference.sections.find((section) => section.id === 'spells');
    const guidingBoltItem = spells?.items.find((item) => item.name === 'Guiding Bolt');

    expect(reference.stats.secondary.map((stat) => stat.label)).toEqual(expect.arrayContaining([
      'Spell save DC', 'Spell attack bonus',
    ]));
    expect(spells?.items[0]).toMatchObject({ name: 'Spell slots' });
    expect(guidingBoltItem).toMatchObject({
      hint: expect.any(String),
      meta: expect.arrayContaining(['1st-level', 'Prepared']),
      quickReference: expect.objectContaining({
        metadata: expect.arrayContaining([
          { label: 'Casting time', value: expect.any(String) },
          { label: 'Range', value: expect.any(String) },
          { label: 'Duration', value: expect.any(String) },
          { label: 'Components', value: expect.any(String) },
        ]),
        details: expect.objectContaining({ text: expect.any(String) }),
      }),
    });
    expect(guidingBoltItem?.quickReference?.details?.text.length).toBeGreaterThan(20);
  });

  it('derives Wizard prepared presentation from stable prepared IDs without mutating or duplicating spells', () => {
    const sheet = buildTestWizardCharacterSheetV2();
    const before = JSON.stringify(sheet);
    const reference = characterSheetV2ToReference(sheet, { current: 7, max: 7 });
    const spellItems = reference.sections.find((section) => section.id === 'spells')!.items
      .filter((item) => item.id !== 'spell-slots');
    const leveledItems = spellItems.filter((item) => item.meta.includes('1st-level'));
    const stateFor = (name: string) => leveledItems.find((item) => item.name === name)?.meta[1];

    expect(sheet.spellcasting.spells.filter((spell) => spell.level > 0)).toHaveLength(6);
    expect(sheet.spellcasting.preparedSpellIds).toEqual(['spell-mage-armor', 'spell-magic-missile']);
    expect(stateFor('Mage Armor')).toBe('Prepared');
    expect(stateFor('Magic Missile')).toBe('Prepared');
    for (const name of ['Burning Hands', 'Charm Person', 'Detect Magic', 'Sleep']) {
      expect(stateFor(name)).toBe('Spellbook');
    }
    expect(spellItems.filter((item) => item.name === 'Mage Armor')).toHaveLength(1);
    expect(spellItems.find((item) => item.name === 'Fire Bolt')?.meta).toEqual(expect.arrayContaining(['Cantrip', 'Known']));
    expect(spellItems.find((item) => item.name === 'Mage Armor')?.quickReference?.metadata).toEqual(expect.arrayContaining([
      { label: 'State', value: 'Prepared' },
    ]));
    expect(JSON.stringify(sheet)).toBe(before);
  });

  it('continues rejecting an unknown Wizard prepared stable ID', () => {
    const invalid = buildTestWizardCharacterSheetV2();
    invalid.spellcasting.preparedSpellIds[0] = 'spell-not-in-spellbook';

    expect(isCharacterSheetV2(invalid)).toBe(false);
  });
});

const completeChoices = (draft: StructuredCharacterDraft): StructuredCharacterDraft => ({
  ...draft,
  ruleChoices: availableRuleChoicesForDraft(draft).map((choice) => ({
    ruleId: choice.id,
    optionIds: choice.options.slice(0, choice.count).map((option) => option.value),
  })),
});
