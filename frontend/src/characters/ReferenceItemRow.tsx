import type { CharacterReferenceItem } from './types';

export function ReferenceItemRow({
  item,
  onOpenQuickReference,
}: {
  item: CharacterReferenceItem;
  onOpenQuickReference: (item: CharacterReferenceItem, opener: HTMLButtonElement) => void;
}) {
  const canOpen = item.quickReference !== undefined;
  const descriptionId = `${item.id}-detail-state`;

  return (
    <button
      type="button"
      className={canOpen ? 'ability-row' : 'ability-row ability-row--future'}
      onClick={(event) => {
        if (canOpen) {
          onOpenQuickReference(item, event.currentTarget);
        }
      }}
      aria-disabled={canOpen ? undefined : 'true'}
      aria-describedby={canOpen ? undefined : descriptionId}
    >
      <span className="ability-row__main">
        <span className="ability-row__title">{item.name}</span>
        <span className="ability-row__hint">{item.hint}</span>
      </span>
      <span className="ability-row__meta" aria-label={`${item.name} metadata`}>
        {item.meta.map((meta) => (
          <span className={badgeClassName(meta)} key={meta}>
            {meta}
          </span>
        ))}
      </span>
      <span className="ability-row__affordance">
        {canOpen ? 'Quick explanation' : 'Details planned'}
      </span>
      {!canOpen ? (
        <span id={descriptionId} className="sr-only">
          Detail sheet planned for a later slice.
        </span>
      ) : null}
    </button>
  );
}

function badgeClassName(label: string) {
  if (label === 'Action') {
    return 'badge badge--action';
  }

  if (label === 'Bonus Action') {
    return 'badge badge--bonus';
  }

  if (label === 'Concentration') {
    return 'badge badge--concentration';
  }

  if (label.includes('spell')) {
    return 'badge badge--spell';
  }

  if (label === 'Passive') {
    return 'badge badge--passive';
  }

  return 'badge badge--neutral';
}
