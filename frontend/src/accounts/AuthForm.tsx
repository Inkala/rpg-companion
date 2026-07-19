import { useEffect, useState, type FormEvent } from 'react';
import type { AccountMode } from '../app/appTypes';
import {
  AuthApiError,
  registerAccount,
  signIn,
  type AuthUser,
} from '../auth/api';
import {
  validateRegistrationEmail,
  validateRegistrationPassword,
  validateRegistrationUsername,
} from './authValidation';

interface AuthFormProps {
  initialMode: AccountMode;
  onAuthenticated: (user: AuthUser) => void;
  onModeChange: (mode: AccountMode) => void;
  onRegistrationSuccess: () => void;
  onAuthenticationFailure?: () => boolean;
}

export const AuthForm = ({
  initialMode,
  onAuthenticated,
  onModeChange,
  onRegistrationSuccess,
  onAuthenticationFailure,
}: AuthFormProps) => {
  const [mode, setMode] = useState<AccountMode>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordConfirmationError, setPasswordConfirmationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setUsernameError(null);
    setEmailError(null);
    setPasswordError(null);
    setPasswordConfirmation('');
    setPasswordConfirmationError(null);
  }, [initialMode]);

  const submitAccountForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (mode === 'register') {
      const nextUsernameError = validateRegistrationUsername(username);
      const nextEmailError = validateRegistrationEmail(email);
      const nextPasswordError = validateRegistrationPassword(password);
      const nextPasswordConfirmationError = validatePasswordConfirmation(
        password,
        passwordConfirmation,
      );
      setUsernameError(nextUsernameError);
      setEmailError(nextEmailError);
      setPasswordError(nextPasswordError);
      setPasswordConfirmationError(nextPasswordConfirmationError);
      if (
        nextUsernameError
        || nextEmailError
        || nextPasswordError
        || nextPasswordConfirmationError
      ) {
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        await registerAccount({ username, email, password });
        setUsername('');
        setEmail('');
        setPassword('');
        setPasswordConfirmation('');
        setUsernameOrEmail('');
        setMode('sign-in');
        onModeChange('sign-in');
        onRegistrationSuccess();
        return;
      }

      const user = await signIn({ usernameOrEmail, password });
      onAuthenticated(user);
    } catch (submitError) {
      const privateContinuationCleared = onAuthenticationFailure?.() ?? false;
      const message = privateContinuationCleared
        ? 'Could not sign in. Please try again.'
        : submitError instanceof AuthApiError
          ? submitError.message
          : 'The account request failed.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRegistering = mode === 'register';
  const usernameErrorId = 'account-username-error';
  const emailErrorId = 'account-email-error';
  const passwordErrorId = 'account-password-error';
  const passwordConfirmationErrorId = 'account-password-confirmation-error';

  return (
    <>
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
              if (passwordConfirmationError) {
                setPasswordConfirmationError(
                  validatePasswordConfirmation(nextPassword, passwordConfirmation),
                );
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

        {isRegistering ? (
          <>
            <label className="form-field">
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordConfirmation}
                required
                onChange={(event) => {
                  const nextConfirmation = event.target.value;
                  setPasswordConfirmation(nextConfirmation);
                  if (passwordConfirmationError) {
                    setPasswordConfirmationError(
                      validatePasswordConfirmation(password, nextConfirmation),
                    );
                  }
                }}
                onBlur={() => {
                  setPasswordConfirmationError(
                    validatePasswordConfirmation(password, passwordConfirmation),
                  );
                }}
                aria-invalid={passwordConfirmationError ? 'true' : undefined}
                aria-describedby={
                  passwordConfirmationError ? passwordConfirmationErrorId : undefined
                }
              />
            </label>
            {passwordConfirmationError ? (
              <p id={passwordConfirmationErrorId} className="form-error" role="alert">
                {passwordConfirmationError}
              </p>
            ) : null}
          </>
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
          const nextMode = isRegistering ? 'sign-in' : 'register';
          setMode(nextMode);
          setError(null);
          setPasswordConfirmation('');
          setPasswordConfirmationError(null);
          onModeChange(nextMode);
        }}
      >
        {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Create one'}
      </button>
    </>
  );
};

const validatePasswordConfirmation = (password: string, confirmation: string) => {
  if (confirmation.length === 0) {
    return 'Confirm your password.';
  }

  return password === confirmation ? null : 'Passwords do not match.';
};
