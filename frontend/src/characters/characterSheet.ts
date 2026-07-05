import type { QuickReferenceSheetContent } from './types';

export type DndRulesetVersion = '2014' | '2024' | 'mixed' | 'unknown';

export type CharacterSheetV1 = {
  schemaVersion: 'CharacterSheetV1';
  ruleset: CharacterSheetRuleset;
  identity: CharacterSheetIdentity;
  summary: CharacterSheetSummary;
  abilities: CharacterSheetAbilities;
  combat: CharacterSheetCombat;
  proficiencies: CharacterSheetProficiencies;
  actions: CharacterSheetAction[];
  features: CharacterSheetFeature[];
  spellcasting: CharacterSheetSpellcasting | null;
  equipment: CharacterSheetEquipment;
  personality: CharacterSheetPersonality;
  audit: CharacterSheetAudit;
};

export type CharacterSheetRuleset = {
  system: 'dnd5e';
  version: DndRulesetVersion;
  sourceStatus: 'draft' | 'audited-sample' | 'needs-audit';
};

export type CharacterSheetIdentity = {
  name: string;
  ancestry: string;
  background: string;
  alignment?: string;
  classes: CharacterClassEntry[];
  concept?: string;
};

export type CharacterClassEntry = {
  name: string;
  level: number;
  subclass?: string;
};

export type CharacterSheetSummary = {
  displayLine: string;
  supportingLine?: string;
  landingConcept: string;
  portraitAssetId?: string;
  portraitAlt?: string;
  featuredAbilities: string[];
  referenceSections: CharacterReferenceSectionConfig[];
};

export type CharacterReferenceSectionConfig = {
  id: 'actions' | 'features' | 'spells';
  label: string;
  defaultOpen: boolean;
};

export type CharacterSheetAbilities = {
  scores: AbilityScores;
};

export type AbilityScores = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

export type CharacterSheetCombat = {
  hitPoints: {
    current: number;
    max: number;
    temporary: number;
  };
  armorClass: AuditedNumber;
  initiative: number;
  speed: CharacterSpeed[];
  proficiencyBonus: number;
  passivePerception: AuditedNumber;
  concentration: string | null;
};

export type AuditedNumber = {
  value?: number;
  needsConfirmation?: boolean;
  note?: string;
};

export type CharacterSpeed = {
  type: 'walk';
  feet: number;
};

export type CharacterSheetProficiencies = {
  savingThrows: AuditedTextList;
  skills: CharacterSkill[];
  weapons: AuditedTextList;
  armor: AuditedTextList;
  tools: AuditedTextList;
  languages: AuditedTextList;
};

export type AuditedTextList = {
  values: string[];
  needsConfirmation?: boolean;
  note?: string;
};

export type CharacterSkill = {
  name: string;
  proficient: boolean;
  modifier: number;
  needsConfirmation?: boolean;
  note?: string;
};

export type CharacterSheetAction = {
  id: string;
  name: string;
  kind: 'attack' | 'ability' | 'spell';
  section: 'actions';
  actionType: string;
  attackBonus?: number;
  damage?: CharacterDamage[];
  range?: {
    normal: number;
    long: number;
  };
  summary: string;
  meta: string[];
  quickReference?: QuickReferenceSheetContent;
};

export type CharacterDamage = {
  dice: string;
  bonus: number;
  type: string;
};

export type CharacterSheetFeature = {
  id: string;
  name: string;
  category: string;
  source: CharacterFeatureSource;
  tags: string[];
  summary: string;
  includeInReference: boolean;
  quickReference?: QuickReferenceSheetContent;
};

export type CharacterFeatureSource = {
  rulesVersion: DndRulesetVersion;
  status: 'confirmed' | 'needs-confirmation' | 'deferred';
  note?: string;
};

export type CharacterSheetSpellcasting = {
  ability: 'wisdom' | 'intelligence' | 'charisma';
  spellSaveDC: AuditedNumber | null;
  spellAttackBonus: AuditedNumber | null;
  slots: CharacterSpellSlot[];
  spells: CharacterSheetSpell[];
};

export type CharacterSpellSlot = {
  level: number;
  max: number;
  used: number;
};

export type CharacterSheetSpell = {
  id: string;
  name: string;
  level: number;
  actionType: string;
  castingTime: string;
  duration: string;
  concentration: boolean;
  summary: string;
  meta: string[];
  preparedOrKnown: 'prepared' | 'known';
  source: CharacterFeatureSource;
  quickReference?: QuickReferenceSheetContent;
};

export type CharacterSheetEquipment = {
  armor: AuditedTextList;
  weapons: string[];
  packsAndGear: AuditedTextList;
  tools: AuditedTextList;
  languages: AuditedTextList;
  currency: {
    cp?: number;
    sp?: number;
    ep?: number;
    gp?: number;
    pp?: number;
    needsConfirmation?: boolean;
    note?: string;
  } | null;
};

export type CharacterSheetPersonality = {
  traits: string[];
  ideals: string[];
  bonds: string[];
  flaws: string[];
  notes: string[];
};

export type CharacterSheetAudit = {
  source: string;
  needsConfirmation: string[];
  rulesVersionWarnings: string[];
  deferredCorrections: string[];
};
