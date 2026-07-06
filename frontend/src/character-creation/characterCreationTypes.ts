export type CharacterCreationMode = 'manual' | 'guided' | null;

export type CharacterCreationDraft = {
  mode: CharacterCreationMode;
  name: string;
  concept: string;
  selectedBuild: string | null;
};

export const initialCharacterCreationDraft = (): CharacterCreationDraft => ({
  mode: null,
  name: '',
  concept: '',
  selectedBuild: null,
});
