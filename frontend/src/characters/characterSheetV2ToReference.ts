import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { levelUpRules } from '../rules/generated/levelUpRules';
import type {
  CharacterEquipmentInput,
  CharacterSheetV2,
  CharacterSheetV2Spell,
  RuleSelection,
  ValueProvenance,
} from './characterSheetV2';
import type {
  CharacterReferenceItem,
  CharacterReferenceSection,
  CharacterReferenceViewModel,
  HitPoints,
  QuickReferenceSheetContent,
} from './types';

const abilityNames = [
  'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
] as const;

export const characterSheetV2ToReference = (
  sheet: CharacterSheetV2,
  hitPoints: HitPoints,
): CharacterReferenceViewModel => {
  const race = resolvedRace(sheet.identity.race);
  const className = resolvedClass(sheet.identity.class);
  const subclass = sheet.identity.subclass ? resolvedSubclass(sheet.identity.subclass) : null;
  const identity = [race.base, race.subrace, `${className} ${sheet.identity.level}`, subclass]
    .filter(Boolean)
    .join(' · ');
  const supportingIdentity = [sheet.identity.gender, sheet.identity.background]
    .filter((value) => value.trim() !== '')
    .join(' · ');

  const sections: CharacterReferenceSection[] = [
    abilitySection(sheet),
    attackSection(sheet),
    featureSection(sheet),
    spellSection(sheet),
    equipmentSection(sheet),
    otherSection(sheet),
  ].filter((section) => section.items.length > 0);

  const secondary: CharacterReferenceViewModel['stats']['secondary'] = [
    { label: 'Initiative', value: signed(sheet.combat.initiative.value), emphasis: 'initiative' },
    { label: 'Passive Perception', value: String(sheet.combat.passivePerception.value), emphasis: 'perception' },
    { label: 'Proficiency', value: signed(sheet.combat.proficiencyBonus.value), emphasis: 'proficiency' },
  ];
  if (sheet.spellcasting.spellSaveDC !== null) {
    secondary.push({ label: 'Spell save DC', value: String(sheet.spellcasting.spellSaveDC.value) });
  }
  if (sheet.spellcasting.spellAttackBonus !== null) {
    secondary.push({ label: 'Spell attack bonus', value: signed(sheet.spellcasting.spellAttackBonus.value) });
  }

  return {
    name: sheet.identity.name,
    identity,
    supportingIdentity: supportingIdentity || undefined,
    stats: {
      hitPoints,
      armorClass: String(sheet.combat.armorClass.value),
      speed: `${sheet.combat.speedFt.value} ft.`,
      secondary,
    },
    sections,
  };
};

const abilitySection = (sheet: CharacterSheetV2): CharacterReferenceSection => ({
  id: 'abilities',
  label: 'Ability scores',
  defaultOpen: true,
  items: abilityNames.map((ability) => ({
    id: `ability-${ability}`,
    name: capitalize(ability),
    hint: `${sheet.abilityScores.scores[ability].value} (${signed(sheet.abilityScores.modifiers[ability])})`,
    meta: [provenanceLabel(sheet.abilityScores.scores[ability].provenance)],
  })),
});

const attackSection = (sheet: CharacterSheetV2): CharacterReferenceSection => ({
  id: 'actions',
  label: 'Attacks',
  defaultOpen: true,
  items: sheet.attacks.map((attack) => ({
    id: attack.id,
    name: attack.name,
    hint: attack.damage.map(formatDamage).join(', '),
    meta: [
      `Atk ${signed(attack.attackBonus.value)}`,
      ...attack.damage.map(formatDamage),
      provenanceLabel(attack.attackBonus.provenance),
    ],
  })),
});

const featureSection = (sheet: CharacterSheetV2): CharacterReferenceSection => ({
  id: 'features',
  label: 'Features and traits',
  defaultOpen: true,
  items: sheet.features.map((feature) => ({
    id: feature.id,
    name: feature.name,
    hint: firstSentence(feature.description),
    meta: [feature.category, feature.source === 'srd' ? `SRD ${capitalize(feature.ownerKind)}` : 'Manual', provenanceLabel(feature.provenance)],
    quickReference: descriptiveQuickReference(feature.name, feature.category, feature.description, [
      { label: 'Source', value: feature.source === 'srd' ? `SRD ${capitalize(feature.ownerKind)}` : 'Imported manual feature' },
      { label: 'Provenance', value: provenanceLabel(feature.provenance) },
    ]),
  })),
});

const spellSection = (sheet: CharacterSheetV2): CharacterReferenceSection => {
  const preparedSpellIDs = new Set(sheet.spellcasting.preparedSpellIds);
  const slotItem: CharacterReferenceItem[] = sheet.spellcasting.slots.length === 0 ? [] : [{
    id: 'spell-slots',
    name: 'Spell slots',
    hint: sheet.spellcasting.slots.map((slot) => `Level ${slot.level}: ${slot.max - slot.used}/${slot.max}`).join(' · '),
    meta: sheet.spellcasting.availableSpellLevels.map((level) => `${ordinal(level)}-level spells`),
  }];
  return {
    id: 'spells',
    label: 'Spells',
    defaultOpen: sheet.spellcasting.spells.length > 0,
    items: [...slotItem, ...sheet.spellcasting.spells.map((spell) => spellItem(spell, preparedSpellIDs))],
  };
};

const spellItem = (spell: CharacterSheetV2Spell, preparedSpellIDs: ReadonlySet<string>): CharacterReferenceItem => {
  const effectiveState = spell.state === 'spellbook' && preparedSpellIDs.has(spell.id)
    ? 'prepared'
    : spell.state;
  const state = effectiveState.split('-').map(capitalize).join(' ');
  const details = spell.higherLevelText
    ? `${spell.description}\n\nAt higher levels: ${spell.higherLevelText}`
    : spell.description;
  const components = [spell.components.join(', '), spell.materialComponent]
    .filter(Boolean)
    .join(' · ');
  const flags = [spell.concentration ? 'Concentration' : '', spell.ritual ? 'Ritual' : ''].filter(Boolean);
  return {
    id: spell.id,
    name: spell.name,
    hint: firstSentence(spell.description),
    meta: [spell.level === 0 ? 'Cantrip' : `${ordinal(spell.level)}-level`, state, spell.school, ...flags],
    quickReference: descriptiveQuickReference(spell.name, spell.level === 0 ? 'Cantrip' : `${ordinal(spell.level)}-level spell`, details, [
      { label: 'State', value: state },
      { label: 'School', value: capitalize(spell.school) },
      { label: 'Casting time', value: spell.castingTime },
      { label: 'Range', value: spell.range },
      { label: 'Duration', value: spell.duration },
      { label: 'Components', value: components },
      { label: 'Concentration', value: spell.concentration ? 'Yes' : 'No' },
      { label: 'Ritual', value: spell.ritual ? 'Yes' : 'No' },
      { label: 'Provenance', value: provenanceLabel(spell.provenance) },
    ]),
  };
};

const equipmentSection = (sheet: CharacterSheetV2): CharacterReferenceSection => ({
  id: 'equipment',
  label: 'Equipment',
  defaultOpen: false,
  items: sheet.equipment.map((entry) => equipmentItem(entry)),
});

const equipmentItem = (entry: CharacterEquipmentInput): CharacterReferenceItem => {
  if (entry.source === 'manual') {
    return {
      id: entry.id,
      name: entry.name,
      hint: `${entry.equipped ? 'Equipped' : 'Carried'} · Quantity ${entry.quantity}`,
      meta: [entry.category, 'Manual'],
    };
  }
  const equipment = characterCreationRules.equipment.find((candidate) => candidate.index === entry.index);
  const name = equipment?.name ?? entry.index;
  const details = equipmentDetails(equipment);
  return {
    id: entry.index,
    name,
    hint: `${entry.equipped ? 'Equipped' : 'Carried'} · Quantity ${entry.quantity}`,
    meta: [humanize(equipment?.categoryIndex ?? 'equipment'), 'SRD'],
    ...(details ? {
      quickReference: descriptiveQuickReference(name, 'Equipment', details, [
        { label: 'State', value: entry.equipped ? 'Equipped' : 'Carried' },
        { label: 'Quantity', value: String(entry.quantity) },
        { label: 'Category', value: humanize(equipment?.categoryIndex ?? 'equipment') },
      ]),
    } : {}),
  };
};

const otherSection = (sheet: CharacterSheetV2): CharacterReferenceSection => ({
  id: 'other',
  label: 'Other',
  defaultOpen: false,
  items: sheet.other.map((entry) => ({
    id: entry.id,
    name: entry.title,
    hint: firstSentence(entry.description),
    meta: ['Other'],
    quickReference: descriptiveQuickReference(entry.title, 'Other', entry.description, []),
  })),
});

const descriptiveQuickReference = (
  title: string,
  label: string,
  description: string,
  metadata: QuickReferenceSheetContent['metadata'],
): QuickReferenceSheetContent => ({
  title,
  label,
  summary: firstSentence(description),
  metadata,
  details: { collapsedLabel: '', expandedLabel: '', text: description },
});

const resolvedRace = (selection: RuleSelection) => {
  if (selection.source === 'manual') return { base: selection.name, subrace: '' };
  const race = characterCreationRules.races.find((candidate) => candidate.index === selection.index);
  if (race) return { base: race.name, subrace: '' };
  const subrace = characterCreationRules.subraces.find((candidate) => candidate.index === selection.index);
  const base = characterCreationRules.races.find((candidate) => candidate.index === subrace?.raceIndex)?.name;
  return { base: base ?? selection.index, subrace: subrace?.name ?? '' };
};

const resolvedClass = (selection: RuleSelection) => selection.source === 'manual'
  ? selection.name
  : levelUpRules.classes.find((candidate) => candidate.index === selection.index)?.name ?? selection.index;

const resolvedSubclass = (selection: RuleSelection) => {
  if (selection.source === 'manual') return selection.name;
  for (const classRule of levelUpRules.classes) {
    const subclass = classRule.subclasses.find((candidate) => candidate.index === selection.index);
    if (subclass) return subclass.name;
  }
  return selection.index;
};

type CanonicalEquipment = (typeof characterCreationRules.equipment)[number];

const equipmentDetails = (equipment: CanonicalEquipment | undefined) => {
  if (!equipment) return '';
  const details: string[] = [...equipment.description, ...equipment.special];
  if (equipment.armor) {
    details.push(`${equipment.armor.category} armor. Base AC ${equipment.armor.baseArmorClass}.`);
  }
  if (equipment.weapon?.damage) {
    details.push(`${equipment.weapon.damage.dice} ${equipment.weapon.damage.type} damage.`);
    if (equipment.weapon.propertyIndexes.length > 0) details.push(`Properties: ${equipment.weapon.propertyIndexes.join(', ')}.`);
  }
  if (equipment.cost) details.push(`Cost: ${equipment.cost.quantity} ${equipment.cost.unit}.`);
  if (equipment.weight !== null) details.push(`Weight: ${equipment.weight} lb.`);
  return details.join(' ');
};

const provenanceLabel = (provenance: ValueProvenance) => {
  if (provenance.kind === 'calculated') return 'Calculated';
  if (provenance.kind === 'manual-override') return 'Manual override';
  return 'Imported';
};

const formatDamage = (damage: { dice: string; bonus: number; type: string }) =>
  `${damage.dice}${damage.bonus === 0 ? '' : ` ${signed(damage.bonus)}`} ${damage.type}`;

const firstSentence = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/^.*?[.!?](?:\s|$)/s);
  return (match?.[0] ?? trimmed).trim();
};

const signed = (value: number) => value >= 0 ? `+${value}` : String(value);
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const humanize = (value: string) => value.split('-').map(capitalize).join(' ');
const ordinal = (level: number) => level === 1 ? '1st' : level === 2 ? '2nd' : level === 3 ? '3rd' : `${level}th`;
