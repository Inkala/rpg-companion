import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { buildGeneratedFighterCharacterSheet } from './character-creation/generatedFighterBuilds';

const maraUser = {
  id: '00000000-0000-0000-0000-000000000001',
  usernameCanonical: 'mara',
  username: 'Mara',
};

const fighterCharacterSummary = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Branna Shieldhand',
  className: 'Fighter',
  subclassName: null,
  level: 1,
  ancestry: 'Human',
  background: 'Soldier',
  hitPoints: { current: 12, max: 12 },
  armorClass: 19,
  speedFt: 30,
  updatedAt: '2026-07-07T10:00:00Z',
};

const fighterCharacter = {
  ownerSubjectId: maraUser.id,
  ...fighterCharacterSummary,
  abilityScores: {
    strength: 16,
    dexterity: 11,
    constitution: 15,
    intelligence: 9,
    wisdom: 13,
    charisma: 14,
  },
  referencePayload: buildGeneratedFighterCharacterSheet(
    'strength-melee-fighter',
    'Branna Shieldhand',
  ),
  createdAt: '2026-07-07T10:00:00Z',
};

const signedInFetchMock = (
  characters: unknown[] = [],
  characterDetail: unknown = fighterCharacter,
) => {
  return vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/auth/session') && init?.method === 'DELETE') {
      return Promise.resolve(new Response(null, { status: 204 }));
    }

    if (url.endsWith('/auth/session')) {
      return Promise.resolve(jsonResponse({ user: maraUser }));
    }

    if (url.endsWith('/characters')) {
      return Promise.resolve(jsonResponse({ characters }));
    }

    if (url.includes('/characters/')) {
      return Promise.resolve(jsonResponse(characterDetail));
    }

    return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
  });
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv('VITE_API_BASE_URL', '');
  window.history.replaceState(null, '', '/');
});

describe('App', () => {
  it('renders the home route from /', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
  });

  it('renders the sign-in route from /login', () => {
    stubSignedOutBackend();
    window.history.replaceState(null, '', '/login');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username or email')).toBeInTheDocument();
  });

  it('renders the create-account route from /sign-up', () => {
    stubSignedOutBackend();
    window.history.replaceState(null, '', '/sign-up');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders the sample Character Reference route from /characters/sample', () => {
    window.history.replaceState(null, '', '/characters/sample');

    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Character Reference' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mara Velard' })).toBeInTheDocument();
  });

  it('renders the character creation route from /characters/new', () => {
    window.history.replaceState(null, '', '/characters/new');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Start a character draft.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fill the sheet myself/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Help me choose/ })).toBeInTheDocument();
  });

  it('shows sign-in-required state for a saved character route while signed out', async () => {
    const fetchMock = stubSignedOutBackend();
    window.history.replaceState(null, '', '/characters/22222222-2222-2222-2222-222222222222');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Sign in to open this character.' }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      'http://localhost:8080/characters/22222222-2222-2222-2222-222222222222',
      expect.anything(),
    );
  });

  it('shows loading state for a signed-in saved character route', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/auth/session')) {
        return Promise.resolve(jsonResponse({ user: maraUser }));
      }

      if (url.includes('/characters/')) {
        return new Promise<Response>(() => {});
      }

      return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/characters/22222222-2222-2222-2222-222222222222');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Loading character...' })).toBeInTheDocument();
  });

  it('renders saved Character Reference for a valid payload', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', signedInFetchMock());
    window.history.replaceState(null, '', '/characters/22222222-2222-2222-2222-222222222222');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Branna Shieldhand' })).toBeInTheDocument();
    expect(screen.getByText('Human Fighter - Level 1')).toBeInTheDocument();
  });

  it('shows saved character fetch errors', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/auth/session')) {
        return Promise.resolve(jsonResponse({ user: maraUser }));
      }

      if (url.includes('/characters/')) {
        return Promise.resolve(jsonResponse({ error: 'Character not found.' }, 404));
      }

      return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/characters/missing');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Could not load character' })).toBeInTheDocument();
    expect(screen.getByText('Character not found.')).toBeInTheDocument();
  });

  it('shows unsupported state for invalid saved reference payloads', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal(
      'fetch',
      signedInFetchMock([], {
        ...fighterCharacter,
        referencePayload: { schemaVersion: 'Unknown' },
      }),
    );
    window.history.replaceState(null, '', '/characters/22222222-2222-2222-2222-222222222222');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Character Reference is not available yet' }),
    ).toBeInTheDocument();
  });

  it('shows not found for unknown routes and returns home', () => {
    window.history.replaceState(null, '', '/missing');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Home' })[0]);

    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();
  });

  it('does not load character summaries while signed out', async () => {
    const fetchMock = stubSignedOutBackend();

    render(<App />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/auth/session',
        expect.objectContaining({ credentials: 'include' }),
      );
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      'http://localhost:8080/characters',
      expect.anything(),
    );
  });

  it('opens character creation from the signed-out home action', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Create character' }));

    expect(window.location.pathname).toBe('/characters/new');
    expect(screen.getByRole('heading', { name: 'Start a character draft.' })).toBeInTheDocument();
  });

  it('updates the URL from home account actions', () => {
    stubSignedOutBackend();

    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' })[0]);

    expect(window.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);

    expect(window.location.pathname).toBe('/sign-up');
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
  });

  it('updates the URL from account form switches', () => {
    stubSignedOutBackend();
    window.history.replaceState(null, '', '/login');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Need an account? Create one' }));

    expect(window.location.pathname).toBe('/sign-up');
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));

    expect(window.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('registers and returns to the signed-in home', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'authentication required' }, 401))
      .mockResolvedValueOnce(jsonResponse({ user: maraUser }))
      .mockResolvedValueOnce(jsonResponse({ characters: [] }));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'Mara' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'mara@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Correct-horse-battery-staple1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('button', { name: 'Mara account menu' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No saved characters yet' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/auth/register',
      expect.objectContaining({
        body: JSON.stringify({
          username: 'Mara',
          email: 'mara@example.com',
          password: 'Correct-horse-battery-staple1',
        }),
        credentials: 'include',
        method: 'POST',
      }),
    );
  });

  it('restores a signed-in session and signs out', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = signedInFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const accountMenu = await screen.findByRole('button', { name: 'Mara account menu' });
    expect(screen.getByRole('heading', { name: 'No saved characters yet' })).toBeInTheDocument();

    fireEvent.click(accountMenu);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/auth/session',
        expect.objectContaining({
          credentials: 'include',
          method: 'DELETE',
        }),
      );
    });
    expect(window.location.pathname).toBe('/');
    expect(screen.getAllByRole('button', { name: 'Create account' })[0]).toBeInTheDocument();
  });

  it('opens a saved character from My characters', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', signedInFetchMock([fighterCharacterSummary]));

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Saved characters' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Character Reference' }));

    expect(window.location.pathname).toBe('/characters/22222222-2222-2222-2222-222222222222');
    expect(await screen.findByRole('heading', { name: 'Branna Shieldhand' })).toBeInTheDocument();
  });

  it('opens saved Character Reference from generated save success', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/session')) {
        return Promise.resolve(jsonResponse({ user: maraUser }));
      }

      if (url.endsWith('/characters') && init?.method === 'POST') {
        return Promise.resolve(jsonResponse(fighterCharacter, 201));
      }

      if (url.endsWith('/characters')) {
        return Promise.resolve(jsonResponse({ characters: [] }));
      }

      if (url.includes('/characters/')) {
        return Promise.resolve(jsonResponse(fighterCharacter));
      }

      return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/characters/new');

    render(<App />);

    expect(await screen.findByRole('button', { name: 'Mara account menu' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Help me choose/ }));
    finishStrengthQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Use Strength melee Fighter' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Branna Shieldhand' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));

    expect(await screen.findByText(/Branna Shieldhand is saved/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Character Reference' }));

    expect(window.location.pathname).toBe('/characters/22222222-2222-2222-2222-222222222222');
    expect(await screen.findByRole('heading', { name: 'Branna Shieldhand' })).toBeInTheDocument();
  });

  it('supports browser Back and Forward between routes', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Create character' }));

    expect(window.location.pathname).toBe('/characters/new');
    expect(screen.getByRole('heading', { name: 'Start a character draft.' })).toBeInTheDocument();

    window.history.back();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
    fireEvent(window, new PopStateEvent('popstate'));

    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();

    window.history.forward();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/characters/new');
    });
    fireEvent(window, new PopStateEvent('popstate'));

    expect(screen.getByRole('heading', { name: 'Start a character draft.' })).toBeInTheDocument();
  });
});

const stubSignedOutBackend = () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'authentication required' }, 401));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const finishStrengthQuiz = () => {
  [
    /Stand in front and take the pressure/,
    /In the crush, shield high and feet planted/,
    /Rush in and make space for them/,
    /Force it open and keep moving/,
    /Everyone is safe because you held the line/,
  ].forEach((answer, index) => {
    fireEvent.click(screen.getByLabelText(answer));
    fireEvent.click(
      screen.getByRole('button', {
        name: index === 4 ? 'See recommendation' : 'Next',
      }),
    );
  });
};

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
