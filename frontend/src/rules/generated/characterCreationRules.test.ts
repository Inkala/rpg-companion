import { describe, expect, it } from 'vitest'

import {
  characterCreationRuleCounts,
  characterCreationRules,
  characterCreationRulesChecksum,
  characterCreationRulesSnapshotId,
} from './characterCreationRules'
import { levelUpRulesChecksum } from './levelUpRules'

describe('generated character creation rules', () => {
  it('contains the exact SRD races and supported subraces', () => {
    expect(characterCreationRules.races.map(({ index }) => index)).toEqual([
      'dragonborn',
      'dwarf',
      'elf',
      'gnome',
      'half-elf',
      'half-orc',
      'halfling',
      'human',
      'tiefling',
    ])
    expect(characterCreationRules.subraces.map(({ index, raceIndex }) => ({ index, raceIndex }))).toEqual([
      { index: 'high-elf', raceIndex: 'elf' },
      { index: 'hill-dwarf', raceIndex: 'dwarf' },
      { index: 'lightfoot-halfling', raceIndex: 'halfling' },
      { index: 'rock-gnome', raceIndex: 'gnome' },
    ])
    expect(characterCreationRules.races.find(({ index }) => index === 'dwarf')).toMatchObject({
      speedFt: 25,
      ignoresHeavyArmorSpeedPenalty: true,
      abilityBonuses: [{ ability: 'constitution', bonus: 2 }],
      subraceIndexes: ['hill-dwarf'],
    })
  })

  it('covers every equipment category and preserves representative equipment details', () => {
    expect(characterCreationRuleCounts).toMatchObject({
      races: 9,
      subraces: 4,
      raceTraits: 38,
      equipment: 237,
      spells: 169,
      equipmentByCategory: {
        'adventuring-gear': 116,
        armor: 13,
        'mounts-and-vehicles': 40,
        tools: 31,
        weapon: 37,
      },
    })
    expect(characterCreationRules.equipmentCategories.map(({ index }) => index)).toEqual([
      'adventuring-gear',
      'armor',
      'mounts-and-vehicles',
      'tools',
      'weapon',
    ])
    expect(characterCreationRules.raceTraits.find(({ index }) => index === 'keen-senses')).toMatchObject({
      proficiencyIndexes: ['skill-perception'],
      raceIndexes: ['elf'],
    })
    expect(characterCreationRules.raceTraits.find(({ index }) => index === 'keen-senses')?.description)
      .toContain('proficiency in the Perception skill')

    expect(characterCreationRules.equipment.find(({ index }) => index === 'longsword')).toMatchObject({
      cost: { quantity: 15, unit: 'gp' },
      weight: 3,
      weapon: {
        category: 'Martial',
        rangeType: 'Melee',
        damage: { dice: '1d8', type: 'slashing' },
        twoHandedDamage: { dice: '1d10', type: 'slashing' },
        propertyIndexes: ['versatile'],
      },
    })
    expect(characterCreationRules.equipment.find(({ index }) => index === 'leather-armor')).toMatchObject({
      armor: { category: 'Light', baseArmorClass: 11, dexterityBonus: true, maximumDexterityBonus: null },
    })
    expect(characterCreationRules.equipment.find(({ index }) => index === 'shield')).toMatchObject({
      armor: { category: 'Shield', baseArmorClass: 2, dexterityBonus: false, shieldBonus: 2 },
    })
    expect(characterCreationRules.equipment.find(({ index }) => index === 'explorers-pack')?.contents).toHaveLength(8)
    expect(characterCreationRules.equipment.find(({ index }) => index === 'smiths-tools')).toMatchObject({
      tool: { index: 'artisans-tools', name: "Artisan's Tools" },
    })
    expect(characterCreationRules.equipment.find(({ index }) => index === 'sailing-ship')).toMatchObject({
      vehicle: { categoryIndex: 'waterborne-vehicles', category: 'Waterborne Vehicles', speed: { quantity: 2, unit: 'mph' } },
    })
  })

  it('preserves complete bounded spell details and memberships', () => {
    const acidArrow = characterCreationRules.spells.find(({ index }) => index === 'acid-arrow')
    expect(acidArrow).toMatchObject({
      level: 2,
      school: 'evocation',
      castingTime: '1 action',
      range: '90 feet',
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      components: ['V', 'S', 'M'],
      material: "Powdered rhubarb leaf and an adder's stomach.",
      classIndexes: ['wizard'],
    })
    expect(acidArrow?.description).toContain('shimmering green arrow')
    expect(acidArrow?.higherLevel).toContain('damage (both initial and later) increases by 1d4')
    expect(acidArrow?.subclassMemberships).toContainEqual(expect.objectContaining({
      classIndex: 'druid',
      subclassIndex: 'land',
    }))
  })

  it('exposes shared identity and stable calculation rule identifiers', () => {
    expect(characterCreationRules.metadata.snapshotId).toBe(characterCreationRulesSnapshotId)
    expect(characterCreationRulesChecksum).toMatch(/^[a-f0-9]{64}$/)
    expect(characterCreationRulesChecksum).toBe(levelUpRulesChecksum)
    expect(characterCreationRules.calculationRules.map(({ id }) => id)).toEqual([
      'ability-modifier',
      'armor-class-armor',
      'armor-class-unarmored',
      'initiative',
      'maximum-hit-points',
      'passive-perception',
      'proficiency-bonus',
      'spell-attack-bonus',
      'spell-save-dc',
      'walking-speed',
    ])
  })

  it('preserves every bounded Race and Race-trait creation choice', () => {
    expect(characterCreationRuleCounts.raceChoices).toBe(8)
    expect(characterCreationRules.raceChoices.map(({ id }) => id)).toEqual([
      'dragonborn-draconic-ancestry',
      'dwarf-tool-proficiency',
      'half-elf-ability-bonuses',
      'half-elf-language',
      'half-elf-skill-versatility',
      'high-elf-cantrip',
      'high-elf-extra-language',
      'human-extra-language',
    ])
    expect(characterCreationRules.raceChoices.find(({ id }) => id === 'half-elf-ability-bonuses')).toEqual({
      id: 'half-elf-ability-bonuses',
      sourceOwnerType: 'race',
      sourceOwnerIndex: 'half-elf',
      selectionCount: 2,
      optionType: 'ability-bonus',
      allowedOptionIndexes: ['charisma', 'constitution', 'dexterity', 'intelligence', 'strength', 'wisdom'].filter(
        (ability) => ability !== 'charisma',
      ),
      boundedRule: null,
      optionValue: 1,
      exclusivityConstraint: 'distinct-options',
    })
    expect(characterCreationRules.raceChoices.find(({ id }) => id === 'dragonborn-draconic-ancestry')?.allowedOptionIndexes)
      .toHaveLength(10)
    expect(characterCreationRules.raceChoices.find(({ id }) => id === 'dwarf-tool-proficiency')?.allowedOptionIndexes)
      .toEqual(['brewers-supplies', 'masons-tools', 'smiths-tools'])
    expect(characterCreationRules.raceChoices.find(({ id }) => id === 'half-elf-skill-versatility')).toMatchObject({
      selectionCount: 2,
      boundedRule: 'any-srd-skill-proficiency',
      exclusivityConstraint: 'distinct-options',
    })
    expect(characterCreationRules.raceChoices.find(({ id }) => id === 'high-elf-cantrip')?.allowedOptionIndexes)
      .toHaveLength(14)
  })

  it('preserves the complete supported always-on derived modifier set', () => {
    expect(characterCreationRuleCounts.featureModifiers).toBe(19)
    const modifiers = Object.fromEntries(characterCreationRules.featureModifiers.map((modifier) => [modifier.id, modifier]))
    expect(modifiers['barbarian-unarmored-defense-ac']).toMatchObject({
      formula: '10+dexterity-modifier+constitution-modifier',
      conditions: ['not-wearing-armor'],
    })
    expect(modifiers['monk-unarmored-defense-ac']?.conditions).toEqual(['not-wearing-armor', 'not-using-shield'])
    expect(modifiers['barbarian-fast-movement-speed']).toMatchObject({
      sourceIndex: 'fast-movement',
      kind: 'speed-bonus',
      value: 10,
      conditions: ['not-wearing-heavy-armor'],
    })
    expect(modifiers['draconic-resilience-ac']).toMatchObject({
      sourceIndex: 'draconic-resilience',
      kind: 'armor-class-formula',
      formula: '13+dexterity-modifier',
      conditions: ['not-wearing-armor'],
    })
    expect(modifiers['draconic-resilience-maximum-hit-points']).toMatchObject({
      sourceIndex: 'draconic-resilience',
      kind: 'maximum-hit-points-per-class-level',
      value: 1,
      formula: 'sorcerer-level',
    })
    expect(modifiers['hill-dwarf-dwarven-toughness-maximum-hit-points']).toMatchObject({
      sourceIndex: 'dwarven-toughness',
      kind: 'maximum-hit-points-per-character-level',
      value: 1,
      formula: 'character-level',
    })
    expect(modifiers['bard-expertise-skills']).toMatchObject({
      sourceIndex: 'bard-expertise-1',
      kind: 'skill-expertise-choice',
      value: 2,
    })
    expect(modifiers['lore-bonus-proficiencies']).toMatchObject({
      sourceIndex: 'bonus-proficiencies',
      kind: 'skill-choice',
      value: 3,
    })
    expect(modifiers['rogue-expertise-skills']).toMatchObject({
      sourceIndex: 'rogue-expertise-1',
      kind: 'skill-expertise-choice',
      value: 2,
    })
    expect(modifiers['warlock-beguiling-influence-deception']?.formula).toBe('deception')
    expect(modifiers['warlock-beguiling-influence-persuasion']?.formula).toBe('persuasion')
  })
})
