export type AbilityScoresDTO = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

export type HitPointsDTO = {
  current: number;
  max: number;
};

export type CharacterDTO = {
  id: string;
  ownerSubjectId: string | null;
  name: string;
  className: string;
  subclassName: string | null;
  level: number;
  ancestry: string;
  background: string;
  abilityScores: AbilityScoresDTO;
  hitPoints: HitPointsDTO;
  armorClass: number;
  speedFt: number;
  referencePayload: unknown;
  createdAt: string;
  updatedAt: string;
};
