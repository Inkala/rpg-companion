import {
  availableRuleChoicesForDraft,
  buildCreateCharacterV2Request,
  createStructuredCharacterDraft,
  reconcileStructuredDraft,
  validateStructuredCharacterDraft,
} from '../character-creation/characterSheetV2Draft';
import type { CharacterV2DTO, CreateCharacterV2RequestDTO } from './characterSheetV2';
import { buildCharacterSheetV2 } from './characterSheetV2Calculations';

export const buildTestCharacterSheetV2 = (name = 'Aldren Vale', level = 1) => {
  let draft = createStructuredCharacterDraft(level > 1 ? 'manual-transfer' : 'guided');
  draft.name = name;
  draft.gender = 'Other';
  draft.raceKey = 'human';
  draft.classKey = 'fighter';
  draft.level = level;
  draft.subclassKey = level >= 3 ? 'champion' : '';
  draft = reconcileStructuredDraft(draft);
  const availableChoices = availableRuleChoicesForDraft(draft);
  draft.ruleChoices = draft.ruleChoices.map((entry) => {
    const choice = availableChoices.find((candidate) => candidate.id === entry.ruleId)!;
    return choice.allowManual && choice.options.length === 0
      ? { ...entry, manualNote: `Explicit ${choice.label} choice.` }
      : { ...entry, optionIds: choice.options.slice(0, choice.count).map((option) => option.value) };
  });
  const errors = validateStructuredCharacterDraft(draft);
  if (errors.length > 0) throw new Error(errors.map((error) => `${error.field}: ${error.message}`).join(' | '));
  return buildCharacterSheetV2(buildCreateCharacterV2Request(draft));
};

export const testCharacterV2DTO = (name = 'Aldren Vale', level = 1): CharacterV2DTO => {
  const referencePayload = buildTestCharacterSheetV2(name, level);
  return {
    id: 'saved-v2',
    schemaVersion: 'CharacterSheetV2',
    name,
    gender: referencePayload.identity.gender,
    className: 'Fighter',
    subclassName: level >= 3 ? 'Champion' : null,
    level,
    race: 'Human',
    background: 'Soldier',
    abilityScores: Object.fromEntries(Object.entries(referencePayload.abilityScores.scores)
      .map(([ability, resolved]) => [ability, resolved.value])) as CharacterV2DTO['abilityScores'],
    hitPoints: { current: referencePayload.hitPointProgression.maximum.value, max: referencePayload.hitPointProgression.maximum.value },
    armorClass: referencePayload.combat.armorClass.value,
    speedFt: referencePayload.combat.speedFt.value,
    referencePayload,
    createdAt: '2026-07-20T10:00:00Z',
    updatedAt: '2026-07-20T10:00:00Z',
  };
};

export const buildTestWizardCharacterSheetV2 = (name = 'Elara Quill') => buildCharacterSheetV2({
  schemaVersion: 'CharacterSheetV2',
  creationSource: 'manual-transfer',
  identity: {
    name,
    gender: 'Other',
    race: { source: 'srd', index: 'human' },
    background: 'Sage',
    class: { source: 'srd', index: 'wizard' },
    level: 1,
    subclass: null,
  },
  abilityScores: {
    mode: 'calculated',
    base: { strength: 8, dexterity: 14, constitution: 13, intelligence: 11, wisdom: 12, charisma: 10 },
  },
  proficiencies: { perception: 'none', skills: [] },
  hitPointProgression: { levelGains: [] },
  combat: { defense: { mode: 'unarmored', formulaId: 'standard-unarmored' } },
  ruleChoices: [{ ruleId: 'human-extra-language', optionIds: ['dwarvish'] }],
  attacks: [{
    id: 'fire-bolt',
    name: 'Fire Bolt',
    attackBonus: { mode: 'calculated', ability: 'spellcasting', proficient: true },
    damage: [{ dice: '1d10', bonus: 0, type: 'fire' }],
  }],
  spellcasting: {
    mode: 'spellbook-prepared',
    cantrips: ['fire-bolt', 'light', 'mage-hand'].map((index) => ({ id: `spell-${index}`, source: 'srd' as const, index })),
    initialSpellbook: ['burning-hands', 'charm-person', 'detect-magic', 'mage-armor', 'magic-missile', 'sleep']
      .map((index) => ({ id: `spell-${index}`, source: 'srd' as const, index })),
    additions: [],
    preparedSpellIds: ['spell-mage-armor', 'spell-magic-missile'],
  },
  features: [{ source: 'srd', index: 'spellcasting-wizard' }],
  equipment: [],
  other: [],
} satisfies CreateCharacterV2RequestDTO);

export const testWizardV2DTO = (name = 'Elara Quill'): CharacterV2DTO => {
  const referencePayload = buildTestWizardCharacterSheetV2(name);
  return {
    id: 'saved-wizard-v2',
    schemaVersion: 'CharacterSheetV2',
    name,
    gender: referencePayload.identity.gender,
    className: 'Wizard',
    subclassName: null,
    level: 1,
    race: 'Human',
    background: 'Sage',
    abilityScores: Object.fromEntries(Object.entries(referencePayload.abilityScores.scores)
      .map(([ability, resolved]) => [ability, resolved.value])) as CharacterV2DTO['abilityScores'],
    hitPoints: {
      current: referencePayload.hitPointProgression.maximum.value,
      max: referencePayload.hitPointProgression.maximum.value,
    },
    armorClass: referencePayload.combat.armorClass.value,
    speedFt: referencePayload.combat.speedFt.value,
    referencePayload,
    createdAt: '2026-07-20T10:00:00Z',
    updatedAt: '2026-07-20T10:00:00Z',
  };
};
