export type CharacterCreationMode = 'manual' | 'guided' | null;

export type CharacterBuildId =
  | 'strength-melee-fighter'
  | 'dexterity-archer-fighter';

export type FantasyBucket =
  | 'strengthMelee'
  | 'dexterityArcher'
  | 'futureMagic'
  | 'futureHealingSupport'
  | 'futureStealthTrickery'
  | 'futureSocialCleverChaos';

export type UnsupportedFantasyBucket = Exclude<
  FantasyBucket,
  'strengthMelee' | 'dexterityArcher'
>;

export type FantasyBucketScores = Record<FantasyBucket, number>;

export type CharacterCreationDraft = {
  mode: CharacterCreationMode;
  name: string;
  concept: string;
  questionnaireAnswers: Record<string, string>;
  fantasyBucketScores: FantasyBucketScores;
  unsupportedFantasyBuckets: UnsupportedFantasyBucket[];
  recommendedBuild: CharacterBuildId | null;
  selectedBuild: CharacterBuildId | null;
  recommendationWasOverridden: boolean;
};

export const initialFantasyBucketScores = (): FantasyBucketScores => ({
  strengthMelee: 0,
  dexterityArcher: 0,
  futureMagic: 0,
  futureHealingSupport: 0,
  futureStealthTrickery: 0,
  futureSocialCleverChaos: 0,
});

export const initialCharacterCreationDraft = (): CharacterCreationDraft => ({
  mode: null,
  name: '',
  concept: '',
  questionnaireAnswers: {},
  fantasyBucketScores: initialFantasyBucketScores(),
  unsupportedFantasyBuckets: [],
  recommendedBuild: null,
  selectedBuild: null,
  recommendationWasOverridden: false,
});
