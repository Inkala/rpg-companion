export type HitPoints = {
  current: number;
  max: number;
};

export type CharacterReferenceStat = {
  label: string;
  value: string;
  emphasis?: 'ac';
};

export type CharacterReferencePortrait = {
  src: string;
  alt: string;
};

export type QuickReferenceSheetContent = {
  title: string;
  label: string;
  summary: string;
  metadata: Array<{
    label: string;
    value: string;
  }>;
  reminder?: {
    heading: string;
    text: string;
  };
  details?: {
    collapsedLabel: string;
    expandedLabel: string;
    text: string;
  };
};

export type CharacterReferenceItem = {
  id: string;
  name: string;
  hint: string;
  meta: string[];
  quickReference?: QuickReferenceSheetContent;
};

export type CharacterReferenceSection = {
  id: string;
  label: string;
  defaultOpen?: boolean;
  items: CharacterReferenceItem[];
};

export type CharacterReferenceViewModel = {
  name: string;
  identity: string;
  supportingIdentity?: string;
  portrait?: CharacterReferencePortrait;
  stats: {
    hitPoints: HitPoints;
    armorClass: string;
    speed: string;
    concentration?: string;
    secondary: CharacterReferenceStat[];
  };
  sections: CharacterReferenceSection[];
};
