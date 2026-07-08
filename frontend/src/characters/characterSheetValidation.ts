import type { CharacterSheetV1 } from './characterSheet';

export const isCharacterSheetV1 = (value: unknown): value is CharacterSheetV1 => {
  if (!isRecord(value) || value.schemaVersion !== 'CharacterSheetV1') {
    return false;
  }

  return (
    isRecord(value.ruleset) &&
    value.ruleset.system === 'dnd5e' &&
    typeof value.ruleset.version === 'string' &&
    isRecord(value.identity) &&
    typeof value.identity.name === 'string' &&
    typeof value.identity.ancestry === 'string' &&
    typeof value.identity.background === 'string' &&
    Array.isArray(value.identity.classes) &&
    isRecord(value.summary) &&
    typeof value.summary.displayLine === 'string' &&
    typeof value.summary.landingConcept === 'string' &&
    Array.isArray(value.summary.featuredAbilities) &&
    Array.isArray(value.summary.referenceSections) &&
    isRecord(value.abilities) &&
    isRecord(value.abilities.scores) &&
    isRecord(value.combat) &&
    isRecord(value.combat.hitPoints) &&
    typeof value.combat.hitPoints.current === 'number' &&
    typeof value.combat.hitPoints.max === 'number' &&
    Array.isArray(value.combat.speed) &&
    typeof value.combat.proficiencyBonus === 'number' &&
    isRecord(value.proficiencies) &&
    Array.isArray(value.actions) &&
    Array.isArray(value.features) &&
    isRecord(value.equipment) &&
    isRecord(value.personality) &&
    isRecord(value.audit)
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};
