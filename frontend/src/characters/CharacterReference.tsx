import { useMemo, useState } from 'react';
import { CharacterReferenceSection } from './CharacterReferenceSection';
import { HitPointStat, Stat } from './CharacterStats';
import { QuickReferenceSheet } from './QuickReferenceSheet';
import type {
  CharacterReferenceItem,
  CharacterReferenceViewModel,
  QuickReferenceSheetContent,
} from './types';

type ActiveQuickReference = {
  content: QuickReferenceSheetContent;
  opener: HTMLButtonElement;
};

export function CharacterReference({
  character,
  onBack,
}: {
  character: CharacterReferenceViewModel;
  onBack: () => void;
}) {
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

  function toggleSection(sectionId: string) {
    setOpenSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  function openQuickReference(item: CharacterReferenceItem, opener: HTMLButtonElement) {
    if (!item.quickReference) {
      return;
    }

    setActiveQuickReference({
      content: item.quickReference,
      opener,
    });
  }

  function closeQuickReference() {
    const opener = activeQuickReference?.opener;
    setActiveQuickReference(null);
    window.setTimeout(() => {
      opener?.focus();
    }, 0);
  }

  return (
    <>
      <main className="app-shell reference-page">
        <header className="reference-nav">
          <button className="back-button" onClick={onBack}>
            Back
            <span className="sr-only"> to guest landing page</span>
          </button>
          <span className="reference-nav__label" aria-hidden="true">
            Character Reference
          </span>
        </header>

        <section className="reference-summary" aria-labelledby="reference-title">
          <p className="eyebrow">Character Reference</p>
          <h1 id="reference-title">Character Reference</h1>
          <div className="reference-identity">
            {character.portrait ? (
              <img
                className="portrait portrait--reference"
                src={character.portrait.src}
                alt={character.portrait.alt}
              />
            ) : null}
            <div>
              <h2 className="character-name reference-character">{character.name}</h2>
              <p className="identity-line">{character.identity}</p>
              {character.supportingIdentity ? (
                <p className="supporting-line">{character.supportingIdentity}</p>
              ) : null}
            </div>
          </div>

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

        <div className="reference-sections">
          {character.sections.map((section) => (
            <CharacterReferenceSection
              key={section.id}
              section={section}
              isOpen={openSections[section.id] === true}
              onToggle={() => toggleSection(section.id)}
              onOpenQuickReference={openQuickReference}
            />
          ))}
        </div>
      </main>

      {activeQuickReference ? (
        <QuickReferenceSheet
          content={activeQuickReference.content}
          onClose={closeQuickReference}
        />
      ) : null}
    </>
  );
}
