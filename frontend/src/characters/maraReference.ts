import maraPortrait from '../assets/characters/mara-vale-portrait.webp';
import type { CharacterReferencePortrait, CharacterReferenceViewModel, HitPoints } from './types';

type MaraLandingPreview = {
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

export const maraReferenceCharacter: CharacterReferenceViewModel = {
  name: 'Mara Velard',
  identity: 'Human Ranger · Level 3',
  supportingIdentity: 'Hunter · Outlander',
  portrait: {
    src: maraPortrait,
    alt: 'Portrait of Mara Velard',
  },
  stats: {
    hitPoints: {
      current: 26,
      max: 26,
    },
    armorClass: '14',
    speed: '30 ft.',
    concentration: 'No concentration',
    secondary: [
      {
        label: 'Initiative',
        value: '+3',
      },
      {
        label: 'Passive Perception',
        value: '14',
      },
      {
        label: 'Proficiency',
        value: '+2',
      },
    ],
  },
  sections: [
    {
      id: 'actions',
      label: 'Actions',
      defaultOpen: true,
      items: [
        {
          id: 'longbow',
          name: 'Longbow',
          hint: 'Reliable ranged attack.',
          meta: ['Action', '+7 to hit', '1d8 + 3 piercing', '150 / 600 ft.'],
        },
        {
          id: 'shortsword',
          name: 'Shortsword',
          hint: 'A close-range backup weapon.',
          meta: ['Action', '+5 to hit', '1d6 + 3 piercing'],
        },
      ],
    },
    {
      id: 'features',
      label: 'Features',
      defaultOpen: false,
      items: [
        {
          id: 'archery',
          name: 'Archery',
          hint: '+2 to ranged weapon attack rolls.',
          meta: ['Fighting Style', 'Passive'],
        },
        {
          id: 'colossus-slayer',
          name: 'Colossus Slayer',
          hint: 'Add 1d8 after hitting an already wounded enemy.',
          meta: ['Hunter feature', 'Once per turn'],
          quickReference: {
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
          },
        },
      ],
    },
    {
      id: 'spells',
      label: 'Spells',
      defaultOpen: false,
      items: [
        {
          id: 'hunters-mark',
          name: "Hunter's Mark",
          hint: 'Mark one creature and add 1d6 damage on weapon hits.',
          meta: ['1st-level spell', 'Bonus Action', 'Concentration', 'Up to 1 hour'],
        },
        {
          id: 'fog-cloud',
          name: 'Fog Cloud',
          hint: 'Create a sphere of heavily obscuring fog.',
          meta: ['1st-level spell', 'Action', 'Concentration', 'Up to 1 hour'],
        },
        {
          id: 'cure-wounds',
          name: 'Cure Wounds',
          hint: 'Restore hit points to a creature you touch.',
          meta: ['1st-level spell', 'Action', 'Instantaneous'],
        },
      ],
    },
  ],
};

export const maraLandingPreview: MaraLandingPreview = {
  name: maraReferenceCharacter.name,
  identity: maraReferenceCharacter.identity,
  concept:
    'A steady wilderness scout with a clear attack, useful spells, and quick rules reminders.',
  stats: {
    hitPoints: maraReferenceCharacter.stats.hitPoints,
    armorClass: maraReferenceCharacter.stats.armorClass,
    speed: maraReferenceCharacter.stats.speed,
  },
  portrait: {
    src: maraPortrait,
    alt: 'Portrait of Mara Velard',
  },
  featuredAbilities: ['Longbow', 'Colossus Slayer'],
};
