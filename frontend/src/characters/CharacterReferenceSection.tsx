import { ReferenceItemRow } from './ReferenceItemRow';
import type { CharacterReferenceItem, CharacterReferenceSection as Section } from './types';

export function CharacterReferenceSection({
  section,
  isOpen,
  onToggle,
  onOpenQuickReference,
}: {
  section: Section;
  isOpen: boolean;
  onToggle: () => void;
  onOpenQuickReference: (item: CharacterReferenceItem, opener: HTMLButtonElement) => void;
}) {
  const panelId = `${section.id}-section-panel`;

  return (
    <section className="reference-section">
      <button
        type="button"
        className="section-header"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span>
          {section.label}, {section.items.length} items
        </span>
        <span className="section-state">{isOpen ? 'Expanded' : 'Collapsed'}</span>
      </button>

      {isOpen ? (
        <div id={panelId} className="section-panel">
          {section.items.map((item) => (
            <ReferenceItemRow
              key={item.id}
              item={item}
              onOpenQuickReference={onOpenQuickReference}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
