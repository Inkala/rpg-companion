import { describe, expect, it } from 'vitest';
import { buildGeneratedFighterCharacterSheet } from '../character-creation/generatedFighterBuilds';
import type { CharacterDTO } from '../characters/apiTypes';
import type { CharacterSheetV1 } from '../characters/characterSheet';
import { isCharacterSheetV1 } from '../characters/characterSheetValidation';
import { levelUpRules } from '../rules/generated/levelUpRules';
import {
  buildLevelUpPlan,
  getLevelUpEligibility,
  levelUpStepsFor,
} from './stateMachine';
import {
  buildLevelUpRequest,
  validateLevelUpDraft,
} from './LevelUpFlow';
import { completeDraftFor, viableCharacterAt } from './levelUpTestFixtures';

const transitions = [
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
] as const;

describe('level-up state machine', () => {
  it.each(levelUpRules.classes.flatMap((classRule) =>
    transitions.map(([from, to]) => [classRule.name, from, to] as const),
  ))('builds exactly one canonical %s transition from %i to %i', (className, from, to) => {
    const character = characterAt(className, from);

    const plan = buildLevelUpPlan(character, character.referencePayload as CharacterSheetV1);

    expect(plan.classRule.name).toBe(className);
    expect(plan.fromLevel).toBe(from);
    expect(plan.toLevel).toBe(to);
    expect(plan.fixedAverageHp).toBeGreaterThan(0);
    expect(plan.steps.at(0)).toBe('decision-prerequisites');
    expect(plan.steps.at(-1)).toBe('review');
    if (plan.targetRule.spellcasting) {
      expect(plan.steps).toContain('decision-spells');
    } else {
      expect(plan.steps).not.toContain('decision-spells');
    }
    if (plan.targetRule.abilityScoreImprovement) {
      expect(plan.steps).toContain('decision-asi');
    }
  });

  it.each(levelUpRules.classes.flatMap((classRule) =>
    transitions.map(([from, to]) => [classRule.name, from, to] as const),
  ))('constructs a viable bounded %s DTO from %i to %i', (className, from, to) => {
    const character = viableCharacterAt(className, from);
    const sheet = character.referencePayload as CharacterSheetV1;
    const plan = buildLevelUpPlan(character, sheet);
    const draft = completeDraftFor(plan, sheet);

    expect(isCharacterSheetV1(sheet)).toBe(true);
    expect(plan.blockedReason).toBeNull();
    expect(plan.toLevel).toBe(to);
    expect(validateLevelUpDraft(draft, plan, sheet)).toEqual([]);
    const request = buildLevelUpRequest(character, sheet, plan, draft);
    expect(request.expectedUpdatedAt).toBe(character.updatedAt);
    expect(request).not.toEqual(expect.objectContaining({
      referencePayload: expect.anything(),
      character: expect.anything(),
      className: expect.anything(),
      class: expect.anything(),
      fromLevel: expect.anything(),
      toLevel: expect.anything(),
      ownerSubjectId: expect.anything(),
      ownerId: expect.anything(),
      partyId: expect.anything(),
    }));
    if (plan.targetRule.spellcasting) {
      expect(plan.steps).toContain('decision-spells');
      expect(request.spells).toBeDefined();
    }
    if (plan.steps.includes('decision-class-specific')) {
      expect(request.classChoices.length).toBeGreaterThan(0);
    }
    if (plan.targetRule.abilityScoreImprovement) {
      expect(request.abilityScoreImprovement).toEqual({ mode: 'ability-scores', increases: { strength: 2 } });
    }
  });

  it('rejects unsupported, multiclass, malformed, and level 5 characters', () => {
    const malformed = characterAt('Fighter', 1);
    malformed.referencePayload = { schemaVersion: 'Unknown' };
    const multiclass = characterAt('Fighter', 1);
    (multiclass.referencePayload as CharacterSheetV1).identity.classes.push({
      name: 'Wizard',
      level: 1,
    });

    expect(getLevelUpEligibility(malformed)).toEqual(
      expect.objectContaining({ eligible: false, reason: 'malformed-sheet' }),
    );
    expect(getLevelUpEligibility(multiclass)).toEqual(
      expect.objectContaining({ eligible: false, reason: 'multiclass' }),
    );
    expect(getLevelUpEligibility(characterAt('Artificer', 1))).toEqual(
      expect.objectContaining({ eligible: false, reason: 'unsupported-class' }),
    );
    expect(getLevelUpEligibility(characterAt('Fighter', 5))).toEqual(
      expect.objectContaining({ eligible: false, reason: 'level-cap' }),
    );
  });

  it('includes subclass, ASI, spell, class-choice, retained, and review decisions only when required', () => {
    expect(levelUpStepsFor(characterAt('Fighter', 2))).toContain('decision-subclass');
    expect(levelUpStepsFor(characterAt('Fighter', 3))).toContain('decision-asi');
    expect(levelUpStepsFor(characterAt('Wizard', 2))).toContain('decision-spells');
    expect(levelUpStepsFor(characterAt('Sorcerer', 2))).toContain('decision-class-specific');
    expect(levelUpStepsFor(characterAt('Fighter', 1))).toEqual(expect.arrayContaining([
      'decision-hp',
      'decision-confirm-retained',
      'review',
    ]));
  });

  it.each([
    ['Bard', 'known'],
    ['Cleric', 'prepared'],
    ['Druid', 'prepared'],
    ['Paladin', 'prepared'],
    ['Ranger', 'known'],
    ['Sorcerer', 'known'],
    ['Warlock', 'pact-known'],
    ['Wizard', 'spellbook-prepared'],
  ] as const)('uses the generated %s spell decision mode', (className, mode) => {
    const character = characterAt(className, 1);
    const plan = buildLevelUpPlan(character, character.referencePayload as CharacterSheetV1);
    expect(plan.targetRule.spellcasting?.mode).toBe(mode);
    expect(plan.steps).toContain('decision-spells');
  });

  it('blocks an unrepresentable earlier Expertise choice safely', () => {
    const character = characterAt('Rogue', 2);
    const sheet = character.referencePayload as CharacterSheetV1;
    sheet.proficiencies.skills = [];
    sheet.proficiencies.tools.values = [];

    const plan = buildLevelUpPlan(character, sheet);

    expect(plan.blockedReason).toMatch(/cannot be reconstructed safely/);
    expect(plan.missingPrerequisites).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'rogue-expertise', representable: false }),
    ]));
  });

  it('collects the third Warlock invocation at target level five', () => {
    const character = characterAt('Warlock', 4);
    const sheet = character.referencePayload as CharacterSheetV1;
    sheet.identity.classes[0].subclass = 'Fiend';
    character.subclassName = 'Fiend';
    sheet.features = [
      canonicalFeature('eldritch-invocation-agonizing-blast'),
      canonicalFeature('eldritch-invocation-devils-sight'),
      canonicalFeature('pact-of-the-blade'),
    ];

    expect(buildLevelUpPlan(character, sheet).steps).toContain('decision-class-specific');
  });

  it.each(levelUpRules.classes.flatMap((classRule) => transitions.map(([from, to]) => [
    classRule.name,
    from,
    to,
    classRule.choices.some((choice) =>
      choice.fromLevel <= to &&
      selectionCount(choice.selectionCountByLevel, to) >
        selectionCount(choice.selectionCountByLevel, from),
    ),
  ] as const)))('exposes target class-choice count changes for %s %i to %i', (className, from, _to, needsChoice) => {
    const character = characterAt(className, from);
    const sheet = character.referencePayload as CharacterSheetV1;
    const classRule = levelUpRules.classes.find((candidate) => candidate.name === className)!;
    if (from >= classRule.subclassDecisionLevel) {
      sheet.identity.classes[0].subclass = classRule.subclasses[0].name;
      character.subclassName = classRule.subclasses[0].name;
    }
    sheet.features = classRule.choices.flatMap((choice) => {
      const currentCount = selectionCount(choice.selectionCountByLevel, from);
      if (currentCount === 0) return [];
      if (choice.options.length === 0) return [canonicalFeature(choice.id)];
      return choice.options.slice(0, currentCount).map((option) => canonicalFeature(option.index));
    });

    const plan = buildLevelUpPlan(character, sheet);

    if (needsChoice) expect(plan.steps).toContain('decision-class-specific');
  });
});

const characterAt = (className: string, level: number): CharacterDTO => {
  const sheet = structuredClone(
    buildGeneratedFighterCharacterSheet('strength-melee-fighter', 'Regression Hero'),
  );
  sheet.identity.classes = [{ name: className, level }];
  sheet.summary.displayLine = `Human ${className} - Level ${level}`;
  sheet.features = [];
  sheet.spellcasting = null;

  return {
    id: '22222222-2222-2222-2222-222222222222',
    ownerSubjectId: '33333333-3333-3333-3333-333333333333',
    name: 'Regression Hero',
    className,
    subclassName: null,
    level,
    ancestry: 'Human',
    background: 'Soldier',
    abilityScores: { ...sheet.abilities.scores },
    hitPoints: {
      current: sheet.combat.hitPoints.current,
      max: sheet.combat.hitPoints.max,
    },
    armorClass: sheet.combat.armorClass.value ?? 0,
    speedFt: sheet.combat.speed[0].feet,
    referencePayload: sheet,
    createdAt: '2026-07-07T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  };
};

const canonicalFeature = (id: string) => ({
  id,
  name: id,
  category: 'Class choice',
  source: { rulesVersion: '2014' as const, status: 'confirmed' as const },
  tags: [],
  summary: 'Represented canonical choice.',
  includeInReference: true,
});

const selectionCount = (counts: object, level: number) =>
  (counts as Record<string, number>)[String(level)] ?? 0;
