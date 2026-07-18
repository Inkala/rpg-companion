import { useMemo, useState } from 'react';
import genericAvatar from '../assets/characters/generic-avatar.webp';
import { CharacterReferenceSection } from './CharacterReferenceSection';
import { HitPointStat, Stat } from './CharacterStats';
import { QuickReferenceSheet } from './QuickReferenceSheet';
import type {
  CharacterReferenceItem,
  CharacterReferenceViewModel,
  QuickReferenceSheetContent,
} from './types';
import './characters.css';

type ActiveQuickReference = {
  content: QuickReferenceSheetContent;
  opener: HTMLButtonElement;
};

interface CharacterReferenceProps {
  character: CharacterReferenceViewModel;
  onBack: () => void;
  backLabel?: string;
}

export const CharacterReference = ({
  character,
  onBack,
  backLabel = 'Back to guest landing page',
}: CharacterReferenceProps) => {
  const portrait = character.portrait ?? {
    src: genericAvatar,
    alt: 'Generic character avatar',
  };
  const defaultOpenSections = useMemo(
    () =>
      Object.fromEntries(
        character.sections.map((section) => [section.id, section.defaultOpen === true]),
      ),
    [character.sections],
  );
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(defaultOpenSections);
  const [activeQuickReference, setActiveQuickReference] =
    useState<ActiveQuickReference | null>(null);

  const toggleSection = (sectionId: string) => {
    setOpenSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  const openQuickReference = (item: CharacterReferenceItem, opener: HTMLButtonElement) => {
    if (!item.quickReference) {
      return;
    }

    setActiveQuickReference({
      content: item.quickReference,
      opener,
    });
  };

  const closeQuickReference = () => {
    const opener = activeQuickReference?.opener;
    setActiveQuickReference(null);
    window.setTimeout(() => {
      opener?.focus();
    }, 0);
  };

  return (
    <>
      <main
        className="app-shell reference-page"
        inert={activeQuickReference ? true : undefined}
      >
        <header className="reference-nav">
          <button className="back-button" onClick={onBack} aria-label={backLabel}>
            Back
          </button>
        </header>

        <section className="reference-summary" aria-labelledby="reference-title">
          <h1 id="reference-title" className="sr-only">
            Character Reference
          </h1>
          <p className="eyebrow" aria-hidden="true">
            Character Reference
          </p>
          <header className="reference-identity">
            <img
              className="portrait portrait--reference"
              src={portrait.src}
              alt={portrait.alt}
            />
            <div>
              <h2 className="character-name reference-character">{character.name}</h2>
              <p className="identity-line">{character.identity}</p>
              {character.supportingIdentity ? (
                <p className="supporting-line">{character.supportingIdentity}</p>
              ) : null}
            </div>
          </header>

          <dl className="primary-stats" aria-label="Primary stats">
            <HitPointStat hitPoints={character.stats.hitPoints} />
            <Stat label="AC" value={character.stats.armorClass} emphasis="ac" />
            <Stat label="Speed" value={character.stats.speed} />
          </dl>

          {character.stats.concentration ? (
            <p className="status-line">{character.stats.concentration}</p>
          ) : null}

          {character.stats.secondary.length > 0 ? (
            <dl className="secondary-stats" aria-label="Secondary stats">
              {character.stats.secondary.map((stat) => (
                <Stat key={stat.label} {...stat} />
              ))}
            </dl>
          ) : null}
        </section>

        <section className="reference-sections" aria-label="Character details">
          {character.sections.map((section) => (
            <CharacterReferenceSection
              key={section.id}
              section={section}
              isOpen={openSections[section.id] === true}
              onToggle={() => toggleSection(section.id)}
              onOpenQuickReference={openQuickReference}
            />
          ))}
        </section>
      </main>

      {activeQuickReference ? (
        <QuickReferenceSheet
          content={activeQuickReference.content}
          onClose={closeQuickReference}
        />
      ) : null}
    </>
  );
};
