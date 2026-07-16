import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PartySummaryDTO } from './apiTypes';
import { PartyList } from './PartyList';

const parties: PartySummaryDTO[] = [
  {
    id: 'party/one',
    name: 'Ash & Ivy Pact With A Deliberately Long Quest Board Name',
    role: 'gm',
    gm: { username: 'nerea-sol-with-a-long-username' },
    linkedCharacters: [
      { characterName: 'Nim of the Very Long Woodland Trail', username: 'nim-player' },
      { characterName: 'Keth', username: 'keth-lantern-with-a-long-username' },
      { characterName: 'Ori Willowmark', username: 'ori_w' },
    ],
  },
  {
    id: 'party-2',
    name: 'The Silver Company',
    role: 'player',
    gm: { username: 'silver-gm' },
    linkedCharacters: [],
  },
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

  it('shows the exact authenticated empty card with create and join actions', async () => {
    const onCreateParty = vi.fn();
    const onJoinParty = vi.fn();

    const { container } = renderList({
      loadParties: vi.fn().mockResolvedValue([]),
      onCreateParty,
      onJoinParty,
    });

    const message = await screen.findByText('You have not joined a party yet.');
    const emptyCard = message.closest('.party-list__empty');
    expect(emptyCard).not.toBeNull();
    expect(emptyCard).toHaveClass('party-list__empty');
    expect(within(emptyCard as HTMLElement).queryByRole('heading')).not.toBeInTheDocument();
    expect(within(emptyCard as HTMLElement).getAllByRole('button')).toHaveLength(2);
    expect(container).not.toHaveTextContent('No parties yet');

    fireEvent.click(screen.getByRole('button', { name: 'Create party' }));
    fireEvent.click(screen.getByRole('button', { name: 'Join party' }));

    expect(onCreateParty).toHaveBeenCalledOnce();
    expect(onJoinParty).toHaveBeenCalledOnce();
  });

  it('renders multiple quest-board links with GM and linked-character summaries', async () => {
    const onOpenParty = vi.fn();
    const getPartyHref = vi.fn((partyId: string) => `/parties/${encodeURIComponent(partyId)}`);

    renderList({
      loadParties: vi.fn().mockResolvedValue(parties),
      getPartyHref,
      onOpenParty,
    });

    const partyList = await screen.findByRole('list', { name: 'Your parties' });
    const partyCards = Array.from(partyList.children) as HTMLElement[];
    expect(partyCards).toHaveLength(2);

    const firstLink = within(partyCards[0]).getByRole('link', { name: parties[0].name });
    expect(firstLink).toHaveAttribute('href', '/parties/party%2Fone');
    expect(firstLink).toHaveClass('party-list-card');
    expect(within(firstLink).getByRole('heading', { name: parties[0].name })).toHaveClass(
      'party-list-card__title',
    );
    expect(within(firstLink).getByText('LINKED CHARACTERS')).toBeInTheDocument();
    expect(firstLink.querySelector('.party-list-card__gm')).toHaveTextContent(
      'GM: nerea-sol-with-a-long-username',
    );
    expect(firstLink.querySelectorAll('.party-list-card__character')).toHaveLength(3);
    expect(firstLink.querySelectorAll('.party-list-card__character')[0]).toHaveTextContent(
      'Nim of the Very Long Woodland Trail: nim-player',
    );
    expect(firstLink.querySelectorAll('.party-list-card__character')[1]).toHaveTextContent(
      'Keth: keth-lantern-with-a-long-username',
    );

    const secondLink = within(partyCards[1]).getByRole('link', { name: parties[1].name });
    expect(within(secondLink).getByText('No linked characters yet.')).toBeInTheDocument();
    expect(within(secondLink).queryByText('Player')).not.toBeInTheDocument();
    expect(within(secondLink).queryByText(/Role:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open party/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Open party')).not.toBeInTheDocument();

    for (const link of [firstLink, secondLink]) {
      expect(link.querySelector('a, button, input, select, textarea, [tabindex]')).toBeNull();
    }
    expect(getPartyHref).toHaveBeenNthCalledWith(1, 'party/one');
    expect(getPartyHref).toHaveBeenNthCalledWith(2, 'party-2');

    expect(fireEvent.click(secondLink)).toBe(false);
    expect(onOpenParty).toHaveBeenCalledOnce();
    expect(onOpenParty).toHaveBeenCalledWith('party-2');
  });

  it.each([
    ['Control', { ctrlKey: true }],
    ['Command', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
    ['non-primary', { button: 1 }],
  ])('preserves native %s click behavior', async (_label, eventInit) => {
    const onOpenParty = vi.fn();
    renderList({ loadParties: vi.fn().mockResolvedValue([parties[1]]), onOpenParty });

    const link = await screen.findByRole('link', { name: 'The Silver Company' });
    let wasPreventedByPartyLink = true;
    document.addEventListener(
      'click',
      (event) => {
        wasPreventedByPartyLink = event.defaultPrevented;
        event.preventDefault();
      },
      { once: true },
    );

    fireEvent.click(link, eventInit);
    expect(wasPreventedByPartyLink).toBe(false);
    expect(onOpenParty).not.toHaveBeenCalled();
  });

  it('uses the visible heading as the keyboard-focusable link name', async () => {
    renderList({ loadParties: vi.fn().mockResolvedValue([parties[1]]) });

    const link = await screen.findByRole('link', { name: 'The Silver Company' });
    const heading = within(link).getByRole('heading', { name: 'The Silver Company' });

    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('aria-labelledby', heading.id);
    expect(link.tabIndex).toBe(0);
    link.focus();
    expect(link).toHaveFocus();
  });

  it('provides scoped list and card hooks for responsive Party summaries', async () => {
    const { container } = renderList({
      loadParties: vi.fn().mockResolvedValue(parties),
    });

    expect(container.querySelector('section')).toHaveClass('party-list');
    expect(screen.getByRole('heading', { name: 'My parties' })).toHaveClass('party-list__title');

    const partyList = await screen.findByRole('list', { name: 'Your parties' });
    expect(partyList).toHaveClass('party-list__items');
    Array.from(partyList.children).forEach((item) => {
      expect(item).toHaveClass('party-list__item');
      expect(item.querySelector('a')).toHaveClass('party-list-card');
    });
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
    expect(await screen.findByRole('heading', { name: parties[0].name })).toBeInTheDocument();
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
      expect(screen.queryByText(parties[0].name)).not.toBeInTheDocument();
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
  getPartyHref: (partyId) => `/parties/${encodeURIComponent(partyId)}`,
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
