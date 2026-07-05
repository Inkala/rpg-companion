import type { AccountMode } from '../../app/appTypes';
import huninLogo from '../../assets/brand/hunin-logo.svg';
import type { AuthUser } from '../../auth/api';
import { AccountHeaderActions } from '../../accounts/AccountHeaderActions';

interface HomeHeaderProps {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  isSessionLoading: boolean;
  sessionError: string | null;
  onHome: () => void;
  onOpenAccount: (mode: AccountMode) => void;
  onSignOut: () => void;
}

export const HomeHeader = ({
  accountsAvailable,
  currentUser,
  isSessionLoading,
  sessionError,
  onHome,
  onOpenAccount,
  onSignOut,
}: HomeHeaderProps) => {
  return (
    <header className="home-header">
      <section className="brand-block" aria-labelledby="landing-title">
        <a
          className="brand-logo-link"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onHome();
          }}
        >
          <img className="brand-logo" src={huninLogo} alt="Hunin" />
        </a>
        <h1 id="landing-title" className="sr-only">
          Hunin
        </h1>
        <p className="brand-tagline">Your party companion.</p>
        <p className="brand-support">
          Create, bring in, and understand a character without decoding the
          whole sheet.
        </p>
      </section>

      <button
        type="button"
        className="mobile-menu-button"
        aria-disabled="true"
        aria-describedby="future-entry-description"
      >
        Menu
      </button>

      <AccountHeaderActions
        accountsAvailable={accountsAvailable}
        currentUser={currentUser}
        isSessionLoading={isSessionLoading}
        sessionError={sessionError}
        onOpenAccount={onOpenAccount}
        onSignOut={onSignOut}
      />
    </header>
  );
};
