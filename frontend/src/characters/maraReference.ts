import maraPortrait from '../assets/characters/mara-vale-portrait.webp';
import {
  characterSheetToLandingPreview,
  characterSheetToReference,
} from './characterSheetToReference';
import type { CharacterSummaryDTO } from './apiTypes';
import { maraCharacterSheet } from './maraCharacterSheet';

export const maraPortraits = {
  'mara-vale-portrait': {
    src: maraPortrait,
    alt: 'Portrait of Mara Velard',
  },
};

export const maraReferenceCharacter = characterSheetToReference(maraCharacterSheet, maraPortraits);

export const maraLandingPreview = characterSheetToLandingPreview(maraCharacterSheet, maraPortraits);

export const maraSummaryCharacter: CharacterSummaryDTO = {
  id: 'mara-velard-sample',
  name: maraCharacterSheet.identity.name,
  className: maraCharacterSheet.identity.classes[0]?.name ?? 'Ranger',
  subclassName: maraCharacterSheet.identity.classes[0]?.subclass ?? null,
  level: maraCharacterSheet.identity.classes[0]?.level ?? 3,
  ancestry: maraCharacterSheet.identity.ancestry,
  background: maraCharacterSheet.identity.background,
  hitPoints: {
    current: maraCharacterSheet.combat.hitPoints.current,
    max: maraCharacterSheet.combat.hitPoints.max,
  },
  armorClass: maraCharacterSheet.combat.armorClass.value ?? 14,
  speedFt: maraCharacterSheet.combat.speed[0]?.feet ?? 30,
  portraitAssetId: maraCharacterSheet.summary.portraitAssetId,
  portraitAlt: maraCharacterSheet.summary.portraitAlt,
  featuredAbilities: maraCharacterSheet.summary.featuredAbilities,
  landingConcept: maraCharacterSheet.summary.landingConcept,
  updatedAt: '2026-07-05T10:00:00Z',
};
