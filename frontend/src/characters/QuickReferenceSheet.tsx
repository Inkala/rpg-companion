import { useEffect, useRef } from 'react';
import type { QuickReferenceSheetContent } from './types';

interface QuickReferenceSheetProps {
  content: QuickReferenceSheetContent;
  onClose: () => void;
}

export const QuickReferenceSheet = ({
  content,
  onClose,
}: QuickReferenceSheetProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `${content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sheet-title`;
  const summaryId = `${content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sheet-summary`;
  const descriptionId = `${content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-description-heading`;

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || dialogRef.current === null) {
        return;
      }

      const focusable = getFocusableElements(dialogRef.current);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="sheet-layer" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={summaryId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Quick reference</p>
            <h2 id={titleId}>
              {content.title}
              <span className="sr-only"> quick reference</span>
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            className="sheet-close"
            type="button"
            onClick={onClose}
            aria-label={`Close ${content.title} quick reference`}
          >
            Close
          </button>
        </header>

        <span className="badge badge--feature">{content.label}</span>

        <p id={summaryId} className="sheet-summary">
          {content.summary}
        </p>

        <dl className="sheet-meta" aria-label={`${content.title} details`}>
          {content.metadata.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        {content.reminder || content.details ? (
          <section className="reminder-block" aria-labelledby={descriptionId}>
            <h3 id={descriptionId}>Description</h3>
            {content.reminder ? <p>{content.reminder.text}</p> : null}
            {content.details ? (
              <p className="details-copy">{content.details.text}</p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
};

const getFocusableElements = (container: HTMLElement) => {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled'));
};
