import { describe, expect, it } from 'vitest';
import { characterSheetToLandingPreview, characterSheetToReference } from './characterSheetToReference';
import { maraCharacterSheet } from './maraCharacterSheet';

const portraits = {
  'mara-vale-portrait': {
    src: '/mara.webp',
    alt: 'Portrait of Mara Velard',
  },
};

describe('characterSheetToReference', () => {
  it('maps Mara CharacterSheetV1 to the current Character Reference view model', () => {
    const reference = characterSheetToReference(maraCharacterSheet, portraits);

    expect(reference.name).toBe('Mara Velard');
    expect(reference.identity).toBe('Human Ranger · Level 3');
    expect(reference.supportingIdentity).toBe('Hunter · Outlander');
    expect(reference.stats.hitPoints).toEqual({ current: 26, max: 26 });
    expect(reference.stats.armorClass).toBe('14');
    expect(reference.stats.speed).toBe('30 ft.');
    expect(reference.stats.concentration).toBeUndefined();
    expect(reference.stats.secondary).toEqual([
      { label: 'Initiative', value: '+3' },
      { label: 'Passive Perception', value: '14' },
      { label: 'Proficiency', value: '+2' },
    ]);
    expect(reference.sections.map((section) => section.id)).toEqual([
      'actions',
      'features',
      'spells',
    ]);
    expect(reference.sections[0]).toMatchObject({
      id: 'actions',
      label: 'Actions',
      defaultOpen: true,
    });
    expect(reference.sections[1]).toMatchObject({
      id: 'features',
      label: 'Features',
      defaultOpen: false,
    });
    expect(reference.sections[2]).toMatchObject({
      id: 'spells',
      label: 'Spells',
      defaultOpen: false,
    });
    expect(reference.sections[0].items.map((item) => item.name)).toEqual([
      'Longbow',
      'Shortsword',
    ]);
    expect(reference.sections[1].items.map((item) => item.name)).toEqual([
      'Archery',
      'Colossus Slayer',
    ]);
    expect(reference.sections[2].items.map((item) => item.name)).toEqual([
      "Hunter's Mark",
      'Fog Cloud',
      'Cure Wounds',
    ]);
  });

  it('preserves Colossus Slayer quick-reference copy', () => {
    const reference = characterSheetToReference(maraCharacterSheet, portraits);
    const features = reference.sections.find((section) => section.id === 'features');
    const colossusSlayer = features?.items.find((item) => item.id === 'colossus-slayer');

    expect(colossusSlayer?.quickReference).toEqual({
      title: 'Colossus Slayer',
      label: 'Hunter feature',
      summary: 'After you hit an enemy that is already wounded, add 1d8 damage.',
      metadata: [
        {
          label: 'Timing',
          value: 'Once per turn',
        },
        {
          label: 'Resource',
          value: 'No limited use',
        },
      ],
      reminder: {
        heading: 'Remember',
        text: 'The enemy must be below its hit point maximum before the hit.',
      },
      details: {
        collapsedLabel: 'Show more details',
        expandedLabel: 'Hide details',
        text: 'The bonus applies once per turn, not once per attack.',
      },
    });
  });

  it('maps Mara landing preview from the same CharacterSheetV1 fixture', () => {
    const preview = characterSheetToLandingPreview(maraCharacterSheet, portraits);

    expect(preview).toEqual({
      name: 'Mara Velard',
      identity: 'Human Ranger · Level 3',
      concept:
        'A steady wilderness scout with a clear attack, useful spells, and quick rules reminders.',
      stats: {
        hitPoints: {
          current: 26,
          max: 26,
        },
        armorClass: '14',
        speed: '30 ft.',
      },
      portrait: {
        src: '/mara.webp',
        alt: 'Portrait of Mara Velard',
      },
      featuredAbilities: ['Longbow', 'Colossus Slayer'],
    });
  });

  it('keeps suspicious Mara sheet values marked for audit', () => {
    expect(maraCharacterSheet.combat.armorClass.needsConfirmation).toBe(true);
    expect(maraCharacterSheet.combat.passivePerception.needsConfirmation).toBe(true);
    expect(maraCharacterSheet.proficiencies.savingThrows.needsConfirmation).toBe(true);
    expect(maraCharacterSheet.spellcasting?.spellSaveDC?.needsConfirmation).toBe(true);
    expect(maraCharacterSheet.spellcasting?.spellAttackBonus?.needsConfirmation).toBe(true);
    expect(maraCharacterSheet.equipment.tools.needsConfirmation).toBe(true);
    expect(maraCharacterSheet.equipment.languages.needsConfirmation).toBe(true);
    expect(maraCharacterSheet.equipment.currency?.needsConfirmation).toBe(true);
    expect(maraCharacterSheet.audit.needsConfirmation).toContain(
      'Confirm the complete D&D 5E 2014 Ranger feature set for the sample.',
    );
    expect(maraCharacterSheet.audit.rulesVersionWarnings).toContain(
      'Do not add Weapon Mastery-like generated content to this 2014 sample.',
    );
  });
});
