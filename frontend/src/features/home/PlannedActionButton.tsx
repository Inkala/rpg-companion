import * as Tooltip from '@radix-ui/react-tooltip';

interface PlannedActionButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'quiet';
}

export const PlannedActionButton = ({
  label,
  variant = 'secondary',
}: PlannedActionButtonProps) => {
  const buttonClassName =
    variant === 'quiet'
      ? 'future-link'
      : `button button--${variant} future-button`;

  return (
    <div className="future-entry">
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              className={buttonClassName}
              aria-disabled="true"
              aria-describedby="future-entry-description"
              onClick={(event) => event.preventDefault()}
            >
              {label}
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="tooltip" sideOffset={8}>
              Coming soon
              <Tooltip.Arrow className="tooltip__arrow" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
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
