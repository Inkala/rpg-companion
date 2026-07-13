import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AccountMode, AppRoute } from './app/appTypes';
import {
  parseAppRoute,
  pathForAccountMode,
  pathForRoute,
} from './app/router';
import { AppShell } from './app/AppShell';
import {
  AuthApiError,
  authApiAvailable,
  currentSession,
  signOut,
  type AuthUser,
} from './auth/api';
import { CharacterCreationPage } from './character-creation/CharacterCreationPage';
import { CharacterReference } from './characters/CharacterReference';
import { listCharacterSummaries } from './characters/api';
import { maraReferenceCharacter } from './characters/maraReference';
import { SavedCharacterReferencePage } from './characters/SavedCharacterReferencePage';
import { getApiBaseUrl } from './config/apiBaseUrl';
import { AccountPage } from './pages/AccountPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { createPartiesApiClient } from './parties/api';
import { JoinPartyPage } from './parties/JoinPartyPage';
import { PartyPage } from './parties/PartyPage';

type AppProps = {
  initialRoute?: AppRoute;
  initialInviteToken?: string | null;
};

type AuthenticationDestination =
  | { name: 'new-party' }
  | { name: 'party-invite'; token: string }
  | { name: 'party'; partyId: string }
  | { name: 'party-character'; partyId: string; characterId: string };

export const App = ({
  initialRoute,
  initialInviteToken = null,
}: AppProps = {}) => {
  const [route, setRoute] = useState<AppRoute>(
    () => initialRoute ?? parseAppRoute(window.location.pathname),
  );
  const [inviteToken, setInviteToken] = useState<string | null>(initialInviteToken);
  const [pendingAuthentication, setPendingAuthentication] =
    useState<AuthenticationDestination | null>(null);
  const routeRef = useRef(route);
  const inviteTokenRef = useRef(inviteToken);
  const pendingAuthenticationRef = useRef(pendingAuthentication);
  const apiBaseUrl = getApiBaseUrl();
  const partyApi = useMemo(
    () => createPartiesApiClient({ apiBaseUrl }),
    [apiBaseUrl],
  );
  const accountsAvailable = authApiAvailable();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(accountsAvailable);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      const previousRoute = routeRef.current;
      const nextRoute = parseAppRoute(window.location.pathname);
      const destination = pendingAuthenticationRef.current;

      if (nextRoute.name === 'join-party' && destination?.name === 'party-invite') {
        inviteTokenRef.current = destination.token;
        setInviteToken(destination.token);
      } else if (nextRoute.name === 'account') {
        if (destination?.name === 'party-invite') {
          inviteTokenRef.current = null;
          setInviteToken(null);
        } else if (
          destination === null &&
          previousRoute.name === 'join-party' &&
          inviteTokenRef.current !== null
        ) {
          const inviteDestination: AuthenticationDestination = {
            name: 'party-invite',
            token: inviteTokenRef.current,
          };
          pendingAuthenticationRef.current = inviteDestination;
          setPendingAuthentication(inviteDestination);
          inviteTokenRef.current = null;
          setInviteToken(null);
        }
      }

      routeRef.current = nextRoute;
      setRoute(nextRoute);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!accountsAvailable) {
      setCurrentUser(null);
      setIsSessionLoading(false);
      setSessionError(null);
      return () => {
        isActive = false;
      };
    }

    setIsSessionLoading(true);
    currentSession()
      .then((user) => {
        if (isActive) {
          setCurrentUser((existingUser) => user ?? existingUser);
          setSessionError(null);
        }
      })
      .catch(() => {
        if (isActive) {
          setSessionError('Could not check your session.');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsSessionLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [accountsAvailable]);

  const navigateToRoute = (nextRoute: AppRoute) => {
    const path = pathForRoute(nextRoute);
    window.history.pushState(null, '', path);
    routeRef.current = nextRoute;
    setRoute(nextRoute);
  };

  const clearInviteState = () => {
    inviteTokenRef.current = null;
    pendingAuthenticationRef.current = null;
    setInviteToken(null);
    setPendingAuthentication(null);
  };

  const showSampleCharacter = () => {
    navigateToRoute({ name: 'sample-character' });
  };

  const showSavedCharacter = (id: string) => {
    navigateToRoute({ name: 'saved-character', id });
  };

  const showNewCharacter = () => {
    navigateToRoute({ name: 'new-character' });
  };

  const showHome = () => {
    clearInviteState();
    navigateToRoute({ name: 'home' });
  };

  const showAccount = (mode: AccountMode) => {
    pendingAuthenticationRef.current = null;
    setPendingAuthentication(null);
    navigateToRoute({ name: 'account', mode });
  };

  const showProfile = () => {
    clearInviteState();
    navigateToRoute({ name: 'profile' });
  };

  const showAccountMode = (mode: AccountMode) => {
    window.history.pushState(null, '', pathForAccountMode(mode));
    const accountRoute: AppRoute = { name: 'account', mode };
    routeRef.current = accountRoute;
    setRoute(accountRoute);
  };

  const restoreAuthenticationDestination = (
    destination: AuthenticationDestination,
  ) => {
    const restoredToken =
      destination.name === 'party-invite' ? destination.token : null;
    inviteTokenRef.current = restoredToken;
    setInviteToken(restoredToken);
    navigateToRoute(routeForAuthenticationDestination(destination));
  };

  const beginAuthentication = (
    destination: AuthenticationDestination,
    mode: AccountMode = 'sign-in',
  ) => {
    inviteTokenRef.current = null;
    pendingAuthenticationRef.current = destination;
    setInviteToken(null);
    setPendingAuthentication(destination);
    navigateToRoute({ name: 'account', mode });
  };

  const openAccount = (mode: AccountMode) => {
    if (route.name === 'join-party' && inviteToken !== null) {
      beginAuthentication({ name: 'party-invite', token: inviteToken }, mode);
      return;
    }

    if (route.name === 'party') {
      beginAuthentication({ name: 'party', partyId: route.partyId }, mode);
      return;
    }

    showAccount(mode);
  };

  const handleAccountBack = () => {
    const destination = pendingAuthenticationRef.current;
    pendingAuthenticationRef.current = null;
    setPendingAuthentication(null);

    if (destination === null) {
      showHome();
      return;
    }

    restoreAuthenticationDestination(destination);
  };

  const handleAuthenticated = (user: AuthUser) => {
    const destination = pendingAuthenticationRef.current;
    setCurrentUser(user);
    setSessionError(null);
    pendingAuthenticationRef.current = null;
    setPendingAuthentication(null);

    if (destination === null) {
      inviteTokenRef.current = null;
      setInviteToken(null);
      navigateToRoute({ name: 'home' });
      return;
    }

    restoreAuthenticationDestination(destination);
  };

  const handleInviteSignIn = () => {
    if (inviteToken === null) {
      showAccount('sign-in');
      return;
    }

    beginAuthentication({ name: 'party-invite', token: inviteToken });
  };

  const handleInviteCancel = () => {
    showHome();
  };

  const handleJoinedParty = (partyId: string) => {
    clearInviteState();
    navigateToRoute({ name: 'party', partyId });
  };

  const handleInviteUnavailable = useCallback((unavailableToken: string) => {
    if (inviteTokenRef.current === unavailableToken) {
      inviteTokenRef.current = null;
      setInviteToken(null);
    }

    const destination = pendingAuthenticationRef.current;
    if (
      destination?.name === 'party-invite' &&
      destination.token === unavailableToken
    ) {
      pendingAuthenticationRef.current = null;
      setPendingAuthentication(null);
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      clearInviteState();
      setCurrentUser(null);
      setSessionError(null);
      navigateToRoute({ name: 'home' });
    } catch (error) {
      const message =
        error instanceof AuthApiError
          ? error.message
          : 'Could not sign out. Please try again.';
      setSessionError(message);
    }
  };

  return (
    <AppShell
      accountsAvailable={accountsAvailable}
      currentUser={currentUser}
      isSessionLoading={isSessionLoading}
      sessionError={sessionError}
      onHome={showHome}
      onOpenAccount={openAccount}
      onOpenProfile={showProfile}
      onSignOut={handleSignOut}
      showAccountActions={route.name !== 'account' && route.name !== 'profile'}
    >
      {route.name === 'home' ? (
        <HomePage
          isSignedIn={currentUser !== null}
          onCreateCharacter={showNewCharacter}
          onExploreCharacter={showSampleCharacter}
        />
      ) : route.name === 'account' ? (
        <AccountPage
          accountsAvailable={accountsAvailable}
          currentUser={currentUser}
          initialMode={route.mode}
          onBack={handleAccountBack}
          onAuthenticated={handleAuthenticated}
          onModeChange={showAccountMode}
          onSignOut={handleSignOut}
        />
      ) : route.name === 'profile' ? (
        <ProfilePage
          currentUser={currentUser}
          isSessionLoading={isSessionLoading}
          sessionError={sessionError}
          onBack={showHome}
          onSignIn={() => openAccount('sign-in')}
          onSignOut={handleSignOut}
        />
      ) : route.name === 'new-character' ? (
        <CharacterCreationPage
          isSignedIn={currentUser !== null}
          onBack={showHome}
          onCreateAccount={() => openAccount('register')}
          onOpenCharacterReference={showSavedCharacter}
          onSignIn={() => openAccount('sign-in')}
        />
      ) : route.name === 'sample-character' ? (
        <CharacterReference
          character={maraReferenceCharacter}
          onBack={showHome}
        />
      ) : route.name === 'saved-character' ? (
        <SavedCharacterReferencePage
          characterId={route.id}
          isSignedIn={currentUser !== null}
          onBack={showHome}
          onSignIn={() => openAccount('sign-in')}
        />
      ) : route.name === 'join-party' ? (
        <JoinPartyPage
          token={inviteToken}
          isSignedIn={currentUser !== null}
          inspectInvite={partyApi.inspectPartyInvite}
          loadCharacters={listCharacterSummaries}
          joinParty={partyApi.joinParty}
          onSignIn={handleInviteSignIn}
          onCreateCharacter={showNewCharacter}
          onJoined={handleJoinedParty}
          onCancel={handleInviteCancel}
          onInviteUnavailable={handleInviteUnavailable}
        />
      ) : route.name === 'party' ? (
        <PartyPage
          partyId={route.partyId}
          isSignedIn={currentUser !== null}
          loadParty={partyApi.getParty}
          onSignIn={() =>
            beginAuthentication({ name: 'party', partyId: route.partyId })
          }
          onBack={showHome}
          onOpenCharacter={(characterId) =>
            navigateToRoute({
              name: 'party-character',
              partyId: route.partyId,
              characterId,
            })
          }
        />
      ) : (
        <NotFoundPage onHome={showHome} />
      )}
    </AppShell>
  );
};

const routeForAuthenticationDestination = (
  destination: AuthenticationDestination,
): AppRoute => {
  switch (destination.name) {
    case 'new-party':
      return { name: 'new-party' };
    case 'party-invite':
      return { name: 'join-party' };
    case 'party':
      return { name: 'party', partyId: destination.partyId };
    case 'party-character':
      return {
        name: 'party-character',
        partyId: destination.partyId,
        characterId: destination.characterId,
      };
  }
};
