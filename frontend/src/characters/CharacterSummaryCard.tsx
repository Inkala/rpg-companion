import genericAvatar from '../assets/characters/generic-avatar.webp';
import { HitPointStat, Stat } from './CharacterStats';
import type { CharacterSummaryDTO } from './apiTypes';
import { maraPortraits } from './maraReference';
import './characters.css';

interface CharacterSummaryCardProps {
  character: CharacterSummaryDTO;
  onExpand: () => void;
}

const genericAvatarAlt = 'Generic character avatar';

export const CharacterSummaryCard = ({
  character,
  onExpand,
}: CharacterSummaryCardProps) => {
  const portrait = resolvePortrait(character);
  const titleId = `character-summary-${character.id}`;
  const classReference = `${character.className} reference`;
  const identity = `${character.ancestry} ${character.className} - Level ${character.level}`;

  return (
    <article className="sample-card character-card" aria-labelledby={titleId}>
      <header className="sample-card__identity character-card__identity">
        <div className="sample-card__summary">
          <img
            className="portrait portrait--landing"
            src={portrait.src}
            alt={portrait.alt}
          />
          <div>
            <p className="eyebrow">{classReference}</p>
            <h3 id={titleId} className="character-name">
              {character.name}
            </h3>
            <p className="identity-line">{identity}</p>
          </div>
        </div>
        <button
          className="button button--primary sample-card__action"
          type="button"
          onClick={onExpand}
        >
          Expand
        </button>
      </header>

      <dl className="landing-stat-strip" aria-label={`${character.name} quick stats`}>
        <HitPointStat hitPoints={character.hitPoints} />
        <Stat label="AC" value={String(character.armorClass)} emphasis="ac" />
        <Stat label="Speed" value={`${character.speedFt} ft.`} />
      </dl>

      {(character.featuredAbilities?.length ?? 0) > 0 ? (
        <ul className="badge-row" aria-label="Featured abilities">
          {character.featuredAbilities?.map((ability) => (
            <li key={ability}>
              <span className="badge badge--neutral">{ability}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {character.landingConcept ? (
        <p className="preview-note">{character.landingConcept}</p>
      ) : null}
    </article>
  );
};

const resolvePortrait = (character: CharacterSummaryDTO) => {
  if (character.portraitAssetId === 'mara-vale-portrait') {
    return {
      src: maraPortraits['mara-vale-portrait'].src,
      alt: character.portraitAlt ?? maraPortraits['mara-vale-portrait'].alt,
    };
  }

  return {
    src: genericAvatar,
    alt: genericAvatarAlt,
  };
};
