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
  updatedAt: '2026-07-05T10:00:00Z',
};

const renderHomePage = (isSignedIn = false) => {
  const onCreateCharacter = vi.fn();
  const onExploreCharacter = vi.fn();

  const result = render(
    <HomePage
      isSignedIn={isSignedIn}
      onCreateCharacter={onCreateCharacter}
      onExploreCharacter={onExploreCharacter}
    />,
  );

  return { ...result, onCreateCharacter, onExploreCharacter };
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('HomePage', () => {
  it('renders the guest landing content', () => {
    const { onCreateCharacter, onExploreCharacter } = renderHomePage();

    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mara Velard' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create character' }),
    ).not.toHaveAttribute('aria-disabled');
    expect(
      screen.getByRole('button', { name: /Create party/ }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: /Join party/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.queryByRole('button', { name: /Add an existing character/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create character' }));

    expect(onExploreCharacter).toHaveBeenCalledOnce();
    expect(onCreateCharacter).toHaveBeenCalledOnce();
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

  it('renders saved character summary cards', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ characters: [maraCharacterSummary] })));
    renderHomePage(true);

    expect(await screen.findByRole('heading', { name: 'Saved characters' })).toBeInTheDocument();
    const card = screen.getByRole('article', { name: 'Mara Velard' });
    expect(within(card).getByRole('heading', { name: 'Mara Velard' })).toBeInTheDocument();
    expect(within(card).getByText('Ranger - Hunter - Level 3')).toBeInTheDocument();
    expect(within(card).getByText('Human - Outlander')).toBeInTheDocument();
    expect(within(card).getByText('26/26')).toBeInTheDocument();
    expect(within(card).getByText('14')).toBeInTheDocument();
    expect(within(card).getByText('30 ft.')).toBeInTheDocument();
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
    const myParties = screen.getByText('My parties');
    const maraHeading = screen.getByRole('heading', { name: 'Mara Velard' });

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
