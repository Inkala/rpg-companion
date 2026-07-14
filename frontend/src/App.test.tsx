import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const manualCharacter = {
  ...fighterCharacter,
  id: '44444444-4444-4444-4444-444444444444',
  name: 'Seren Ashfall',
  className: 'Ranger',
  subclassName: null,
  level: 3,
  ancestry: 'Human',
  background: 'Outlander',
  abilityScores: {
    strength: 12,
    dexterity: 16,
    constitution: 14,
    intelligence: 10,
    wisdom: 15,
    charisma: 8,
  },
  hitPoints: { current: 26, max: 28 },
  armorClass: 15,
  referencePayload: buildGeneratedFighterCharacterSheet(
    'dexterity-archer-fighter',
    'Seren Ashfall',
  ),
  createdAt: '2026-07-11T10:00:00Z',
  updatedAt: '2026-07-11T10:00:00Z',
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

const createdParty = {
  id: 'party-1',
  name: 'The Lantern Guard',
  role: 'gm',
};

const generatedInvite = {
  token: 'g'.repeat(43),
  createdAt: '2026-07-13T10:00:00Z',
  expiresAt: '2026-07-20T10:00:00Z',
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

    if (url.endsWith('/parties')) {
      return Promise.resolve(jsonResponse({ parties: [] }));
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

  it('hides the create Party form while signed out and performs no create request', async () => {
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/new');

    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Sign in to create a party' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Party name')).not.toBeInTheDocument();
    await waitFor(() => expect(requestedPaths(fetchMock)).toContain('/auth/session'));
    expect(partyCreateRequests(fetchMock)).toHaveLength(0);
  });

  it.each(['sign-in', 'register'] as const)(
    'preserves %s flow for the typed create Party destination',
    async (accountMode) => {
      const fetchMock = partyFetchMock();
      vi.stubGlobal('fetch', fetchMock);
      window.history.replaceState(null, '', '/parties/new');
      render(<App />);

      clickPrivateRouteSignIn();
      if (accountMode === 'register') {
        fireEvent.click(
          screen.getByRole('button', { name: 'Need an account? Create one' }),
        );
        completeRegistrationForm();
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
        expect(
          await screen.findByRole('heading', { name: 'Sign in' }),
        ).toBeInTheDocument();
        expect(window.location.pathname).toBe('/login');
        completeSignInForm();
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
      } else {
        completeSignInForm();
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
      }

      expect(
        await screen.findByRole('heading', { name: 'Create a party' }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/parties/new');
    },
  );

  it('restores the signed-out create Party state from Account Back', () => {
    vi.stubGlobal('fetch', partyFetchMock());
    window.history.replaceState(null, '', '/parties/new');
    render(<App />);

    clickPrivateRouteSignIn();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(window.location.pathname).toBe('/parties/new');
    expect(
      screen.getByRole('heading', { name: 'Sign in to create a party' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Party name')).not.toBeInTheDocument();
  });

  it('navigates signed-in Party creation success to Party detail', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true, party: gmPartyDetail });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/new');
    render(<App />);

    fireEvent.change(await screen.findByLabelText('Party name'), {
      target: { value: 'The Lantern Guard' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create party' }));

    expect(
      await screen.findByRole('heading', { name: 'The Lantern Guard' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/parties/party-1');
    expect(partyCreateRequests(fetchMock)).toHaveLength(1);
  });

  it('returns Home when create Party is cancelled', async () => {
    vi.stubGlobal('fetch', partyFetchMock({ restoredUser: true }));
    window.history.replaceState(null, '', '/parties/new');
    render(<App />);

    await screen.findByRole('heading', { name: 'Create a party' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();
  });

  it('performs no Party request for an invalid API configuration', () => {
    const fetchMock = vi.fn();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.hunin.example/private');
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/new');

    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Sign in to create a party' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Party name')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
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

  it('captures a valid fragment introduced after the join route is mounted', async () => {
    const historyState = { navigationId: 17, preserved: true };
    const fetchMock = partyFetchMock({ restoredUser: true });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(
      historyState,
      '',
      '/parties/join?source=shared',
    );
    render(<App />);

    await screen.findByRole('button', { name: 'Mara account menu' });
    expect(
      screen.getByRole('heading', { name: 'Party invite unavailable' }),
    ).toBeInTheDocument();

    dispatchFragmentNavigation(inviteToken);

    expect(window.location.pathname).toBe('/parties/join');
    expect(window.location.search).toBe('?source=shared');
    expect(window.location.hash).toBe('');
    expect(window.history.state).toEqual(historyState);
    expect(inviteAppearsInBrowserSurface(inviteToken)).toBe(false);
    expect(
      await screen.findByRole('heading', { name: 'Join The Lantern Guard' }),
    ).toBeInTheDocument();
    expect(requestCount(fetchMock, '/party-invites/inspect')).toBe(1);
    expect(requestCount(fetchMock, '/characters')).toBe(1);
  });

  it('replaces a mounted invite and ignores a late result from the previous token', async () => {
    const firstToken = 'a'.repeat(43);
    const replacementToken = 'b'.repeat(43);
    const firstInspection = deferred<Response>();
    const replacementInspection = {
      party: { id: 'party-2', name: 'The Silver Company' },
      expiresAt: '2026-07-20T10:00:00Z',
    };
    const inspectInvite = vi.fn((requestedToken: string) => {
      return requestedToken === firstToken
        ? firstInspection.promise
        : Promise.resolve(jsonResponse(replacementInspection));
    });
    const fetchMock = partyFetchMock({ restoredUser: true, inspectInvite });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    render(<App />);

    await screen.findByRole('button', { name: 'Mara account menu' });
    dispatchFragmentNavigation(firstToken);
    await waitFor(() => {
      expect(requestCount(fetchMock, '/party-invites/inspect')).toBe(1);
    });

    dispatchFragmentNavigation(replacementToken);

    expect(window.location.hash).toBe('');
    expect(
      await screen.findByRole('heading', { name: 'Join The Silver Company' }),
    ).toBeInTheDocument();
    expect(requestCount(fetchMock, '/party-invites/inspect')).toBe(2);
    expect(requestCount(fetchMock, '/characters')).toBe(2);
    expect(inviteAppearsInBrowserSurface(firstToken)).toBe(false);
    expect(inviteAppearsInBrowserSurface(replacementToken)).toBe(false);

    await act(async () => {
      firstInspection.resolve(jsonResponse(partyInspection));
      await firstInspection.promise;
    });

    expect(
      screen.getByRole('heading', { name: 'Join The Silver Company' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Join The Lantern Guard' }),
    ).not.toBeInTheDocument();
  });

  it('scrubs an invalid mounted join fragment and clears the active invite safely', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    render(<App />);

    await screen.findByRole('button', { name: 'Mara account menu' });
    dispatchFragmentNavigation(inviteToken);
    expect(
      await screen.findByRole('heading', { name: 'Join The Lantern Guard' }),
    ).toBeInTheDocument();
    const inspectionCount = requestCount(fetchMock, '/party-invites/inspect');
    const characterCount = requestCount(fetchMock, '/characters');

    dispatchFragmentNavigation('not-an-invite');

    expect(window.location.hash).toBe('');
    expect(
      screen.getByRole('heading', { name: 'Party invite unavailable' }),
    ).toBeInTheDocument();
    expect(requestCount(fetchMock, '/party-invites/inspect')).toBe(inspectionCount);
    expect(requestCount(fetchMock, '/characters')).toBe(characterCount);
  });

  it('scrubs and discards a fragment introduced on a non-join route', async () => {
    const historyState = { navigationId: 18 };
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(historyState, '', '/?source=shared');
    render(<App />);

    await waitFor(() => expect(requestCount(fetchMock, '/auth/session')).toBe(1));
    dispatchFragmentNavigation(inviteToken);

    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('?source=shared');
    expect(window.location.hash).toBe('');
    expect(window.history.state).toEqual(historyState);
    expect(inviteAppearsInBrowserSurface(inviteToken)).toBe(false);
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    expect(requestCount(fetchMock, '/party-invites/inspect')).toBe(0);
    expect(requestCount(fetchMock, '/characters')).toBe(0);
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
    expect(inviteAppearsInBrowserSurface(inviteToken)).toBe(false);

    window.history.forward();
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    fireEvent(window, new PopStateEvent('popstate'));
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(inviteAppearsInBrowserSurface(inviteToken)).toBe(false);

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

    expect(
      screen.getByRole('heading', { name: 'Party invite unavailable' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('main')).queryByRole('button', { name: 'Sign in' }),
    ).not.toBeInTheDocument();
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

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
    completeSignInForm();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

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

  it('opens Character creation for a no-Character invite without leaking the token', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true, characters: [] });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Create or transfer character' }),
    );

    expect(window.location.pathname).toBe('/characters/new');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
    expect(JSON.stringify(window.history.state).includes(inviteToken)).toBe(false);
    expect((document.body.textContent ?? '').includes(inviteToken)).toBe(false);
  });

  it('returns a saved Character to the active invite and reloads invite data', async () => {
    const fetchMock = partyFetchMock({
      restoredUser: true,
      characters: [],
      charactersAfterCreate: [fighterCharacterSummary],
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Create or transfer character' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Help me choose/ }));
    finishStrengthQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Use Strength melee Fighter' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Branna Shieldhand' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));

    const returnButton = await screen.findByRole('button', {
      name: 'Return to party invite',
    });
    expect(screen.queryByRole('button', { name: 'Open Character Reference' })).not.toBeInTheDocument();
    fireEvent.click(returnButton);

    expect(
      await screen.findByRole('heading', { name: 'Join The Lantern Guard' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/parties/join');
    expect(requestCount(fetchMock, '/party-invites/inspect')).toBe(2);
    expect(requestCountByMethod(fetchMock, '/characters', 'GET')).toBe(2);
    expect(requestCountByMethod(fetchMock, '/characters', 'POST')).toBe(1);
  });

  it('clears the invite when Character creation Back cancels the flow', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true, characters: [] });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/join');
    renderInviteApp();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Create or transfer character' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(window.location.pathname).toBe('/');

    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/characters/new'));
    fireEvent(window, new PopStateEvent('popstate'));
    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/parties/join'));
    fireEvent(window, new PopStateEvent('popstate'));

    expect(
      await screen.findByRole('heading', { name: 'Party invite unavailable' }),
    ).toBeInTheDocument();
    expect(requestCount(fetchMock, '/party-invites/inspect')).toBe(1);
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

  it('renders GM invite tools without duplicating the Party request', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true, party: gmPartyDetail });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/party-1');
    render(<App />);

    expect(
      await screen.findByRole('button', { name: 'Generate invite link' }),
    ).toBeInTheDocument();
    expect(requestCount(fetchMock, '/parties/party-1')).toBe(1);
  });

  it('renders no invite generation control for a loaded Player Party', async () => {
    vi.stubGlobal('fetch', partyFetchMock({ restoredUser: true }));
    window.history.replaceState(null, '', '/parties/party-1');
    render(<App />);

    await screen.findByRole('heading', { name: 'The Lantern Guard' });
    expect(
      screen.queryByRole('button', { name: 'Generate invite link' }),
    ).not.toBeInTheDocument();
  });

  it('builds the exact fragment invite URL without changing browser navigation', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true, party: gmPartyDetail });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({ safe: 'state' }, '', '/parties/party-1');
    render(<App />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Generate invite link' }),
    );
    await waitFor(() => {
      expect(
        document.querySelector<HTMLInputElement>('input[aria-label="Shareable invite URL"]') !== null,
      ).toBe(true);
    });
    const inviteURL = document.querySelector<HTMLInputElement>(
      'input[aria-label="Shareable invite URL"]',
    )?.value ?? '';

    expect(
      inviteURL === `${window.location.origin}/parties/join#${generatedInvite.token}`,
    ).toBe(true);
    expect(window.location.pathname).toBe('/parties/party-1');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
    expect(JSON.stringify(window.history.state).includes(generatedInvite.token)).toBe(false);
  });

  it('copies a generated invite and safely announces success', async () => {
    const copied: string[] = [];
    vi.stubGlobal('fetch', partyFetchMock({ restoredUser: true, party: gmPartyDetail }));
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn((value: string) => {
        copied.push(value);
        return Promise.resolve();
      }) },
    });
    window.history.replaceState(null, '', '/parties/party-1');
    render(<App />);

    await generateInviteWithoutTokenOutput();
    fireEvent.click(findButtonWithoutDOMOutput('Copy invite link'));

    await waitFor(() => {
      expect(document.querySelector('[role="status"]')?.textContent === 'Invite link copied.').toBe(true);
    });
    expect(copied.length).toBe(1);
    expect(copied[0] === `${window.location.origin}/parties/join#${generatedInvite.token}`).toBe(true);
  });

  it('shows the safe manual-copy state when clipboard writing fails', async () => {
    vi.stubGlobal('fetch', partyFetchMock({ restoredUser: true, party: gmPartyDetail }));
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('clipboard rejected')) },
    });
    window.history.replaceState(null, '', '/parties/party-1');
    render(<App />);

    await generateInviteWithoutTokenOutput();
    fireEvent.click(findButtonWithoutDOMOutput('Copy invite link'));

    await waitFor(() => {
      expect(
        document.querySelector('[role="alert"]')?.textContent ===
          'Could not copy the invite link. Copy it manually instead.',
      ).toBe(true);
    });
  });

  it('navigates a GM Character action to the typed Party Character route', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true, party: gmPartyDetail });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/parties/party-1');
    render(<App />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open Branna Shieldhand Character Reference' }),
    );

    expect(screen.getByRole('heading', { name: 'Character Reference' })).toHaveFocus();
    expect(window.location.pathname).toBe(
      '/parties/party-1/characters/22222222-2222-2222-2222-222222222222',
    );
    expect(
      await screen.findByRole('heading', { name: 'Branna Shieldhand' }),
    ).toBeInTheDocument();
    expect(requestCount(fetchMock, `/parties/party-1/characters/${fighterCharacterSummary.id}`)).toBe(1);
  });

  it('performs no Party Character request for a signed-out direct visit', async () => {
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(
      null,
      '',
      `/parties/party-1/characters/${fighterCharacterSummary.id}`,
    );
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Sign in to view this character' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(requestedPaths(fetchMock)).toContain('/auth/session'));
    expect(
      requestCount(fetchMock, `/parties/party-1/characters/${fighterCharacterSummary.id}`),
    ).toBe(0);
  });

  it.each(['sign-in', 'register'] as const)(
    'preserves Party Character %s for the exact typed identifiers',
    async (accountMode) => {
      const fetchMock = partyFetchMock();
      vi.stubGlobal('fetch', fetchMock);
      window.history.replaceState(
        null,
        '',
        `/parties/party-1/characters/${fighterCharacterSummary.id}`,
      );
      render(<App />);

      clickPrivateRouteSignIn();
      if (accountMode === 'register') {
        fireEvent.click(
          screen.getByRole('button', { name: 'Need an account? Create one' }),
        );
        completeRegistrationForm();
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
        expect(
          await screen.findByRole('heading', { name: 'Sign in' }),
        ).toBeInTheDocument();
        expect(window.location.pathname).toBe('/login');
        completeSignInForm();
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
      } else {
        completeSignInForm();
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
      }

      expect(
        await screen.findByRole('heading', { name: 'Branna Shieldhand' }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe(
        `/parties/party-1/characters/${fighterCharacterSummary.id}`,
      );
    },
  );

  it('loads a restored Party Character session through the dedicated endpoint', async () => {
    const fetchMock = partyFetchMock({ restoredUser: true });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(
      null,
      '',
      `/parties/party-1/characters/${fighterCharacterSummary.id}`,
    );
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Branna Shieldhand' }),
    ).toBeInTheDocument();
    expect(
      requestCount(fetchMock, `/parties/party-1/characters/${fighterCharacterSummary.id}`),
    ).toBe(1);
  });

  it('returns Party Character Back to the same Party', async () => {
    vi.stubGlobal('fetch', partyFetchMock({ restoredUser: true }));
    window.history.replaceState(
      null,
      '',
      `/parties/party-1/characters/${fighterCharacterSummary.id}`,
    );
    render(<App />);

    await screen.findByRole('heading', { name: 'Branna Shieldhand' });
    fireEvent.click(screen.getByRole('button', { name: 'Back to party' }));

    expect(screen.getByRole('heading', { name: 'Party' })).toHaveFocus();
    expect(window.location.pathname).toBe('/parties/party-1');
    expect(
      await screen.findByRole('heading', { name: 'The Lantern Guard' }),
    ).toBeInTheDocument();
  });

  it('fails closed for unsupported Party Character data', async () => {
    vi.stubGlobal(
      'fetch',
      partyFetchMock({
        restoredUser: true,
        partyCharacter: { ...fighterCharacter, referencePayload: { schemaVersion: 'Unknown' } },
      }),
    );
    window.history.replaceState(
      null,
      '',
      `/parties/party-1/characters/${fighterCharacterSummary.id}`,
    );
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Character Reference unavailable' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Branna Shieldhand' })).not.toBeInTheDocument();
  });

  it('shows no backend detail for a private Party Character failure', async () => {
    vi.stubGlobal(
      'fetch',
      partyFetchMock({
        restoredUser: true,
        partyCharacterResponse: jsonResponse(
          { error: 'private authorization detail', code: 'not_found' },
          404,
        ),
      }),
    );
    window.history.replaceState(
      null,
      '',
      `/parties/party-1/characters/${fighterCharacterSummary.id}`,
    );
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load this character. Please try again.',
    );
    expect(screen.queryByText('private authorization detail')).not.toBeInTheDocument();
  });

  it('opens the profile from the signed-in account menu', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', signedInFetchMock());

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Mara account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'My profile' }));

    expect(window.location.pathname).toBe('/profile');
    expect(await screen.findByRole('heading', { name: 'Mara' })).toHaveFocus();
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

  it('opens the signed-out create Party route from Home', () => {
    vi.stubGlobal('fetch', partyFetchMock());
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Create party/ }));

    expect(window.location.pathname).toBe('/parties/new');
    expect(
      screen.getByRole('heading', { name: 'Sign in to create a party' }),
    ).toHaveFocus();
    expect(
      screen.getByRole('heading', { name: 'Sign in to create a party' }),
    ).toHaveAttribute('tabindex', '-1');
  });

  it('opens a safe generic Join Party route without carrying invite data', async () => {
    const fetchMock = partyFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    render(<App initialRoute={{ name: 'home' }} initialInviteToken={inviteToken} />);

    fireEvent.click(screen.getByRole('button', { name: /Join party/ }));

    expect(window.location.pathname).toBe('/parties/join');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
    expect(JSON.stringify(window.history.state).includes(inviteToken)).toBe(false);
    expect(
      screen.getByRole('heading', { name: 'Party invite unavailable' }),
    ).toHaveFocus();
    expect(inviteAppearsInBrowserSurface(inviteToken)).toBe(false);
    await waitFor(() => expect(requestedPaths(fetchMock)).toContain('/auth/session'));
    expect(requestCount(fetchMock, '/party-invites/inspect')).toBe(0);
  });

  it('opens the exact Party route from a signed-in Home Party card', async () => {
    const fetchMock = partyFetchMock({
      restoredUser: true,
      parties: [{ id: 'party-1', name: 'The Lantern Guard', role: 'player' }],
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open The Lantern Guard' }),
    );

    expect(screen.getByRole('heading', { name: 'Party' })).toHaveFocus();
    expect(window.location.pathname).toBe('/parties/party-1');
    expect(
      await screen.findByRole('heading', { name: 'The Lantern Guard' }),
    ).toBeInTheDocument();
  });

  it('updates the URL from home account actions', () => {
    stubSignedOutBackend();

    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' })[0]);

    expect(window.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);

    expect(window.location.pathname).toBe('/sign-up');
    expect(screen.getByRole('heading', { name: 'Create account' })).toHaveFocus();
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

  it('registers, stays signed out, shows a dismissible success toast, and opens sign-in', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const submittedValues = {
      username: 'Mara',
      email: 'mara@example.com',
      password: 'Correct-horse-battery-staple1',
    };
    const fetchMock = vi.fn((url: string) => {
      const path = new URL(url).pathname;
      if (path === '/auth/session') {
        return Promise.resolve(
          jsonResponse({ error: 'authentication required' }, 401),
        );
      }
      if (path === '/auth/register') {
        return Promise.resolve(jsonResponse({ user: maraUser }));
      }
      if (path === '/characters') {
        return Promise.resolve(jsonResponse({ characters: [] }));
      }
      if (path === '/parties') {
        return Promise.resolve(jsonResponse({ parties: [] }));
      }
      return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: submittedValues.username },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: submittedValues.email },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: submittedValues.password },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mara account menu' })).not.toBeInTheDocument();
    const toast = await screen.findByText('Account created. Sign in to continue.');
    expect(toast).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss notification' })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(submittedValues.email);
    expect(document.body).not.toHaveTextContent(submittedValues.password);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    await waitFor(() => {
      expect(screen.queryByText('Account created. Sign in to continue.')).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/auth/register',
      expect.objectContaining({
        body: JSON.stringify(submittedValues),
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

  it('opens saved Character Reference immediately after generated save success', async () => {
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

    await waitFor(() => {
      expect(window.location.pathname).toBe('/characters/22222222-2222-2222-2222-222222222222');
    });
    expect(screen.queryByRole('button', { name: 'Open Character Reference' })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Branna Shieldhand' })).toBeInTheDocument();
  });

  it('opens saved Character Reference immediately after manual save success', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/session')) {
        return Promise.resolve(jsonResponse({ user: maraUser }));
      }

      if (url.endsWith('/characters') && init?.method === 'POST') {
        return Promise.resolve(jsonResponse(manualCharacter, 201));
      }

      if (url.endsWith('/characters')) {
        return Promise.resolve(jsonResponse({ characters: [] }));
      }

      if (url.includes('/characters/')) {
        return Promise.resolve(jsonResponse(manualCharacter));
      }

      return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/characters/new');

    render(<App />);

    expect(await screen.findByRole('button', { name: 'Mara account menu' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Fill the sheet myself/ }));
    fillValidMinimumManualCharacter();
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/characters/44444444-4444-4444-4444-444444444444');
    });
    expect(screen.queryByRole('button', { name: 'Open Character Reference' })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Seren Ashfall' })).toBeInTheDocument();
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

    expect(
      screen.getByRole('heading', { name: 'Choose how Hunin helps next.' }),
    ).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Hunin' })).not.toHaveFocus();

    window.history.forward();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/characters/new');
    });
    fireEvent(window, new PopStateEvent('popstate'));

    expect(screen.getByRole('heading', { name: 'Start a character draft.' })).toHaveFocus();
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
  inspectInvite,
  party = partyDetail,
  characters = [fighterCharacterSummary],
  charactersAfterCreate,
  partyCharacter = fighterCharacter,
  partyCharacterResponse,
  parties = [],
}: {
  restoredUser?: boolean;
  inspectionResponse?: Response;
  inspectInvite?: (token: string) => Promise<Response>;
  party?: unknown;
  characters?: unknown[];
  charactersAfterCreate?: unknown[];
  partyCharacter?: unknown;
  partyCharacterResponse?: Response;
  parties?: unknown[];
} = {}) => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
  let characterWasCreated = false;

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
      if (inspectInvite) {
        const body = typeof init?.body === 'string'
          ? JSON.parse(init.body) as { token?: unknown }
          : {};
        return inspectInvite(typeof body.token === 'string' ? body.token : '');
      }
      return Promise.resolve(inspectionResponse ?? jsonResponse(partyInspection));
    }

    if (path === '/party-invites/join') {
      return Promise.resolve(jsonResponse(joinedParty, 201));
    }

    if (path === '/characters' && init?.method === 'POST') {
      characterWasCreated = true;
      return Promise.resolve(jsonResponse(fighterCharacter, 201));
    }

    if (path === '/characters') {
      return Promise.resolve(jsonResponse({
        characters:
          characterWasCreated && charactersAfterCreate
            ? charactersAfterCreate
            : characters,
      }));
    }

    if (path === `/parties/party-1/characters/${fighterCharacterSummary.id}`) {
      return Promise.resolve(partyCharacterResponse ?? jsonResponse(partyCharacter));
    }

    if (path === '/parties' && init?.method === 'POST') {
      return Promise.resolve(jsonResponse(createdParty, 201));
    }

    if (path === '/parties' && init?.method === 'GET') {
      return Promise.resolve(jsonResponse({ parties }));
    }

    if (path === '/parties/party-1/invites' && init?.method === 'POST') {
      return Promise.resolve(jsonResponse(generatedInvite, 201));
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

const requestCount = (fetchMock: ReturnType<typeof vi.fn>, path: string) => {
  return requestedPaths(fetchMock).filter((requestedPath) => requestedPath === path).length;
};

const dispatchFragmentNavigation = (fragment: string) => {
  window.history.pushState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}#${fragment}`,
  );
  fireEvent(window, new HashChangeEvent('hashchange'));
};

const inviteAppearsInBrowserSurface = (sensitiveValue: string) => {
  const storageValues = (storage: Storage) => {
    return Array.from({ length: storage.length }, (_, index) => {
      const key = storage.key(index) ?? '';
      return `${key}:${storage.getItem(key) ?? ''}`;
    }).join('|');
  };

  return [
    window.location.pathname,
    window.location.search,
    window.location.hash,
    JSON.stringify(window.history.state),
    document.body.textContent ?? '',
    storageValues(window.localStorage),
    storageValues(window.sessionStorage),
  ].some((surface) => surface.includes(sensitiveValue));
};

const requestCountByMethod = (
  fetchMock: ReturnType<typeof vi.fn>,
  path: string,
  method: string,
) => {
  return fetchMock.mock.calls.filter(([url, init]) => {
    return (
      new URL(String(url)).pathname === path &&
      (init?.method ?? 'GET') === method
    );
  }).length;
};

const partyCreateRequests = (fetchMock: ReturnType<typeof vi.fn>) => {
  return fetchMock.mock.calls.filter(([url, init]) => {
    return new URL(String(url)).pathname === '/parties' && init?.method === 'POST';
  });
};

const generateInviteWithoutTokenOutput = async () => {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Generate invite link' }),
  );
  await waitFor(() => {
    expect(
      document.querySelector<HTMLInputElement>('input[aria-label="Shareable invite URL"]') !== null,
    ).toBe(true);
  });
};

const findButtonWithoutDOMOutput = (label: string) => {
  const button = Array.from(document.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  expect(button instanceof HTMLButtonElement).toBe(true);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing ${label} button.`);
  }
  return button;
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

const fillValidMinimumManualCharacter = () => {
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Seren Ashfall' },
  });
  fireEvent.change(screen.getByLabelText('Class'), {
    target: { value: 'Ranger' },
  });
  fireEvent.change(screen.getByLabelText('Level'), {
    target: { value: '3' },
  });
  fireEvent.change(screen.getByLabelText('Ancestry'), {
    target: { value: 'Human' },
  });
  fireEvent.change(screen.getByLabelText('Background'), {
    target: { value: 'Outlander' },
  });
  fireEvent.change(screen.getByLabelText('Strength'), {
    target: { value: '12' },
  });
  fireEvent.change(screen.getByLabelText('Dexterity'), {
    target: { value: '16' },
  });
  fireEvent.change(screen.getByLabelText('Constitution'), {
    target: { value: '14' },
  });
  fireEvent.change(screen.getByLabelText('Intelligence'), {
    target: { value: '10' },
  });
  fireEvent.change(screen.getByLabelText('Wisdom'), {
    target: { value: '15' },
  });
  fireEvent.change(screen.getByLabelText('Charisma'), {
    target: { value: '8' },
  });
  fireEvent.change(screen.getByLabelText('Current HP'), {
    target: { value: '26' },
  });
  fireEvent.change(screen.getByLabelText('Maximum HP'), {
    target: { value: '28' },
  });
  fireEvent.change(screen.getByLabelText('Armor Class'), {
    target: { value: '15' },
  });
  fireEvent.change(screen.getByLabelText('Speed'), {
    target: { value: '30' },
  });
  fireEvent.change(screen.getByLabelText('Proficiency bonus'), {
    target: { value: '2' },
  });
};

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
};
