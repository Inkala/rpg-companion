import { CharacterSummaryCard } from './CharacterSummaryCard';
import { maraSummaryCharacter } from './maraReference';
import './characters.css';

interface SampleCharacterCardProps {
  onExploreCharacter: () => void;
}

export const SampleCharacterCard = ({ onExploreCharacter }: SampleCharacterCardProps) => {
  return (
    <section className="demo-section" aria-labelledby="sample-character-title">
      <p className="eyebrow" id="sample-character-title">Sample character</p>

      <CharacterSummaryCard
        character={maraSummaryCharacter}
        onExpand={onExploreCharacter}
      />
    </section>
  );
};
