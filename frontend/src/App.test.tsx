import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { HitPointValue } from './characters/CharacterStats';

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv('VITE_API_BASE_URL', '');
});

function openCharacterReference() {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Explore Mara' }));
}

const passwordPolicyMessage =
  'Use 8–128 characters with an uppercase letter, lowercase letter, number, and special character.';
const usernamePolicyMessage =
  'Username must be 3–32 characters and use only English letters, numbers, underscores, or hyphens.';
const emailPolicyMessage = 'Enter a valid email address.';

function openRegistrationForm() {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'authentication required' }, 401));
  vi.stubGlobal('fetch', fetchMock);

  const result = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  return { ...result, fetchMock };
}

describe('App', () => {
  it('renders the guest landing page', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();
    expect(screen.getByText('Your party companion.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Create, bring in, and understand a character without decoding the whole sheet.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore Mara' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Create a character/ }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByRole('button', { name: /Add an existing character/ }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText(
        'Accounts are unavailable in the public demo until the backend is deployed. Mara remains available without an account.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /I have a party invite/ }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('registers through the configured local backend', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'authentication required' }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            usernameCanonical: 'mara',
            username: 'Mara',
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'Mara' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'mara@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Correct-horse-battery-staple1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Mara')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
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
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'authentication required' }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            usernameCanonical: 'mara',
            username: 'Mara',
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    const passwordError = await screen.findByRole('alert');
    expect(passwordError).toHaveTextContent(passwordPolicyMessage);
    expect(passwordField).toHaveAttribute('aria-invalid', 'true');
    expect(passwordField).toHaveAttribute('aria-describedby', passwordError.id);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(passwordField, {
      target: { value: 'Correct-horse-battery-staple1' },
    });
    expect(screen.queryByText(passwordPolicyMessage)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Mara')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
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

  it('shows invalid email after blur and clears it when corrected', () => {
    const { fetchMock } = openRegistrationForm();
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
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(emailField, {
      target: { value: 'mara@example.com' },
    });

    expect(screen.queryByText(emailPolicyMessage)).not.toBeInTheDocument();
    expect(emailField).not.toHaveAttribute('aria-invalid');
    expect(emailField).not.toHaveAttribute('aria-describedby');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not show an email error after blur when email is valid', () => {
    const { fetchMock } = openRegistrationForm();
    const emailField = screen.getByLabelText('Email');

    fireEvent.change(emailField, {
      target: { value: 'mara@example.com' },
    });
    fireEvent.blur(emailField);

    expect(screen.queryByText(emailPolicyMessage)).not.toBeInTheDocument();
    expect(emailField).not.toHaveAttribute('aria-invalid');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows invalid username after blur', () => {
    const { fetchMock } = openRegistrationForm();
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows invalid password after blur', () => {
    const { fetchMock } = openRegistrationForm();
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('validates every registration field on submit', () => {
    const { fetchMock } = openRegistrationForm();

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText(usernamePolicyMessage)).toBeInTheDocument();
    expect(screen.getByText(emailPolicyMessage)).toBeInTheDocument();
    expect(screen.getByText(passwordPolicyMessage)).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows invalid sign-in errors from the backend', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'authentication required' }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ error: 'Username, email, or password is incorrect.' }, 401),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
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
    expect(fetchMock).toHaveBeenLastCalledWith(
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

  it('shows authenticated state and signs out', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            usernameCanonical: 'mara',
            username: 'Mara',
          },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('Mara')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        'http://localhost:8080/auth/session',
        expect.objectContaining({
          credentials: 'include',
          method: 'DELETE',
        }),
      );
    });
    expect(
      screen.getByRole('button', { name: 'Create account' }),
    ).toBeInTheDocument();
  });

  it('opens Character Reference from Explore Mara', () => {
    openCharacterReference();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Character Reference' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mara Velard' })).toBeInTheDocument();
    expect(screen.getByText('Human Ranger · Level 3')).toBeInTheDocument();
  });

  it('shows only maximum HP when Mara is at full HP', () => {
    openCharacterReference();

    const primaryStats = screen.getByLabelText('Primary stats');
    const fullHp = within(primaryStats).getByText('26');

    expect(fullHp).toBeInTheDocument();
    expect(fullHp).toHaveClass('hp-value--full');
    expect(within(primaryStats).queryByText('26 / 26')).not.toBeInTheDocument();
  });

  it('renders reduced HP as muted current HP before primary maximum HP', () => {
    const { container } = render(
      <HitPointValue hitPoints={{ current: 22, max: 26 }} />,
    );

    const currentHp = screen.getByText('22');
    const separator = screen.getByText('/');
    const maxHp = screen.getByText('26');

    expect(container.textContent).toBe('22 / 26');
    expect(currentHp.compareDocumentPosition(separator)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(separator.compareDocumentPosition(maxHp)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(currentHp).toHaveClass('hp-value__current');
    expect(separator).toHaveClass('hp-value__separator');
    expect(maxHp).toHaveClass('hp-value__max');
  });

  it('starts with Actions expanded', () => {
    openCharacterReference();

    expect(screen.getByRole('button', { name: /Actions, 2 items/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Longbow/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shortsword/ })).toBeInTheDocument();
  });

  it('expands Features on request', () => {
    openCharacterReference();

    const featuresHeader = screen.getByRole('button', {
      name: /Features, 2 items/,
    });

    expect(featuresHeader).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Colossus Slayer/ })).not.toBeInTheDocument();

    fireEvent.click(featuresHeader);

    expect(featuresHeader).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Archery/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Colossus Slayer/ })).toBeInTheDocument();
  });

  it('opens the Colossus Slayer sheet', () => {
    openCharacterReference();
    fireEvent.click(screen.getByRole('button', { name: /Features, 2 items/ }));

    fireEvent.click(screen.getByRole('button', { name: /Colossus Slayer/ }));

    const sheet = screen.getByRole('dialog', {
      name: 'Colossus Slayer quick reference',
    });

    expect(sheet).toBeInTheDocument();
    expect(
      within(sheet).getByText(
        'After you hit an enemy that is already wounded, add 1d8 damage.',
      ),
    ).toBeInTheDocument();
    expect(within(sheet).getByText('Timing')).toBeInTheDocument();
    expect(within(sheet).getByText('Once per turn')).toBeInTheDocument();
  });

  it('closes the sheet and returns focus to Colossus Slayer', async () => {
    openCharacterReference();
    fireEvent.click(screen.getByRole('button', { name: /Features, 2 items/ }));

    const colossusRow = screen.getByRole('button', { name: /Colossus Slayer/ });
    fireEvent.click(colossusRow);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Close Colossus Slayer quick reference',
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(colossusRow).toHaveFocus();
    });
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
