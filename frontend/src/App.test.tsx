import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { HitPointValue } from './characters/CharacterStats';

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv('VITE_API_BASE_URL', '');
  window.history.replaceState(null, '', '/');
});

const openCharacterReference = () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
};

const passwordPolicyMessage =
  'Use 8–128 characters with an uppercase letter, lowercase letter, number, and special character.';
const usernamePolicyMessage =
  'Username must be 3–32 characters and use only English letters, numbers, underscores, or hyphens.';
const emailPolicyMessage = 'Enter a valid email address.';
const partyLoginRequiredMessage = 'You’ll need an account to create or join a party.';
const maraUser = {
  id: '00000000-0000-0000-0000-000000000001',
  usernameCanonical: 'mara',
  username: 'Mara',
};
const maraCharacterSummary = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Mara Velard',
  className: 'Ranger',
  subclassName: 'Hunter',
  level: 3,
  ancestry: 'Human',
  background: 'Outlander',
  hitPoints: { current: 26, max: 26 },
  armorClass: 14,
  speedFt: 30,
  updatedAt: '2026-07-05T10:00:00Z',
};

const openSignedInAccountMenu = async () => {
  const accountMenu = await screen.findByRole('button', { name: 'Mara account menu' });
  fireEvent.click(accountMenu);
  return screen.getByRole('menu');
};

const openRegistrationForm = () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'authentication required' }, 401));
  vi.stubGlobal('fetch', fetchMock);

  const result = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  return { ...result, fetchMock };
};

const signedInFetchMock = (
  characters: unknown[] = [],
  characterStatus = 200,
) => {
  return vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/auth/session') && init?.method === 'DELETE') {
      return Promise.resolve(new Response(null, { status: 204 }));
    }

    if (url.endsWith('/auth/session')) {
      return Promise.resolve(jsonResponse({ user: maraUser }));
    }

    if (url.endsWith('/characters')) {
      return Promise.resolve(
        characterStatus === 200
          ? jsonResponse({ characters })
          : jsonResponse({ error: 'Character list failed.' }, characterStatus),
      );
    }

    return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
  });
};

describe('App', () => {
  it('renders the home route from /', () => {
    window.history.replaceState(null, '', '/');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();
  });

  it('renders the sign-in route from /login', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'authentication required' }, 401)),
    );
    window.history.replaceState(null, '', '/login');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username or email')).toBeInTheDocument();
  });

  it('renders the create-account route from /sign-up', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'authentication required' }, 401)),
    );
    window.history.replaceState(null, '', '/sign-up');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders the sample Character Reference route from /characters/sample', () => {
    window.history.replaceState(null, '', '/characters/sample');

    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Character Reference' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mara Velard' })).toBeInTheDocument();
  });

  it('shows not found for unknown routes and returns home', () => {
    window.history.replaceState(null, '', '/missing');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Home' })[0]);

    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();
  });

  it('renders the guest landing page', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hunin' })).toHaveAttribute('href', '/');
    expect(screen.getByText('Your party companion.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Create, bring in, and understand a character without decoding the whole sheet.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Create character/ }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByRole('button', { name: /Create party/ }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: /Join party/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.queryByRole('button', { name: /Add an existing character/ })).not.toBeInTheDocument();
    expect(screen.queryByText(partyLoginRequiredMessage)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Accounts are unavailable in the public demo until the backend is deployed. Mara remains available without an account.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('does not load character summaries while signed out', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'authentication required' }, 401));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/auth/session',
        expect.objectContaining({ credentials: 'include' }),
      );
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      'http://localhost:8080/characters',
      expect.anything(),
    );
  });

  it('orders the signed-out Mara sample before home actions', () => {
    render(<App />);

    const createCharacter = screen.getByRole('button', { name: /Create character/ });
    const maraHeading = screen.getByRole('heading', { name: 'Mara Velard' });

    expect(maraHeading.compareDocumentPosition(createCharacter)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('shows lightweight account actions in the header when accounts are available', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'authentication required' }, 401)),
    );

    render(<App />);

    const accountActions = screen.getByLabelText('Account actions');
    expect(within(accountActions).getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(
      within(accountActions).getByRole('button', { name: 'Create account' }),
    ).toBeInTheDocument();
  });

  it('updates the URL from home account actions', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'authentication required' }, 401)),
    );

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(window.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(window.location.pathname).toBe('/sign-up');
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
  });

  it('updates the URL from account form switches', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'authentication required' }, 401)),
    );
    window.history.replaceState(null, '', '/login');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Need an account? Create one' }));

    expect(window.location.pathname).toBe('/sign-up');
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));

    expect(window.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('registers through the configured local backend', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'authentication required' }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          user: maraUser,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ characters: [] }));
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

    const menu = await openSignedInAccountMenu();
    expect(within(menu).getByRole('menuitem', { name: 'My profile' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
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
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'authentication required' }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          user: maraUser,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ characters: [] }));
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

    expect(await screen.findByRole('button', { name: 'Mara account menu' })).toBeInTheDocument();
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
    const fetchMock = signedInFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const menu = await openSignedInAccountMenu();
    expect(screen.getByRole('heading', { name: 'No saved characters yet' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No parties yet' })).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/auth/session',
        expect.objectContaining({
          credentials: 'include',
          method: 'DELETE',
        }),
      );
    });
    expect(window.location.pathname).toBe('/');
    expect(
      screen.getByRole('button', { name: 'Create account' }),
    ).toBeInTheDocument();
  });

  it('loads character summaries after session restore', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = signedInFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('No saved characters yet')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/characters',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('shows the signed-in empty character state for an empty character list', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', signedInFetchMock());

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'No saved characters yet' })).toBeInTheDocument();
    expect(
      screen.getByText('Start with a guided character or fill in your sheet manually.'),
    ).toBeInTheDocument();
  });

  it('renders saved character summary cards', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', signedInFetchMock([maraCharacterSummary]));

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Saved characters' })).toBeInTheDocument();
    const card = screen.getByRole('article', { name: 'Mara Velard' });
    expect(within(card).getByRole('heading', { name: 'Mara Velard' })).toBeInTheDocument();
    expect(within(card).getByText('Ranger - Hunter - Level 3')).toBeInTheDocument();
    expect(within(card).getByText('Human - Outlander')).toBeInTheDocument();
    expect(within(card).getByText('26/26')).toBeInTheDocument();
    expect(within(card).getByText('14')).toBeInTheDocument();
    expect(within(card).getByText('30 ft.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Mara Velard/ })).not.toBeInTheDocument();
  });

  it('shows a friendly character summary loading error', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', signedInFetchMock([], 500));

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Couldn’t load characters' })).toBeInTheDocument();
    expect(
      screen.getByText('Try refreshing the page. Mara is still available below.'),
    ).toBeInTheDocument();
  });

  it('closes the account menu when clicking outside it', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', signedInFetchMock());

    render(<App />);

    await openSignedInAccountMenu();
    fireEvent.pointerDown(screen.getByRole('heading', { name: 'No saved characters yet' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('orders signed-in empty home sections before the Mara demo', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', signedInFetchMock());

    render(<App />);

    const myCharacters = await screen.findByText('My characters');
    const myParties = screen.getByText('My parties');
    const maraHeading = screen.getByRole('heading', { name: 'Mara Velard' });

    expect(myCharacters.compareDocumentPosition(maraHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(myParties.compareDocumentPosition(maraHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
  });

  it('opens Character Reference from the sample character', () => {
    openCharacterReference();

    expect(window.location.pathname).toBe('/characters/sample');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Character Reference' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mara Velard' })).toBeInTheDocument();
    expect(screen.getByText('Human Ranger · Level 3')).toBeInTheDocument();
  });

  it('supports browser Back and Forward between routes', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));

    expect(window.location.pathname).toBe('/characters/sample');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Character Reference' }),
    ).toBeInTheDocument();

    window.history.back();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
    fireEvent(window, new PopStateEvent('popstate'));

    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();

    window.history.forward();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/characters/sample');
    });
    fireEvent(window, new PopStateEvent('popstate'));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Character Reference' }),
    ).toBeInTheDocument();
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

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
