import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PartyDetailDTO } from './apiTypes';
import { PartyPage } from './PartyPage';

const gmParty: PartyDetailDTO = {
  id: 'party-1',
  name: 'The Lantern Guard',
  role: 'gm',
  members: [
    { username: 'Mara', role: 'gm', character: null },
    {
      username: 'Bran',
      role: 'player',
      character: { id: 'character-1', name: 'Branna Shieldhand' },
    },
  ],
};

const playerParty: PartyDetailDTO = {
  ...gmParty,
  role: 'player',
};

describe('PartyPage', () => {
  it('shows a signed-out state without loading and keeps sign-in and back actions', () => {
    const loadParty = vi.fn();
    const onSignIn = vi.fn();
    const onBack = vi.fn();

    renderPage({ isSignedIn: false, loadParty, onSignIn, onBack });

    expect(screen.getByRole('heading', { name: 'Sign in to view this party' })).toBeInTheDocument();
    expect(loadParty).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onSignIn).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('loads the requested party with an accessible loading state', () => {
    const pendingLoad = deferred<PartyDetailDTO>();
    const loadParty = vi.fn().mockReturnValue(pendingLoad.promise);

    renderPage({ partyId: 'party-requested', loadParty });

    expect(screen.getByRole('status')).toHaveTextContent('Loading party...');
    expect(loadParty).toHaveBeenCalledWith('party-requested');
  });

  it('shows the Party name, current GM role, and accessible roster', async () => {
    const onOpenCharacter = vi.fn();

    renderPage({
      loadParty: vi.fn().mockResolvedValue(gmParty),
      onOpenCharacter,
    });

    expect(await screen.findByRole('heading', { name: 'The Lantern Guard' })).toBeInTheDocument();
    expect(getCurrentRoleText('Your role: GM')).toBeInTheDocument();

    const roster = screen.getByRole('list', { name: 'The Lantern Guard roster' });
    const members = within(roster).getAllByRole('listitem');
    expect(members).toHaveLength(2);

    expect(within(members[0]).getByRole('heading', { name: 'Mara' })).toBeInTheDocument();
    expect(within(members[0]).getByText('GM')).toBeInTheDocument();
    expect(within(members[0]).getByText('No character linked')).toBeInTheDocument();

    expect(within(members[1]).getByRole('heading', { name: 'Bran' })).toBeInTheDocument();
    expect(within(members[1]).getByText('Player')).toBeInTheDocument();
    expect(within(members[1]).getByText('Branna Shieldhand')).toBeInTheDocument();

    fireEvent.click(
      within(members[1]).getByRole('button', {
        name: 'Open Branna Shieldhand Character Reference',
      }),
    );
    expect(onOpenCharacter).toHaveBeenCalledWith('character-1');
  });

  it('does not let a Player open member characters', async () => {
    const onOpenCharacter = vi.fn();

    renderPage({
      loadParty: vi.fn().mockResolvedValue(playerParty),
      onOpenCharacter,
    });

    await screen.findByRole('heading', { name: 'The Lantern Guard' });
    expect(getCurrentRoleText('Your role: Player')).toBeInTheDocument();
    expect(screen.getByText('Branna Shieldhand')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Character Reference/ })).not.toBeInTheDocument();
    expect(onOpenCharacter).not.toHaveBeenCalled();
  });

  it('shows a safe generic error and retries', async () => {
    const loadParty = vi
      .fn()
      .mockRejectedValueOnce(new Error('sensitive backend details'))
      .mockResolvedValueOnce(gmParty);

    renderPage({ loadParty });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load this party. Please try again.');
    expect(alert).not.toHaveTextContent('sensitive backend details');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByRole('status')).toHaveTextContent('Loading party...');
    expect(await screen.findByRole('heading', { name: 'The Lantern Guard' })).toBeInTheDocument();
    expect(loadParty).toHaveBeenCalledTimes(2);
  });

  it('ignores a late result after signing out', async () => {
    const pendingLoad = deferred<PartyDetailDTO>();
    const props = defaultProps({ loadParty: vi.fn().mockReturnValue(pendingLoad.promise) });
    const { rerender } = render(<PartyPage {...props} />);

    rerender(<PartyPage {...props} isSignedIn={false} />);
    pendingLoad.resolve(gmParty);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in to view this party' })).toBeInTheDocument();
      expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
    });
  });

  it('ignores a late result after the Party id changes', async () => {
    const firstLoad = deferred<PartyDetailDTO>();
    const secondParty: PartyDetailDTO = {
      id: 'party-2',
      name: 'The Silver Company',
      role: 'player',
      members: [],
    };
    const loadParty = vi.fn((partyId: string) => {
      return partyId === 'party-1' ? firstLoad.promise : Promise.resolve(secondParty);
    });
    const props = defaultProps({ loadParty });
    const { rerender } = render(<PartyPage {...props} />);

    rerender(<PartyPage {...props} partyId="party-2" />);
    expect(await screen.findByRole('heading', { name: 'The Silver Company' })).toBeInTheDocument();

    firstLoad.resolve(gmParty);
    await waitFor(() => {
      expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'The Silver Company' })).toBeInTheDocument();
    });
  });

  it('hides a loaded private roster immediately when a new Party request is pending', async () => {
    const secondLoad = deferred<PartyDetailDTO>();
    const committedViews: string[] = [];
    const loadParty = vi.fn((partyId: string) => {
      return partyId === 'party-1' ? Promise.resolve(gmParty) : secondLoad.promise;
    });
    const props = defaultProps({ loadParty });

    const PartyPageCommitObserver = ({ partyId }: { partyId: string }) => {
      useLayoutEffect(() => {
        committedViews.push(document.body.textContent ?? '');
      }, [partyId]);

      return <PartyPage {...props} partyId={partyId} />;
    };

    const { rerender } = render(<PartyPageCommitObserver partyId="party-1" />);
    expect(await screen.findByRole('heading', { name: 'The Lantern Guard' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'The Lantern Guard roster' })).toBeInTheDocument();

    rerender(<PartyPageCommitObserver partyId="party-2" />);

    const partyChangeCommit = committedViews.at(-1) ?? '';
    expect(partyChangeCommit).toContain('Loading party...');
    expect(partyChangeCommit).not.toContain('The Lantern Guard');
    expect(partyChangeCommit).not.toContain('Branna Shieldhand');
    expect(screen.getByRole('status')).toHaveTextContent('Loading party...');
    expect(screen.queryByRole('list', { name: 'The Lantern Guard roster' })).not.toBeInTheDocument();
  });

  it('ignores a late result after the loader is replaced', async () => {
    const firstLoad = deferred<PartyDetailDTO>();
    const replacementParty: PartyDetailDTO = {
      id: 'party-1',
      name: 'Replacement Result',
      role: 'gm',
      members: [],
    };
    const props = defaultProps({ loadParty: vi.fn().mockReturnValue(firstLoad.promise) });
    const { rerender } = render(<PartyPage {...props} />);

    rerender(
      <PartyPage
        {...props}
        loadParty={vi.fn().mockResolvedValue(replacementParty)}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'Replacement Result' })).toBeInTheDocument();

    firstLoad.resolve(gmParty);
    await waitFor(() => {
      expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Replacement Result' })).toBeInTheDocument();
    });
  });

  it('ignores a late result after unmounting', async () => {
    const pendingLoad = deferred<PartyDetailDTO>();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderPage({
      loadParty: vi.fn().mockReturnValue(pendingLoad.promise),
    });

    unmount();
    pendingLoad.resolve(gmParty);

    await waitFor(() => {
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
    consoleErrorSpy.mockRestore();
  });
});

const renderPage = (overrides: Partial<Parameters<typeof PartyPage>[0]> = {}) => {
  return render(<PartyPage {...defaultProps(overrides)} />);
};

const defaultProps = (
  overrides: Partial<Parameters<typeof PartyPage>[0]> = {},
): Parameters<typeof PartyPage>[0] => ({
  partyId: 'party-1',
  isSignedIn: true,
  loadParty: vi.fn().mockResolvedValue(gmParty),
  onSignIn: vi.fn(),
  onBack: vi.fn(),
  onOpenCharacter: vi.fn(),
  ...overrides,
});

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

const getCurrentRoleText = (roleText: string) => {
  return screen.getByText((_, element) => {
    return element?.tagName === 'P' && element.textContent === roleText;
  });
};
