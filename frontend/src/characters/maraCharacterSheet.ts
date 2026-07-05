import type { CharacterSheetV1 } from './characterSheet';

export const maraCharacterSheet: CharacterSheetV1 = {
  schemaVersion: 'CharacterSheetV1',
  ruleset: {
    system: 'dnd5e',
    version: '2014',
    sourceStatus: 'audited-sample',
  },
  identity: {
    name: 'Mara Velard',
    ancestry: 'Human',
    background: 'Outlander',
    alignment: 'Neutral Good',
    classes: [
      {
        name: 'Ranger',
        level: 3,
        subclass: 'Hunter',
      },
    ],
    concept:
      'A calm wilderness scout and practical guide. Mara is observant, prepared, and steady under pressure.',
  },
  summary: {
    displayLine: 'Human Ranger · Level 3',
    supportingLine: 'Hunter · Outlander',
    landingConcept:
      'A steady wilderness scout with a clear attack, useful spells, and quick rules reminders.',
    portraitAssetId: 'mara-vale-portrait',
    portraitAlt: 'Portrait of Mara Velard',
    featuredAbilities: ['Longbow', 'Colossus Slayer'],
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
      {
        id: 'spells',
        label: 'Spells',
        defaultOpen: false,
      },
    ],
  },
  abilities: {
    scores: {
      strength: 10,
      dexterity: 16,
      constitution: 14,
      intelligence: 10,
      wisdom: 14,
      charisma: 8,
    },
  },
  combat: {
    hitPoints: {
      current: 26,
      max: 26,
      temporary: 0,
    },
    armorClass: {
      value: 14,
      needsConfirmation: true,
      note: 'Visible value is stable. Confirm armor source, likely leather armor plus Dexterity.',
    },
    initiative: 3,
    speed: [
      {
        type: 'walk',
        feet: 30,
      },
    ],
    proficiencyBonus: 2,
    passivePerception: {
      value: 14,
      needsConfirmation: true,
      note: 'Visible value is stable. Confirm Perception proficiency and full skill list.',
    },
    concentration: null,
  },
  proficiencies: {
    savingThrows: {
      values: [],
      needsConfirmation: true,
      note: 'Saving throw proficiencies are not confirmed from the current sample.',
    },
    skills: [
      {
        name: 'Perception',
        proficient: true,
        modifier: 4,
        needsConfirmation: true,
        note: 'Passive Perception 14 implies this, but the full skill list still needs review.',
      },
    ],
    weapons: {
      values: ['Longbow', 'Shortsword'],
      needsConfirmation: true,
      note: 'Only visible sample weapons are modeled for now.',
    },
    armor: {
      values: ['Leather armor'],
      needsConfirmation: true,
      note: 'Included to explain AC 14, but the generated sheet/source must confirm it.',
    },
    tools: {
      values: [],
      needsConfirmation: true,
      note: 'Tool proficiencies are not confirmed.',
    },
    languages: {
      values: [],
      needsConfirmation: true,
      note: 'Languages are not confirmed.',
    },
  },
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
      summary: 'Reliable ranged attack.',
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
      summary: 'A close-range backup weapon.',
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
    {
      id: 'colossus-slayer',
      name: 'Colossus Slayer',
      category: 'Hunter feature',
      source: {
        rulesVersion: '2014',
        status: 'confirmed',
      },
      tags: ['Once per turn'],
      summary: 'Add 1d8 after hitting an already wounded enemy.',
      includeInReference: true,
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
  spellcasting: {
    ability: 'wisdom',
    spellSaveDC: {
      needsConfirmation: true,
      note: 'Spell save DC is not displayed yet and must be confirmed before use.',
    },
    spellAttackBonus: {
      needsConfirmation: true,
      note: 'Spell attack bonus is not displayed yet and must be confirmed before use.',
    },
    slots: [
      {
        level: 1,
        max: 3,
        used: 0,
      },
    ],
    spells: [
      {
        id: 'hunters-mark',
        name: "Hunter's Mark",
        level: 1,
        actionType: 'Bonus Action',
        castingTime: 'Bonus Action',
        duration: 'Up to 1 hour',
        concentration: true,
        summary: 'Mark one creature and add 1d6 damage on weapon hits.',
        meta: ['1st-level spell', 'Bonus Action', 'Concentration', 'Up to 1 hour'],
        preparedOrKnown: 'known',
        source: {
          rulesVersion: '2014',
          status: 'confirmed',
          note: 'Keep modeled as a spell for D&D 5E 2014.',
        },
      },
      {
        id: 'fog-cloud',
        name: 'Fog Cloud',
        level: 1,
        actionType: 'Action',
        castingTime: 'Action',
        duration: 'Up to 1 hour',
        concentration: true,
        summary: 'Create a sphere of heavily obscuring fog.',
        meta: ['1st-level spell', 'Action', 'Concentration', 'Up to 1 hour'],
        preparedOrKnown: 'known',
        source: {
          rulesVersion: '2014',
          status: 'confirmed',
        },
      },
      {
        id: 'cure-wounds',
        name: 'Cure Wounds',
        level: 1,
        actionType: 'Action',
        castingTime: 'Action',
        duration: 'Instantaneous',
        concentration: false,
        summary: 'Restore hit points to a creature you touch.',
        meta: ['1st-level spell', 'Action', 'Instantaneous'],
        preparedOrKnown: 'known',
        source: {
          rulesVersion: '2014',
          status: 'confirmed',
        },
      },
    ],
  },
  equipment: {
    armor: {
      values: ['Leather armor'],
      needsConfirmation: true,
      note: 'Used to explain current AC, pending sheet confirmation.',
    },
    weapons: ['Longbow', 'Shortsword'],
    packsAndGear: {
      values: [],
      needsConfirmation: true,
      note: 'Pack and gear inventory are incomplete.',
    },
    tools: {
      values: [],
      needsConfirmation: true,
      note: 'Tools are incomplete.',
    },
    languages: {
      values: [],
      needsConfirmation: true,
      note: 'Languages are incomplete.',
    },
    currency: {
      needsConfirmation: true,
      note: 'Currency is not confirmed.',
    },
  },
  personality: {
    traits: [],
    ideals: [],
    bonds: [],
    flaws: [],
    notes: [],
  },
  audit: {
    source: 'Current visible Mara fixture plus rough generated sheet warning.',
    needsConfirmation: [
      'Confirm AC 14 armor source.',
      'Confirm passive perception, Perception proficiency, and full skill list.',
      'Confirm saving throw proficiencies.',
      'Confirm spell save DC and spell attack bonus.',
      'Confirm equipment, tools, languages, and currency.',
      'Confirm the complete D&D 5E 2014 Ranger feature set for the sample.',
    ],
    rulesVersionWarnings: [
      'Do not import D&D 2024 Ranger wording into this 2014 sample.',
      'Do not model Hunter’s Mark as a 2024 Ranger class feature.',
      'Do not add Weapon Mastery-like generated content to this 2014 sample.',
    ],
    deferredCorrections: [
      'Decide whether Mara remains Ranger 3 Hunter long term.',
      'Decide which non-visible Ranger features belong in a later full sheet.',
    ],
  },
};
