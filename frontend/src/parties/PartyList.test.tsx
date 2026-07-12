import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PartySummaryDTO } from './apiTypes';
import { PartyList } from './PartyList';

const parties: PartySummaryDTO[] = [
  { id: 'party-1', name: 'The Lantern Guard', role: 'gm' },
  { id: 'party-2', name: 'The Silver Company', role: 'player' },
];

describe('PartyList', () => {
  it('shows the signed-out state without loading parties', () => {
    const loadParties = vi.fn();
    const onSignIn = vi.fn();

    renderList({ isSignedIn: false, loadParties, onSignIn });

    expect(screen.getByRole('heading', { name: 'Sign in to see your parties' })).toBeInTheDocument();
    expect(loadParties).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledOnce();
  });

  it('shows an accessible loading state', () => {
    const pendingLoad = deferred<PartySummaryDTO[]>();

    renderList({ loadParties: vi.fn().mockReturnValue(pendingLoad.promise) });

    expect(screen.getByRole('heading', { name: 'My parties' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading your parties...');
  });

  it('shows the empty state with create and join actions', async () => {
    const onCreateParty = vi.fn();
    const onJoinParty = vi.fn();

    renderList({
      loadParties: vi.fn().mockResolvedValue([]),
      onCreateParty,
      onJoinParty,
    });

    expect(await screen.findByRole('heading', { name: 'No parties yet' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('You have not joined a party yet.');

    fireEvent.click(screen.getByRole('button', { name: 'Create party' }));
    fireEvent.click(screen.getByRole('button', { name: 'Join party' }));

    expect(onCreateParty).toHaveBeenCalledOnce();
    expect(onJoinParty).toHaveBeenCalledOnce();
  });

  it('renders accessible Party cards with textual roles and opens by id', async () => {
    const onOpenParty = vi.fn();

    renderList({
      loadParties: vi.fn().mockResolvedValue(parties),
      onOpenParty,
    });

    const partyList = await screen.findByRole('list', { name: 'Your parties' });
    const partyCards = within(partyList).getAllByRole('listitem');
    expect(partyCards).toHaveLength(2);

    expect(within(partyCards[0]).getByRole('heading', { name: 'The Lantern Guard' })).toBeInTheDocument();
    expect(within(partyCards[0]).getByText('GM')).toBeInTheDocument();
    expect(within(partyCards[1]).getByRole('heading', { name: 'The Silver Company' })).toBeInTheDocument();
    expect(within(partyCards[1]).getByText('Player')).toBeInTheDocument();

    fireEvent.click(within(partyCards[1]).getByRole('button', { name: 'Open The Silver Company' }));
    expect(onOpenParty).toHaveBeenCalledWith('party-2');
  });

  it('shows a safe recoverable error and retries the load', async () => {
    const loadParties = vi
      .fn()
      .mockRejectedValueOnce(new Error('sensitive backend details'))
      .mockResolvedValueOnce([parties[0]]);

    renderList({ loadParties });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load your parties. Please try again.');
    expect(alert).not.toHaveTextContent('sensitive backend details');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByRole('status')).toHaveTextContent('Loading your parties...');
    expect(await screen.findByRole('heading', { name: 'The Lantern Guard' })).toBeInTheDocument();
    expect(loadParties).toHaveBeenCalledTimes(2);
  });

  it('ignores a late result after changing to signed out', async () => {
    const pendingLoad = deferred<PartySummaryDTO[]>();
    const props = defaultProps({ loadParties: vi.fn().mockReturnValue(pendingLoad.promise) });
    const { rerender } = render(<PartyList {...props} />);

    rerender(<PartyList {...props} isSignedIn={false} />);
    expect(screen.getByRole('heading', { name: 'Sign in to see your parties' })).toBeInTheDocument();

    pendingLoad.resolve([parties[0]]);

    await waitFor(() => {
      expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Sign in to see your parties' })).toBeInTheDocument();
    });
  });

  it('ignores a late result after unmounting', async () => {
    const pendingLoad = deferred<PartySummaryDTO[]>();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderList({
      loadParties: vi.fn().mockReturnValue(pendingLoad.promise),
    });

    unmount();
    pendingLoad.resolve([parties[0]]);

    await waitFor(() => {
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
    consoleErrorSpy.mockRestore();
  });
});

const renderList = (overrides: Partial<Parameters<typeof PartyList>[0]> = {}) => {
  return render(<PartyList {...defaultProps(overrides)} />);
};

const defaultProps = (
  overrides: Partial<Parameters<typeof PartyList>[0]> = {},
): Parameters<typeof PartyList>[0] => ({
  isSignedIn: true,
  loadParties: vi.fn().mockResolvedValue([]),
  onSignIn: vi.fn(),
  onCreateParty: vi.fn(),
  onJoinParty: vi.fn(),
  onOpenParty: vi.fn(),
  ...overrides,
});

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};
