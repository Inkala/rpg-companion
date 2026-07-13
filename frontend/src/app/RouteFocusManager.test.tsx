import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteFocusManager } from './RouteFocusManager';

const FocusHarness = ({
  routeKey,
  heading = 'Destination',
  includePrimaryHeading = true,
}: {
  routeKey: string;
  heading?: string;
  includePrimaryHeading?: boolean;
}) => (
  <>
    <header>
      <h1>Hidden Hunin heading</h1>
    </header>
    <main>
      <h2>Fallback heading</h2>
      {includePrimaryHeading ? <h1>{heading}</h1> : null}
      <button type="button">Retry</button>
    </main>
    <RouteFocusManager routeKey={routeKey} />
  </>
);

describe('RouteFocusManager', () => {
  it('skips initial load and focuses the main h1 once on a route transition', () => {
    const { rerender } = render(<FocusHarness routeKey="/" />);
    const initialHeading = screen.getByRole('heading', { name: 'Destination' });
    expect(initialHeading).not.toHaveFocus();

    rerender(<FocusHarness routeKey="/parties/new" />);

    const destinationHeading = screen.getByRole('heading', { name: 'Destination' });
    expect(destinationHeading).toHaveFocus();
    expect(destinationHeading).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('heading', { name: 'Hidden Hunin heading' })).not.toHaveFocus();
  });

  it('falls back to the first h2 inside main when no h1 exists', () => {
    const { rerender } = render(
      <FocusHarness routeKey="/" includePrimaryHeading={false} />,
    );

    rerender(
      <FocusHarness routeKey="/next" includePrimaryHeading={false} />,
    );

    expect(screen.getByRole('heading', { name: 'Fallback heading' })).toHaveFocus();
  });

  it('does not steal focus for same-route loading completion or Retry updates', () => {
    const { rerender } = render(<FocusHarness routeKey="/" />);
    rerender(<FocusHarness routeKey="/parties/party-1" heading="Party" />);
    expect(screen.getByRole('heading', { name: 'Party' })).toHaveFocus();

    const retry = screen.getByRole('button', { name: 'Retry' });
    retry.focus();
    expect(retry).toHaveFocus();
    rerender(
      <FocusHarness
        routeKey="/parties/party-1"
        heading="The Lantern Guard"
      />,
    );

    expect(retry).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'The Lantern Guard' })).not.toHaveFocus();
  });
});
