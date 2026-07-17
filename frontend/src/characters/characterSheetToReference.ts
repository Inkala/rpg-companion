import type { CharacterSheetV1 } from './characterSheet';
import type {
  CharacterReferencePortrait,
  CharacterReferenceSection,
  CharacterReferenceViewModel,
  HitPoints,
} from './types';

export type CharacterLandingPreview = {
  name: string;
  identity: string;
  concept: string;
  stats: {
    hitPoints: HitPoints;
    armorClass: string;
    speed: string;
  };
  portrait: CharacterReferencePortrait;
  featuredAbilities: string[];
};

type PortraitMap = Record<string, CharacterReferencePortrait>;

export const characterSheetToReference = (
  sheet: CharacterSheetV1,
  portraits: PortraitMap = {},
): CharacterReferenceViewModel => {
  return {
    name: sheet.identity.name,
    identity: sheet.summary.displayLine,
    supportingIdentity: sheet.summary.supportingLine,
    portrait: portraitForSheet(sheet, portraits),
    stats: {
      hitPoints: {
        current: sheet.combat.hitPoints.current,
        max: sheet.combat.hitPoints.max,
      },
      armorClass: formatAuditedNumber(sheet.combat.armorClass.value),
      speed: formatSpeed(sheet),
      concentration: sheet.combat.concentration ?? undefined,
      secondary: [
        {
          label: 'Initiative',
          value: formatSignedNumber(sheet.combat.initiative),
          emphasis: 'initiative',
        },
        {
          label: 'Passive Perception',
          value: formatAuditedNumber(sheet.combat.passivePerception.value),
          emphasis: 'perception',
        },
        {
          label: 'Proficiency',
          value: formatSignedNumber(sheet.combat.proficiencyBonus),
          emphasis: 'proficiency',
        },
      ],
    },
    sections: sheet.summary.referenceSections
      .map((sectionConfig) => sectionForConfig(sheet, sectionConfig))
      .filter((section): section is CharacterReferenceSection => section.items.length > 0),
  };
};

export const characterSheetToLandingPreview = (
  sheet: CharacterSheetV1,
  portraits: PortraitMap = {},
): CharacterLandingPreview => {
  const reference = characterSheetToReference(sheet, portraits);

  return {
    name: reference.name,
    identity: reference.identity,
    concept: sheet.summary.landingConcept,
    stats: {
      hitPoints: reference.stats.hitPoints,
      armorClass: reference.stats.armorClass,
      speed: reference.stats.speed,
    },
    portrait: reference.portrait ?? {
      src: '',
      alt: '',
    },
    featuredAbilities: sheet.summary.featuredAbilities,
  };
};

const sectionForConfig = (
  sheet: CharacterSheetV1,
  sectionConfig: CharacterSheetV1['summary']['referenceSections'][number],
): CharacterReferenceSection => {
  switch (sectionConfig.id) {
    case 'actions':
      return {
        ...sectionConfig,
        items: sheet.actions.map((action) => ({
          id: action.id,
          name: action.name,
          hint: action.summary,
          meta: action.meta,
          quickReference: action.quickReference,
        })),
      };
    case 'features':
      return {
        ...sectionConfig,
        items: sheet.features
          .filter((feature) => feature.includeInReference)
          .map((feature) => ({
            id: feature.id,
            name: feature.name,
            hint: feature.summary,
            meta: [feature.category, ...feature.tags],
            quickReference: feature.quickReference,
          })),
      };
    case 'spells':
      return {
        ...sectionConfig,
        items:
          sheet.spellcasting?.spells.map((spell) => ({
            id: spell.id,
            name: spell.name,
            hint: spell.summary,
            meta: spell.meta,
            quickReference: spell.quickReference,
          })) ?? [],
      };
  }
};

const portraitForSheet = (
  sheet: CharacterSheetV1,
  portraits: PortraitMap,
): CharacterReferencePortrait | undefined => {
  if (!sheet.summary.portraitAssetId) {
    return undefined;
  }

  return portraits[sheet.summary.portraitAssetId];
};

const formatSpeed = (sheet: CharacterSheetV1) => {
  const walkSpeed = sheet.combat.speed.find((speed) => speed.type === 'walk');
  if (!walkSpeed) {
    return '';
  }

  return `${walkSpeed.feet} ft.`;
};

const formatSignedNumber = (value: number) => {
  return value >= 0 ? `+${value}` : String(value);
};

const formatAuditedNumber = (value: number | undefined) => {
  return value === undefined ? '' : String(value);
};
