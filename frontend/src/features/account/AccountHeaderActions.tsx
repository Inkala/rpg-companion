import type { AccountMode } from '../../app/appTypes';
import type { AuthUser } from '../../auth/api';

export function AccountHeaderActions({
  accountsAvailable,
  currentUser,
  isSessionLoading,
  sessionError,
  onOpenAccount,
  onSignOut,
}: {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  isSessionLoading: boolean;
  sessionError: string | null;
  onOpenAccount: (mode: AccountMode) => void;
  onSignOut: () => void;
}) {
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
        <p className="account-strip__label">Signed in as {currentUser.username}</p>
        {sessionError ? (
          <p className="form-error" role="alert">
            {sessionError}
          </p>
        ) : null}
        <button type="button" className="inline-action" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    );
  }

  return (
    <section className="account-strip" aria-label="Account actions">
      <p className="account-strip__text">
        {isSessionLoading
          ? 'Checking session...'
          : 'Accounts are available during local development. Character saving will be available as Hunin grows.'}
      </p>
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
}
