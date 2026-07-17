import type { CharacterReferenceItem } from './types';

interface ReferenceItemRowProps {
  item: CharacterReferenceItem;
  onOpenQuickReference: (item: CharacterReferenceItem, opener: HTMLButtonElement) => void;
}

export const ReferenceItemRow = ({
  item,
  onOpenQuickReference,
}: ReferenceItemRowProps) => {
  const canOpen = item.quickReference !== undefined;
  const content = (
    <>
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
      {canOpen ? (
        <span className="ability-row__affordance">Quick explanation</span>
      ) : null}
    </>
  );

  if (canOpen) {
    return (
      <button
        type="button"
        className="ability-row"
        onClick={(event) => onOpenQuickReference(item, event.currentTarget)}
      >
        {content}
      </button>
    );
  }

  return <div className="ability-row ability-row--static">{content}</div>;
};

const badgeClassName = (label: string) => {
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
};
