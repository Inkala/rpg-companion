import type { AuthUser } from '../auth/api';
import '../accounts/accounts.css';

interface ProfilePageProps {
  currentUser: AuthUser | null;
  isSessionLoading: boolean;
  sessionError: string | null;
  onBack: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const ProfilePage = ({
  currentUser,
  isSessionLoading,
  sessionError,
  onBack,
  onSignIn,
  onSignOut,
}: ProfilePageProps) => {
  return (
    <main className="app-shell account-page account-page--auth">
      <header className="reference-nav">
        <button type="button" className="back-button" onClick={onBack}>
          Home
        </button>
      </header>

      {isSessionLoading ? (
        <ProfileCard title="Checking your account...">
          <p className="account-card__text">Loading your Hunin profile.</p>
        </ProfileCard>
      ) : sessionError ? (
        <ProfileCard title="Could not load your profile" quiet>
          <p className="form-error" role="alert">
            {sessionError}
          </p>
          <p className="account-card__text">Try signing in again or return home.</p>
          <button type="button" className="button button--primary" onClick={onSignIn}>
            Sign in
          </button>
        </ProfileCard>
      ) : currentUser ? (
        <ProfileCard title={currentUser.username}>
          <p className="account-card__text">
            Your Hunin profile is read-only in this demo. More account settings are planned for a
            later release.
          </p>
          <button type="button" className="button button--secondary" onClick={onSignOut}>
            Sign out
          </button>
        </ProfileCard>
      ) : (
        <ProfileCard title="Sign in to view your profile." quiet>
          <p className="account-card__text">
            Sign in to see your Hunin account details and saved characters.
          </p>
          <button type="button" className="button button--primary" onClick={onSignIn}>
            Sign in
          </button>
        </ProfileCard>
      )}
    </main>
  );
};

const ProfileCard = ({
  children,
  quiet = false,
  title,
}: {
  children: React.ReactNode;
  quiet?: boolean;
  title: string;
}) => {
  return (
    <section className={`account-card${quiet ? ' account-card--quiet' : ''}`}>
      <p className="eyebrow">My profile</p>
      <h1 className="account-title">{title}</h1>
      {children}
    </section>
  );
};
