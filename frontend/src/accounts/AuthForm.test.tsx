import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './AuthForm';

const passwordPolicyMessage =
  'Use 8–128 characters with an uppercase letter, lowercase letter, number, and special character.';
const usernamePolicyMessage =
  'Username must be 3–32 characters and use only English letters, numbers, underscores, or hyphens.';
const emailPolicyMessage = 'Enter a valid email address.';
const confirmationRequiredMessage = 'Confirm your password.';
const passwordMismatchMessage = 'Passwords do not match.';

const maraUser = {
  id: '00000000-0000-0000-0000-000000000001',
  usernameCanonical: 'mara',
  username: 'Mara',
};

const renderAuthForm = (mode: 'sign-in' | 'register' = 'register') => {
  const onAuthenticated = vi.fn();
  const onModeChange = vi.fn();
  const onRegistrationSuccess = vi.fn();

  const result = render(
    <AuthForm
      initialMode={mode}
      onAuthenticated={onAuthenticated}
      onModeChange={onModeChange}
      onRegistrationSuccess={onRegistrationSuccess}
    />,
  );

  return { ...result, onAuthenticated, onModeChange, onRegistrationSuccess };
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
});

describe('AuthForm', () => {
  it('switches between register and sign-in modes', () => {
    const { onModeChange } = renderAuthForm('sign-in');

    fireEvent.click(screen.getByRole('button', { name: 'Need an account? Create one' }));

    expect(onModeChange).toHaveBeenCalledWith('register');
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));

    expect(onModeChange).toHaveBeenCalledWith('sign-in');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('registers through the configured backend and switches to sign-in without authenticating', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ user: maraUser }));
    vi.stubGlobal('fetch', fetchMock);
    const { onAuthenticated, onModeChange, onRegistrationSuccess } = renderAuthForm();

    fillRegistrationForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(onModeChange).toHaveBeenCalledWith('sign-in');
    expect(onRegistrationSuccess).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/auth/register',
      expect.objectContaining({
        body: JSON.stringify({
          username: 'Mara',
          email: 'mara@example.com',
          password: 'Correct-horse-battery-staple1',
        }),
        credentials: 'include',
        method: 'POST',
      }),
    );
  });

  it('uses custom inline registration password validation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ user: maraUser }));
    vi.stubGlobal('fetch', fetchMock);
    const { container, onAuthenticated } = renderAuthForm();

    expect(container.querySelector('form')).toHaveAttribute('novalidate');
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'Mara' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'mara@example.com' },
    });

    const passwordField = screen.getByLabelText('Password');
    expect(passwordField).toHaveAttribute('type', 'password');
    expect(passwordField).not.toHaveAttribute('minlength');
    expect(passwordField).not.toHaveAttribute('maxlength');
    expect(passwordField).not.toHaveAttribute('pattern');
    fireEvent.change(passwordField, {
      target: { value: 'weakpass' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'weakpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    const passwordError = await screen.findByRole('alert');
    expect(passwordError).toHaveTextContent(passwordPolicyMessage);
    expect(passwordField).toHaveAttribute('aria-invalid', 'true');
    expect(passwordField).toHaveAttribute('aria-describedby', passwordError.id);
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(passwordField, {
      target: { value: 'Correct-horse-battery-staple1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Correct-horse-battery-staple1' },
    });
    expect(screen.queryByText(passwordPolicyMessage)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await screen.findByRole('heading', { name: 'Sign in' });
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('shows invalid email after blur and clears it when corrected', () => {
    renderAuthForm();
    const emailField = screen.getByLabelText('Email');

    fireEvent.change(emailField, {
      target: { value: 'not-an-email' },
    });
    expect(screen.queryByText(emailPolicyMessage)).not.toBeInTheDocument();

    fireEvent.blur(emailField);

    const emailError = screen.getByRole('alert');
    expect(emailError).toHaveTextContent(emailPolicyMessage);
    expect(emailField).toHaveAttribute('aria-invalid', 'true');
    expect(emailField).toHaveAttribute('aria-describedby', emailError.id);

    fireEvent.change(emailField, {
      target: { value: 'mara@example.com' },
    });

    expect(screen.queryByText(emailPolicyMessage)).not.toBeInTheDocument();
    expect(emailField).not.toHaveAttribute('aria-invalid');
    expect(emailField).not.toHaveAttribute('aria-describedby');
  });

  it('does not show an email error after blur when email is valid', () => {
    renderAuthForm();
    const emailField = screen.getByLabelText('Email');

    fireEvent.change(emailField, {
      target: { value: 'mara@example.com' },
    });
    fireEvent.blur(emailField);

    expect(screen.queryByText(emailPolicyMessage)).not.toBeInTheDocument();
    expect(emailField).not.toHaveAttribute('aria-invalid');
  });

  it('shows invalid username after blur', () => {
    renderAuthForm();
    const usernameField = screen.getByLabelText('Username');

    fireEvent.change(usernameField, {
      target: { value: 'má' },
    });
    expect(screen.queryByText(usernamePolicyMessage)).not.toBeInTheDocument();

    fireEvent.blur(usernameField);

    const usernameError = screen.getByRole('alert');
    expect(usernameError).toHaveTextContent(usernamePolicyMessage);
    expect(usernameField).toHaveAttribute('aria-invalid', 'true');
    expect(usernameField).toHaveAttribute('aria-describedby', usernameError.id);
  });

  it('shows invalid password after blur', () => {
    renderAuthForm();
    const passwordField = screen.getByLabelText('Password');

    fireEvent.change(passwordField, {
      target: { value: 'weakpass' },
    });
    expect(screen.queryByText(passwordPolicyMessage)).not.toBeInTheDocument();

    fireEvent.blur(passwordField);

    const passwordError = screen.getByRole('alert');
    expect(passwordError).toHaveTextContent(passwordPolicyMessage);
    expect(passwordField).toHaveAttribute('aria-invalid', 'true');
    expect(passwordField).toHaveAttribute('aria-describedby', passwordError.id);
  });

  it('validates every registration field on submit', () => {
    vi.stubGlobal('fetch', vi.fn());
    renderAuthForm();

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText(usernamePolicyMessage)).toBeInTheDocument();
    expect(screen.getByText(emailPolicyMessage)).toBeInTheDocument();
    expect(screen.getByText(passwordPolicyMessage)).toBeInTheDocument();
    expect(screen.getByText(confirmationRequiredMessage)).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('aria-invalid', 'true');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires matching password confirmation without sending it to the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ user: maraUser }));
    vi.stubGlobal('fetch', fetchMock);
    renderAuthForm();

    fillRegistrationForm('Different-password1!');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    const confirmationField = screen.getByLabelText('Confirm password');
    expect(screen.getByText(passwordMismatchMessage)).toBeInTheDocument();
    expect(confirmationField).toHaveAttribute('required');
    expect(confirmationField).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(confirmationField, {
      target: { value: 'Correct-horse-battery-staple1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      username: 'Mara',
      email: 'mara@example.com',
      password: 'Correct-horse-battery-staple1',
    });
    expect(String(request.body)).not.toContain('confirm');
  });

  it('shows invalid sign-in errors from the backend', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'Username, email, or password is incorrect.' }, 401));
    vi.stubGlobal('fetch', fetchMock);
    renderAuthForm('sign-in');

    fireEvent.change(screen.getByLabelText('Username or email'), {
      target: { value: 'Mara' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Username, email, or password is incorrect.',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/auth/sessions',
      expect.objectContaining({
        body: JSON.stringify({
          usernameOrEmail: 'Mara',
          password: 'wrong password',
        }),
        credentials: 'include',
        method: 'POST',
      }),
    );
  });
});

const fillRegistrationForm = (confirmation = 'Correct-horse-battery-staple1') => {
  fireEvent.change(screen.getByLabelText('Username'), {
    target: { value: 'Mara' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'mara@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'Correct-horse-battery-staple1' },
  });
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: confirmation },
  });
};

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
