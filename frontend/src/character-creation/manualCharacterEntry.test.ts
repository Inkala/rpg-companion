import { describe, expect, it } from 'vitest';
import { characterSheetToReference } from '../characters/characterSheetToReference';
import {
  buildManualCharacterCreateRequest,
  validateManualCharacterEntryDraft,
  type ManualCharacterEntryDraftV1,
} from './manualCharacterEntry';

const validMinimumDraft = (): ManualCharacterEntryDraftV1 => ({
  name: 'Seren Ashfall',
  className: 'Ranger',
  subclassName: '',
  level: '3',
  ancestry: 'Human',
  background: 'Outlander',
  concept: '',
  notes: '',
  hitPoints: {
    current: '26',
    max: '28',
  },
  armorClass: '15',
  speedFt: '30',
  proficiencyBonus: '2',
  initiative: '',
  passivePerception: '',
  abilityScores: {
    strength: '12',
    dexterity: '16',
    constitution: '14',
    intelligence: '10',
    wisdom: '15',
    charisma: '8',
  },
  action: {
    name: '',
    actionType: '',
    attackBonus: '',
    damage: '',
    range: '',
    summary: '',
  },
  feature: {
    name: '',
    category: '',
    summary: '',
  },
});

describe('manual character entry', () => {
  it('maps a valid minimum draft to a backend create request', () => {
    const result = buildManualCharacterCreateRequest(validMinimumDraft());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toMatchObject({
      name: 'Seren Ashfall',
      className: 'Ranger',
      subclassName: null,
      level: 3,
      ancestry: 'Human',
      background: 'Outlander',
      abilityScores: {
        strength: 12,
        dexterity: 16,
        constitution: 14,
        intelligence: 10,
        wisdom: 15,
        charisma: 8,
      },
      hitPoints: {
        current: 26,
        max: 28,
      },
      armorClass: 15,
      speedFt: 30,
    });
    expect(result.value).not.toHaveProperty('ownerSubjectId');
    expect(result.value.referencePayload.schemaVersion).toBe('CharacterSheetV1');
    expect(result.value.referencePayload.combat.proficiencyBonus).toBe(2);
  });

  it('includes a provided subclass in both payload layers', () => {
    const draft = {
      ...validMinimumDraft(),
      subclassName: 'Hunter',
    };

    const result = buildManualCharacterCreateRequest(draft);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.subclassName).toBe('Hunter');
    expect(result.value.referencePayload.identity.classes[0]).toEqual({
      name: 'Ranger',
      level: 3,
      subclass: 'Hunter',
    });
    expect(result.value.referencePayload.summary.displayLine).toBe(
      'Human Ranger - Level 3',
    );
    expect(result.value.referencePayload.summary.supportingLine).toBe(
      'Hunter - Outlander',
    );
  });

  it('maps an optional action into Character Reference sections', () => {
    const draft = {
      ...validMinimumDraft(),
      action: {
        name: 'Longbow',
        actionType: 'Action',
        attackBonus: '+5',
        damage: '1d8 + 3 piercing',
        range: '150 / 600 ft.',
        summary: 'A careful ranged weapon attack.',
      },
    };

    const result = buildManualCharacterCreateRequest(draft);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const reference = characterSheetToReference(result.value.referencePayload);
    const actionSection = reference.sections.find((section) => section.id === 'actions');

    expect(actionSection?.items).toEqual([
      expect.objectContaining({
        name: 'Longbow',
        hint: 'A careful ranged weapon attack.',
        meta: ['Action', '+5 to hit', '1d8 + 3 piercing', '150 / 600 ft.'],
      }),
    ]);
  });

  it('maps an optional feature into Character Reference sections', () => {
    const draft = {
      ...validMinimumDraft(),
      feature: {
        name: 'Favored Terrain Notes',
        category: 'Character note',
        summary: 'Ask the GM when wilderness knowledge applies.',
      },
    };

    const result = buildManualCharacterCreateRequest(draft);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const reference = characterSheetToReference(result.value.referencePayload);
    const featureSection = reference.sections.find((section) => section.id === 'features');

    expect(featureSection?.items).toEqual([
      expect.objectContaining({
        name: 'Favored Terrain Notes',
        hint: 'Ask the GM when wilderness knowledge applies.',
        meta: ['Character note'],
      }),
    ]);
  });

  it('omits empty optional action and feature rows', () => {
    const result = buildManualCharacterCreateRequest(validMinimumDraft());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.referencePayload.actions).toEqual([]);
    expect(result.value.referencePayload.features).toEqual([]);
    expect(result.value.referencePayload.summary.referenceSections).toEqual([]);
    expect(characterSheetToReference(result.value.referencePayload).sections).toEqual([]);
  });

  it('returns validation errors and no payload for missing required fields', () => {
    const draft = {
      ...validMinimumDraft(),
      name: ' ',
      className: '',
      ancestry: '',
      background: '',
      abilityScores: {
        ...validMinimumDraft().abilityScores,
        wisdom: '',
      },
    };

    const errors = validateManualCharacterEntryDraft(draft);
    const result = buildManualCharacterCreateRequest(draft);

    expect(errors).toEqual(
      expect.arrayContaining([
        { field: 'name', message: 'Name is required.' },
        { field: 'className', message: 'Class is required.' },
        { field: 'ancestry', message: 'Ancestry is required.' },
        { field: 'background', message: 'Background is required.' },
        { field: 'abilityScores.wisdom', message: 'Wisdom is required.' },
      ]),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(errors);
    }
  });

  it('returns validation errors for invalid numeric values', () => {
    const draft = {
      ...validMinimumDraft(),
      level: '21',
      armorClass: '-1',
      speedFt: 'fast',
      proficiencyBonus: '-2',
      hitPoints: {
        current: '-1',
        max: 'many',
      },
      abilityScores: {
        ...validMinimumDraft().abilityScores,
        strength: '0',
        charisma: '31',
      },
    };

    expect(validateManualCharacterEntryDraft(draft)).toEqual(
      expect.arrayContaining([
        { field: 'level', message: 'Level must be between 1 and 20.' },
        { field: 'hitPoints.current', message: 'Current HP must be non-negative.' },
        { field: 'hitPoints.max', message: 'Maximum HP must be a number.' },
        { field: 'armorClass', message: 'Armor Class must be non-negative.' },
        { field: 'speedFt', message: 'Speed must be a number.' },
        {
          field: 'proficiencyBonus',
          message: 'Proficiency bonus must be non-negative.',
        },
        { field: 'abilityScores.strength', message: 'Strength must be between 1 and 30.' },
        { field: 'abilityScores.charisma', message: 'Charisma must be between 1 and 30.' },
      ]),
    );
  });

  it('returns a validation error when current HP is greater than max HP', () => {
    const draft = {
      ...validMinimumDraft(),
      hitPoints: {
        current: '31',
        max: '30',
      },
    };

    expect(validateManualCharacterEntryDraft(draft)).toContainEqual({
      field: 'hitPoints.current',
      message: 'Current HP must be less than or equal to maximum HP.',
    });
  });

  it('builds a CharacterSheetV1 payload that can pass through Character Reference', () => {
    const draft = {
      ...validMinimumDraft(),
      concept: 'A practical scout with a borrowed map.',
      notes: 'Transferred from an existing paper sheet.',
      initiative: '+3',
      passivePerception: '14',
    };
    const result = buildManualCharacterCreateRequest(draft);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const reference = characterSheetToReference(result.value.referencePayload);

    expect(result.value.referencePayload).toMatchObject({
      schemaVersion: 'CharacterSheetV1',
      ruleset: {
        system: 'dnd5e',
        version: '2014',
        sourceStatus: 'needs-audit',
      },
      spellcasting: null,
    });
    expect(reference.name).toBe('Seren Ashfall');
    expect(reference.identity).toBe('Human Ranger - Level 3');
    expect(reference.stats.hitPoints).toEqual({ current: 26, max: 28 });
    expect(reference.stats.armorClass).toBe('15');
    expect(reference.stats.speed).toBe('30 ft.');
    expect(reference.stats.secondary).toEqual([
      { label: 'Initiative', value: '+3', emphasis: 'initiative' },
      { label: 'Passive Perception', value: '14', emphasis: 'perception' },
      { label: 'Proficiency', value: '+2', emphasis: 'proficiency' },
    ]);
  });
});
