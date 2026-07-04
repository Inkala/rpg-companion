import { useEffect, useState } from 'react';
import type { AccountMode, AppRoute } from './app/appTypes';
import {
  parseAppRoute,
  pathForAccountMode,
  pathForRoute,
} from './app/router';
import {
  AuthApiError,
  authApiAvailable,
  currentSession,
  signOut,
  type AuthUser,
} from './auth/api';
import { CharacterReference } from './characters/CharacterReference';
import { maraReferenceCharacter } from './characters/maraReference';
import { AccountPage } from './pages/AccountPage';
import { HomePage } from './pages/HomePage';
import './App.css';

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseAppRoute(window.location.pathname));
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const accountsAvailable = authApiAvailable();

  useEffect(() => {
    function handlePopState() {
      setRoute(parseAppRoute(window.location.pathname));
    }

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

  function navigateToRoute(nextRoute: AppRoute) {
    const path = pathForRoute(nextRoute);
    window.history.pushState(null, '', path);
    setRoute(nextRoute);
  }

  function showSampleCharacter() {
    navigateToRoute({ name: 'sample-character' });
  }

  function showHome() {
    navigateToRoute({ name: 'home' });
  }

  function showAccount(mode: AccountMode) {
    navigateToRoute({ name: 'account', mode });
  }

  function showAccountMode(mode: AccountMode) {
    window.history.pushState(null, '', pathForAccountMode(mode));
    setRoute({ name: 'account', mode });
  }

  function handleAuthenticated(user: AuthUser) {
    setCurrentUser(user);
    setSessionError(null);
    navigateToRoute({ name: 'home' });
  }

  async function handleSignOut() {
    try {
      await signOut();
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
  }

  return (
    <>
      {route.name === 'home' ? (
        <HomePage
          accountsAvailable={accountsAvailable}
          currentUser={currentUser}
          isSessionLoading={isSessionLoading}
          sessionError={sessionError}
          onExploreMara={showSampleCharacter}
          onOpenAccount={showAccount}
          onSignOut={handleSignOut}
        />
      ) : route.name === 'account' ? (
        <AccountPage
          accountsAvailable={accountsAvailable}
          currentUser={currentUser}
          initialMode={route.mode}
          onBack={showHome}
          onAuthenticated={handleAuthenticated}
          onModeChange={showAccountMode}
          onSignOut={handleSignOut}
        />
      ) : route.name === 'sample-character' ? (
        <CharacterReference
          character={maraReferenceCharacter}
          onBack={showHome}
        />
      ) : (
        <NotFoundPage onHome={showHome} />
      )}
    </>
  );
}

function NotFoundPage({ onHome }: { onHome: () => void }) {
  return (
    <main className="app-shell account-page">
      <header className="reference-nav">
        <button className="back-button" onClick={onHome}>
          Home
        </button>
      </header>
      <section className="account-card account-card--quiet">
        <p className="eyebrow">Not found</p>
        <h1 className="account-title">Page not found</h1>
        <p className="account-card__text">
          This Hunin page does not exist yet.
        </p>
        <button type="button" className="button button--secondary" onClick={onHome}>
          Home
        </button>
      </section>
    </main>
  );
}
