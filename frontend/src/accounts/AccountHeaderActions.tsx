import { House, LogOut, Sword, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AccountMode } from '../app/appTypes';
import type { AuthUser } from '../auth/api';
import './accounts.css';

interface AccountHeaderActionsProps {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  isSessionLoading: boolean;
  sessionError: string | null;
  onHome: () => void;
  onOpenAccount: (mode: AccountMode) => void;
  onOpenProfile?: () => void;
  onSignOut: (returnFocus?: HTMLElement) => void;
}

export const AccountHeaderActions = ({
  accountsAvailable,
  currentUser,
  sessionError,
  onHome,
  onOpenAccount,
  onOpenProfile,
  onSignOut,
}: AccountHeaderActionsProps) => {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const accountMenuTriggerRef = useRef<HTMLButtonElement | null>(null);

  const openHome = () => {
    setIsAccountMenuOpen(false);
    onHome();
  };

  const openProfile = () => {
    setIsAccountMenuOpen(false);
    if (onOpenProfile) {
      onOpenProfile();
      return;
    }

    window.history.pushState(null, '', '/profile');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    const closeMenuOnOutsideClick = (event: PointerEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
        accountMenuTriggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeMenuOnOutsideClick);
    document.addEventListener('keydown', closeMenuOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenuOnOutsideClick);
      document.removeEventListener('keydown', closeMenuOnEscape);
    };
  }, [isAccountMenuOpen]);

  if (!accountsAvailable) {
    return (
      <section className="account-strip account-strip--quiet" aria-label="Account status">
        <button type="button" className="inline-action inline-action--icon" onClick={openHome}>
          <House aria-hidden="true" size={18} strokeWidth={2.2} />
          <span>Home</span>
        </button>
        <p className="account-strip__text">
          Accounts are unavailable in the public demo until the backend is deployed. Mara remains
          available without an account.
        </p>
      </section>
    );
  }

  if (currentUser) {
    return (
      <section className="account-strip" aria-label="Account status">
        {sessionError ? (
          <p className="form-error" role="alert">
            {sessionError}
          </p>
        ) : null}
        <div className="account-menu" ref={accountMenuRef}>
          <button
            ref={accountMenuTriggerRef}
            type="button"
            className="account-menu__trigger"
            aria-label={`${currentUser.username} account menu`}
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
            onClick={() => setIsAccountMenuOpen((current) => !current)}
          >
            <UserRound aria-hidden="true" size={24} strokeWidth={2.2} />
          </button>

          {isAccountMenuOpen ? (
            <div className="account-menu__content" role="menu">
              <button
                type="button"
                className="account-menu__item"
                role="menuitem"
                onClick={openHome}
              >
                <House aria-hidden="true" size={20} strokeWidth={2.2} />
                <span>Home</span>
              </button>
              <button
                type="button"
                className="account-menu__item"
                role="menuitem"
                onClick={openProfile}
              >
                <Sword aria-hidden="true" size={20} strokeWidth={2.2} />
                <span>Profile</span>
              </button>
              <button
                type="button"
                className="account-menu__item"
                role="menuitem"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  onSignOut(accountMenuTriggerRef.current ?? undefined);
                }}
              >
                <LogOut aria-hidden="true" size={20} strokeWidth={2.2} />
                <span>Sign out</span>
              </button>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="account-strip" aria-label="Account actions">
      {sessionError ? (
        <p className="form-error" role="alert">
          {sessionError}
        </p>
      ) : null}
      <div className="account-actions">
        <button
          type="button"
          className="inline-action inline-action--icon"
          onClick={openHome}
        >
          <House aria-hidden="true" size={18} strokeWidth={2.2} />
          <span>Home</span>
        </button>
        <button
          type="button"
          className="inline-action"
          onClick={() => onOpenAccount('sign-in')}
        >
          Sign in
        </button>
        <button
          type="button"
          className="button button--secondary button--compact"
          onClick={() => onOpenAccount('register')}
        >
          Create account
        </button>
      </div>
    </section>
  );
};
