import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { levelUpRules } from '../rules/generated/levelUpRules';
import type {
  CharacterSheetV2Spell,
  CharacterSpellcastingInput,
  SpellSelectionInput,
} from './characterSheetV2';

export type SpellReconstructionInput = {
  classIndex: string;
  subclassIndex: string | null;
  level: number;
  abilityModifier: number;
  input: CharacterSpellcastingInput;
  activeFeatureIds?: string[];
  raceGrantedCantripIndexes?: string[];
  classGrantedCantripIndexes?: string[];
};

export type SpellReconstructionResult = {
  spells: CharacterSheetV2Spell[];
  preparedSpellIds: string[];
  alwaysPreparedSpellIds: string[];
};

type CanonicalSpellcasting = {
  mode: Exclude<CharacterSpellcastingInput['mode'], 'none'>;
  ability: 'intelligence' | 'wisdom' | 'charisma';
  cantripsKnown?: number;
  spellsKnown?: number;
  preparedFormula?: string | null;
  replacementLimit: number;
  initialSpellbookSpells: number;
  wizardSpellbookAdditions?: number;
  availableSpellLevels: readonly number[];
};

export const reconstructSpellcastingV2 = (context: SpellReconstructionInput): SpellReconstructionResult => {
  const classRule = levelUpRules.classes.find(({ index }) => index === context.classIndex);
  const target = classRule?.levels.find(({ level }) => level === context.level);
  if (!classRule || !target) throw new Error('canonical Class level is unavailable');
  const expectedMode = target.spellcasting?.mode ?? 'none';
  if (context.input.mode !== expectedMode) throw new Error(`spellcasting mode must be ${expectedMode}`);
  const granted = [...raceGrantedCantrips(context), ...classGrantedCantrips(context)];
  if (expectedMode === 'none') return { spells: granted, preparedSpellIds: [], alwaysPreparedSpellIds: [] };
  const targetCasting = target.spellcasting as CanonicalSpellcasting | null;
  if (!targetCasting) throw new Error('spellcasting progression is unavailable');
  if (context.input.mode === 'none') throw new Error(`spellcasting mode must be ${expectedMode}`);
  const slotOverrides = context.input.slotOverride ?? [];
  if (slotOverrides.some(({ level }) => !(targetCasting.availableSpellLevels as readonly number[]).includes(level))) {
    throw new Error('spell slot override level is unavailable');
  }

  const cantrips = resolveDistinct(context.input.cantrips, context, context.level, true);
  if (cantrips.length !== (targetCasting.cantripsKnown ?? 0)) {
    throw new Error(`choose exactly ${targetCasting.cantripsKnown ?? 0} cantrips`);
  }

  let ordinary: CharacterSheetV2Spell[] = [];
  let preparedSpellIds: string[] = [];
  if (context.input.mode === 'known' || context.input.mode === 'pact-known') {
    ordinary = reconstructKnown(context, context.input.levels);
  } else if (context.input.mode === 'prepared') {
    ordinary = resolveDistinct(context.input.prepared, context, context.level, false).map((spell) => ({ ...spell, state: 'prepared' }));
    const wanted = preparedLimit(targetCasting.preparedFormula, context.abilityModifier, context.level);
    if (ordinary.length !== wanted) throw new Error(`choose exactly ${wanted} prepared spells`);
    preparedSpellIds = ordinary.map(({ id }) => id);
  } else {
    const initial = resolveDistinct(context.input.initialSpellbook, context, 1, false);
    const initialCount = classRule.levels[0].spellcasting?.initialSpellbookSpells ?? 0;
    if (initial.length !== initialCount) throw new Error(`choose exactly ${initialCount} initial spellbook spells`);
    if (initial.some(({ level }) => level !== 1)) throw new Error('initial Wizard spellbook spells must be level 1');
    const additions = context.input.additions;
    if (additions.length !== Math.max(0, context.level - 1) || additions.some((entry, index) => entry.level !== index + 2)) {
      throw new Error(`Wizard spellbook additions must cover every level 2 through ${context.level}`);
    }
    ordinary = [...initial];
    for (const addition of additions) {
      const levelRule = classRule.levels.find(({ level }) => level === addition.level)?.spellcasting as CanonicalSpellcasting | null | undefined;
      const spells = resolveDistinct(addition.spells, context, addition.level, false);
      if (!levelRule || spells.length !== levelRule.wizardSpellbookAdditions) throw new Error(`Wizard level ${addition.level} requires exactly two additions`);
      appendUnique(ordinary, spells);
    }
    ordinary = ordinary.map((spell) => ({ ...spell, state: 'spellbook' }));
    const known = new Set(ordinary.map(({ id }) => id));
    if (new Set(context.input.preparedSpellIds).size !== context.input.preparedSpellIds.length || context.input.preparedSpellIds.some((id) => !known.has(id))) {
      throw new Error('Wizard prepared spells must be a distinct spellbook subset');
    }
    const wanted = preparedLimit(targetCasting.preparedFormula, context.abilityModifier, context.level);
    if (context.input.preparedSpellIds.length !== wanted) throw new Error(`choose exactly ${wanted} prepared spells`);
    preparedSpellIds = [...context.input.preparedSpellIds];
  }

  const automatic = automaticSpells(context);
  const ordinaryIdentities = new Set([...cantrips, ...ordinary, ...granted].map(spellIdentity));
  if (ordinaryIdentities.size !== cantrips.length + ordinary.length + granted.length || automatic.some((spell) => ordinaryIdentities.has(spellIdentity(spell)))) throw new Error('automatic or granted spell duplicates a normal selection');
  return {
    spells: [...granted, ...cantrips.map((spell) => ({ ...spell, state: 'known' as const })), ...ordinary, ...automatic],
    preparedSpellIds,
    alwaysPreparedSpellIds: automatic.map(({ id }) => id),
  };
};

const raceGrantedCantrips = (context: SpellReconstructionInput): CharacterSheetV2Spell[] => (context.raceGrantedCantripIndexes ?? []).map((index) => {
  const spell = characterCreationRules.spells.find((entry) => entry.index === index);
  const choice = characterCreationRules.raceChoices.find((entry) => entry.id === 'high-elf-cantrip');
  if (!spell || spell.level !== 0 || !choice?.allowedOptionIndexes.includes(index as never)) throw new Error('Race-granted cantrip is unavailable');
  return { id: `race-high-elf-cantrip-${index}`, canonicalIndex: spell.index, name: spell.name, level: spell.level, school: spell.school, castingTime: spell.castingTime, range: spell.range, components: [...spell.components], materialComponent: spell.material ?? null, duration: spell.duration, concentration: spell.concentration, ritual: spell.ritual, description: spell.description, higherLevelText: spell.higherLevel ?? null, state: 'known' as const, provenance: { kind: 'calculated' as const, ruleId: 'high-elf-cantrip' } };
});

const classGrantedCantrips = (context: SpellReconstructionInput): CharacterSheetV2Spell[] => (context.classGrantedCantripIndexes ?? []).map((index) => {
  const spell = characterCreationRules.spells.find((entry) => entry.index === index);
  const choice = characterCreationRules.classChoices.find((entry) => entry.id === 'circle-of-the-land-bonus-cantrip' && entry.classIndex === context.classIndex && entry.requiredSubclassIndex === context.subclassIndex);
  if (!spell || spell.level !== 0 || !choice?.options.some((option) => option.index === index)) throw new Error('Class-granted cantrip is unavailable');
  return { id: `class-circle-of-the-land-cantrip-${index}`, canonicalIndex: spell.index, name: spell.name, level: spell.level, school: spell.school, castingTime: spell.castingTime, range: spell.range, components: [...spell.components], materialComponent: spell.material ?? null, duration: spell.duration, concentration: spell.concentration, ritual: spell.ritual, description: spell.description, higherLevelText: spell.higherLevel ?? null, state: 'known' as const, provenance: { kind: 'calculated' as const, ruleId: 'circle-of-the-land-bonus-cantrip' } };
});

const reconstructKnown = (context: SpellReconstructionInput, levels: Extract<CharacterSpellcastingInput, { mode: 'known' | 'pact-known' }>['levels']) => {
  const classRule = levelUpRules.classes.find(({ index }) => index === context.classIndex)!;
  const progression = classRule.levels.filter(({ level, spellcasting }) => level <= context.level && spellcasting !== null);
  if (levels.length !== progression.length || levels.some((entry, index) => entry.level !== progression[index].level)) {
    throw new Error('known spell decisions must cover every spellcasting level');
  }
  const result: CharacterSheetV2Spell[] = [];
  let previousKnown = 0;
  progression.forEach((levelRule, index) => {
    const decision = levels[index];
    const casting = levelRule.spellcasting as CanonicalSpellcasting;
    const wantedLearned = index === 0 ? casting.spellsKnown ?? 0 : Math.max(0, (casting.spellsKnown ?? 0) - previousKnown);
    if (decision.learned.length !== wantedLearned) throw new Error(`level ${decision.level} learned spell count is invalid`);
    if (decision.replacements.length > casting.replacementLimit || index === 0 && decision.replacements.length > 0) throw new Error(`level ${decision.level} replacement count is invalid`);
    for (const replacement of decision.replacements) {
      const position = result.findIndex(({ id }) => id === replacement.removeSpellId);
      if (position < 0) throw new Error(`level ${decision.level} replacement removes an unknown spell`);
      const [added] = resolveDistinct([replacement.add], context, decision.level, false);
      if (added.id === replacement.removeSpellId || result.some((spell) => spellIdentity(spell) === spellIdentity(added))) throw new Error('replacement must add a distinct new spell');
      result.splice(position, 1, { ...added, state: 'known' });
    }
    appendUnique(result, resolveDistinct(decision.learned, context, decision.level, false).map((spell) => ({ ...spell, state: 'known' })));
    previousKnown = casting.spellsKnown ?? 0;
  });
  return result;
};

const resolveDistinct = (inputs: SpellSelectionInput[], context: SpellReconstructionInput, acquisitionLevel: number, cantrip: boolean) => {
  const ids = inputs.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new Error('spell selection IDs must be distinct');
  return inputs.map((input) => resolveSpell(input, context, acquisitionLevel, cantrip));
};

const resolveSpell = (input: SpellSelectionInput, context: SpellReconstructionInput, acquisitionLevel: number, cantrip: boolean): CharacterSheetV2Spell => {
  if (input.source === 'manual') {
    if (!input.importReason.trim()) throw new Error('manual spell requires an import reason');
    if ((input.level === 0) !== cantrip || !legalSpellLevel(context.classIndex, acquisitionLevel, input.level)) throw new Error('manual spell level is unavailable');
    return { id: input.id, canonicalIndex: null, name: input.name, level: input.level, school: input.school, castingTime: input.castingTime, range: input.range, components: [...input.components], materialComponent: input.materialComponent ?? null, duration: input.duration, concentration: input.concentration, ritual: input.ritual, description: input.description, higherLevelText: input.higherLevelText ?? null, state: 'known', provenance: { kind: 'imported', note: input.importReason } };
  }
  const spell = characterCreationRules.spells.find(({ index }) => index === input.index);
  if (!spell || (spell.level === 0) !== cantrip || !legalSpellLevel(context.classIndex, acquisitionLevel, spell.level) || !eligible(spell, context, acquisitionLevel)) {
    throw new Error(`${input.index} is unavailable for ${context.classIndex} level ${acquisitionLevel}`);
  }
  return { id: input.id, canonicalIndex: spell.index, name: spell.name, level: spell.level, school: spell.school, castingTime: spell.castingTime, range: spell.range, components: [...spell.components], materialComponent: spell.material ?? null, duration: spell.duration, concentration: spell.concentration, ritual: spell.ritual, description: spell.description, higherLevelText: spell.higherLevel ?? null, state: 'known', provenance: { kind: 'calculated', ruleId: 'spell-canonical' } };
};

const eligible = (spell: (typeof characterCreationRules.spells)[number], context: SpellReconstructionInput, level: number) =>
  (spell.classIndexes as readonly string[]).includes(context.classIndex) || spell.subclassMemberships.some((membership) =>
    membership.classIndex === context.classIndex && membership.subclassIndex === context.subclassIndex && membership.classLevel <= level && membership.kind === 'expanded');

const legalSpellLevel = (classIndex: string, classLevel: number, spellLevel: number) => spellLevel === 0 || Boolean((levelUpRules.classes.find(({ index }) => index === classIndex)?.levels.find(({ level }) => level === classLevel)?.spellcasting?.availableSpellLevels as readonly number[] | undefined)?.includes(spellLevel));

const automaticSpells = (context: SpellReconstructionInput): CharacterSheetV2Spell[] => {
  const selectedClass = levelUpRules.classes.find(({ index }) => index === context.classIndex);
  const activeFeatures = new Set([
    ...(context.activeFeatureIds ?? []),
    ...(selectedClass?.levels ?? []).filter(({ level }) => level <= context.level).flatMap(({ features }) => features.map(({ index }) => index)),
    ...(selectedClass?.subclasses.find(({ index }) => index === context.subclassIndex)?.featuresByLevel ?? [])
      .filter(({ level }) => level <= context.level).flatMap(({ features }) => features.map(({ index }) => index)),
  ]);
  return characterCreationRules.spells.flatMap((spell) => {
    const automatic = spell.subclassMemberships.some((membership) => membership.classIndex === context.classIndex && membership.subclassIndex === context.subclassIndex && membership.classLevel <= context.level && membership.kind === 'always-prepared' && membership.requiredFeatureIndexes.every((id) => activeFeatures.has(id)));
    return automatic ? [{ ...canonicalSpell(spell, `automatic-${spell.index}`), state: 'always-prepared' as const }] : [];
  });
};

const preparedLimit = (formula: string | null | undefined, abilityModifier: number, level: number) => {
  if (formula === 'max(1,abilityModifier+classLevel)') return Math.max(1, abilityModifier + level);
  if (formula === 'max(1,abilityModifier+floor(classLevel/2))') return Math.max(1, abilityModifier + Math.floor(level / 2));
  throw new Error('prepared spell formula is unavailable');
};

const appendUnique = (target: CharacterSheetV2Spell[], additions: CharacterSheetV2Spell[]) => {
  const identities = new Set(target.map(spellIdentity));
  for (const spell of additions) {
    const identity = spellIdentity(spell);
    if (identities.has(identity)) throw new Error(`duplicate spell selection ${spell.id}`);
    identities.add(identity);
    target.push(spell);
  }
};

const spellIdentity = (spell: CharacterSheetV2Spell) => spell.canonicalIndex === null ? `manual:${spell.id}` : `srd:${spell.canonicalIndex}`;

const canonicalSpell = (spell: (typeof characterCreationRules.spells)[number], id: string): CharacterSheetV2Spell => ({
  id,
  canonicalIndex: spell.index,
  name: spell.name,
  level: spell.level,
  school: spell.school,
  castingTime: spell.castingTime,
  range: spell.range,
  components: [...spell.components],
  materialComponent: spell.material ?? null,
  duration: spell.duration,
  concentration: spell.concentration,
  ritual: spell.ritual,
  description: spell.description,
  higherLevelText: spell.higherLevel ?? null,
  state: 'known',
  provenance: { kind: 'calculated', ruleId: 'spell-canonical' },
});
