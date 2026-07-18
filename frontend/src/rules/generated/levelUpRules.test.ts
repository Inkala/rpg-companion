import { describe, expect, it } from 'vitest'

import {
  levelUpRules,
  levelUpRulesChecksum,
  levelUpRulesSnapshotId,
} from './levelUpRules'

describe('generated level-up rules parity', () => {
  it('exposes the generated snapshot identity and bounded transitions', () => {
    expect(levelUpRules.metadata.snapshotId).toBe(levelUpRulesSnapshotId)
    expect(levelUpRulesChecksum).toMatch(/^[a-f0-9]{64}$/)
    expect(levelUpRules.supportedTransitions).toEqual([
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
    ])
    expect(levelUpRules.supportedTransitions).not.toContainEqual({ from: 5, to: 6 })
  })

  it('covers all classes, spell counts, memberships, slots, and choice IDs', () => {
    expect(levelUpRules.classes.map(({ index }) => index)).toEqual([
      'barbarian',
      'bard',
      'cleric',
      'druid',
      'fighter',
      'monk',
      'paladin',
      'ranger',
      'rogue',
      'sorcerer',
      'warlock',
      'wizard',
    ])
    expect([0, 1, 2, 3].map((level) => levelUpRules.spells.filter((spell) => spell.level === level).length)).toEqual([
      24, 49, 54, 42,
    ])

    const memberships = Object.fromEntries(
      levelUpRules.classes.map(({ index }) => [
        index,
        levelUpRules.spells.filter((spell) => spell.classIndexes.some((classIndex) => classIndex === index)).length,
      ]),
    )
    expect(memberships).toEqual({
      barbarian: 0,
      bard: 62,
      cleric: 58,
      druid: 52,
      fighter: 0,
      monk: 0,
      paladin: 25,
      ranger: 31,
      rogue: 0,
      sorcerer: 72,
      warlock: 35,
      wizard: 100,
    })

    const byClass = Object.fromEntries(levelUpRules.classes.map((rule) => [rule.index, rule]))
    expect(byClass.wizard.levels[4].spellcasting).toMatchObject({ slots: [4, 3, 2], wizardSpellbookAdditions: 2 })
    expect(byClass.paladin.levels[4].spellcasting).toMatchObject({ slots: [4, 2, 0] })
    expect(byClass.ranger.levels[4].spellcasting).toMatchObject({ slots: [4, 2, 0] })
    expect(byClass.warlock.levels[4].spellcasting).toMatchObject({ pactSlots: 2, pactSlotLevel: 3 })

    const choiceIds = levelUpRules.classes.flatMap(({ choices }) => choices.map(({ id }) => id))
    expect(choiceIds).toEqual(expect.arrayContaining([
      'fighter-fighting-style',
      'bard-expertise',
      'ranger-favored-enemy',
      'ranger-natural-explorer',
      'sorcerer-metamagic',
      'warlock-eldritch-invocations',
      'warlock-pact-boon',
    ]))
  })
})
