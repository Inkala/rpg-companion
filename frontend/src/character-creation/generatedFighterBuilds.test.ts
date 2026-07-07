import { describe, expect, it } from 'vitest';
import { characterSheetToReference } from '../characters/characterSheetToReference';
import type { CharacterBuildId } from './characterCreationTypes';
import {
  buildGeneratedFighterCharacterSheet,
  buildGeneratedFighterCreateRequest,
  generatedFighterBuilds,
} from './generatedFighterBuilds';

const buildIds: CharacterBuildId[] = [
  'strength-melee-fighter',
  'dexterity-archer-fighter',
];

describe('generatedFighterBuilds', () => {
  it('defines both supported Help me choose Fighter builds', () => {
    expect(Object.keys(generatedFighterBuilds).sort()).toEqual([...buildIds].sort());
  });

  it('maps Strength melee Fighter to the exact create payload required by T-013A', () => {
    const payload = buildGeneratedFighterCreateRequest(
      'strength-melee-fighter',
      'Branna Shieldhand',
    );

    expect(payload).toMatchObject({
      name: 'Branna Shieldhand',
      className: 'Fighter',
      subclassName: null,
      level: 1,
      ancestry: 'Human',
      background: 'Soldier',
      abilityScores: {
        strength: 16,
        dexterity: 11,
        constitution: 15,
        intelligence: 9,
        wisdom: 13,
        charisma: 14,
      },
      hitPoints: {
        current: 12,
        max: 12,
      },
      armorClass: 19,
      speedFt: 30,
    });
    expect(payload).not.toHaveProperty('ownerSubjectId');
    expect(payload.referencePayload.identity.name).toBe('Branna Shieldhand');
    expect(payload.referencePayload.summary.featuredAbilities).toEqual([
      'Longsword',
      'Defense',
      'Second Wind',
    ]);
  });

  it('maps Dexterity archer Fighter to the exact create payload required by T-013A', () => {
    const payload = buildGeneratedFighterCreateRequest(
      'dexterity-archer-fighter',
      'Nera Quickshot',
    );

    expect(payload).toMatchObject({
      name: 'Nera Quickshot',
      className: 'Fighter',
      subclassName: null,
      level: 1,
      ancestry: 'Human',
      background: 'Outlander',
      abilityScores: {
        strength: 11,
        dexterity: 16,
        constitution: 15,
        intelligence: 9,
        wisdom: 14,
        charisma: 13,
      },
      hitPoints: {
        current: 12,
        max: 12,
      },
      armorClass: 14,
      speedFt: 30,
    });
    expect(payload).not.toHaveProperty('ownerSubjectId');
    expect(payload.referencePayload.identity.name).toBe('Nera Quickshot');
    expect(payload.referencePayload.summary.featuredAbilities).toEqual([
      'Longbow',
      'Archery',
      'Second Wind',
    ]);
  });

  it('uses the build default name when the provided name is blank', () => {
    expect(
      buildGeneratedFighterCreateRequest('strength-melee-fighter', '   ').name,
    ).toBe('Aldren Vale');
    expect(
      buildGeneratedFighterCreateRequest('dexterity-archer-fighter', '').name,
    ).toBe('Lysa Thorn');
  });

  it('puts a full CharacterSheetV1 object in referencePayload', () => {
    const payload = buildGeneratedFighterCreateRequest(
      'strength-melee-fighter',
      'Branna Shieldhand',
    );

    expect(payload.referencePayload).toMatchObject({
      schemaVersion: 'CharacterSheetV1',
      ruleset: {
        system: 'dnd5e',
        version: '2014',
        sourceStatus: 'draft',
      },
      identity: {
        name: 'Branna Shieldhand',
        ancestry: 'Human',
        background: 'Soldier',
        classes: [
          {
            name: 'Fighter',
            level: 1,
          },
        ],
      },
      summary: {
        displayLine: 'Human Fighter - Level 1',
        supportingLine: 'Strength melee Fighter - Soldier',
      },
      abilities: expect.any(Object),
      combat: expect.any(Object),
      proficiencies: expect.any(Object),
      actions: expect.any(Array),
      features: expect.any(Array),
      spellcasting: null,
      equipment: expect.any(Object),
      personality: expect.any(Object),
      audit: expect.any(Object),
    });
  });

  it.each(buildIds)('maps %s through Character Reference without a Spells section', (buildId) => {
    const sheet = buildGeneratedFighterCharacterSheet(buildId, 'Test Fighter');
    const reference = characterSheetToReference(sheet);

    expect(reference.name).toBe('Test Fighter');
    expect(reference.identity).toBe('Human Fighter - Level 1');
    expect(reference.sections.map((section) => section.id)).toEqual([
      'actions',
      'features',
    ]);
    expect(reference.sections.find((section) => section.id === 'actions')?.items.length).toBe(2);
    expect(reference.sections.find((section) => section.id === 'features')?.items.length).toBe(2);
    expect(reference.sections.find((section) => section.id === 'spells')).toBeUndefined();
  });
});
