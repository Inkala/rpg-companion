import type { CreateCharacterRequestDTO } from '../characters/apiTypes';
import type {
  AbilityScores,
  CharacterReferenceSectionConfig,
  CharacterSheetAction,
  CharacterSheetFeature,
  CharacterSheetV1,
} from '../characters/characterSheet';

export type ManualCharacterEntryDraftV1 = {
  name: string;
  className: string;
  subclassName: string;
  level: string;
  ancestry: string;
  background: string;
  concept: string;
  notes: string;
  hitPoints: {
    current: string;
    max: string;
  };
  armorClass: string;
  speedFt: string;
  proficiencyBonus: string;
  initiative: string;
  passivePerception: string;
  abilityScores: {
    strength: string;
    dexterity: string;
    constitution: string;
    intelligence: string;
    wisdom: string;
    charisma: string;
  };
  action: {
    name: string;
    actionType: string;
    attackBonus: string;
    damage: string;
    range: string;
    summary: string;
  };
  feature: {
    name: string;
    category: string;
    summary: string;
  };
};

export type ManualCharacterEntryValidationError = {
  field: string;
  message: string;
};

export type ManualCharacterCreateRequest = CreateCharacterRequestDTO & {
  referencePayload: CharacterSheetV1;
};

export type ManualCharacterEntryMapResult =
  | { ok: true; value: ManualCharacterCreateRequest }
  | { ok: false; errors: ManualCharacterEntryValidationError[] };

type ParsedManualCharacterEntryDraft = {
  name: string;
  className: string;
  subclassName: string | null;
  level: number;
  ancestry: string;
  background: string;
  concept: string;
  notes: string;
  hitPoints: {
    current: number;
    max: number;
  };
  armorClass: number;
  speedFt: number;
  proficiencyBonus: number;
  initiative: number;
  passivePerception: number | undefined;
  abilityScores: AbilityScores;
  action: ManualCharacterEntryDraftV1['action'];
  feature: ManualCharacterEntryDraftV1['feature'];
};

const abilityLabels: Record<keyof AbilityScores, string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
};

export const validateManualCharacterEntryDraft = (
  draft: ManualCharacterEntryDraftV1,
): ManualCharacterEntryValidationError[] => {
  return parseManualCharacterEntryDraft(draft).errors;
};

export const buildManualCharacterCreateRequest = (
  draft: ManualCharacterEntryDraftV1,
): ManualCharacterEntryMapResult => {
  const parsedDraft = parseManualCharacterEntryDraft(draft);

  if (parsedDraft.errors.length > 0 || !parsedDraft.value) {
    return { ok: false, errors: parsedDraft.errors };
  }

  const referencePayload = buildManualCharacterSheet(parsedDraft.value);

  return {
    ok: true,
    value: {
      name: parsedDraft.value.name,
      className: parsedDraft.value.className,
      subclassName: parsedDraft.value.subclassName,
      level: parsedDraft.value.level,
      ancestry: parsedDraft.value.ancestry,
      background: parsedDraft.value.background,
      abilityScores: parsedDraft.value.abilityScores,
      hitPoints: parsedDraft.value.hitPoints,
      armorClass: parsedDraft.value.armorClass,
      speedFt: parsedDraft.value.speedFt,
      referencePayload,
    },
  };
};

const parseManualCharacterEntryDraft = (
  draft: ManualCharacterEntryDraftV1,
): {
  value: ParsedManualCharacterEntryDraft | null;
  errors: ManualCharacterEntryValidationError[];
} => {
  const errors: ManualCharacterEntryValidationError[] = [];
  const name = requireText(draft.name, 'name', 'Name', errors);
  const className = requireText(draft.className, 'className', 'Class', errors);
  const ancestry = requireText(draft.ancestry, 'ancestry', 'Ancestry', errors);
  const background = requireText(draft.background, 'background', 'Background', errors);
  const level = parseRequiredInteger(draft.level, 'level', 'Level', errors);
  const hitPointsCurrent = parseRequiredInteger(
    draft.hitPoints.current,
    'hitPoints.current',
    'Current HP',
    errors,
  );
  const hitPointsMax = parseRequiredInteger(
    draft.hitPoints.max,
    'hitPoints.max',
    'Maximum HP',
    errors,
  );
  const armorClass = parseRequiredInteger(
    draft.armorClass,
    'armorClass',
    'Armor Class',
    errors,
  );
  const speedFt = parseRequiredInteger(draft.speedFt, 'speedFt', 'Speed', errors);
  const proficiencyBonus = parseRequiredInteger(
    draft.proficiencyBonus,
    'proficiencyBonus',
    'Proficiency bonus',
    errors,
  );
  const initiative = parseOptionalInteger(draft.initiative, 'initiative', 'Initiative', errors);
  const passivePerception = parseOptionalInteger(
    draft.passivePerception,
    'passivePerception',
    'Passive Perception',
    errors,
  );
  const abilityScores = parseAbilityScores(draft, errors);

  if (level !== null && (level < 1 || level > 20)) {
    errors.push({ field: 'level', message: 'Level must be between 1 and 20.' });
  }
  if (hitPointsCurrent !== null && hitPointsCurrent < 0) {
    errors.push({
      field: 'hitPoints.current',
      message: 'Current HP must be non-negative.',
    });
  }
  if (hitPointsMax !== null && hitPointsMax < 0) {
    errors.push({ field: 'hitPoints.max', message: 'Maximum HP must be non-negative.' });
  }
  if (
    hitPointsCurrent !== null &&
    hitPointsMax !== null &&
    hitPointsCurrent > hitPointsMax
  ) {
    errors.push({
      field: 'hitPoints.current',
      message: 'Current HP must be less than or equal to maximum HP.',
    });
  }
  if (armorClass !== null && armorClass < 0) {
    errors.push({ field: 'armorClass', message: 'Armor Class must be non-negative.' });
  }
  if (speedFt !== null && speedFt < 0) {
    errors.push({ field: 'speedFt', message: 'Speed must be non-negative.' });
  }
  if (proficiencyBonus !== null && proficiencyBonus < 0) {
    errors.push({
      field: 'proficiencyBonus',
      message: 'Proficiency bonus must be non-negative.',
    });
  }

  if (
    errors.length > 0 ||
    !name ||
    !className ||
    !ancestry ||
    !background ||
    level === null ||
    hitPointsCurrent === null ||
    hitPointsMax === null ||
    armorClass === null ||
    speedFt === null ||
    proficiencyBonus === null ||
    !abilityScores
  ) {
    return { value: null, errors };
  }

  return {
    errors,
    value: {
      name,
      className,
      subclassName: optionalText(draft.subclassName),
      level,
      ancestry,
      background,
      concept: optionalText(draft.concept) ?? '',
      notes: optionalText(draft.notes) ?? '',
      hitPoints: {
        current: hitPointsCurrent,
        max: hitPointsMax,
      },
      armorClass,
      speedFt,
      proficiencyBonus,
      initiative: initiative ?? 0,
      passivePerception: passivePerception ?? undefined,
      abilityScores,
      action: draft.action,
      feature: draft.feature,
    },
  };
};

const parseAbilityScores = (
  draft: ManualCharacterEntryDraftV1,
  errors: ManualCharacterEntryValidationError[],
): AbilityScores | null => {
  const parsedScores: Partial<AbilityScores> = {};

  Object.entries(abilityLabels).forEach(([ability, label]) => {
    const key = ability as keyof AbilityScores;
    const field = `abilityScores.${key}`;
    const score = parseRequiredInteger(draft.abilityScores[key], field, label, errors);

    if (score === null) {
      return;
    }
    if (score < 1 || score > 30) {
      errors.push({
        field,
        message: `${label} must be between 1 and 30.`,
      });
      return;
    }

    parsedScores[key] = score;
  });

  const hasEveryScore = Object.keys(abilityLabels).every(
    (ability) => parsedScores[ability as keyof AbilityScores] !== undefined,
  );

  return hasEveryScore ? parsedScores as AbilityScores : null;
};

const buildManualCharacterSheet = (
  draft: ParsedManualCharacterEntryDraft,
): CharacterSheetV1 => {
  const actions = buildManualActions(draft);
  const features = buildManualFeatures(draft);
  const referenceSections = buildReferenceSections(actions, features);
  const displayLine = `${draft.ancestry} ${draft.className} - Level ${draft.level}`;
  const supportingLine = [
    draft.subclassName,
    draft.background,
  ].filter(Boolean).join(' - ') || draft.background;

  return {
    schemaVersion: 'CharacterSheetV1',
    ruleset: {
      system: 'dnd5e',
      version: '2014',
      sourceStatus: 'needs-audit',
    },
    identity: {
      name: draft.name,
      ancestry: draft.ancestry,
      background: draft.background,
      classes: [
        {
          name: draft.className,
          level: draft.level,
          ...(draft.subclassName ? { subclass: draft.subclassName } : {}),
        },
      ],
      ...(draft.concept ? { concept: draft.concept } : {}),
    },
    summary: {
      displayLine,
      supportingLine,
      landingConcept:
        draft.concept || 'Manual character transferred from an existing sheet.',
      featuredAbilities: [
        ...actions.map((action) => action.name),
        ...features.map((feature) => feature.name),
      ],
      referenceSections,
    },
    abilities: {
      scores: draft.abilityScores,
    },
    combat: {
      hitPoints: {
        current: draft.hitPoints.current,
        max: draft.hitPoints.max,
        temporary: 0,
      },
      armorClass: {
        value: draft.armorClass,
      },
      initiative: draft.initiative,
      speed: [
        {
          type: 'walk',
          feet: draft.speedFt,
        },
      ],
      proficiencyBonus: draft.proficiencyBonus,
      passivePerception: {
        value: draft.passivePerception,
        needsConfirmation: draft.passivePerception === undefined,
      },
      concentration: null,
    },
    proficiencies: {
      savingThrows: { values: [] },
      skills: [],
      weapons: { values: [] },
      armor: { values: [] },
      tools: { values: [] },
      languages: { values: [] },
    },
    actions,
    features,
    spellcasting: null,
    equipment: {
      armor: { values: [] },
      weapons: [],
      packsAndGear: { values: [] },
      tools: { values: [] },
      languages: { values: [] },
      currency: null,
    },
    personality: {
      traits: [],
      ideals: [],
      bonds: [],
      flaws: [],
      notes: draft.notes ? [draft.notes] : [],
    },
    audit: {
      source: 'Manual character entry',
      needsConfirmation: [
        'Manual entry stores player-entered sheet facts without full D&D legality validation.',
      ],
      rulesVersionWarnings: [],
      deferredCorrections: [
        'Spells, full equipment, full skill grid, and full saves grid are deferred.',
      ],
    },
  };
};

const buildManualActions = (
  draft: ParsedManualCharacterEntryDraft,
): CharacterSheetAction[] => {
  const name = optionalText(draft.action.name);

  if (!name) {
    return [];
  }

  const actionType = optionalText(draft.action.actionType) ?? 'Action';
  const attackBonus = parseOptionalIntegerValue(draft.action.attackBonus);
  const damage = optionalText(draft.action.damage);
  const range = optionalText(draft.action.range);
  const summary = optionalText(draft.action.summary) ?? 'Manual action from existing sheet.';
  const meta = [
    actionType,
    attackBonus === undefined ? null : `${formatSignedNumber(attackBonus)} to hit`,
    damage,
    range,
  ].filter((value): value is string => Boolean(value));

  return [
    {
      id: `manual-action-${slugify(name)}`,
      name,
      kind: 'attack',
      section: 'actions',
      actionType,
      ...(attackBonus === undefined ? {} : { attackBonus }),
      summary,
      meta,
    },
  ];
};

const buildManualFeatures = (
  draft: ParsedManualCharacterEntryDraft,
): CharacterSheetFeature[] => {
  const name = optionalText(draft.feature.name);

  if (!name) {
    return [];
  }

  const category = optionalText(draft.feature.category) ?? 'Manual note';
  const summary = optionalText(draft.feature.summary) ?? 'Manual feature from existing sheet.';

  return [
    {
      id: `manual-feature-${slugify(name)}`,
      name,
      category,
      source: {
        rulesVersion: '2014',
        status: 'needs-confirmation',
        note: 'Entered manually from an existing sheet.',
      },
      tags: [],
      summary,
      includeInReference: true,
    },
  ];
};

const buildReferenceSections = (
  actions: CharacterSheetAction[],
  features: CharacterSheetFeature[],
): CharacterReferenceSectionConfig[] => {
  const sections: CharacterReferenceSectionConfig[] = [];

  if (actions.length > 0) {
    sections.push({
      id: 'actions',
      label: 'Actions',
      defaultOpen: true,
    });
  }

  if (features.length > 0) {
    sections.push({
      id: 'features',
      label: 'Features',
      defaultOpen: actions.length === 0,
    });
  }

  return sections;
};

const requireText = (
  value: string,
  field: string,
  label: string,
  errors: ManualCharacterEntryValidationError[],
) => {
  const trimmed = value.trim();

  if (trimmed === '') {
    errors.push({ field, message: `${label} is required.` });
    return null;
  }

  return trimmed;
};

const optionalText = (value: string) => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const parseRequiredInteger = (
  value: string,
  field: string,
  label: string,
  errors: ManualCharacterEntryValidationError[],
) => {
  const trimmed = value.trim();

  if (trimmed === '') {
    errors.push({ field, message: `${label} is required.` });
    return null;
  }

  const parsed = parseOptionalIntegerValue(trimmed);
  if (parsed === undefined) {
    errors.push({ field, message: `${label} must be a number.` });
    return null;
  }

  return parsed;
};

const parseOptionalInteger = (
  value: string,
  field: string,
  label: string,
  errors: ManualCharacterEntryValidationError[],
) => {
  const trimmed = value.trim();

  if (trimmed === '') {
    return null;
  }

  const parsed = parseOptionalIntegerValue(trimmed);
  if (parsed === undefined) {
    errors.push({ field, message: `${label} must be a number.` });
    return null;
  }

  return parsed;
};

const parseOptionalIntegerValue = (value: string) => {
  const trimmed = value.trim();

  if (!/^[+-]?\d+$/.test(trimmed)) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
};

const formatSignedNumber = (value: number) => {
  return value >= 0 ? `+${value}` : String(value);
};

const slugify = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'entry';
};
