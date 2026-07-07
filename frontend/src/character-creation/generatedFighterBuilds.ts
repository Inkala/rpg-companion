import type { AbilityScoresDTO, HitPointsDTO } from '../characters/apiTypes';
import type {
  CharacterSheetAction,
  CharacterSheetFeature,
  CharacterSheetV1,
} from '../characters/characterSheet';
import type { CharacterBuildId } from './characterCreationTypes';

export type GeneratedFighterBuild = {
  id: CharacterBuildId;
  label: string;
  defaultName: string;
  ancestry: 'Human';
  className: 'Fighter';
  subclassName: null;
  level: 1;
  background: string;
  concept: string;
  landingConcept: string;
  abilityScores: AbilityScoresDTO;
  hitPoints: HitPointsDTO;
  armorClass: number;
  speedFt: number;
  initiative: number;
  passivePerception: number;
  proficiencyBonus: 2;
  savingThrows: string[];
  skills: GeneratedFighterSkill[];
  armor: string[];
  weapons: string[];
  packsAndGear: string[];
  tools: string[];
  languages: string[];
  actions: CharacterSheetAction[];
  features: CharacterSheetFeature[];
  featuredAbilities: string[];
  auditNeedsConfirmation: string[];
  auditDeferredCorrections: string[];
};

export type GeneratedFighterCreateRequest = {
  name: string;
  className: string;
  subclassName: string | null;
  level: number;
  ancestry: string;
  background: string;
  abilityScores: AbilityScoresDTO;
  hitPoints: HitPointsDTO;
  armorClass: number;
  speedFt: number;
  referencePayload: CharacterSheetV1;
};

type GeneratedFighterSkill = {
  name: string;
  proficient: true;
  modifier: number;
};

const secondWindFeature: CharacterSheetFeature = {
  id: 'second-wind',
  name: 'Second Wind',
  category: 'Fighter feature',
  source: {
    rulesVersion: '2014',
    status: 'confirmed',
  },
  tags: ['Bonus Action', 'Short Rest'],
  summary: 'Regain 1d10 + 1 HP once per short rest.',
  includeInReference: true,
  quickReference: {
    title: 'Second Wind',
    label: 'Fighter feature',
    summary: 'Regain 1d10 + 1 HP as a bonus action.',
    metadata: [
      {
        label: 'Timing',
        value: 'Bonus Action',
      },
      {
        label: 'Recovery',
        value: 'Short Rest',
      },
    ],
    reminder: {
      heading: 'Remember',
      text: 'This is a simple emergency heal for the Fighter.',
    },
    details: {
      collapsedLabel: 'Show more details',
      expandedLabel: 'Hide details',
      text: 'At level 1, Second Wind restores 1d10 + your Fighter level hit points.',
    },
  },
};

export const generatedFighterBuilds: Record<CharacterBuildId, GeneratedFighterBuild> = {
  'strength-melee-fighter': {
    id: 'strength-melee-fighter',
    label: 'Strength melee Fighter',
    defaultName: 'Aldren Vale',
    ancestry: 'Human',
    className: 'Fighter',
    subclassName: null,
    level: 1,
    background: 'Soldier',
    concept:
      'A brave front-line defender who holds the line with heavy armor, a shield, and a reliable longsword.',
    landingConcept:
      'A sturdy beginner Fighter built to stand in front, protect allies, and make one clear melee attack.',
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
    initiative: 0,
    passivePerception: 11,
    proficiencyBonus: 2,
    savingThrows: ['Strength', 'Constitution'],
    skills: [
      { name: 'Athletics', proficient: true, modifier: 5 },
      { name: 'Intimidation', proficient: true, modifier: 4 },
      { name: 'Perception', proficient: true, modifier: 3 },
      { name: 'Survival', proficient: true, modifier: 3 },
    ],
    armor: ['Chain mail', 'Shield'],
    weapons: ['Longsword', 'Javelin'],
    packsAndGear: ['Beginner adventuring gear'],
    tools: ['Gaming set'],
    languages: ['Common'],
    actions: [
      {
        id: 'longsword',
        name: 'Longsword',
        kind: 'attack',
        section: 'actions',
        actionType: 'Action',
        attackBonus: 5,
        damage: [
          {
            dice: '1d8',
            bonus: 3,
            type: 'slashing',
          },
        ],
        summary: 'Reliable one-handed melee attack while carrying a shield.',
        meta: ['Action', '+5 to hit', '1d8 + 3 slashing'],
      },
      {
        id: 'javelin',
        name: 'Javelin',
        kind: 'attack',
        section: 'actions',
        actionType: 'Action',
        attackBonus: 5,
        damage: [
          {
            dice: '1d6',
            bonus: 3,
            type: 'piercing',
          },
        ],
        range: {
          normal: 30,
          long: 120,
        },
        summary: 'Simple thrown backup attack when an enemy is out of reach.',
        meta: ['Action', '+5 to hit', '1d6 + 3 piercing', '30 / 120 ft.'],
      },
    ],
    features: [
      {
        id: 'defense',
        name: 'Defense',
        category: 'Fighting Style',
        source: {
          rulesVersion: '2014',
          status: 'confirmed',
        },
        tags: ['Passive'],
        summary: '+1 AC while wearing armor.',
        includeInReference: true,
      },
      secondWindFeature,
    ],
    featuredAbilities: ['Longsword', 'Defense', 'Second Wind'],
    auditNeedsConfirmation: [],
    auditDeferredCorrections: [
      'Generated fixed beginner build. Full D&D character creation rules are deferred.',
    ],
  },
  'dexterity-archer-fighter': {
    id: 'dexterity-archer-fighter',
    label: 'Dexterity archer Fighter',
    defaultName: 'Lysa Thorn',
    ancestry: 'Human',
    className: 'Fighter',
    subclassName: null,
    level: 1,
    background: 'Outlander',
    concept:
      'An alert ranged Fighter who finds a clean angle, lands accurate shots, and keeps moving.',
    landingConcept:
      'A precise beginner Fighter built around longbow attacks, awareness, and flexible positioning.',
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
    initiative: 3,
    passivePerception: 14,
    proficiencyBonus: 2,
    savingThrows: ['Strength', 'Constitution'],
    skills: [
      { name: 'Acrobatics', proficient: true, modifier: 5 },
      { name: 'Perception', proficient: true, modifier: 4 },
      { name: 'Stealth', proficient: true, modifier: 5 },
      { name: 'Survival', proficient: true, modifier: 4 },
    ],
    armor: ['Leather armor'],
    weapons: ['Longbow', 'Shortsword'],
    packsAndGear: ['Beginner adventuring gear'],
    tools: ['Musical instrument'],
    languages: ['Common'],
    actions: [
      {
        id: 'longbow',
        name: 'Longbow',
        kind: 'attack',
        section: 'actions',
        actionType: 'Action',
        attackBonus: 7,
        damage: [
          {
            dice: '1d8',
            bonus: 3,
            type: 'piercing',
          },
        ],
        range: {
          normal: 150,
          long: 600,
        },
        summary: 'Accurate ranged attack with the Archery fighting style.',
        meta: ['Action', '+7 to hit', '1d8 + 3 piercing', '150 / 600 ft.'],
      },
      {
        id: 'shortsword',
        name: 'Shortsword',
        kind: 'attack',
        section: 'actions',
        actionType: 'Action',
        attackBonus: 5,
        damage: [
          {
            dice: '1d6',
            bonus: 3,
            type: 'piercing',
          },
        ],
        summary: 'Close-range backup weapon for when enemies get near.',
        meta: ['Action', '+5 to hit', '1d6 + 3 piercing'],
      },
    ],
    features: [
      {
        id: 'archery',
        name: 'Archery',
        category: 'Fighting Style',
        source: {
          rulesVersion: '2014',
          status: 'confirmed',
        },
        tags: ['Passive'],
        summary: '+2 to ranged weapon attack rolls.',
        includeInReference: true,
      },
      secondWindFeature,
    ],
    featuredAbilities: ['Longbow', 'Archery', 'Second Wind'],
    auditNeedsConfirmation: [],
    auditDeferredCorrections: [
      'Generated fixed beginner build. Full D&D character creation rules are deferred.',
    ],
  },
};

export const buildGeneratedFighterCharacterSheet = (
  buildId: CharacterBuildId,
  characterName: string,
): CharacterSheetV1 => {
  const build = generatedFighterBuilds[buildId];
  const name = normalizeCharacterName(characterName, build.defaultName);

  return {
    schemaVersion: 'CharacterSheetV1',
    ruleset: {
      system: 'dnd5e',
      version: '2014',
      sourceStatus: 'draft',
    },
    identity: {
      name,
      ancestry: build.ancestry,
      background: build.background,
      classes: [
        {
          name: build.className,
          level: build.level,
        },
      ],
      concept: build.concept,
    },
    summary: {
      displayLine: `${build.ancestry} ${build.className} - Level ${build.level}`,
      supportingLine: `${build.label} - ${build.background}`,
      landingConcept: build.landingConcept,
      featuredAbilities: [...build.featuredAbilities],
      referenceSections: [
        {
          id: 'actions',
          label: 'Actions',
          defaultOpen: true,
        },
        {
          id: 'features',
          label: 'Features',
          defaultOpen: false,
        },
      ],
    },
    abilities: {
      scores: { ...build.abilityScores },
    },
    combat: {
      hitPoints: {
        current: build.hitPoints.current,
        max: build.hitPoints.max,
        temporary: 0,
      },
      armorClass: {
        value: build.armorClass,
      },
      initiative: build.initiative,
      speed: [
        {
          type: 'walk',
          feet: build.speedFt,
        },
      ],
      proficiencyBonus: build.proficiencyBonus,
      passivePerception: {
        value: build.passivePerception,
      },
      concentration: null,
    },
    proficiencies: {
      savingThrows: {
        values: [...build.savingThrows],
      },
      skills: build.skills.map((skill) => ({ ...skill })),
      weapons: {
        values: [...build.weapons],
      },
      armor: {
        values: [...build.armor],
      },
      tools: {
        values: [...build.tools],
      },
      languages: {
        values: [...build.languages],
      },
    },
    actions: build.actions.map(cloneAction),
    features: build.features.map(cloneFeature),
    spellcasting: null,
    equipment: {
      armor: {
        values: [...build.armor],
      },
      weapons: [...build.weapons],
      packsAndGear: {
        values: [...build.packsAndGear],
      },
      tools: {
        values: [...build.tools],
      },
      languages: {
        values: [...build.languages],
      },
      currency: null,
    },
    personality: {
      traits: [],
      ideals: [],
      bonds: [],
      flaws: [],
      notes: ['This is a fixed beginner build generated from Help me choose.'],
    },
    audit: {
      source: `Hunin Help me choose fixed build: ${build.label}`,
      needsConfirmation: [...build.auditNeedsConfirmation],
      rulesVersionWarnings: [],
      deferredCorrections: [...build.auditDeferredCorrections],
    },
  };
};

export const buildGeneratedFighterCreateRequest = (
  buildId: CharacterBuildId,
  characterName: string,
): GeneratedFighterCreateRequest => {
  const build = generatedFighterBuilds[buildId];
  const referencePayload = buildGeneratedFighterCharacterSheet(buildId, characterName);

  return {
    name: referencePayload.identity.name,
    className: build.className,
    subclassName: build.subclassName,
    level: build.level,
    ancestry: build.ancestry,
    background: build.background,
    abilityScores: { ...build.abilityScores },
    hitPoints: { ...build.hitPoints },
    armorClass: build.armorClass,
    speedFt: build.speedFt,
    referencePayload,
  };
};

const normalizeCharacterName = (characterName: string, fallback: string) => {
  const trimmed = characterName.trim();
  return trimmed === '' ? fallback : trimmed;
};

const cloneAction = (action: CharacterSheetAction): CharacterSheetAction => ({
  ...action,
  damage: action.damage?.map((damage) => ({ ...damage })),
  range: action.range ? { ...action.range } : undefined,
  meta: [...action.meta],
  quickReference: action.quickReference ? structuredClone(action.quickReference) : undefined,
});

const cloneFeature = (feature: CharacterSheetFeature): CharacterSheetFeature => ({
  ...feature,
  source: { ...feature.source },
  tags: [...feature.tags],
  quickReference: feature.quickReference ? structuredClone(feature.quickReference) : undefined,
});
