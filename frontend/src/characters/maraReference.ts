import maraPortrait from '../assets/characters/mara-vale-portrait.webp';
import {
  characterSheetToLandingPreview,
  characterSheetToReference,
} from './characterSheetToReference';
import { maraCharacterSheet } from './maraCharacterSheet';

const maraPortraits = {
  'mara-vale-portrait': {
    src: maraPortrait,
    alt: 'Portrait of Mara Velard',
  },
};

export const maraReferenceCharacter = characterSheetToReference(maraCharacterSheet, maraPortraits);

export const maraLandingPreview = characterSheetToLandingPreview(maraCharacterSheet, maraPortraits);
