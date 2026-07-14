import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

const maraCharacterSummary = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Mara Velard',
  className: 'Ranger',
  subclassName: 'Hunter',
  level: 3,
  ancestry: 'Human',
  background: 'Outlander',
  hitPoints: { current: 26, max: 26 },
  armorClass: 14,
  speedFt: 30,
  portraitAssetId: 'mara-vale-portrait',
  portraitAlt: 'Portrait of Mara Velard',
  featuredAbilities: ['Longbow', 'Colossus Slayer'],
  landingConcept:
    'A steady wilderness scout with a clear attack, useful spells, and quick rules reminders.',
  updatedAt: '2026-07-05T10:00:00Z',
};

const parties = [
  { id: 'party-1', name: 'The Lantern Guard', role: 'gm' as const },
  { id: 'party-2', name: 'The Silver Company', role: 'player' as const },
];

const renderHomePage = (
  isSignedIn = false,
  overrides: Partial<React.ComponentProps<typeof HomePage>> = {},
) => {
  const onCreateCharacter = vi.fn();
  const onExploreCharacter = vi.fn();
  const onCreateParty = vi.fn();
  const onJoinParty = vi.fn();
  const onOpenParty = vi.fn();
  const onSignIn = vi.fn();
  const loadParties = vi.fn().mockResolvedValue([]);
  const props: React.ComponentProps<typeof HomePage> = {
    isSignedIn,
    onCreateCharacter,
    onExploreCharacter,
    onCreateParty,
    onJoinParty,
    onOpenParty,
    onSignIn,
    loadParties,
    ...overrides,
  };

  const result = render(<HomePage {...props} />);

  return {
    ...result,
    props,
    onCreateCharacter,
    onExploreCharacter,
    onCreateParty,
    onJoinParty,
    onOpenParty,
    onSignIn,
    loadParties,
  };
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('HomePage', () => {
  it('renders the guest landing content', () => {
    const {
      onCreateCharacter,
      onExploreCharacter,
      onCreateParty,
      onJoinParty,
    } = renderHomePage();

    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mara Velard' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create character' }),
    ).not.toHaveAttribute('aria-disabled');
    expect(
      screen.getByRole('button', { name: /Create party/ }),
    ).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('button', { name: /Join party/ })).not.toHaveAttribute(
      'aria-disabled',
    );
    expect(screen.queryByRole('button', { name: /Add an existing character/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create character' }));
    fireEvent.click(screen.getByRole('button', { name: /Create party/ }));
    fireEvent.click(screen.getByRole('button', { name: /Join party/ }));

    expect(onExploreCharacter).toHaveBeenCalledOnce();
    expect(onCreateCharacter).toHaveBeenCalledOnce();
    expect(onCreateParty).toHaveBeenCalledOnce();
    expect(onJoinParty).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Party tools.*planned|wait for account-backed party work/i)).not.toBeInTheDocument();
  });

  it('orders the signed-out Mara sample before home actions', () => {
    renderHomePage();

    const createCharacter = screen.getByRole('button', { name: /Create character/ });
    const maraHeading = screen.getByRole('heading', { name: 'Mara Velard' });

    expect(maraHeading.compareDocumentPosition(createCharacter)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('loads the signed-in empty character state', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ characters: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const { onCreateCharacter } = renderHomePage(true);

    expect(await screen.findByRole('heading', { name: 'No saved characters yet' })).toBeInTheDocument();
    const myCharacters = screen.getByRole('region', { name: 'My characters' });
    expect(myCharacters).toHaveClass('home-panel--characters');
    expect(
      within(myCharacters).getByRole('heading', { name: 'No saved characters yet' })
        .parentElement?.parentElement,
    ).toHaveClass('home-panel__header-row');
    expect(
      screen.getByText('Start with a guided character or fill in your sheet manually.'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/characters',
      expect.objectContaining({ credentials: 'include' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create character' }));

    expect(onCreateCharacter).toHaveBeenCalledOnce();
  });

  it('loads signed-in Parties through one stable supplied loader', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ characters: [] })));
    const loadParties = vi.fn().mockResolvedValue([]);
    const { rerender, props } = renderHomePage(true, { loadParties });

    expect(
      await screen.findByRole('heading', { name: 'No parties yet' }),
    ).toBeInTheDocument();
    expect(loadParties).toHaveBeenCalledOnce();

    rerender(<HomePage {...props} loadParties={loadParties} />);
    await waitFor(() => expect(loadParties).toHaveBeenCalledOnce());
  });

  it('exposes functional create and join actions for an empty signed-in Party list', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ characters: [] })));
    const onCreateParty = vi.fn();
    const onJoinParty = vi.fn();
    renderHomePage(true, {
      loadParties: vi.fn().mockResolvedValue([]),
      onCreateParty,
      onJoinParty,
    });

    await screen.findByRole('heading', { name: 'No parties yet' });
    fireEvent.click(screen.getByRole('button', { name: 'Create party' }));
    fireEvent.click(screen.getByRole('button', { name: 'Join party' }));

    expect(onCreateParty).toHaveBeenCalledOnce();
    expect(onJoinParty).toHaveBeenCalledOnce();
  });

  it('renders loaded GM and Player Party cards and opens their exact IDs', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ characters: [] })));
    const onOpenParty = vi.fn();
    renderHomePage(true, {
      loadParties: vi.fn().mockResolvedValue(parties),
      onOpenParty,
    });

    const partyList = await screen.findByRole('list', { name: 'Your parties' });
    expect(within(partyList).getByText('GM')).toBeInTheDocument();
    expect(within(partyList).getByText('Player')).toBeInTheDocument();
    fireEvent.click(
      within(partyList).getByRole('button', { name: 'Open The Lantern Guard' }),
    );
    fireEvent.click(
      within(partyList).getByRole('button', { name: 'Open The Silver Company' }),
    );

    expect(onOpenParty).toHaveBeenNthCalledWith(1, 'party-1');
    expect(onOpenParty).toHaveBeenNthCalledWith(2, 'party-2');
  });

  it('shows a safe Party error and retries through the same loader', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ characters: [] })));
    const loadParties = vi
      .fn()
      .mockRejectedValueOnce(new Error('private Party detail'))
      .mockResolvedValueOnce(parties);
    renderHomePage(true, { loadParties });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load your parties. Please try again.',
    );
    expect(screen.queryByText('private Party detail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('list', { name: 'Your parties' })).toBeInTheDocument();
    expect(loadParties).toHaveBeenCalledTimes(2);
  });

  it('renders saved character summary cards', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ characters: [maraCharacterSummary] })));
    renderHomePage(true);

    expect(await screen.findByRole('heading', { name: 'Saved characters' })).toBeInTheDocument();
    const savedCharacters = screen.getByRole('list', { name: 'Your saved characters' });
    const card = within(savedCharacters).getByRole('article', { name: 'Mara Velard' });
    expect(within(card).getByRole('heading', { name: 'Mara Velard' })).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Portrait of Mara Velard' })).toBeInTheDocument();
    expect(within(card).getByText('Ranger reference')).toBeInTheDocument();
    expect(within(card).getByText('Human Ranger - Level 3')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Open Character Reference' })).not.toBeInTheDocument();
    expect(within(card).getByText('26')).toBeInTheDocument();
    expect(within(card).getByText('14')).toBeInTheDocument();
    expect(within(card).getByText('30 ft.')).toBeInTheDocument();
    expect(within(card).getByText('Longbow')).toBeInTheDocument();
    expect(within(card).getByText('Colossus Slayer')).toBeInTheDocument();
    expect(within(card).getByText(/A steady wilderness scout/)).toBeInTheDocument();
    expect(savedCharacters).toHaveClass('character-summary-list');
    expect(screen.queryByRole('link', { name: /Mara Velard/ })).not.toBeInTheDocument();
  });

  it('shows a friendly character summary loading error', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Character list failed.' }, 500)));
    renderHomePage(true);

    expect(await screen.findByRole('heading', { name: 'Couldn’t load characters' })).toBeInTheDocument();
    expect(
      screen.getByText('Try refreshing the page. Mara is still available below.'),
    ).toBeInTheDocument();
  });

  it('keeps signed-in home sections before the Mara demo', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ characters: [] })));
    renderHomePage(true);

    const myCharacters = await screen.findByText('My characters');
    const myParties = await screen.findByRole('heading', { name: 'My parties' });
    const maraHeading = screen.getByRole('heading', { name: 'Mara Velard' });

    expect(myCharacters.compareDocumentPosition(myParties)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(myCharacters.compareDocumentPosition(maraHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(myParties.compareDocumentPosition(maraHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
  });

  it('does not set state after unmounting during a character load', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    let resolveCharacters: (response: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveCharacters = resolve;
          }),
      ),
    );
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHomePage(true);
    unmount();
    resolveCharacters(jsonResponse({ characters: [] }));

    await waitFor(() => {
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });
});

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
