import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { levelUpRules } from '../rules/generated/levelUpRules';
import type {
  AbilityName,
  AbilityScoresDTO,
  CharacterCalculationInput,
  CharacterCalculationOutput,
  CharacterSheetV2,
  CreateCharacterV2RequestDTO,
  ResolvedValue,
} from './characterSheetV2';
import { isCreateCharacterV2Request, validateRuleChoices } from './characterSheetV2Validation';

const abilityNames: AbilityName[] = [
  'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
];

export const abilityModifier = (score: number): number => Math.floor((score - 10) / 2);

export const resolveCalculatedValue = (
  calculatedValue: number,
  override?: { value: number; reason: string },
): { resolved: ResolvedValue<number>; calculatedSuggestion: number } => ({
  resolved: override
    ? { value: override.value, provenance: { kind: 'manual-override', reason: override.reason } }
    : { value: calculatedValue, provenance: { kind: 'calculated', ruleId: 'character-sheet-v2' } },
  calculatedSuggestion: calculatedValue,
});

export const resetToCalculated = (
  input: { calculatedValue: number; canReset: boolean },
): ResolvedValue<number> | null => input.canReset
  ? { value: input.calculatedValue, provenance: { kind: 'calculated', ruleId: 'character-sheet-v2' } }
  : null;

export const resetAbilityScoresToCalculated = (
  input: Omit<CharacterCalculationInput, 'abilityScores'> & { retainedBase?: AbilityScoresDTO },
): AbilityScoresDTO | null => {
  if (!input.retainedBase) return null;
  try {
    return calculateCharacterV2({
      ...input,
      abilityScores: { mode: 'calculated', base: input.retainedBase },
    }).finalAbilityScores;
  } catch {
    return null;
  }
};

export const calculateCharacterV2 = (input: CharacterCalculationInput): CharacterCalculationOutput => {
  if (input.race.source !== 'srd') {
    throw new Error('manual Race cannot receive canonical automation');
  }
  const raceIndex = input.race.index;
  const classRule = levelUpRules.classes.find((entry) => entry.index === input.classIndex);
  const raceRule = characterCreationRules.races.find((entry) => entry.index === raceIndex);
  const classLevel = classRule?.levels.find((entry) => entry.level === input.level);
  if (!classRule || !raceRule || !classLevel || input.level < 1 || input.level > 5) {
    throw new Error('unsupported canonical Race, Class, or level');
  }
  if (input.subclassIndex !== null && (!classRule.subclasses.some((entry) => entry.index === input.subclassIndex) || input.level < classRule.subclassDecisionLevel)) {
    throw new Error('unsupported canonical subclass for Class or level');
  }

  const choiceErrors = validateRuleChoices({
    raceIndex: raceRule.index,
    subraceIndex: input.subraceIndex,
    classIndex: classRule.index,
    level: input.level,
    choices: input.ruleChoices,
  });
  if (choiceErrors.length > 0) {
    throw new Error(choiceErrors.join('; '));
  }
  if (raceRule.index === 'half-elf' && !input.ruleChoices.some((choice) => choice.ruleId === 'half-elf-ability-bonuses')) {
    throw new Error('Half-Elf calculated ability scores require the current canonical ability choice set');
  }

  const subrace = input.subraceIndex === null
    ? undefined
    : characterCreationRules.subraces.find((entry) => entry.index === input.subraceIndex);
  if (subrace && (subrace.raceIndex !== raceRule.index || !(raceRule.subraceIndexes as readonly string[]).includes(subrace.index))) {
    throw new Error('subrace does not belong to selected Race');
  }

  const finalAbilityScores = calculateAbilityScores(input, raceRule, subrace);
  if (abilityNames.some((ability) => finalAbilityScores[ability] < 1 || finalAbilityScores[ability] > 30)) {
    throw new Error('resolved ability score is outside the supported bound');
  }
  const abilityModifiers = Object.fromEntries(
    abilityNames.map((ability) => [ability, abilityModifier(finalAbilityScores[ability])]),
  ) as AbilityScoresDTO;
  const proficiencyBonus = classLevel.proficiencyBonus;
  const initiative = abilityModifiers.dexterity + (
    classRule.index === 'bard' && input.level >= 2 && featureModifier('bard-jack-of-all-trades-initiative')
      ? Math.floor(proficiencyBonus / 2) : 0
  );
  const passivePerception = calculatePassivePerception(input, abilityModifiers.wisdom, proficiencyBonus, raceRule, subrace);
  const armorState = resolveArmorState(input);
  const speedFt = calculateSpeed(input, raceRule, armorState, finalAbilityScores.strength);
  const maximumHitPoints = calculateMaximumHitPoints(input, classRule, abilityModifiers.constitution, subrace);
  const armorClass = calculateArmorClass(input, classRule.index, abilityModifiers, armorState);
  const spellcasting = classLevel.spellcasting === null
    ? null
    : {
      ability: classLevel.spellcasting.ability,
      spellSaveDC: 8 + proficiencyBonus + abilityModifiers[classLevel.spellcasting.ability],
      spellAttackBonus: proficiencyBonus + abilityModifiers[classLevel.spellcasting.ability],
      slots: classLevel.spellcasting.mode === 'pact-known'
        ? pactSlots(classLevel.spellcasting.pactSlots, classLevel.spellcasting.pactSlotLevel)
        : [...(classLevel.spellcasting.slots ?? [])],
      availableSpellLevels: [...classLevel.spellcasting.availableSpellLevels],
    };

  return {
    id: input.id,
    finalAbilityScores,
    abilityModifiers,
    proficiencyBonus,
    initiative,
    passivePerception,
    speedFt,
    maximumHitPoints,
    armorClass,
    spellcasting,
  };
};

const calculateAbilityScores = (
  input: CharacterCalculationInput,
  race: (typeof characterCreationRules.races)[number],
  subrace: (typeof characterCreationRules.subraces)[number] | undefined,
): AbilityScoresDTO => {
  if (input.abilityScores.mode === 'imported') {
    return { ...input.abilityScores.values };
  }
  const scores = { ...input.abilityScores.base };
  for (const bonus of [...race.abilityBonuses, ...(subrace?.abilityBonuses ?? [])]) {
    scores[bonus.ability] += bonus.bonus;
  }
  const halfElf = input.ruleChoices.find((choice) => choice.ruleId === 'half-elf-ability-bonuses');
  for (const ability of halfElf?.optionIds ?? []) {
    scores[ability as AbilityName] += 1;
  }
  return scores;
};

const calculatePassivePerception = (
  input: CharacterCalculationInput,
  wisdomModifier: number,
  proficiencyBonus: number,
  race: (typeof characterCreationRules.races)[number],
  subrace: (typeof characterCreationRules.subraces)[number] | undefined,
): number => {
  let rank = input.proficiencies.perception;
  const selectedSkill = input.proficiencies.skills.find((skill) => skill.name === 'perception');
  if (selectedSkill?.rank === 'expertise') rank = 'expertise';
  else if (selectedSkill?.rank === 'proficient' && rank === 'none') rank = 'proficient';

  const traitIndexes = new Set([...race.traitIndexes, ...(subrace?.traitIndexes ?? [])]);
  const raceChoicePerception = input.ruleChoices.some((choice) =>
    choice.ruleId === 'half-elf-skill-versatility' && choice.optionIds.includes('skill-perception'));
  if (((traitIndexes.has('keen-senses') && featureModifier('high-elf-keen-senses')) || raceChoicePerception) && rank === 'none') rank = 'proficient';
  return 10 + wisdomModifier + (rank === 'expertise' ? 2 * proficiencyBonus : rank === 'proficient' ? proficiencyBonus : 0);
};

type ArmorState = {
  armor?: (typeof characterCreationRules.equipment)[number];
  shield?: (typeof characterCreationRules.equipment)[number];
  wearingArmor: boolean;
  wearingHeavyArmor: boolean;
  usingShield: boolean;
};

const resolveArmorState = (input: CharacterCalculationInput): ArmorState => {
  const equippedCanonical = new Set(input.equipment.flatMap((entry) =>
    entry.source === 'srd' && entry.equipped ? [entry.index] : []));
  const findEquipped = (index: string | undefined) => index && equippedCanonical.has(index)
    ? characterCreationRules.equipment.find((entry) => entry.index === index)
    : undefined;
  const armor = findEquipped(input.defense.mode === 'armor' ? input.defense.armorIndex : undefined);
  const shield = findEquipped(input.defense.mode === 'manual' ? undefined : input.defense.shieldIndex);
  if (armor && (!armor.armor || armor.armor.category === 'Shield')) throw new Error('selected armor is not canonical armor');
  if (shield && (!shield.armor || shield.armor.category !== 'Shield')) throw new Error('selected shield is not a canonical shield');
  return {
    armor,
    shield,
    wearingArmor: Boolean(armor),
    wearingHeavyArmor: armor?.armor?.category === 'Heavy',
    usingShield: Boolean(shield),
  };
};

const calculateSpeed = (
  input: CharacterCalculationInput,
  race: (typeof characterCreationRules.races)[number],
  armor: ArmorState,
  strength: number,
): number => {
  let speed = race.speedFt;
  const strengthMinimum = armor.armor?.armor?.strengthMinimum ?? 0;
  if (armor.wearingHeavyArmor && strength < strengthMinimum && !race.ignoresHeavyArmorSpeedPenalty) speed -= 10;
  if (input.classIndex === 'barbarian' && input.level >= 5 && !armor.wearingHeavyArmor) {
    speed += featureModifierValue('barbarian-fast-movement-speed');
  }
  if (input.classIndex === 'monk' && input.level >= 2 && !armor.wearingArmor && !armor.usingShield) {
    speed += featureModifierValue('monk-unarmored-movement-speed');
  }
  return speed;
};

const calculateMaximumHitPoints = (
  input: CharacterCalculationInput,
  classRule: (typeof levelUpRules.classes)[number],
  constitutionModifier: number,
  subrace: (typeof characterCreationRules.subraces)[number] | undefined,
): number => {
  const gains = new Map(input.hitPointProgression.levelGains.map((gain) => [gain.level, gain]));
  if (gains.size !== input.hitPointProgression.levelGains.length) throw new Error('duplicate hit point gain level');
  let maximum = Math.max(1, classRule.hitDie + constitutionModifier);
  for (let level = 2; level <= input.level; level += 1) {
    const gain = gains.get(level);
    if (!gain) throw new Error(`missing hit point gain for level ${level}`);
    const rolled = gain.mode === 'rolled' ? gain.roll : classRule.fixedAverageHp;
    if (gain.mode === 'rolled' && (gain.roll < 1 || gain.roll > classRule.hitDie)) throw new Error('hit point roll exceeds Hit Die');
    maximum += Math.max(1, rolled + constitutionModifier);
  }
  if ((subrace?.traitIndexes as readonly string[] | undefined)?.includes('dwarven-toughness')) {
    maximum += input.level * featureModifierValue('hill-dwarf-dwarven-toughness-maximum-hit-points');
  }
  if (input.classIndex === 'sorcerer' && input.subclassIndex === 'draconic') {
    maximum += input.level * featureModifierValue('draconic-resilience-maximum-hit-points');
  }
  return input.hitPointProgression.maximumOverride?.value ?? maximum;
};

const calculateArmorClass = (
  input: CharacterCalculationInput,
  classIndex: string,
  modifiers: AbilityScoresDTO,
  armor: ArmorState,
): number => {
  const defense = input.defense;
  if (defense.mode === 'manual') {
    return defense.armorClass;
  }
  const shieldBonus = armor.shield?.armor?.shieldBonus ?? 0;
  if (defense.mode === 'armor') {
    if (!armor.armor?.armor) throw new Error('armor defense requires equipped canonical armor');
    const rule = armor.armor.armor;
    const dexterityBonus = rule.dexterityBonus
      ? Math.min(modifiers.dexterity, rule.maximumDexterityBonus ?? modifiers.dexterity)
      : 0;
    const defenseStyle = selectedDefenseStyle(input.ruleChoices, classIndex)
      ? featureModifierValue(`${classIndex}-defense-style-ac`) : 0;
    return rule.baseArmorClass + dexterityBonus + shieldBonus + defenseStyle;
  }
  if (armor.wearingArmor) throw new Error('unarmored defense cannot wear armor');
  const legal: Array<{ id: NonNullable<Extract<CharacterCalculationInput['defense'], { mode: 'unarmored' }>['formulaId']>; value: number }> = [
    { id: 'standard-unarmored', value: 10 + modifiers.dexterity + shieldBonus },
  ];
  if (classIndex === 'barbarian' && featureModifier('barbarian-unarmored-defense-ac')) {
    legal.push({ id: 'barbarian-unarmored-defense', value: 10 + modifiers.dexterity + modifiers.constitution + shieldBonus });
  }
  if (classIndex === 'monk' && !armor.usingShield && featureModifier('monk-unarmored-defense-ac')) {
    legal.push({ id: 'monk-unarmored-defense', value: 10 + modifiers.dexterity + modifiers.wisdom });
  }
  if (classIndex === 'sorcerer' && input.subclassIndex === 'draconic' && featureModifier('draconic-resilience-ac')) {
    legal.push({ id: 'draconic-resilience', value: 13 + modifiers.dexterity + shieldBonus });
  }
  const chosen = legal.find((formula) => formula.id === defense.formulaId);
  if (!chosen) throw new Error('selected defense formula is unavailable');
  return chosen?.value ?? legal[0].value;
};

const selectedDefenseStyle = (choices: CharacterCalculationInput['ruleChoices'], classIndex: string): boolean => {
  const option = classIndex === 'fighter' ? 'fighter-fighting-style-defense'
    : classIndex === 'paladin' ? 'fighting-style-defense'
      : classIndex === 'ranger' ? 'ranger-fighting-style-defense' : '';
  return choices.some((choice) => choice.optionIds.includes(option));
};

const pactSlots = (count: number | undefined, level: number | undefined): number[] => {
  const slots = [0, 0, 0];
  if (count && level) slots[level - 1] = count;
  return slots;
};

const featureModifier = (id: string) => characterCreationRules.featureModifiers.find((entry) => entry.id === id);
const featureModifierValue = (id: string): number => {
  const value = featureModifier(id)?.value;
  if (typeof value !== 'number') throw new Error(`missing canonical feature modifier ${id}`);
  return value;
};

const calculateManualClassV2 = (input: CharacterCalculationInput): CharacterCalculationOutput => {
  if (input.race.source !== 'srd' || input.level < 1 || input.level > 5) {
    throw new Error('manual Class requires a supported Race input and level');
  }
  const raceIndex = input.race.index;
  const raceRule = characterCreationRules.races.find((entry) => entry.index === raceIndex);
  if (!raceRule) throw new Error('unsupported canonical Race input');
  const subrace = input.subraceIndex === null
    ? undefined : characterCreationRules.subraces.find((entry) => entry.index === input.subraceIndex);
  if (subrace && (subrace.raceIndex !== raceRule.index || !(raceRule.subraceIndexes as readonly string[]).includes(subrace.index))) {
    throw new Error('subrace does not belong to selected Race');
  }
  const choiceErrors = validateRuleChoices({
    raceIndex: raceRule.index, subraceIndex: subrace?.index ?? null,
    classIndex: null, level: input.level, choices: input.ruleChoices,
  });
  if (choiceErrors.length > 0) throw new Error(choiceErrors.join('; '));
  const finalAbilityScores = calculateAbilityScores(input, raceRule, subrace);
  const abilityModifiers = Object.fromEntries(
    abilityNames.map((ability) => [ability, abilityModifier(finalAbilityScores[ability])]),
  ) as AbilityScoresDTO;
  const proficiencyBonus = input.level === 5 ? 3 : 2;
  const armorState = resolveArmorState(input);
  return {
    id: input.id,
    finalAbilityScores,
    abilityModifiers,
    proficiencyBonus,
    initiative: abilityModifiers.dexterity,
    passivePerception: calculatePassivePerception(input, abilityModifiers.wisdom, proficiencyBonus, raceRule, subrace),
    speedFt: calculateSpeed(input, raceRule, armorState, finalAbilityScores.strength),
    maximumHitPoints: input.hitPointProgression.maximumOverride!.value,
    armorClass: calculateArmorClass(input, '', abilityModifiers, armorState),
    spellcasting: null,
  };
};

export const buildCharacterSheetV2 = (request: CreateCharacterV2RequestDTO): CharacterSheetV2 => {
  if (!isCreateCharacterV2Request(request)) throw new Error('CreateCharacterV2 request is invalid');
  const selectedClass = request.identity.class;
  const raceSelection = request.identity.race;
  const directRace = raceSelection.source === 'srd'
    ? characterCreationRules.races.find((entry) => entry.index === raceSelection.index) : undefined;
  const selectedSubrace = raceSelection.source === 'srd'
    ? characterCreationRules.subraces.find((entry) => entry.index === raceSelection.index) : undefined;
  const canonicalRaceIndex = directRace?.index ?? selectedSubrace?.raceIndex ?? null;
  const calculationRaceIndex = canonicalRaceIndex ?? 'human';
  const canonicalClassIndex = selectedClass.source === 'srd' ? selectedClass.index : null;
  const subclassIndex = request.identity.subclass?.source === 'srd' ? request.identity.subclass.index : null;
  const calculationInput: CharacterCalculationInput = {
    id: request.identity.name,
    classIndex: canonicalClassIndex ?? '',
    subclassIndex,
    level: request.identity.level,
    race: { source: 'srd', index: calculationRaceIndex },
    subraceIndex: selectedSubrace?.index ?? null,
    abilityScores: request.abilityScores,
    ruleChoices: request.ruleChoices,
    proficiencies: request.proficiencies,
    hitPointProgression: request.hitPointProgression,
    defense: request.combat.defense,
    equipment: request.equipment,
  };
  const calculation = canonicalClassIndex === null
    ? calculateManualClassV2(calculationInput) : calculateCharacterV2(calculationInput);
  const calculated = (value: number, ruleId: string): ResolvedValue<number> => ({
    value, provenance: { kind: 'calculated', ruleId },
  });
  const override = (value: number, source: { value: number; reason: string } | undefined, ruleId: string): ResolvedValue<number> =>
    source ? { value: source.value, provenance: { kind: 'manual-override', reason: source.reason } } : calculated(value, ruleId);
  const abilityProvenance = request.abilityScores.mode === 'calculated'
    ? { kind: 'calculated' as const, ruleId: 'ability-score-final' }
    : { kind: 'imported' as const, note: request.abilityScores.reason };
  const scores = Object.fromEntries(abilityNames.map((ability) => [ability, {
    value: calculation.finalAbilityScores[ability], provenance: abilityProvenance,
  }])) as CharacterSheetV2['abilityScores']['scores'];
  const attacks = request.attacks.map((attack) => {
    if (attack.attackBonus.mode === 'manual-override') return {
      id: attack.id, name: attack.name, damage: attack.damage, attackBonusInput: null,
      attackBonus: { value: attack.attackBonus.value, provenance: { kind: 'manual-override' as const, reason: attack.attackBonus.reason } },
    };
    const ability = attack.attackBonus.ability === 'spellcasting'
      ? calculation.spellcasting?.ability : attack.attackBonus.ability;
    if (!ability) throw new Error('spellcasting attack requires a spellcasting Class');
    const bonus = calculation.abilityModifiers[ability] + (attack.attackBonus.proficient ? calculation.proficiencyBonus : 0);
    return {
      id: attack.id, name: attack.name, damage: attack.damage,
      attackBonusInput: { ability: attack.attackBonus.ability, proficient: attack.attackBonus.proficient },
      attackBonus: calculated(bonus, 'attack-bonus'),
    };
  });
  const spells = (request.spellcasting?.spells ?? []).map((spell) => {
    if (spell.source === 'manual') return {
      id: spell.id, canonicalIndex: null, name: spell.name, level: spell.level, school: spell.school,
      castingTime: spell.castingTime, range: spell.range, components: [...spell.components],
      materialComponent: spell.materialComponent ?? null, duration: spell.duration,
      concentration: spell.concentration, ritual: spell.ritual, description: spell.description,
      higherLevelText: spell.higherLevelText ?? null, state: spell.state,
      provenance: { kind: 'imported' as const },
    };
    const canonical = characterCreationRules.spells.find((entry) => entry.index === spell.index);
    if (!canonical) throw new Error('unsupported canonical spell');
    return {
      id: spell.id, canonicalIndex: canonical.index, name: canonical.name, level: canonical.level,
      school: canonical.school, castingTime: canonical.castingTime, range: canonical.range,
      components: [...canonical.components], materialComponent: canonical.material, duration: canonical.duration,
      concentration: canonical.concentration, ritual: canonical.ritual, description: canonical.description,
      higherLevelText: canonical.higherLevel, state: spell.state,
      provenance: { kind: 'calculated' as const, ruleId: 'spell-canonical' },
    };
  });
  const features = request.features.map((feature) => {
    if (feature.source === 'manual') return {
      id: feature.id, source: 'manual' as const, canonicalIndex: null,
      name: feature.name, category: feature.category,
      description: feature.description, provenance: { kind: 'imported' as const },
    };
    const resolved = resolveFeature(
      feature.index, canonicalRaceIndex, selectedSubrace?.index ?? null,
      canonicalClassIndex, subclassIndex, request.identity.level,
    );
    if (!resolved) throw new Error('canonical feature is not owned by the selected character');
    return {
      id: feature.index, source: 'srd' as const, canonicalIndex: feature.index,
      ...resolved, provenance: { kind: 'calculated' as const, ruleId: 'feature-canonical' },
    };
  });
  const spellcasting = calculation.spellcasting && request.spellcasting ? {
    ability: calculation.spellcasting.ability,
    spellSaveDC: calculated(calculation.spellcasting.spellSaveDC, 'spell-save-dc'),
    spellAttackBonus: calculated(calculation.spellcasting.spellAttackBonus, 'spell-attack-bonus'),
    slots: calculation.spellcasting.slots.map((max, index) => {
      const manual = request.spellcasting?.slotOverride?.find((slot) => slot.level === index + 1);
      return { level: index + 1, max: manual?.max ?? max, used: 0,
        provenance: manual ? { kind: 'manual-override' as const, reason: manual.reason } : { kind: 'calculated' as const, ruleId: 'spell-slots' } };
    }),
    availableSpellLevels: [...calculation.spellcasting.availableSpellLevels], spells,
    preparedSpellIds: [...request.spellcasting.preparedSpellIds],
  } : null;
  return {
    schemaVersion: 'CharacterSheetV2',
    ruleset: { system: 'dnd5e', version: '2014', snapshotId: characterCreationRules.metadata.snapshotId },
    creationSource: request.creationSource, identity: structuredClone(request.identity),
    abilityScores: { input: structuredClone(request.abilityScores), scores, modifiers: calculation.abilityModifiers },
    proficiencies: structuredClone(request.proficiencies),
    hitPointProgression: { ...structuredClone(request.hitPointProgression), maximum: override(calculation.maximumHitPoints, request.hitPointProgression.maximumOverride, 'maximum-hit-points') },
    combat: {
      defense: structuredClone(request.combat.defense), proficiencyBonus: calculated(calculation.proficiencyBonus, 'proficiency-bonus'),
      initiative: override(calculation.initiative, request.combat.initiativeOverride, 'initiative'),
      passivePerception: override(calculation.passivePerception, request.combat.passivePerceptionOverride, 'passive-perception'),
      speedFt: override(calculation.speedFt, request.combat.speedOverride, 'walking-speed'),
      armorClass: request.combat.defense.mode === 'manual'
        ? { value: request.combat.defense.armorClass, provenance: { kind: 'manual-override', reason: request.combat.defense.reason } }
        : calculated(calculation.armorClass, request.combat.defense.mode === 'armor' ? 'armor-class-armor' : 'armor-class-unarmored'),
    },
    ruleChoices: structuredClone(request.ruleChoices), attacks, spellcasting, features,
    equipment: structuredClone(request.equipment), other: structuredClone(request.other),
    summary: {
      displayLine: `${request.identity.name} · Level ${request.identity.level}`,
      landingConcept: `${request.identity.background} ${selectedClass.source === 'srd' ? selectedClass.index : selectedClass.name}`,
      featuredAbilities: features.slice(0, 3).map((feature) => feature.name),
      referenceSections: [
        { id: 'actions', label: 'Actions', defaultOpen: true },
        { id: 'features', label: 'Features', defaultOpen: true },
        { id: 'spells', label: 'Spells', defaultOpen: Boolean(spellcasting) },
        { id: 'equipment', label: 'Equipment', defaultOpen: false },
        { id: 'other', label: 'Other', defaultOpen: false },
      ],
    },
  };
};

const resolveFeature = (
  index: string, raceIndex: string | null, subraceIndex: string | null, classIndex: string | null,
  subclassIndex: string | null, level: number,
): { ownerKind: 'race' | 'class' | 'subclass'; name: string; category: string; description: string } | null => {
  const race = characterCreationRules.races.find((entry) => entry.index === raceIndex);
  const subrace = characterCreationRules.subraces.find((entry) => entry.index === subraceIndex);
  if (race?.traitIndexes.includes(index as never) || subrace?.traitIndexes.includes(index as never)) {
    const trait = characterCreationRules.raceTraits.find((entry) => entry.index === index);
    return trait ? { ownerKind: 'race', name: trait.name, category: 'race', description: trait.description } : null;
  }
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === classIndex);
  for (const classLevel of selectedClass?.levels ?? []) {
    if (classLevel.level <= level) {
      const feature = classLevel.features.find((entry) => entry.index === index);
      if (feature) return { ownerKind: 'class', name: feature.name, category: 'class', description: feature.summary };
    }
  }
  const subclass = selectedClass?.subclasses.find((entry) => entry.index === subclassIndex);
  for (const subclassLevel of subclass?.featuresByLevel ?? []) {
    if (subclassLevel.level <= level) {
      const feature = subclassLevel.features.find((entry) => entry.index === index);
      if (feature) return { ownerKind: 'subclass', name: feature.name, category: 'subclass', description: feature.summary };
    }
  }
  return null;
};
