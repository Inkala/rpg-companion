import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const inviteToken = 'i'.repeat(43);

const partyInspection = {
  party: { id: 'party-1', name: 'The Lantern Guard' },
  expiresAt: '2026-07-19T10:00:00Z',
};

const joinedParty = {
  partyId: 'party-1',
  membershipId: 'membership-1',
  role: 'player',
  characterId: fighterCharacterSummary.id,
  joinedAt: '2026-07-13T10:00:00Z',
};

const partyDetail = {
  id: 'party-1',
  name: 'The Lantern Guard',
  role: 'player',
  members: [
    { username: 'Mara', role: 'player', character: fighterCharacterSummary },
  ],
};

const gmPartyDetail = {
  ...partyDetail,
  role: 'gm',
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

  it('uses prepared invite props and performs no private requests while signed out', async () => {
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/');

    render(
      <App
        initialRoute={{ name: 'join-party' }}
        initialInviteToken={inviteToken}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Sign in to use this party invite' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(requestedPaths(fetchMock)).toContain('/auth/session'));
    expect(requestedPaths(fetchMock)).not.toContain('/party-invites/inspect');
    expect(requestedPaths(fetchMock)).not.toContain('/characters');
  });

  it('starts invite inspection and Character loading after restoring a session', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');

    render(
      <App
        initialRoute={{ name: 'join-party' }}
        initialInviteToken={inviteToken}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Sign in to use this party invite' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Join The Lantern Guard' }),
    ).toBeInTheDocument();
    expect(requestedPaths(fetchMock)).toContain('/party-invites/inspect');
    expect(requestedPaths(fetchMock)).toContain('/characters');
  });

  it('moves invite authentication to login without exposing the token', () => {
    vi.stubGlobal('fetch', partyFetchMock());
    window.history.replaceState(null, '', '/parties/join');

    render(
      <App
        initialRoute={{ name: 'join-party' }}
        initialInviteToken={inviteToken}
      />,
    );

    clickPrivateRouteSignIn();

    expect(window.location.pathname).toBe('/login');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('restores the active invite on browser Back from login', async () => {
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    clickPrivateRouteSignIn();
    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/parties/join'));
    fireEvent(window, new PopStateEvent('popstate'));
    expect(
      screen.getByRole('heading', { name: 'Sign in to use this party invite' }),
    ).toBeInTheDocument();

    clickPrivateRouteSignIn();
    completeSignInForm();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(
      await screen.findByRole('heading', { name: 'Join The Lantern Guard' }),
    ).toBeInTheDocument();
  });

  it('keeps the typed invite destination when browser Forward returns to login', async () => {
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    clickPrivateRouteSignIn();
    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/parties/join'));
    fireEvent(window, new PopStateEvent('popstate'));

    window.history.forward();
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    fireEvent(window, new PopStateEvent('popstate'));
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    completeSignInForm();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(
      await screen.findByRole('heading', { name: 'Join The Lantern Guard' }),
    ).toBeInTheDocument();
  });

  it('prevents invite resurrection after Home is chosen following browser Back', async () => {
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    clickPrivateRouteSignIn();
    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/parties/join'));
    fireEvent(window, new PopStateEvent('popstate'));
    fireEvent.click(screen.getByRole('link', { name: 'Hunin' }));
    expect(window.location.pathname).toBe('/');

    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/parties/join'));
    fireEvent(window, new PopStateEvent('popstate'));
    window.history.forward();
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    fireEvent(window, new PopStateEvent('popstate'));
    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/parties/join'));
    fireEvent(window, new PopStateEvent('popstate'));

    clickPrivateRouteSignIn();
    completeSignInForm();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Hunin' })).toBeInTheDocument();
    expect(requestedPaths(fetchMock)).not.toContain('/party-invites/inspect');
  });

  it('preserves the invite destination when switching to registration', async () => {
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    clickPrivateRouteSignIn();
    fireEvent.click(screen.getByRole('button', { name: 'Need an account? Create one' }));
    expect(window.location.pathname).toBe('/sign-up');
    completeRegistrationForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('heading', { name: 'Join The Lantern Guard' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/parties/join');
  });

  it('returns sign-in to the typed invite destination and ignores arbitrary return data', async () => {
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    clickPrivateRouteSignIn();
    window.history.replaceState(
      { returnTo: 'https://untrusted.example' },
      '',
      '/login?returnTo=https://untrusted.example',
    );
    completeSignInForm();
    clickPrivateRouteSignIn();

    expect(
      await screen.findByRole('heading', { name: 'Join The Lantern Guard' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/parties/join');
    expect(window.location.search).toBe('');
    expect(window.location.origin).not.toBe('https://untrusted.example');
  });

  it('restores the signed-out invite and token when leaving account authentication', async () => {
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    clickPrivateRouteSignIn();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(window.location.pathname).toBe('/parties/join');
    expect(
      screen.getByRole('heading', { name: 'Sign in to use this party invite' }),
    ).toBeInTheDocument();

    clickPrivateRouteSignIn();
    completeSignInForm();
    clickPrivateRouteSignIn();
    expect(
      await screen.findByRole('heading', { name: 'Join The Lantern Guard' }),
    ).toBeInTheDocument();
  });

  it('clears invite state on cancellation and returns Home', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    await screen.findByRole('heading', { name: 'Join The Lantern Guard' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(window.location.pathname).toBe('/');

    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/parties/join'));
    fireEvent(window, new PopStateEvent('popstate'));
    expect(
      await screen.findByRole('heading', { name: 'Party invite unavailable' }),
    ).toBeInTheDocument();
  });

  it('clears invite state when the Hunin Home action leaves the flow', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    await screen.findByRole('heading', { name: 'Join The Lantern Guard' });
    fireEvent.click(screen.getByRole('link', { name: 'Hunin' }));
    expect(window.location.pathname).toBe('/');

    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/parties/join'));
    fireEvent(window, new PopStateEvent('popstate'));
    expect(
      await screen.findByRole('heading', { name: 'Party invite unavailable' }),
    ).toBeInTheDocument();
  });

  it('clears invite state when Profile navigation leaves the flow', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    await screen.findByRole('heading', { name: 'Join The Lantern Guard' });
    fireEvent.click(screen.getByRole('button', { name: 'Mara account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'My profile' }));
    expect(window.location.pathname).toBe('/profile');

    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/parties/join'));
    fireEvent(window, new PopStateEvent('popstate'));
    expect(
      await screen.findByRole('heading', { name: 'Party invite unavailable' }),
    ).toBeInTheDocument();
  });

  it('clears invite state after joining and supports Back and Forward for Party routes', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    fireEvent.click(await screen.findByRole('radio', { name: /Branna Shieldhand/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Join party' }));
    expect(await screen.findByRole('heading', { name: 'The Lantern Guard' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/parties/party-1');

    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/parties/join'));
    fireEvent(window, new PopStateEvent('popstate'));
    expect(
      await screen.findByRole('heading', { name: 'Party invite unavailable' }),
    ).toBeInTheDocument();

    window.history.forward();
    await waitFor(() => expect(window.location.pathname).toBe('/parties/party-1'));
    fireEvent(window, new PopStateEvent('popstate'));
    expect(await screen.findByRole('heading', { name: 'The Lantern Guard' })).toBeInTheDocument();
  });

  it('clears an unavailable invite without rendering backend detail', async () => {
    const fetchMock = partyFetchMock({
      restoredUser: true,
      inspectionResponse: jsonResponse(
        { error: 'backend invitation detail', code: 'invite_unavailable' },
        400,
      ),
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    expect(
      await screen.findByRole('heading', { name: 'Party invite unavailable' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.queryByText('backend invitation detail')).not.toBeInTheDocument();
    expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
  });

  it('loads a direct Party route only after restoring a session', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/party-1');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Sign in to view this party' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'The Lantern Guard' })).toBeInTheDocument();
    expect(requestedPaths(fetchMock)).toContain('/parties/party-1');
  });

  it('performs no Party request for a signed-out direct Party route', async () => {
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/party-1');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Sign in to view this party' })).toBeInTheDocument();
    await waitFor(() => expect(requestedPaths(fetchMock)).toContain('/auth/session'));
    expect(requestedPaths(fetchMock)).not.toContain('/parties/party-1');
  });

  it('performs no Party fetch when API configuration is invalid', () => {
    const fetchMock = vi.fn();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.hunin.example/private');
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/party-1');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Sign in to view this party' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('restores the same typed Party destination from account Back and sign-in', async () => {
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/party-1');
    render(<App />);

    clickPrivateRouteSignIn();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(window.location.pathname).toBe('/parties/party-1');
    expect(screen.getByRole('heading', { name: 'Sign in to view this party' })).toBeInTheDocument();

    clickPrivateRouteSignIn();
    completeSignInForm();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'The Lantern Guard' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/parties/party-1');
  });

  it('navigates a GM Character action to the typed Party Character route', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true, party: gmPartyDetail });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/party-1');
    render(<App />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open Branna Shieldhand Character Reference' }),
    );

    expect(window.location.pathname).toBe(
      '/parties/party-1/characters/22222222-2222-2222-2222-222222222222',
    );
  });

  it('opens the profile from the signed-in account menu', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', signedInFetchMock());

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Mara account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'My profile' }));

    expect(window.location.pathname).toBe('/profile');
    expect(await screen.findByRole('heading', { name: 'Mara' })).toBeInTheDocument();
  });

  it('restores a signed-in session on direct profile navigation', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', signedInFetchMock());
    window.history.replaceState(null, '', '/profile');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Checking your account...' })).toBeInTheDocument();
    expect(screen.queryByText('Mara')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Mara' })).toBeInTheDocument();
  });

  it('shows signed-out profile behavior and opens sign in', async () => {
    stubSignedOutBackend();
    window.history.replaceState(null, '', '/profile');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Sign in to view your profile.' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(window.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows a recoverable profile error when session lookup fails', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'failed' }, 500)));
    window.history.replaceState(null, '', '/profile');

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not check your session.');
    expect(screen.getByRole('heading', { name: 'Could not load your profile' })).toBeInTheDocument();
    expect(screen.queryByText('Mara')).not.toBeInTheDocument();
  });

  it('signs out from the profile and returns home', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = signedInFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/profile');

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/auth/session',
        expect.objectContaining({ credentials: 'include', method: 'DELETE' }),
      );
    });
    expect(window.location.pathname).toBe('/');
    expect(screen.getAllByRole('button', { name: 'Create account' })[0]).toBeInTheDocument();
  });

  it('renders the sample Character Reference route from /characters/sample', () => {
    window.history.replaceState(null, '', '/characters/sample');

    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Character Reference' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mara Velard' })).toBeInTheDocument();
  });

  it('keeps the public sample available when the API configuration is invalid', () => {
    const fetchMock = vi.fn();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.hunin.example/api');
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/characters/sample');

    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Character Reference' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mara Velard' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
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
    expect(await screen.findByRole('heading', { name: 'No saved characters yet' })).toBeInTheDocument();

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

const renderInviteApp = () => {
  return render(
    <App
      initialRoute={{ name: 'join-party' }}
      initialInviteToken={inviteToken}
    />,
  );
};

const completeSignInForm = () => {
  fireEvent.change(screen.getByLabelText('Username or email'), {
    target: { value: 'Mara' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'Correct-horse-battery-staple1' },
  });
};

const clickPrivateRouteSignIn = () => {
  fireEvent.click(
    within(screen.getByRole('main')).getByRole('button', { name: 'Sign in' }),
  );
};

const completeRegistrationForm = () => {
  fireEvent.change(screen.getByLabelText('Username'), {
    target: { value: 'Mara' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'mara@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'Correct-horse-battery-staple1' },
  });
};

const partyFetchMock = ({
  restoredUser = false,
  inspectionResponse,
  party = partyDetail,
}: {
  restoredUser?: boolean;
  inspectionResponse?: Response;
  party?: unknown;
} = {}) => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');

  return vi.fn((url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;

    if (path === '/auth/session' && init?.method === 'DELETE') {
      return Promise.resolve(new Response(null, { status: 204 }));
    }

    if (path === '/auth/session') {
      return Promise.resolve(
        restoredUser
          ? jsonResponse({ user: maraUser })
          : jsonResponse({ error: 'authentication required' }, 401),
      );
    }

    if (path === '/auth/sessions' || path === '/auth/register') {
      return Promise.resolve(jsonResponse({ user: maraUser }));
    }

    if (path === '/party-invites/inspect') {
      return Promise.resolve(inspectionResponse ?? jsonResponse(partyInspection));
    }

    if (path === '/party-invites/join') {
      return Promise.resolve(jsonResponse(joinedParty, 201));
    }

    if (path === '/characters') {
      return Promise.resolve(jsonResponse({ characters: [fighterCharacterSummary] }));
    }

    if (path === '/parties/party-1') {
      return Promise.resolve(jsonResponse(party));
    }

    return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
  });
};

const requestedPaths = (fetchMock: ReturnType<typeof vi.fn>) => {
  return fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname);
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
