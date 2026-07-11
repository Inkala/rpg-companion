import { LogOut, Sword, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AccountMode } from '../app/appTypes';
import type { AuthUser } from '../auth/api';
import './accounts.css';

interface AccountHeaderActionsProps {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  isSessionLoading: boolean;
  sessionError: string | null;
  onOpenAccount: (mode: AccountMode) => void;
  onOpenProfile?: () => void;
  onSignOut: () => void;
}

export const AccountHeaderActions = ({
  accountsAvailable,
  currentUser,
  sessionError,
  onOpenAccount,
  onOpenProfile,
  onSignOut,
}: AccountHeaderActionsProps) => {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

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

    document.addEventListener('pointerdown', closeMenuOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeMenuOnOutsideClick);
  }, [isAccountMenuOpen]);

  if (!accountsAvailable) {
    return (
      <section className="account-strip account-strip--quiet" aria-label="Account status">
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
                onClick={openProfile}
              >
                <Sword aria-hidden="true" size={20} strokeWidth={2.2} />
                <span>My profile</span>
              </button>
              <button
                type="button"
                className="account-menu__item"
                role="menuitem"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  onSignOut();
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
