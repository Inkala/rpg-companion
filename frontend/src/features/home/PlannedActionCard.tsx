interface PlannedActionCardProps {
  label: string;
  helper?: string;
  variant?: 'primary' | 'secondary' | 'quiet';
}

export const PlannedActionCard = ({
  label,
  helper,
  variant = 'secondary',
}: PlannedActionCardProps) => {
  const buttonClassName =
    variant === 'quiet'
      ? 'future-link'
      : `button button--${variant} future-button`;

  return (
    <div className="future-entry">
      <button
        type="button"
        className={buttonClassName}
        aria-disabled="true"
        aria-describedby="future-entry-description"
      >
        <span>{label}</span>
        <span className="future-tag" aria-hidden="true">
          Planned
        </span>
      </button>
      {helper ? <p className="future-help">{helper}</p> : null}
    </div>
  );
};

const futureActionDescription =
  'Planned for a later slice. This control is visible for product context but is not available yet.';

export const PlannedActionDescription = () => {
  return (
    <p id="future-entry-description" className="sr-only">
      {futureActionDescription}
    </p>
  );
};
