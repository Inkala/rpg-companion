import { useEffect, useState, type FormEvent } from 'react';
import {
  AuthApiError,
  authApiAvailable,
  currentSession,
  registerAccount,
  signIn,
  signOut,
  type AuthUser,
} from './auth/api';
import huninLogo from './assets/brand/hunin-logo.svg';
import { CharacterReference } from './characters/CharacterReference';
import { HitPointStat, Stat } from './characters/CharacterStats';
import { maraLandingPreview, maraReferenceCharacter } from './characters/maraReference';
import './App.css';

type View = 'landing' | 'reference' | 'account';
type AccountMode = 'sign-in' | 'register';

const passwordPolicyMessage =
  'Use 8–128 characters with an uppercase letter, lowercase letter, number, and special character.';
const usernamePolicyMessage =
  'Username must be 3–32 characters and use only English letters, numbers, underscores, or hyphens.';
const emailPolicyMessage = 'Enter a valid email address.';

const futureActionDescription =
  'Planned for a later slice. This control is visible for product context but is not available yet.';

export function App() {
  const [view, setView] = useState<View>('landing');
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
        <GuestLanding
          accountsAvailable={accountsAvailable}
          currentUser={currentUser}
          isSessionLoading={isSessionLoading}
          sessionError={sessionError}
          onExploreMara={showReference}
          onOpenAccount={showAccount}
          onSignOut={handleSignOut}
        />
      ) : view === 'account' ? (
        <AccountView
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

function GuestLanding({
  accountsAvailable,
  currentUser,
  isSessionLoading,
  sessionError,
  onExploreMara,
  onOpenAccount,
  onSignOut,
}: {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  isSessionLoading: boolean;
  sessionError: string | null;
  onExploreMara: () => void;
  onOpenAccount: (mode: AccountMode) => void;
  onSignOut: () => void;
}) {
  return (
    <main className="app-shell landing-page">
      <p id="future-entry-description" className="sr-only">
        {futureActionDescription}
      </p>

      <section className="brand-block" aria-labelledby="landing-title">
        <img className="brand-logo" src={huninLogo} alt="Hunin" />
        <h1 id="landing-title" className="sr-only">
          Hunin
        </h1>
        <p className="brand-tagline">Your party companion.</p>
        <p className="brand-support">
          Create, bring in, and understand a character without decoding the
          whole sheet.
        </p>
      </section>

      <section className="sample-card" aria-labelledby="sample-character-title">
        <div className="sample-card__rule" aria-hidden="true" />
        <div className="sample-card__identity">
          <img
            className="portrait portrait--landing"
            src={maraLandingPreview.portrait.src}
            alt={maraLandingPreview.portrait.alt}
          />
          <div>
            <p className="eyebrow">Sample character</p>
            <h2 id="sample-character-title" className="character-name">
              {maraLandingPreview.name}
            </h2>
            <p className="identity-line">{maraLandingPreview.identity}</p>
          </div>
        </div>

        <dl className="landing-stat-strip" aria-label="Mara Velard quick stats">
          <HitPointStat hitPoints={maraLandingPreview.stats.hitPoints} />
          <Stat label="AC" value={maraLandingPreview.stats.armorClass} />
          <Stat label="Speed" value={maraLandingPreview.stats.speed} />
        </dl>

        <div className="badge-row" aria-label="Featured abilities">
          {maraLandingPreview.featuredAbilities.map((ability) => (
            <span className="badge badge--neutral" key={ability}>
              {ability}
            </span>
          ))}
        </div>

        <p className="preview-note">{maraLandingPreview.concept}</p>

        <button className="button button--primary" onClick={onExploreMara}>
          Explore Mara
        </button>
      </section>

      <section className="start-group" aria-labelledby="start-your-own">
        <h2 id="start-your-own" className="section-kicker">
          Start your own
        </h2>
        <FutureEntryPoint label="Create a character" />
        <FutureEntryPoint label="Add an existing character" />
      </section>

      <AccountEntry
        accountsAvailable={accountsAvailable}
        currentUser={currentUser}
        isSessionLoading={isSessionLoading}
        sessionError={sessionError}
        onOpenAccount={onOpenAccount}
        onSignOut={onSignOut}
      />

      <nav className="quiet-actions" aria-label="Party actions">
        <FutureEntryPoint label="I have a party invite" variant="quiet" />
      </nav>
    </main>
  );
}

function AccountEntry({
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
      <section className="account-card account-card--quiet" aria-label="Account status">
        <p className="eyebrow">Accounts</p>
        <p className="account-card__text">
          Accounts are unavailable in the public demo until the backend is deployed. Mara remains
          available without an account.
        </p>
      </section>
    );
  }

  if (currentUser) {
    return (
      <section className="account-card" aria-label="Account status">
        <p className="eyebrow">Signed in</p>
        <p className="account-card__text">{currentUser.username}</p>
        {sessionError ? (
          <p className="form-error" role="alert">
            {sessionError}
          </p>
        ) : null}
        <button type="button" className="button button--secondary" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    );
  }

  return (
    <section className="account-card" aria-label="Account actions">
      <p className="eyebrow">Accounts</p>
      <p className="account-card__text">
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
          className="button button--primary"
          onClick={() => onOpenAccount('register')}
        >
          Create account
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onOpenAccount('sign-in')}
        >
          Sign in
        </button>
      </div>
    </section>
  );
}

function FutureEntryPoint({
  label,
  variant = 'secondary',
}: {
  label: string;
  variant?: 'secondary' | 'quiet';
}) {
  const className =
    variant === 'quiet'
      ? 'future-link'
      : 'button button--secondary future-button';

  return (
    <button
      type="button"
      className={className}
      aria-disabled="true"
      aria-describedby="future-entry-description"
    >
      <span>{label}</span>
      <span className="future-tag" aria-hidden="true">
        Planned
      </span>
    </button>
  );
}

function AccountView({
  accountsAvailable,
  currentUser,
  initialMode,
  onBack,
  onAuthenticated,
  onSignOut,
}: {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  initialMode: AccountMode;
  onBack: () => void;
  onAuthenticated: (user: AuthUser) => void;
  onSignOut: () => void;
}) {
  const [mode, setMode] = useState<AccountMode>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setUsernameError(null);
    setEmailError(null);
    setPasswordError(null);
  }, [initialMode]);

  async function submitAccountForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (mode === 'register') {
      const nextUsernameError = validateRegistrationUsername(username);
      const nextEmailError = validateRegistrationEmail(email);
      const nextPasswordError = validateRegistrationPassword(password);
      setUsernameError(nextUsernameError);
      setEmailError(nextEmailError);
      setPasswordError(nextPasswordError);
      if (nextUsernameError || nextEmailError || nextPasswordError) {
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const user =
        mode === 'register'
          ? await registerAccount({ username, email, password })
          : await signIn({ usernameOrEmail, password });
      onAuthenticated(user);
    } catch (submitError) {
      const message =
        submitError instanceof AuthApiError
          ? submitError.message
          : 'The account request failed.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!accountsAvailable) {
    return (
      <main className="app-shell account-page">
        <header className="reference-nav">
          <button className="back-button" onClick={onBack}>
            Back
          </button>
        </header>
        <section className="account-card account-card--quiet">
          <p className="eyebrow">Accounts</p>
          <h1 className="account-title">Coming soon</h1>
          <p className="account-card__text">
            Registration and sign-in need the Hunin backend. The public demo keeps Mara available
            without an account.
          </p>
        </section>
      </main>
    );
  }

  if (currentUser) {
    return (
      <main className="app-shell account-page">
        <header className="reference-nav">
          <button className="back-button" onClick={onBack}>
            Back
          </button>
        </header>
        <section className="account-card">
          <p className="eyebrow">Signed in</p>
          <h1 className="account-title">{currentUser.username}</h1>
          <p className="account-card__text">{currentUser.username}</p>
          <button type="button" className="button button--secondary" onClick={onSignOut}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  const isRegistering = mode === 'register';
  const usernameErrorId = 'account-username-error';
  const emailErrorId = 'account-email-error';
  const passwordErrorId = 'account-password-error';

  return (
    <main className="app-shell account-page">
      <header className="reference-nav">
        <button className="back-button" onClick={onBack}>
          Back
        </button>
      </header>

      <section className="account-card" aria-labelledby="account-title">
        <p className="eyebrow">Accounts</p>
        <h1 id="account-title" className="account-title">
          {isRegistering ? 'Create account' : 'Sign in'}
        </h1>

        <form className="account-form" onSubmit={submitAccountForm} noValidate={isRegistering}>
          {isRegistering ? (
            <>
              <label className="form-field">
                <span>Username</span>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => {
                    const nextUsername = event.target.value;
                    setUsername(nextUsername);
                    if (usernameError) {
                      setUsernameError(validateRegistrationUsername(nextUsername));
                    }
                  }}
                  onBlur={() => setUsernameError(validateRegistrationUsername(username))}
                  aria-invalid={usernameError ? 'true' : undefined}
                  aria-describedby={usernameError ? usernameErrorId : undefined}
                />
              </label>
              {usernameError ? (
                <p id={usernameErrorId} className="form-error" role="alert">
                  {usernameError}
                </p>
              ) : null}

              <label className="form-field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    const nextEmail = event.target.value;
                    setEmail(nextEmail);
                    if (emailError) {
                      setEmailError(validateRegistrationEmail(nextEmail));
                    }
                  }}
                  onBlur={() => setEmailError(validateRegistrationEmail(email))}
                  aria-invalid={emailError ? 'true' : undefined}
                  aria-describedby={emailError ? emailErrorId : undefined}
                />
              </label>
              {emailError ? (
                <p id={emailErrorId} className="form-error" role="alert">
                  {emailError}
                </p>
              ) : null}
            </>
          ) : (
            <label className="form-field">
              <span>Username or email</span>
              <input
                type="text"
                autoComplete="username"
                value={usernameOrEmail}
                onChange={(event) => setUsernameOrEmail(event.target.value)}
                required
              />
            </label>
          )}

          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => {
                const nextPassword = event.target.value;
                setPassword(nextPassword);
                if (passwordError) {
                  setPasswordError(validateRegistrationPassword(nextPassword));
                }
              }}
              onBlur={() => {
                if (isRegistering) {
                  setPasswordError(validateRegistrationPassword(password));
                }
              }}
              aria-invalid={passwordError ? 'true' : undefined}
              aria-describedby={passwordError ? passwordErrorId : undefined}
            />
          </label>
          {passwordError ? (
            <p id={passwordErrorId} className="form-error" role="alert">
              {passwordError}
            </p>
          ) : null}

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="button button--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Working...' : isRegistering ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          className="account-switch"
          onClick={() => {
            setMode(isRegistering ? 'sign-in' : 'register');
            setError(null);
          }}
        >
          {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Create one'}
        </button>
      </section>
    </main>
  );
}

function validateRegistrationUsername(username: string) {
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 32) {
    return usernamePolicyMessage;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return usernamePolicyMessage;
  }
  return null;
}

function validateRegistrationEmail(email: string) {
  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 254) {
    return emailPolicyMessage;
  }
  if (/\s/.test(trimmed)) {
    return emailPolicyMessage;
  }
  const at = trimmed.indexOf('@');
  if (at <= 0 || at !== trimmed.lastIndexOf('@') || at === trimmed.length - 1) {
    return emailPolicyMessage;
  }
  const domain = trimmed.slice(at + 1);
  if (domain.startsWith('.') || domain.endsWith('.') || !domain.includes('.')) {
    return emailPolicyMessage;
  }
  return null;
}

function validateRegistrationPassword(password: string) {
  const characters = Array.from(password);
  if (characters.length < 8 || characters.length > 128) {
    return passwordPolicyMessage;
  }

  let hasUppercase = false;
  let hasLowercase = false;
  let hasDigit = false;
  let hasSpecial = false;
  for (const character of characters) {
    if (character >= 'A' && character <= 'Z') {
      hasUppercase = true;
    } else if (character >= 'a' && character <= 'z') {
      hasLowercase = true;
    } else if (character >= '0' && character <= '9') {
      hasDigit = true;
    } else {
      hasSpecial = true;
    }
  }

  return hasUppercase && hasLowercase && hasDigit && hasSpecial ? null : passwordPolicyMessage;
}
