import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import type { AccountMode, AppRoute } from './app/appTypes';
import {
  parseAppRoute,
  pathForAccountMode,
  pathForRoute,
} from './app/router';
import { AppShell } from './app/AppShell';
import { RouteFocusManager } from './app/RouteFocusManager';
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
import type { PartyDetailDTO } from './parties/apiTypes';
import { CreatePartyPage } from './parties/CreatePartyPage';
import { captureAndScrubInviteFragment } from './parties/inviteFragment';
import { JoinPartyPage } from './parties/JoinPartyPage';
import { PartyCharacterReferencePage } from './parties/PartyCharacterReferencePage';
import { PartyInvitePanel } from './parties/PartyInvitePanel';
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
  const renderPartyTools = useCallback(
    (party: PartyDetailDTO) => (
      <PartyInvitePanel
        partyId={party.id}
        currentUserRole={party.role}
        createInvite={partyApi.createPartyInvite}
        buildInviteURL={buildInviteURL}
        copyText={copyText}
      />
    ),
    [partyApi.createPartyInvite],
  );

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

    const handleHashChange = () => {
      const capturedToken = captureAndScrubInviteFragment({
        location: window.location,
        history: window.history,
      });

      if (routeRef.current.name !== 'join-party') {
        return;
      }

      inviteTokenRef.current = capturedToken;
      pendingAuthenticationRef.current = null;
      setInviteToken(capturedToken);
      setPendingAuthentication(null);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
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

  const showNewParty = () => {
    navigateToRoute({ name: 'new-party' });
  };

  const showJoinParty = () => {
    clearInviteState();
    navigateToRoute({ name: 'join-party' });
  };

  const showParty = (partyId: string) => {
    navigateToRoute({ name: 'party', partyId });
  };

  const returnToInvite = () => {
    if (inviteTokenRef.current === null) {
      showHome();
      return;
    }

    navigateToRoute({ name: 'join-party' });
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
    if (route.name === 'new-party') {
      beginAuthentication({ name: 'new-party' }, mode);
      return;
    }

    if (route.name === 'join-party' && inviteToken !== null) {
      beginAuthentication({ name: 'party-invite', token: inviteToken }, mode);
      return;
    }

    if (route.name === 'party') {
      beginAuthentication({ name: 'party', partyId: route.partyId }, mode);
      return;
    }

    if (route.name === 'party-character') {
      beginAuthentication(
        {
          name: 'party-character',
          partyId: route.partyId,
          characterId: route.characterId,
        },
        mode,
      );
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

  const handleRegistrationSuccess = () => {
    const toastId = toast.success('Account created. Sign in to continue.', {
      action: {
        label: 'Dismiss notification',
        onClick: () => toast.dismiss(toastId),
      },
      duration: 8000,
    });
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

  const handlePartyCreated = (partyId: string) => {
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
      <Toaster
        className="hunin-toaster"
        closeButton
        position="top-center"
        toastOptions={{
          classNames: {
            actionButton: 'hunin-toast__action',
            closeButton: 'hunin-toast__close',
            description: 'hunin-toast__description',
            toast: 'hunin-toast',
            title: 'hunin-toast__title',
          },
        }}
      />
      {route.name === 'home' ? (
        <HomePage
          isSignedIn={currentUser !== null}
          loadParties={partyApi.listParties}
          onCreateCharacter={showNewCharacter}
          onCreateParty={showNewParty}
          onExploreCharacter={showSampleCharacter}
          onJoinParty={showJoinParty}
          onOpenParty={showParty}
          onSignIn={() => openAccount('sign-in')}
        />
      ) : route.name === 'account' ? (
        <AccountPage
          accountsAvailable={accountsAvailable}
          currentUser={currentUser}
          initialMode={route.mode}
          onBack={handleAccountBack}
          onAuthenticated={handleAuthenticated}
          onModeChange={showAccountMode}
          onRegistrationSuccess={handleRegistrationSuccess}
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
          onOpenCharacterReference={
            inviteToken !== null ? returnToInvite : showSavedCharacter
          }
          onSignIn={() => openAccount('sign-in')}
          savedCharacterActionLabel={
            inviteToken !== null ? 'Return to party invite' : undefined
          }
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
      ) : route.name === 'new-party' ? (
        currentUser === null ? (
          <SignedOutCreatePartyState
            onSignIn={() => openAccount('sign-in')}
            onCancel={showHome}
          />
        ) : (
          <CreatePartyPage
            createParty={partyApi.createParty}
            onPartyCreated={handlePartyCreated}
            onCancel={showHome}
          />
        )
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
          renderPartyTools={renderPartyTools}
        />
      ) : route.name === 'party-character' ? (
        <PartyCharacterReferencePage
          partyId={route.partyId}
          characterId={route.characterId}
          isSignedIn={currentUser !== null}
          loadPartyCharacter={partyApi.getPartyCharacter}
          onBack={() =>
            navigateToRoute({ name: 'party', partyId: route.partyId })
          }
          onSignIn={() =>
            beginAuthentication({
              name: 'party-character',
              partyId: route.partyId,
              characterId: route.characterId,
            })
          }
        />
      ) : (
        <NotFoundPage onHome={showHome} />
      )}
      <RouteFocusManager routeKey={pathForRoute(route)} />
    </AppShell>
  );
};

const SignedOutCreatePartyState = ({
  onSignIn,
  onCancel,
}: {
  onSignIn: () => void;
  onCancel: () => void;
}) => (
  <main className="app-shell account-page party-page party-create-page">
    <section
      className="account-card party-state-card"
      aria-labelledby="signed-out-create-party-title"
    >
      <p className="eyebrow">Parties</p>
      <h1 id="signed-out-create-party-title" className="account-title">
        Sign in to create a party
      </h1>
      <p>Party creation is available to signed-in Hunin users.</p>
      <div className="party-actions">
        <button type="button" className="button button--primary" onClick={onSignIn}>
          Sign in
        </button>
        <button type="button" className="button button--secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  </main>
);

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

const buildInviteURL = (path: string) => `${window.location.origin}${path}`;

const copyText = (text: string): Promise<void> => {
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard?.writeText) {
    return Promise.reject(new Error('Clipboard is unavailable.'));
  }

  return clipboard.writeText(text);
};
