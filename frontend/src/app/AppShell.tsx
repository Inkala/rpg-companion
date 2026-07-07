import { LogOut, Sword } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccountHeaderActions } from '../accounts/AccountHeaderActions';
import huninLogo from '../assets/brand/hunin-logo.svg';
import type { AuthUser } from '../auth/api';
import type { AccountMode } from './appTypes';
import './appShell.css';

interface AppShellProps {
  accountsAvailable: boolean;
  children: ReactNode;
  currentUser: AuthUser | null;
  isSessionLoading: boolean;
  sessionError: string | null;
  onHome: () => void;
  onOpenAccount: (mode: AccountMode) => void;
  onSignOut: () => void;
  showAccountActions?: boolean;
}

export const AppShell = ({
  accountsAvailable,
  children,
  currentUser,
  isSessionLoading,
  sessionError,
  onHome,
  onOpenAccount,
  onSignOut,
  showAccountActions = true,
}: AppShellProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const closeMenuOnOutsideClick = (event: PointerEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeMenuOnOutsideClick);
    document.addEventListener('keydown', closeMenuOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenuOnOutsideClick);
      document.removeEventListener('keydown', closeMenuOnEscape);
    };
  }, [isMobileMenuOpen]);

  const openAccount = (mode: AccountMode) => {
    setIsMobileMenuOpen(false);
    onOpenAccount(mode);
  };

  const signOutFromMenu = () => {
    setIsMobileMenuOpen(false);
    onSignOut();
  };

  return (
    <div className="global-shell">
      <header className="app-header">
        <section className="app-brand" aria-labelledby="app-title">
          <a
            className="app-brand__link"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onHome();
            }}
          >
            <img className="app-brand__logo" src={huninLogo} alt="Hunin" />
          </a>
          <h1 id="app-title" className="sr-only">
            Hunin
          </h1>
          <p className="app-brand__tagline">Your party companion.</p>
          <p className="app-brand__support">
            Create, bring in, and understand a character without decoding the
            whole sheet.
          </p>
        </section>

        <nav className="app-header__nav" aria-label="App navigation">
          <button
            type="button"
            className="inline-action app-header__home"
            onClick={onHome}
          >
            Home
          </button>
          {showAccountActions ? (
            <div className="app-header__account">
              <AccountHeaderActions
                accountsAvailable={accountsAvailable}
                currentUser={currentUser}
                isSessionLoading={isSessionLoading}
                sessionError={sessionError}
                onOpenAccount={onOpenAccount}
                onSignOut={onSignOut}
              />
            </div>
          ) : null}
        </nav>

        <div className="app-mobile-menu" ref={mobileMenuRef}>
          <button
            type="button"
            className="app-mobile-menu__trigger"
            aria-expanded={isMobileMenuOpen}
            aria-haspopup="menu"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
          >
            Menu
          </button>

          {isMobileMenuOpen ? (
            <div className="app-mobile-menu__content" role="menu">
              <button
                type="button"
                className="app-mobile-menu__item"
                role="menuitem"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onHome();
                }}
              >
                Home
              </button>
              {showAccountActions ? (
                <MobileAccountActions
                  accountsAvailable={accountsAvailable}
                  currentUser={currentUser}
                  sessionError={sessionError}
                  onClose={() => setIsMobileMenuOpen(false)}
                  onOpenAccount={openAccount}
                  onSignOut={signOutFromMenu}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {children}
    </div>
  );
};

interface MobileAccountActionsProps {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  sessionError: string | null;
  onClose: () => void;
  onOpenAccount: (mode: AccountMode) => void;
  onSignOut: () => void;
}

const MobileAccountActions = ({
  accountsAvailable,
  currentUser,
  sessionError,
  onClose,
  onOpenAccount,
  onSignOut,
}: MobileAccountActionsProps) => {
  if (!accountsAvailable) {
    return (
      <p className="app-mobile-menu__note" role="menuitem">
        Accounts are unavailable in the public demo.
      </p>
    );
  }

  if (currentUser) {
    return (
      <>
        {sessionError ? (
          <p className="form-error app-mobile-menu__error" role="alert">
            {sessionError}
          </p>
        ) : null}
        <button
          type="button"
          className="app-mobile-menu__item"
          role="menuitem"
          onClick={onClose}
        >
          <Sword aria-hidden="true" size={18} strokeWidth={2.2} />
          <span>My profile</span>
        </button>
        <button
          type="button"
          className="app-mobile-menu__item"
          role="menuitem"
          onClick={onSignOut}
        >
          <LogOut aria-hidden="true" size={18} strokeWidth={2.2} />
          <span>Sign out</span>
        </button>
      </>
    );
  }

  return (
    <>
      {sessionError ? (
        <p className="form-error app-mobile-menu__error" role="alert">
          {sessionError}
        </p>
      ) : null}
      <button
        type="button"
        className="app-mobile-menu__item"
        role="menuitem"
        onClick={() => onOpenAccount('sign-in')}
      >
        Sign in
      </button>
      <button
        type="button"
        className="app-mobile-menu__item app-mobile-menu__item--primary"
        role="menuitem"
        onClick={() => onOpenAccount('register')}
      >
        Create account
      </button>
    </>
  );
};
