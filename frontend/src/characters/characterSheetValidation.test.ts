import { describe, expect, it } from 'vitest';
import { buildGeneratedFighterCharacterSheet } from '../character-creation/generatedFighterBuilds';
import {
  buildManualCharacterCreateRequest,
  type ManualCharacterEntryDraftV1,
} from '../character-creation/manualCharacterEntry';
import { maraCharacterSheet } from './maraCharacterSheet';
import { isCharacterSheetV1 } from './characterSheetValidation';

describe('isCharacterSheetV1', () => {
  it('accepts every current application fixture', () => {
    const minimumManual = buildManualSheet(minimumManualDraft());
    const fullManual = buildManualSheet({
      ...minimumManualDraft(),
      concept: 'A practical scout with a borrowed map.',
      notes: 'Transferred from an existing paper sheet.',
      initiative: '+3',
      passivePerception: '14',
      action: {
        name: 'Longbow',
        actionType: 'Action',
        attackBonus: '+5',
        damage: '1d8 + 3 piercing',
        range: '150 / 600 ft.',
        summary: 'A careful ranged weapon attack.',
      },
      feature: {
        name: 'Favored Terrain Notes',
        category: 'Character note',
        summary: 'Ask the GM when wilderness knowledge applies.',
      },
    });

    expect(isCharacterSheetV1(maraCharacterSheet)).toBe(true);
    expect(
      isCharacterSheetV1(
        buildGeneratedFighterCharacterSheet('strength-melee-fighter', 'Aldren Vale'),
      ),
    ).toBe(true);
    expect(
      isCharacterSheetV1(
        buildGeneratedFighterCharacterSheet('dexterity-archer-fighter', 'Nia Swiftarrow'),
      ),
    ).toBe(true);
    expect(isCharacterSheetV1(minimumManual)).toBe(true);
    expect(isCharacterSheetV1(fullManual)).toBe(true);
  });

  it.each([undefined, null, true, 1, 'sheet', [], () => 'sheet'])(
    'returns false without throwing for non-object input %#',
    (value) => {
      expect(() => isCharacterSheetV1(value)).not.toThrow();
      expect(isCharacterSheetV1(value)).toBe(false);
    },
  );

  it('returns false without recursing forever for cyclic input', () => {
    const cyclic: Record<string, unknown> = { schemaVersion: 'CharacterSheetV1' };
    cyclic.ruleset = cyclic;

    expect(() => isCharacterSheetV1(cyclic)).not.toThrow();
    expect(isCharacterSheetV1(cyclic)).toBe(false);
  });

  it('does not mutate accepted or rejected input', () => {
    const accepted = cloneMara();
    const acceptedBefore = JSON.stringify(accepted);
    expect(isCharacterSheetV1(accepted)).toBe(true);
    expect(JSON.stringify(accepted)).toBe(acceptedBefore);

    const rejected = cloneMara();
    record(rejected).unexpected = 'must remain';
    const rejectedBefore = JSON.stringify(rejected);
    expect(isCharacterSheetV1(rejected)).toBe(false);
    expect(JSON.stringify(rejected)).toBe(rejectedBefore);
  });

  it.each([
    ['missing top-level key', (sheet: unknown) => delete record(sheet).audit],
    ['unknown top-level key', (sheet: unknown) => { record(sheet).unknown = true; }],
    ['incorrectly cased top-level key', (sheet: unknown) => {
      record(sheet).Ruleset = record(sheet).ruleset;
      delete record(sheet).ruleset;
    }],
    ['unsupported schema', (sheet: unknown) => { record(sheet).schemaVersion = 'CharacterSheetV2'; }],
    ['unsupported rules version', (sheet: unknown) => { record(record(sheet).ruleset).version = '2025'; }],
    ['unknown ruleset field', (sheet: unknown) => { record(record(sheet).ruleset).extra = true; }],
    ['invalid identity', (sheet: unknown) => { record(record(sheet).identity).classes = null; }],
    ['invalid summary', (sheet: unknown) => { record(record(sheet).summary).featuredAbilities = [null]; }],
    ['invalid abilities', (sheet: unknown) => { record(record(record(sheet).abilities).scores).strength = 10.5; }],
    ['missing required audited value', (sheet: unknown) => { record(record(record(sheet).combat).armorClass).value = undefined; }],
    ['inconsistent HP', (sheet: unknown) => { record(record(record(sheet).combat).hitPoints).current = 9999; }],
    ['invalid proficiency', (sheet: unknown) => { record(record(sheet).proficiencies).skills = [{ name: 'Stealth', proficient: true }]; }],
    ['invalid action', (sheet: unknown) => { record(array(record(sheet).actions)[0]).section = 'bonus'; }],
    ['invalid feature', (sheet: unknown) => { record(record(array(record(sheet).features)[0]).source).status = 'invented'; }],
    ['invalid spellcasting', (sheet: unknown) => { record(sheet).spellcasting = []; }],
    ['invalid equipment', (sheet: unknown) => { record(record(sheet).equipment).currency = { gp: -1 }; }],
    ['invalid personality', (sheet: unknown) => { record(record(sheet).personality).traits = [null]; }],
    ['invalid audit', (sheet: unknown) => { record(record(sheet).audit).Unexpected = []; }],
    ['deeply nested null', (sheet: unknown) => { record(array(record(sheet).actions)[0]).quickReference = null; }],
  ])('rejects %s', (_name, mutate) => {
    const sheet = cloneMara();
    mutate(sheet);
    expect(isCharacterSheetV1(sheet)).toBe(false);
  });

  it('rejects representative exact-shape failures in every major nested section', () => {
    const sections: Array<{
      name: string;
      requiredKey: string;
      locate: (sheet: unknown) => Record<string, unknown>;
      replace: (sheet: unknown, value: unknown) => void;
      allowsNull?: boolean;
    }> = [
      directSection('ruleset', 'system'),
      directSection('identity', 'name'),
      directSection('summary', 'displayLine'),
      directSection('abilities', 'scores'),
      directSection('combat', 'hitPoints'),
      directSection('proficiencies', 'savingThrows'),
      collectionEntry('actions', 'id'),
      collectionEntry('features', 'id'),
      { ...directSection('spellcasting', 'ability'), allowsNull: true },
      directSection('equipment', 'armor'),
      directSection('personality', 'traits'),
      directSection('audit', 'source'),
    ];

    for (const section of sections) {
      const missing = cloneMara();
      delete section.locate(missing)[section.requiredKey];
      expect(isCharacterSheetV1(missing), `${section.name}: missing`).toBe(false);

      const unknown = cloneMara();
      section.locate(unknown).unexpected = true;
      expect(isCharacterSheetV1(unknown), `${section.name}: unknown`).toBe(false);

      const wrongCase = cloneMara();
      const object = section.locate(wrongCase);
      const variant = `${section.requiredKey[0].toUpperCase()}${section.requiredKey.slice(1)}`;
      object[variant] = object[section.requiredKey];
      delete object[section.requiredKey];
      expect(isCharacterSheetV1(wrongCase), `${section.name}: wrong case`).toBe(false);

      if (!section.allowsNull) {
        const nullSection = cloneMara();
        section.replace(nullSection, null);
        expect(isCharacterSheetV1(nullSection), `${section.name}: null`).toBe(false);
      }

      const wrongType = cloneMara();
      section.replace(wrongType, 'invalid');
      expect(isCharacterSheetV1(wrongType), `${section.name}: wrong type`).toBe(false);
    }
  });

  it('enforces identifier and Unicode string boundaries', () => {
    const identifierMaximum = cloneMara();
    record(array(record(identifierMaximum).actions)[0]).id = 'a'.repeat(128);
    expect(isCharacterSheetV1(identifierMaximum)).toBe(true);

    const identifierOverflow = cloneMara();
    record(array(record(identifierOverflow).actions)[0]).id = 'a'.repeat(129);
    expect(isCharacterSheetV1(identifierOverflow)).toBe(false);

    const labelMaximum = cloneMara();
    record(array(record(labelMaximum).actions)[0]).name = '界'.repeat(200);
    expect(isCharacterSheetV1(labelMaximum)).toBe(true);

    const labelOverflow = cloneMara();
    record(array(record(labelOverflow).actions)[0]).name = '界'.repeat(201);
    expect(isCharacterSheetV1(labelOverflow)).toBe(false);

    const summaryMaximum = cloneMara();
    record(array(record(summaryMaximum).actions)[0]).summary = '界'.repeat(1000);
    expect(isCharacterSheetV1(summaryMaximum)).toBe(true);

    const summaryOverflow = cloneMara();
    record(array(record(summaryOverflow).actions)[0]).summary = '界'.repeat(1001);
    expect(isCharacterSheetV1(summaryOverflow)).toBe(false);
  });

  it('enforces integer, finite-number, and collection boundaries', () => {
    for (const value of [-100, 100]) {
      const sheet = cloneMara();
      record(array(record(sheet).actions)[0]).attackBonus = value;
      expect(isCharacterSheetV1(sheet)).toBe(true);
    }
    for (const value of [-101, 101, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const sheet = cloneMara();
      record(array(record(sheet).actions)[0]).attackBonus = value;
      expect(isCharacterSheetV1(sheet)).toBe(false);
    }

    const maximum = cloneMara();
    const source = record(array(record(maximum).actions)[0]);
    record(maximum).actions = Array.from({ length: 32 }, (_, index) => ({
      ...structuredClone(source),
      id: `action-${index}`,
    }));
    expect(isCharacterSheetV1(maximum)).toBe(true);

    const overflow = structuredClone(maximum);
    array(record(overflow).actions).push({ ...structuredClone(source), id: 'action-overflow' });
    expect(isCharacterSheetV1(overflow)).toBe(false);
  });

  it('rejects a structurally valid payload over 65,536 serialized bytes', () => {
    const sheet = cloneMara();
    const source = record(array(record(sheet).features)[0]);
    record(sheet).features = Array.from({ length: 64 }, (_, index) => ({
      ...structuredClone(source),
      id: `feature-${index}`,
      summary: 'a'.repeat(1000),
    }));

    expect(JSON.stringify(sheet).length).toBeGreaterThan(65_536);
    expect(isCharacterSheetV1(sheet)).toBe(false);
  });

  it('rejects duplicate collection identifiers and slot levels', () => {
    for (const field of ['actions', 'features'] as const) {
      const sheet = cloneMara();
      const items = array(record(sheet)[field]);
      items.push(structuredClone(items[0]));
      expect(isCharacterSheetV1(sheet)).toBe(false);
    }

    const duplicateSections = cloneMara();
    const sections = array(record(record(duplicateSections).summary).referenceSections);
    record(sections[1]).id = record(sections[0]).id;
    expect(isCharacterSheetV1(duplicateSections)).toBe(false);

    const duplicateSpells = cloneMara();
    const spellcasting = record(record(duplicateSpells).spellcasting);
    const spells = array(spellcasting.spells);
    spells.push(structuredClone(spells[0]));
    expect(isCharacterSheetV1(duplicateSpells)).toBe(false);

    const duplicateSlots = cloneMara();
    const slots = array(record(record(duplicateSlots).spellcasting).slots);
    slots.push(structuredClone(slots[0]));
    expect(isCharacterSheetV1(duplicateSlots)).toBe(false);
  });

  it('rejects intrinsic HP, range, slot, and speed inconsistencies', () => {
    const hp = cloneMara();
    const hitPoints = record(record(hp).combat).hitPoints;
    record(hitPoints).current = 20;
    record(hitPoints).max = 10;
    expect(isCharacterSheetV1(hp)).toBe(false);

    const range = cloneMara();
    record(array(record(range).actions)[0]).range = { normal: 600, long: 150 };
    expect(isCharacterSheetV1(range)).toBe(false);

    const slots = cloneMara();
    const firstSlot = record(array(record(record(slots).spellcasting).slots)[0]);
    firstSlot.max = 1;
    firstSlot.used = 2;
    expect(isCharacterSheetV1(slots)).toBe(false);

    const speed = cloneMara();
    array(record(record(speed).combat).speed).push({ type: 'walk', feet: 30 });
    expect(isCharacterSheetV1(speed)).toBe(false);
  });
});

const cloneMara = (): unknown => structuredClone(maraCharacterSheet);

const record = (value: unknown): Record<string, unknown> => value as Record<string, unknown>;

const array = (value: unknown): unknown[] => value as unknown[];

const directSection = (name: string, requiredKey: string) => ({
  name,
  requiredKey,
  locate: (sheet: unknown) => record(record(sheet)[name]),
  replace: (sheet: unknown, value: unknown) => { record(sheet)[name] = value; },
});

const collectionEntry = (name: string, requiredKey: string) => ({
  name,
  requiredKey,
  locate: (sheet: unknown) => record(array(record(sheet)[name])[0]),
  replace: (sheet: unknown, value: unknown) => { array(record(sheet)[name])[0] = value; },
});

const buildManualSheet = (draft: ManualCharacterEntryDraftV1): unknown => {
  const result = buildManualCharacterCreateRequest(draft);
  if (!result.ok) {
    throw new Error('expected valid manual fixture');
  }
  return result.value.referencePayload;
};

const minimumManualDraft = (): ManualCharacterEntryDraftV1 => ({
  name: 'Seren Ashfall',
  className: 'Ranger',
  subclassName: '',
  level: '3',
  ancestry: 'Human',
  background: 'Outlander',
  concept: '',
  notes: '',
  hitPoints: { current: '26', max: '28' },
  armorClass: '15',
  speedFt: '30',
  proficiencyBonus: '2',
  initiative: '',
  passivePerception: '',
  abilityScores: {
    strength: '12', dexterity: '16', constitution: '14',
    intelligence: '10', wisdom: '15', charisma: '8',
  },
  action: { name: '', actionType: '', attackBonus: '', damage: '', range: '', summary: '' },
  feature: { name: '', category: '', summary: '' },
});
