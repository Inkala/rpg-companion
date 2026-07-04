import { useEffect, useState } from 'react';
import type { AccountMode, AppView } from './app/appTypes';
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
  const [view, setView] = useState<AppView>('landing');
  const [accountMode, setAccountMode] = useState<AccountMode>('sign-in');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const accountsAvailable = authApiAvailable();

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

  function showReference() {
    setView('reference');
  }

  function showLanding() {
    setView('landing');
  }

  function showAccount(mode: AccountMode) {
    setAccountMode(mode);
    setView('account');
  }

  function handleAuthenticated(user: AuthUser) {
    setCurrentUser(user);
    setSessionError(null);
    setView('landing');
  }

  async function handleSignOut() {
    try {
      await signOut();
      setCurrentUser(null);
      setSessionError(null);
      setView('landing');
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
      {view === 'landing' ? (
        <HomePage
          accountsAvailable={accountsAvailable}
          currentUser={currentUser}
          isSessionLoading={isSessionLoading}
          sessionError={sessionError}
          onExploreMara={showReference}
          onOpenAccount={showAccount}
          onSignOut={handleSignOut}
        />
      ) : view === 'account' ? (
        <AccountPage
          accountsAvailable={accountsAvailable}
          currentUser={currentUser}
          initialMode={accountMode}
          onBack={showLanding}
          onAuthenticated={handleAuthenticated}
          onSignOut={handleSignOut}
        />
      ) : (
        <CharacterReference
          character={maraReferenceCharacter}
          onBack={showLanding}
        />
      )}
    </>
  );
}
