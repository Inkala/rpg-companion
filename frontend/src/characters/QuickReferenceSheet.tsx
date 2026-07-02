import { useEffect, useRef, useState } from 'react';
import type { QuickReferenceSheetContent } from './types';

export function QuickReferenceSheet({
  content,
  onClose,
}: {
  content: QuickReferenceSheetContent;
  onClose: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `${content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sheet-title`;
  const summaryId = `${content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sheet-summary`;
  const detailsId = `${content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-more-details`;
  const reminderId = `${content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-remember-heading`;

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
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
    }

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
        <div className="sheet-handle" aria-hidden="true" />

        <div className="sheet-header">
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
        </div>

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

        {content.reminder ? (
          <section className="reminder-block" aria-labelledby={reminderId}>
            <h3 id={reminderId}>{content.reminder.heading}</h3>
            <p>{content.reminder.text}</p>
          </section>
        ) : null}

        {content.details ? (
          <div className="details-block">
            <button
              type="button"
              className="details-toggle"
              aria-expanded={isExpanded}
              aria-controls={detailsId}
              onClick={() => setIsExpanded((current) => !current)}
            >
              {isExpanded ? content.details.expandedLabel : content.details.collapsedLabel}
            </button>

            {isExpanded ? (
              <p id={detailsId} className="details-copy">
                {content.details.text}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled'));
}
