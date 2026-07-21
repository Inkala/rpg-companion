import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { levelUpRules } from '../rules/generated/levelUpRules';
import type {
  AbilityScoresDTO,
  CharacterAttackInput,
  CharacterEquipmentInput,
  CharacterFeatureInput,
  CharacterSpellcastingInput,
  CreateCharacterV2RequestDTO,
  RuleChoiceInput,
  SpellSelectionInput,
} from '../characters/characterSheetV2';
import { buildCharacterSheetV2 } from '../characters/characterSheetV2Calculations';
import { isCreateCharacterV2Request, validateRuleChoices } from '../characters/characterSheetV2Validation';
import type { CharacterBuildId } from './characterCreationTypes';

export type SelectOption = { value: string; label: string };
export type DraftValidationError = { field: string; message: string };

export type StructuredCharacterDraft = {
  creationSource: 'guided' | 'manual-transfer';
  name: string;
  gender: '' | 'Male' | 'Female' | 'Other';
  raceKey: string;
  manualRaceName: string;
  classKey: string;
  manualClassName: string;
  level: number;
  subclassKey: string;
  manualSubclassName: string;
  background: string;
  abilityMode: 'calculated' | 'imported';
  baseScores: AbilityScoresDTO;
  importedScores: AbilityScoresDTO;
  importedReason: string;
  retainedBaseScores: AbilityScoresDTO;
  perception: 'none' | 'proficient' | 'expertise';
  ruleChoices: RuleChoiceInput[];
  levelGains: CreateCharacterV2RequestDTO['hitPointProgression']['levelGains'];
  maximumOverride: { enabled: boolean; value: number; reason: string };
  defense: {
    mode: 'armor' | 'unarmored' | 'manual';
    armorIndex: string;
    shieldIndex: string;
    formulaId: 'standard-unarmored' | 'barbarian-unarmored-defense' | 'monk-unarmored-defense' | 'draconic-resilience';
    armorClass: number;
    reason: string;
  };
  initiativeOverride: { enabled: boolean; value: number; reason: string };
  passivePerceptionOverride: { enabled: boolean; value: number; reason: string };
  speedOverride: { enabled: boolean; value: number; reason: string };
  attacks: CharacterAttackInput[];
  spellcasting: CharacterSpellcastingInput;
  slotOverride: Array<{ level: number; max: number; reason: string }>;
  manualFeatures: Extract<CharacterFeatureInput, { source: 'manual' }>[];
  equipment: CharacterEquipmentInput[];
  other: Array<{ id: string; title: string; description: string }>;
};

export const classOptions: SelectOption[] = [
  { value: '', label: 'Choose Class' },
  ...levelUpRules.classes.map((entry) => ({ value: entry.index, label: entry.name })),
  { value: 'manual', label: 'Other' },
];

export const raceOptions: SelectOption[] = [
  { value: '', label: 'Choose Race' },
  ...characterCreationRules.races.map((entry) => ({ value: entry.index, label: entry.name })),
  ...characterCreationRules.subraces.map((entry) => ({ value: entry.index, label: entry.name })),
  { value: 'manual', label: 'Other' },
];

export const equipmentOptions = characterCreationRules.equipment.map((entry) => ({
  value: entry.index,
  label: `${entry.name} (${characterCreationRules.equipmentCategories.find((category) => category.index === entry.categoryIndex)?.name ?? entry.categoryIndex})`,
}));

const languageOptions = [
  'abyssal', 'celestial', 'common', 'deep-speech', 'draconic', 'dwarvish', 'elvish', 'giant',
  'gnomish', 'goblin', 'halfling', 'infernal', 'orc', 'primordial', 'sylvan', 'undercommon',
];
const skillOptions = [
  'skill-acrobatics', 'skill-animal-handling', 'skill-arcana', 'skill-athletics', 'skill-deception',
  'skill-history', 'skill-insight', 'skill-intimidation', 'skill-investigation', 'skill-medicine',
  'skill-nature', 'skill-perception', 'skill-performance', 'skill-persuasion', 'skill-religion',
  'skill-sleight-of-hand', 'skill-stealth', 'skill-survival',
];

const defaultScores = (): AbilityScoresDTO => ({
  strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8,
});

export const createStructuredCharacterDraft = (
  creationSource: StructuredCharacterDraft['creationSource'],
  buildId: CharacterBuildId = 'strength-melee-fighter',
): StructuredCharacterDraft => {
  const strengthBuild = buildId === 'strength-melee-fighter';
  const baseScores: AbilityScoresDTO = strengthBuild
    ? { strength: 15, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 12, charisma: 13 }
    : { strength: 10, dexterity: 15, constitution: 14, intelligence: 8, wisdom: 13, charisma: 12 };
  const equipment: CharacterEquipmentInput[] = strengthBuild
    ? [
      { source: 'srd', index: 'chain-mail', quantity: 1, equipped: true },
      { source: 'srd', index: 'shield', quantity: 1, equipped: true },
      { source: 'srd', index: 'longsword', quantity: 1, equipped: true },
      { source: 'srd', index: 'javelin', quantity: 4, equipped: true },
    ]
    : [
      { source: 'srd', index: 'leather-armor', quantity: 1, equipped: true },
      { source: 'srd', index: 'longbow', quantity: 1, equipped: true },
      { source: 'srd', index: 'shortsword', quantity: 1, equipped: true },
    ];
  const attacks: CharacterAttackInput[] = strengthBuild
    ? [
      { id: 'longsword', name: 'Longsword', attackBonus: { mode: 'calculated', ability: 'strength', proficient: true }, damage: [{ dice: '1d8', bonus: 3, type: 'slashing' }] },
      { id: 'javelin', name: 'Javelin', attackBonus: { mode: 'calculated', ability: 'strength', proficient: true }, damage: [{ dice: '1d6', bonus: 3, type: 'piercing' }] },
    ]
    : [
      { id: 'longbow', name: 'Longbow', attackBonus: { mode: 'calculated', ability: 'dexterity', proficient: true }, damage: [{ dice: '1d8', bonus: 3, type: 'piercing' }] },
      { id: 'shortsword', name: 'Shortsword', attackBonus: { mode: 'calculated', ability: 'dexterity', proficient: true }, damage: [{ dice: '1d6', bonus: 3, type: 'piercing' }] },
    ];
  const draft: StructuredCharacterDraft = {
    creationSource,
    name: creationSource === 'guided' ? (strengthBuild ? 'Aldren Vale' : 'Lysa Thorn') : '',
    gender: '',
    raceKey: creationSource === 'guided' ? 'human' : '', manualRaceName: '',
    classKey: creationSource === 'guided' ? 'fighter' : '', manualClassName: '', level: 1,
    subclassKey: '', manualSubclassName: '',
    background: strengthBuild ? 'Soldier' : 'Outlander',
    abilityMode: creationSource === 'guided' ? 'calculated' : 'imported',
    baseScores: structuredClone(baseScores), importedScores: structuredClone(defaultScores()),
    importedReason: creationSource === 'manual-transfer' ? 'Transferred from an existing character sheet.' : '',
    retainedBaseScores: structuredClone(baseScores), perception: 'none', ruleChoices: [], levelGains: [],
    maximumOverride: { enabled: false, value: 10, reason: '' },
    defense: creationSource === 'manual-transfer'
      ? { mode: 'unarmored', armorIndex: '', shieldIndex: '', formulaId: 'standard-unarmored', armorClass: 10, reason: '' }
      : strengthBuild
      ? { mode: 'armor', armorIndex: 'chain-mail', shieldIndex: 'shield', formulaId: 'standard-unarmored', armorClass: 10, reason: '' }
      : { mode: 'armor', armorIndex: 'leather-armor', shieldIndex: '', formulaId: 'standard-unarmored', armorClass: 10, reason: '' },
    initiativeOverride: { enabled: false, value: 0, reason: '' },
    passivePerceptionOverride: { enabled: false, value: 10, reason: '' },
    speedOverride: { enabled: false, value: 30, reason: '' },
    attacks: creationSource === 'guided' ? attacks : [], spellcasting: { mode: 'none' }, slotOverride: [],
    manualFeatures: [], equipment: creationSource === 'guided' ? equipment : [], other: [],
  };
  return reconcileStructuredDraft(draft);
};

export const availableSubclassesForDraft = (draft: StructuredCharacterDraft): SelectOption[] => {
  if (draft.classKey === 'manual') return [{ value: '', label: 'No subclass' }, { value: 'manual', label: 'Other' }];
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === draft.classKey);
  if (!selectedClass || draft.level < selectedClass.subclassDecisionLevel) return [];
  return [
    { value: '', label: 'Choose subclass' },
    ...selectedClass.subclasses.map((entry) => ({ value: entry.index, label: entry.name })),
    { value: 'manual', label: 'Other' },
  ];
};

export const availableSpellsForDraft = (draft: StructuredCharacterDraft, classLevel = draft.level) => {
  if (draft.classKey === 'manual') return [];
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === draft.classKey);
  const levelRule = selectedClass?.levels.find((entry) => entry.level === classLevel);
  const spellcasting = levelRule?.spellcasting;
  if (!spellcasting) return [];
  const activeFeatureIDs = new Set([
    ...canonicalFeatureInputs(draft).flatMap((feature) => feature.source === 'srd' ? [feature.index] : []),
    ...draft.ruleChoices.flatMap((choice) => choice.optionIds),
  ]);
  const calculatedGrantIndexes = new Set(draft.ruleChoices
    .filter((choice) => choice.ruleId === 'high-elf-cantrip' || choice.ruleId === 'circle-of-the-land-bonus-cantrip')
    .flatMap((choice) => choice.optionIds));
  return characterCreationRules.spells.filter((spell) => {
    const memberships = spell.subclassMemberships.filter((membership) =>
      membership.classIndex === draft.classKey &&
      membership.subclassIndex === draft.subclassKey &&
      membership.classLevel <= classLevel &&
      membership.requiredFeatureIndexes.every((index) => activeFeatureIDs.has(index)));
    const isAlwaysPrepared = memberships.some((membership) => membership.kind === 'always-prepared');
    const isExpanded = memberships.some((membership) => membership.kind === 'expanded');
    return !isAlwaysPrepared &&
      !calculatedGrantIndexes.has(spell.index) &&
      (spell.level === 0 || spellcasting.availableSpellLevels.includes(spell.level as never)) &&
      (spell.classIndexes.includes(draft.classKey as never) || isExpanded);
  });
};

export const spellSlotsForDraft = (draft: StructuredCharacterDraft): Array<{ level: number; max: number }> => {
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === draft.classKey);
  const spellcasting = selectedClass?.levels.find((entry) => entry.level === draft.level)?.spellcasting;
  if (!spellcasting) return [];
  if (spellcasting.mode === 'pact-known') {
    return spellcasting.pactSlotLevel && spellcasting.pactSlots
      ? [{ level: spellcasting.pactSlotLevel, max: spellcasting.pactSlots }]
      : [];
  }
  return spellcasting.slots.map((max, index) => ({ level: index + 1, max })).filter((slot) => slot.max > 0);
};

export const availableRuleChoicesForDraft = (draft: StructuredCharacterDraft) => {
  const context = canonicalRaceContext(draft.raceKey);
  const traits = new Set([
    ...(characterCreationRules.races.find((entry) => entry.index === context?.raceIndex)?.traitIndexes ?? []),
    ...(characterCreationRules.subraces.find((entry) => entry.index === context?.subraceIndex)?.traitIndexes ?? []),
  ]);
  const raceChoices = characterCreationRules.raceChoices.filter((choice) =>
    choice.sourceOwnerType === 'race'
      ? choice.sourceOwnerIndex === context?.raceIndex
      : traits.has(choice.sourceOwnerIndex as never));
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === draft.classKey);
  const classChoices = [
    ...(selectedClass?.choices ?? []),
    ...characterCreationRules.classChoices.filter((choice) => choice.classIndex === draft.classKey),
  ].filter((choice) => {
    const count = choice.selectionCountByLevel[String(draft.level) as keyof typeof choice.selectionCountByLevel] ?? 0;
    const requiredSubclass = 'requiredSubclassIndex' in choice ? choice.requiredSubclassIndex : null;
    return draft.level >= choice.fromLevel && count > 0 && (!requiredSubclass || requiredSubclass === draft.subclassKey);
  });
  const activeClassChoiceIDs = new Set(classChoices.map((choice) => choice.id));
  return [
    ...raceChoices.map((choice) => ({
      id: choice.id, label: readable(choice.id), count: choice.selectionCount,
      options: choiceOptions(choice.allowedOptionIndexes, choice.boundedRule), allowManual: false,
    })),
    ...classChoices.map((choice) => ({
      id: choice.id, label: readable(choice.id),
      count: choice.selectionCountByLevel[String(draft.level) as keyof typeof choice.selectionCountByLevel] ?? 0,
      options: classChoiceOptions(choice, draft, activeClassChoiceIDs),
      allowManual: choice.allowManual,
    })),
  ].filter((choice) => choice.count > 0);
};

export const reconcileStructuredDraft = (draft: StructuredCharacterDraft): StructuredCharacterDraft => {
  const next = structuredClone(draft);
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === next.classKey);
  next.levelGains = !selectedClass ? [] : Array.from({ length: Math.max(0, next.level - 1) }, (_, index) => {
    const level = index + 2;
    return next.levelGains.find((gain) => gain.level === level) ?? { level, mode: 'fixed-average' as const };
  });
  const subclasses = availableSubclassesForDraft(next);
  if (subclasses.length === 0) next.subclassKey = '';
  else if (!subclasses.some((option) => option.value === next.subclassKey)) next.subclassKey = '';
  const requiredChoices = availableRuleChoicesForDraft(next);
  next.ruleChoices = requiredChoices.map((choice) => {
    const retained = next.ruleChoices.find((entry) => entry.ruleId === choice.id);
    const validRetained = retained?.optionIds.filter((option) => choice.options.some((candidate) => candidate.value === option)) ?? [];
    return {
      ruleId: choice.id,
      optionIds: validRetained.slice(0, choice.count),
      ...(retained?.manualNote ? { manualNote: retained.manualNote } : {}),
    };
  });
  next.spellcasting = reconcileSpellcasting(next);
  const availableSlots = new Set(spellSlotsForDraft(next).map((slot) => slot.level));
  next.slotOverride = next.slotOverride.filter((entry) => availableSlots.has(entry.level));
  reconcileDefense(next);
  return next;
};

export const resetDraftAbilitiesToCalculated = (draft: StructuredCharacterDraft): StructuredCharacterDraft | null => {
  if (draft.raceKey === 'manual') return null;
  const next = reconcileStructuredDraft(structuredClone(draft));
  next.abilityMode = 'calculated';
  next.baseScores = structuredClone(next.retainedBaseScores);
  next.importedReason = '';
  const context = canonicalRaceContext(next.raceKey);
  const raceChoiceIDs = new Set(characterCreationRules.raceChoices.map((choice) => choice.id));
  const raceErrors = validateRuleChoices({
    raceIndex: context?.raceIndex ?? null,
    subraceIndex: context?.subraceIndex ?? null,
    classIndex: null,
    level: next.level,
    choices: next.ruleChoices.filter((choice) => raceChoiceIDs.has(choice.ruleId as never)),
    requireComplete: true,
  });
  return raceErrors.length > 0 ? null : next;
};

export const validateStructuredCharacterDraft = (draft: StructuredCharacterDraft): DraftValidationError[] => {
  const errors: DraftValidationError[] = [];
  if (draft.name.trim() === '') errors.push({ field: 'name', message: 'Name is required.' });
  if (draft.gender === '') errors.push({ field: 'gender', message: 'Gender is required.' });
  if (draft.raceKey === '') errors.push({ field: 'raceKey', message: 'Race is required.' });
  if (draft.raceKey === 'manual' && draft.manualRaceName.trim() === '') errors.push({ field: 'manualRaceName', message: 'Other Race name is required.' });
  if (draft.classKey === '') errors.push({ field: 'classKey', message: 'Class is required.' });
  if (draft.classKey === 'manual' && draft.manualClassName.trim() === '') errors.push({ field: 'manualClassName', message: 'Other Class name is required.' });
  if (draft.subclassKey === 'manual' && draft.manualSubclassName.trim() === '') errors.push({ field: 'manualSubclassName', message: 'Other Subclass name is required.' });
  if (draft.background.trim() === '') errors.push({ field: 'background', message: 'Background is required.' });
  if (draft.abilityMode === 'imported' && draft.importedReason.trim() === '') errors.push({ field: 'importedReason', message: 'Imported score reason is required.' });
  if (draft.classKey === 'manual' && !draft.maximumOverride.enabled) {
    errors.push({ field: 'maximumOverride.enabled', message: 'Other Class requires a maximum HP override and reason.' });
  } else if (draft.maximumOverride.enabled) {
    if (!Number.isInteger(draft.maximumOverride.value) || draft.maximumOverride.value < 1 || draft.maximumOverride.value > 9999) errors.push({ field: 'maximumOverride.value', message: 'Maximum HP override must be between 1 and 9999.' });
    if (draft.maximumOverride.reason.trim() === '') errors.push({ field: 'maximumOverride.reason', message: 'Maximum HP override reason is required.' });
  }
  if (draft.initiativeOverride.enabled) {
    if (!Number.isInteger(draft.initiativeOverride.value) || draft.initiativeOverride.value < -100 || draft.initiativeOverride.value > 100) errors.push({ field: 'initiativeOverride.value', message: 'Initiative override must be between -100 and 100.' });
    if (draft.initiativeOverride.reason.trim() === '') errors.push({ field: 'initiativeOverride.reason', message: 'Initiative override reason is required.' });
  }
  if (draft.passivePerceptionOverride.enabled) {
    if (!Number.isInteger(draft.passivePerceptionOverride.value) || draft.passivePerceptionOverride.value < 0 || draft.passivePerceptionOverride.value > 100) errors.push({ field: 'passivePerceptionOverride.value', message: 'Passive Perception override must be between 0 and 100.' });
    if (draft.passivePerceptionOverride.reason.trim() === '') errors.push({ field: 'passivePerceptionOverride.reason', message: 'Passive Perception override reason is required.' });
  }
  if (draft.raceKey === 'manual' && !draft.speedOverride.enabled) {
    errors.push({ field: 'speedOverride.enabled', message: 'Other Race requires a Speed override and reason.' });
  } else if (draft.speedOverride.enabled) {
    if (!Number.isInteger(draft.speedOverride.value) || draft.speedOverride.value < 0 || draft.speedOverride.value > 1000) errors.push({ field: 'speedOverride.value', message: 'Speed override must be between 0 and 1000.' });
    if (draft.speedOverride.reason.trim() === '') errors.push({ field: 'speedOverride.reason', message: 'Speed override reason is required.' });
  }
  draft.slotOverride.forEach((entry) => {
    if (entry.reason.trim() === '') errors.push({ field: `slotOverride.${entry.level}.reason`, message: `Level ${entry.level} slot override reason is required.` });
  });
  if (draft.raceKey === 'manual' && draft.abilityMode !== 'imported') errors.push({ field: 'abilityMode', message: 'Other Race requires imported final scores.' });
  if (draft.defense.mode === 'manual' && draft.defense.reason.trim() === '') errors.push({ field: 'defense.reason', message: 'Manual Armor Class requires a reason.' });
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === draft.classKey);
  const selectedRace = characterCreationRules.races.find((entry) => entry.index === draft.raceKey);
  if (selectedRace && selectedRace.subraceIndexes.length > 0) {
    errors.push({ field: 'raceKey', message: 'Choose a supported subrace for this Race.' });
  }
  if (selectedClass && draft.level >= selectedClass.subclassDecisionLevel && draft.subclassKey === '') {
    errors.push({ field: 'subclassKey', message: 'Choose a subclass for this Class level.' });
  }
  for (const choice of availableRuleChoicesForDraft(draft)) {
    const entry = draft.ruleChoices.find((candidate) => candidate.ruleId === choice.id);
    const manualOnly = choice.allowManual && choice.options.length === 0;
    if (!entry || (manualOnly ? !entry.manualNote?.trim() : entry.optionIds.length !== choice.count)) {
      errors.push({ field: `ruleChoices.${choice.id}`, message: manualOnly
        ? `${choice.label} requires an explicit imported choice.`
        : `${choice.label} requires exactly ${choice.count} selection${choice.count === 1 ? '' : 's'}.` });
    }
  }
  validateSpellDecisions(draft, errors);
  if (draft.defense.mode === 'armor' && draft.defense.armorIndex === '') errors.push({ field: 'defense.armorIndex', message: 'Choose canonical armor.' });
  draft.attacks.forEach((attack, attackIndex) => {
    if (!attack.name.trim()) errors.push({ field: `attacks.${attackIndex}.name`, message: 'Attack name is required.' });
    if (attack.attackBonus.mode === 'manual-override' && !attack.attackBonus.reason.trim()) {
      errors.push({ field: `attacks.${attackIndex}.attackBonus.reason`, message: 'Manual attack bonus requires a reason.' });
    }
    attack.damage.forEach((damage, damageIndex) => {
      if (!/^\d+d\d+$/u.test(damage.dice)) errors.push({ field: `attacks.${attackIndex}.damage.${damageIndex}.dice`, message: 'Use dice notation such as 1d8.' });
      if (!damage.type.trim()) errors.push({ field: `attacks.${attackIndex}.damage.${damageIndex}.type`, message: 'Damage type is required.' });
    });
  });
  draft.manualFeatures.forEach((feature, index) => {
    if (!feature.name.trim()) errors.push({ field: `features.${index}.name`, message: 'Manual feature name is required.' });
    if (!feature.category.trim()) errors.push({ field: `features.${index}.category`, message: 'Manual feature category is required.' });
    if (!feature.description.trim()) errors.push({ field: `features.${index}.description`, message: 'Manual feature description is required.' });
  });
  for (const bucket of spellSelectionBuckets(draft.spellcasting)) {
    const acquisitionLevel = bucket.key === 'spellbook.initial'
      ? 1
      : Number(bucket.key.match(/level-(\d+)/u)?.[1] ?? draft.level);
    const availableSpellLevels = new Set(levelUpRules.classes.find((entry) => entry.index === draft.classKey)
      ?.levels.find((entry) => entry.level === acquisitionLevel)?.spellcasting?.availableSpellLevels ?? []);
    for (const spell of bucket.spells) {
      if (spell.source !== 'manual') continue;
      const validLevel = bucket.key === 'cantrips' ? spell.level === 0 : availableSpellLevels.has(spell.level as never);
      if (!validLevel) errors.push({ field: `spellcasting.${bucket.key}.spell.${spell.id}.level`, message: 'Manual spell level is unavailable for this Class level.' });
      const required: Array<keyof typeof spell> = ['name', 'school', 'castingTime', 'range', 'duration', 'description'];
      for (const field of required) {
        if (typeof spell[field] !== 'string' || !(spell[field] as string).trim()) {
          errors.push({ field: `spellcasting.${bucket.key}.spell.${spell.id}.${String(field)}`, message: `Manual spell ${String(field)} is required.` });
        }
      }
      if (spell.components.length === 0) errors.push({ field: `spellcasting.${bucket.key}.spell.${spell.id}.components`, message: 'Manual spell components are required.' });
      if (!spell.importReason.trim()) errors.push({ field: `spellcasting.${bucket.key}.spell.${spell.id}.importReason`, message: 'Manual spell import reason is required.' });
    }
  }
  draft.equipment.forEach((entry, index) => {
    if (entry.source === 'manual' && !entry.name.trim()) errors.push({ field: `equipment.${index}.name`, message: 'Other equipment name is required.' });
    if (entry.source === 'manual' && !entry.category.trim()) errors.push({ field: `equipment.${index}.category`, message: 'Other equipment category is required.' });
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1) errors.push({ field: `equipment.${index}.quantity`, message: 'Equipment quantity must be at least 1.' });
  });
  draft.other.forEach((entry, index) => {
    if (!entry.title.trim()) errors.push({ field: `other.${index}.title`, message: 'Other title is required.' });
    if (!entry.description.trim()) errors.push({ field: `other.${index}.description`, message: 'Other description is required.' });
  });
  if (errors.length > 0) return sortValidationErrors(errors);
  try {
    const request = buildCreateCharacterV2RequestUnchecked(draft);
    if (!isCreateCharacterV2Request(request)) errors.push({ field: 'review', message: 'Review the highlighted structured choices.' });
    else buildCharacterSheetV2(request);
  } catch {
    errors.push({ field: firstSpellDecisionField(draft.spellcasting) ?? 'name', message: 'Review the highlighted structured choice.' });
  }
  return sortValidationErrors(errors);
};

const validationSectionOrder = [
  'name', 'gender', 'raceKey', 'manualRaceName', 'classKey', 'manualClassName', 'subclassKey', 'manualSubclassName', 'background',
  'abilityMode', 'importedReason', 'ruleChoices.', 'maximumOverride.', 'defense.', 'initiativeOverride.',
  'passivePerceptionOverride.', 'speedOverride.', 'attacks.', 'slotOverride.', 'spellcasting.', 'features.', 'equipment.', 'other.', 'review',
];
const sortValidationErrors = (errors: DraftValidationError[]) => errors.map((error, position) => ({ error, position }))
  .sort((left, right) => {
    const rank = (field: string) => {
      const index = validationSectionOrder.findIndex((prefix) => prefix.endsWith('.') ? field.startsWith(prefix) : field === prefix);
      return index < 0 ? validationSectionOrder.length : index;
    };
    return rank(left.error.field) - rank(right.error.field) || left.position - right.position;
  }).map(({ error }) => error);

const reconcileDefense = (draft: StructuredCharacterDraft) => {
  const armor = new Map<string, (typeof characterCreationRules.equipment)[number]>(
    characterCreationRules.equipment.filter((entry) => entry.armor).map((entry) => [entry.index, entry]),
  );
  const isCanonicalArmor = (entry: CharacterEquipmentInput): entry is Extract<CharacterEquipmentInput, { source: 'srd' }> => entry.source === 'srd' && armor.has(entry.index);
  const equippedCanonicalArmor = new Set(draft.equipment
    .filter((entry): entry is Extract<CharacterEquipmentInput, { source: 'srd' }> => isCanonicalArmor(entry) && entry.equipped)
    .map((entry) => entry.index));
  if (draft.defense.armorIndex && !equippedCanonicalArmor.has(draft.defense.armorIndex)) draft.defense.armorIndex = '';
  if (draft.defense.shieldIndex && !equippedCanonicalArmor.has(draft.defense.shieldIndex)) draft.defense.shieldIndex = '';
  const retainSelectedDefenseEquipment = () => {
    const selected = new Set([draft.defense.armorIndex, draft.defense.shieldIndex].filter(Boolean));
    draft.equipment = draft.equipment.filter((entry) => !isCanonicalArmor(entry) || selected.has(entry.index));
  };

  if (draft.defense.mode === 'manual') {
    draft.defense.armorIndex = '';
    draft.defense.shieldIndex = '';
    draft.defense.formulaId = 'standard-unarmored';
    draft.equipment = draft.equipment.filter((entry) => !isCanonicalArmor(entry));
    return;
  }
  draft.defense.reason = '';
  if (draft.defense.mode === 'armor') {
    draft.defense.formulaId = 'standard-unarmored';
    if (armor.get(draft.defense.armorIndex)?.armor?.category === 'Shield') draft.defense.armorIndex = '';
    if (draft.defense.shieldIndex && armor.get(draft.defense.shieldIndex)?.armor?.category !== 'Shield') draft.defense.shieldIndex = '';
    retainSelectedDefenseEquipment();
    return;
  }

  draft.defense.armorIndex = '';
  const allowedFormula = draft.defense.formulaId === 'standard-unarmored' ||
    (draft.defense.formulaId === 'barbarian-unarmored-defense' && draft.classKey === 'barbarian') ||
    (draft.defense.formulaId === 'monk-unarmored-defense' && draft.classKey === 'monk') ||
    (draft.defense.formulaId === 'draconic-resilience' && draft.classKey === 'sorcerer' && draft.subclassKey === 'draconic');
  if (!allowedFormula) {
    draft.defense.formulaId = 'standard-unarmored';
    draft.defense.shieldIndex = '';
  }
  if (draft.defense.formulaId === 'monk-unarmored-defense') {
    draft.defense.shieldIndex = '';
  } else if (draft.defense.shieldIndex && armor.get(draft.defense.shieldIndex)?.armor?.category !== 'Shield') {
    draft.defense.shieldIndex = '';
  }
  retainSelectedDefenseEquipment();
};

export const buildCreateCharacterV2Request = (draft: StructuredCharacterDraft): CreateCharacterV2RequestDTO => {
  const errors = validateStructuredCharacterDraft(draft);
  if (errors.length > 0) throw new Error(errors[0].message);
  return buildCreateCharacterV2RequestUnchecked(draft);
};

const buildCreateCharacterV2RequestUnchecked = (draft: StructuredCharacterDraft): CreateCharacterV2RequestDTO => {
  const spellcasting = structuredClone(draft.spellcasting);
  if (spellcasting.mode !== 'none' && draft.slotOverride.length > 0) spellcasting.slotOverride = structuredClone(draft.slotOverride);
  const request: CreateCharacterV2RequestDTO = {
    schemaVersion: 'CharacterSheetV2', creationSource: draft.creationSource,
    identity: {
      name: draft.name.trim(), gender: draft.gender as Exclude<typeof draft.gender, ''>,
      race: draft.raceKey === 'manual' ? { source: 'manual', name: draft.manualRaceName.trim() } : { source: 'srd', index: draft.raceKey },
      background: draft.background.trim(),
      class: draft.classKey === 'manual' ? { source: 'manual', name: draft.manualClassName.trim() } : { source: 'srd', index: draft.classKey },
      level: draft.level,
      subclass: draft.subclassKey === '' ? null : draft.subclassKey === 'manual'
        ? { source: 'manual', name: draft.manualSubclassName.trim() } : { source: 'srd', index: draft.subclassKey },
    },
    abilityScores: draft.abilityMode === 'calculated'
      ? { mode: 'calculated', base: structuredClone(draft.baseScores) }
      : { mode: 'imported', values: structuredClone(draft.importedScores), reason: draft.importedReason.trim() },
    proficiencies: { perception: draft.perception, skills: selectedSkillProficiencies(draft) },
    hitPointProgression: {
      levelGains: structuredClone(draft.levelGains),
      ...(draft.maximumOverride.enabled ? { maximumOverride: { value: draft.maximumOverride.value, reason: draft.maximumOverride.reason.trim() } } : {}),
    },
    combat: {
      defense: draft.defense.mode === 'armor'
        ? { mode: 'armor', armorIndex: draft.defense.armorIndex, ...(draft.defense.shieldIndex ? { shieldIndex: draft.defense.shieldIndex } : {}) }
        : draft.defense.mode === 'unarmored'
          ? { mode: 'unarmored', formulaId: draft.defense.formulaId, ...(draft.defense.shieldIndex ? { shieldIndex: draft.defense.shieldIndex } : {}) }
          : { mode: 'manual', armorClass: draft.defense.armorClass, reason: draft.defense.reason.trim() },
      ...(draft.initiativeOverride.enabled ? { initiativeOverride: { value: draft.initiativeOverride.value, reason: draft.initiativeOverride.reason.trim() } } : {}),
      ...(draft.passivePerceptionOverride.enabled ? { passivePerceptionOverride: { value: draft.passivePerceptionOverride.value, reason: draft.passivePerceptionOverride.reason.trim() } } : {}),
      ...(draft.speedOverride.enabled ? { speedOverride: { value: draft.speedOverride.value, reason: draft.speedOverride.reason.trim() } } : {}),
    },
    ruleChoices: structuredClone(draft.ruleChoices), attacks: structuredClone(draft.attacks),
    spellcasting,
    features: [...canonicalFeatureInputs(draft), ...structuredClone(draft.manualFeatures)],
    equipment: structuredClone(draft.equipment), other: structuredClone(draft.other),
  };
  return request;
};

export const spellMetadata = (index: string) => characterCreationRules.spells.find((entry) => entry.index === index);

export const allSpellSelections = (input: CharacterSpellcastingInput): SpellSelectionInput[] => {
  if (input.mode === 'none') return [];
  if (input.mode === 'known' || input.mode === 'pact-known') return [
    ...input.cantrips,
    ...input.levels.flatMap((entry) => [...entry.learned, ...entry.replacements.map((replacement) => replacement.add)]),
  ];
  if (input.mode === 'prepared') return [...input.cantrips, ...input.prepared];
  return [...input.cantrips, ...input.initialSpellbook, ...input.additions.flatMap((entry) => entry.spells)];
};

type SpellSelectionBucket = { key: string; spells: SpellSelectionInput[] };

export const spellSelectionBuckets = (input: CharacterSpellcastingInput): SpellSelectionBucket[] => {
  if (input.mode === 'none') return [];
  const buckets: SpellSelectionBucket[] = [{ key: 'cantrips', spells: input.cantrips }];
  if (input.mode === 'known' || input.mode === 'pact-known') {
    for (const decision of input.levels) {
      buckets.push({ key: `known.level-${decision.level}.learned`, spells: decision.learned });
      for (const replacement of decision.replacements) {
        buckets.push({ key: `known.level-${decision.level}.replacement.add`, spells: [replacement.add] });
      }
    }
  } else if (input.mode === 'prepared') buckets.push({ key: 'prepared', spells: input.prepared });
  else {
    buckets.push({ key: 'spellbook.initial', spells: input.initialSpellbook });
    input.additions.forEach((entry) => buckets.push({ key: `spellbook.level-${entry.level}.additions`, spells: entry.spells }));
  }
  return buckets;
};

const firstSpellDecisionField = (input: CharacterSpellcastingInput): string | null => {
  if (input.mode === 'none') return null;
  if (input.mode === 'spellbook-prepared') {
    if (input.initialSpellbook.length !== 6) return 'spellcasting.spellbook.initial';
    const incomplete = input.additions.find((entry) => entry.spells.length !== 2);
    return incomplete ? `spellcasting.spellbook.level-${incomplete.level}.additions` : 'spellcasting.spellbook.prepared';
  }
  if (input.mode === 'known' || input.mode === 'pact-known') {
    const replacement = input.levels.find((entry) => entry.replacements.some((decision) => decision.add.source === 'srd' && !decision.add.index));
    return replacement ? `spellcasting.known.level-${replacement.level}.replacement.add` : `spellcasting.known.level-${input.levels[0]?.level ?? 1}.learned`;
  }
  return 'spellcasting.prepared';
};

const spellSelectionIdentity = (spell: SpellSelectionInput) => spell.source === 'srd'
  ? `srd:${spell.index}`
  : `manual:${spell.id}`;

const validateSpellDecisions = (draft: StructuredCharacterDraft, errors: DraftValidationError[]) => {
  const input = draft.spellcasting;
  if (input.mode === 'none') return;
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === draft.classKey);
  const target = selectedClass?.levels.find((entry) => entry.level === draft.level)?.spellcasting;
  const cantripCount = Number(target?.cantripsKnown ?? 0);
  if (input.cantrips.length !== cantripCount) errors.push({ field: 'spellcasting.cantrips', message: `Choose exactly ${cantripCount} cantrip${cantripCount === 1 ? '' : 's'}.` });
  if (input.mode === 'known' || input.mode === 'pact-known') {
    const knownSpells: SpellSelectionInput[] = [];
    input.levels.forEach((decision, index) => {
      const rule = selectedClass?.levels.find((entry) => entry.level === decision.level)?.spellcasting;
      const previousKnown = index === 0 ? 0 : selectedClass?.levels.find((entry) => entry.level === input.levels[index - 1].level)?.spellcasting?.spellsKnown ?? 0;
      const wanted = Math.max(0, (rule?.spellsKnown ?? 0) - previousKnown);
      if (decision.learned.length !== wanted) errors.push({ field: `spellcasting.known.level-${decision.level}.learned`, message: `Choose exactly ${wanted} learned spell${wanted === 1 ? '' : 's'} at Class level ${decision.level}.` });
      for (const replacement of decision.replacements) {
        const key = `spellcasting.known.level-${decision.level}.replacement`;
        const position = knownSpells.findIndex((spell) => spell.id === replacement.removeSpellId);
        if (position < 0) errors.push({ field: `${key}.remove`, message: `Choose a spell known before Class level ${decision.level} to replace.` });
        if (replacement.add.source === 'srd' && !replacement.add.index) errors.push({ field: `${key}.add`, message: 'Choose the replacement spell.' });
        if (position >= 0) {
          const addedIdentity = spellSelectionIdentity(replacement.add);
          if (addedIdentity === spellSelectionIdentity(knownSpells[position])) {
            errors.push({ field: `${key}.add`, message: 'Replacement spell must be different from the removed spell.' });
          } else if (knownSpells.some((spell, spellIndex) => spellIndex !== position && spellSelectionIdentity(spell) === addedIdentity)) {
            errors.push({ field: `${key}.add`, message: 'Replacement spell must not already remain known.' });
          }
          knownSpells.splice(position, 1, replacement.add);
        }
      }
      knownSpells.push(...decision.learned);
    });
    return;
  }
  if (input.mode === 'spellbook-prepared') {
    if (input.initialSpellbook.length !== 6) errors.push({ field: 'spellcasting.spellbook.initial', message: 'Choose exactly 6 initial spellbook spells.' });
    for (const addition of input.additions) {
      if (addition.spells.length !== 2) errors.push({ field: `spellcasting.spellbook.level-${addition.level}.additions`, message: `Choose exactly 2 spellbook additions at Class level ${addition.level}.` });
    }
    const spellbookIDs = new Set([...input.initialSpellbook, ...input.additions.flatMap((entry) => entry.spells)].map((spell) => spell.id));
    if (input.preparedSpellIds.some((id) => !spellbookIDs.has(id))) errors.push({ field: 'spellcasting.spellbook.prepared', message: 'Prepared spells must remain in the spellbook.' });
  }
};

const reconcileSpellcasting = (draft: StructuredCharacterDraft): CharacterSpellcastingInput => {
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === draft.classKey);
  const target = selectedClass?.levels.find((entry) => entry.level === draft.level)?.spellcasting;
  const mode = target?.mode ?? 'none';
  if (mode === 'none') return { mode: 'none' };
  const retained = draft.spellcasting.mode === mode ? structuredClone(draft.spellcasting) : null;
  if (mode === 'known' || mode === 'pact-known') {
    const existing = retained?.mode === mode ? retained : null;
    const knownIDs: string[] = [];
    const levels = (selectedClass?.levels ?? []).filter((entry) => entry.level <= draft.level && entry.spellcasting !== null).map((entry) => {
      const existingLevel = existing?.levels.find((decision) => decision.level === entry.level);
      const learned = retainAvailableSpellSelections(draft, existingLevel?.learned ?? [], entry.level, false);
      const replacements = (existingLevel?.replacements ?? []).filter((replacement) => {
        if (!knownIDs.includes(replacement.removeSpellId)) return false;
        return retainAvailableSpellSelections(draft, [replacement.add], entry.level, false).length === 1;
      });
      for (const replacement of replacements) {
        const position = knownIDs.indexOf(replacement.removeSpellId);
        if (position >= 0) knownIDs.splice(position, 1, replacement.add.id);
      }
      for (const spell of learned) if (!knownIDs.includes(spell.id)) knownIDs.push(spell.id);
      return { level: entry.level, learned, replacements };
    });
    return {
      mode,
      cantrips: retainAvailableSpellSelections(draft, existing?.cantrips ?? [], draft.level, true),
      levels,
    };
  }
  if (mode === 'prepared') {
    const existing = retained?.mode === 'prepared' ? retained : null;
    return {
      mode,
      cantrips: retainAvailableSpellSelections(draft, existing?.cantrips ?? [], draft.level, true),
      prepared: retainAvailableSpellSelections(draft, existing?.prepared ?? [], draft.level, false),
    };
  }
  const existing = retained?.mode === 'spellbook-prepared' ? retained : null;
  const result: CharacterSpellcastingInput = {
    mode,
    cantrips: retainAvailableSpellSelections(draft, existing?.cantrips ?? [], draft.level, true),
    initialSpellbook: retainAvailableSpellSelections(draft, existing?.initialSpellbook ?? [], 1, false),
    additions: Array.from({ length: Math.max(0, draft.level - 1) }, (_, index) => {
      const level = index + 2;
      return {
        level,
        spells: retainAvailableSpellSelections(draft, existing?.additions.find((entry) => entry.level === level)?.spells ?? [], level, false),
      };
    }),
    preparedSpellIds: existing?.preparedSpellIds ?? [],
  };
  if (result.mode === 'spellbook-prepared') {
    const spellbookIDs = new Set([...result.initialSpellbook, ...result.additions.flatMap((entry) => entry.spells)].map((spell) => spell.id));
    result.preparedSpellIds = result.preparedSpellIds.filter((id) => spellbookIDs.has(id));
  }
  return result;
};

const retainAvailableSpellSelections = (
  draft: StructuredCharacterDraft,
  spells: SpellSelectionInput[],
  acquisitionLevel: number,
  cantrip: boolean,
): SpellSelectionInput[] => {
  const available = new Set<string>(availableSpellsForDraft(draft, acquisitionLevel)
    .filter((spell) => cantrip ? spell.level === 0 : spell.level > 0)
    .map((spell) => spell.index));
  const availableSpellLevels = new Set(levelUpRules.classes.find((entry) => entry.index === draft.classKey)
    ?.levels.find((entry) => entry.level === acquisitionLevel)?.spellcasting?.availableSpellLevels ?? []);
  return spells.filter((spell) => spell.source === 'manual'
    ? (cantrip ? spell.level === 0 : availableSpellLevels.has(spell.level as never))
    : available.has(spell.index));
};

const canonicalFeatureInputs = (draft: StructuredCharacterDraft): CharacterFeatureInput[] => {
  const context = canonicalRaceContext(draft.raceKey);
  const race = characterCreationRules.races.find((entry) => entry.index === context?.raceIndex);
  const subrace = characterCreationRules.subraces.find((entry) => entry.index === context?.subraceIndex);
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === draft.classKey);
  const subclass = selectedClass?.subclasses.find((entry) => entry.index === draft.subclassKey);
  const indexes = [
    ...(race?.traitIndexes ?? []), ...(subrace?.traitIndexes ?? []),
    ...(selectedClass?.levels.filter((entry) => entry.level <= draft.level).flatMap((entry) => entry.features.map((feature) => feature.index)) ?? []),
    ...(subclass?.featuresByLevel.filter((entry) => entry.level <= draft.level).flatMap((entry) => entry.features.map((feature) => feature.index)) ?? []),
  ];
  return [...new Set(indexes)].map((index) => ({ source: 'srd', index }));
};

const selectedSkillProficiencies = (draft: StructuredCharacterDraft): CreateCharacterV2RequestDTO['proficiencies']['skills'] => {
  const ranks = new Map<string, 'proficient' | 'expertise'>();
  for (const choice of draft.ruleChoices) {
    for (const option of choice.optionIds.filter((id) => id.startsWith('skill-'))) {
      const name = option.slice('skill-'.length);
      const rank = choice.ruleId.includes('expertise') ? 'expertise' : 'proficient';
      if (rank === 'expertise' || !ranks.has(name)) ranks.set(name, rank);
    }
  }
  return [...ranks].sort(([left], [right]) => left.localeCompare(right)).map(([name, rank]) => ({ name, rank }));
};

const canonicalRaceContext = (raceKey: string) => {
  const race = characterCreationRules.races.find((entry) => entry.index === raceKey);
  if (race) return { raceIndex: race.index, subraceIndex: null as string | null };
  const subrace = characterCreationRules.subraces.find((entry) => entry.index === raceKey);
  return subrace ? { raceIndex: subrace.raceIndex, subraceIndex: subrace.index } : null;
};

const choiceOptions = (allowed: readonly string[], boundedRule: string | null): SelectOption[] => {
  const values = allowed.length > 0 ? [...allowed]
    : boundedRule === 'any-srd-skill-proficiency' ? skillOptions
      : boundedRule === 'any-srd-language-not-already-known' ? languageOptions : [];
  return values.map((value) => ({ value, label: readable(value) }));
};

const classChoiceOptions = (
  choice: (typeof levelUpRules.classes)[number]['choices'][number] | (typeof characterCreationRules.classChoices)[number],
  draft: StructuredCharacterDraft,
  activeClassChoiceIDs: ReadonlySet<string>,
): SelectOption[] => {
  if (choice.options.length > 0) {
    const activeFeatureIndexes = new Set([
      ...canonicalFeatureInputs(draft).flatMap((feature) => feature.source === 'srd' ? [feature.index] : []),
      ...draft.ruleChoices.filter((selection) => activeClassChoiceIDs.has(selection.ruleId)).flatMap((selection) => selection.optionIds),
    ]);
    return choice.options.filter((option) => {
      const minimumLevel = 'minimumLevel' in option ? option.minimumLevel ?? 1 : 1;
      const requiredFeatureIndexes = 'requiredFeatureIndexes' in option ? option.requiredFeatureIndexes ?? [] : [];
      return draft.level >= minimumLevel && requiredFeatureIndexes.every((index) => activeFeatureIndexes.has(index));
    }).map((option) => ({ value: option.index, label: option.name }));
  }
  const boundedRule = 'boundedRule' in choice ? choice.boundedRule : null;
  if (boundedRule === 'any-srd-skill-proficiency') return skillOptions.map((value) => ({ value, label: readable(value) }));
  if (boundedRule === 'ability-score-improvement-or-srd-feat') {
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    return [
      ...abilities.map((ability) => ({ value: `ability-score-increase-${ability}-2`, label: `${readable(ability)} +2` })),
      ...abilities.flatMap((first, index) => abilities.slice(index + 1).map((second) => ({
        value: `ability-score-increase-${first}-${second}-1`, label: `${readable(first)} +1 and ${readable(second)} +1`,
      }))),
      { value: 'feat-grappler', label: 'Feat: Grappler' },
    ];
  }
  return [];
};

const readable = (value: string) => value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
