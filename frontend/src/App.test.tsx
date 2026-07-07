import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const maraUser = {
  id: '00000000-0000-0000-0000-000000000001',
  usernameCanonical: 'mara',
  username: 'Mara',
};

const signedInFetchMock = () => {
  return vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/auth/session') && init?.method === 'DELETE') {
      return Promise.resolve(new Response(null, { status: 204 }));
    }

    if (url.endsWith('/auth/session')) {
      return Promise.resolve(jsonResponse({ user: maraUser }));
    }

    if (url.endsWith('/characters')) {
      return Promise.resolve(jsonResponse({ characters: [] }));
    }

    return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
  });
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv('VITE_API_BASE_URL', '');
  window.history.replaceState(null, '', '/');
});

describe('App', () => {
  it('renders the home route from /', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
  });

  it('renders the sign-in route from /login', () => {
    stubSignedOutBackend();
    window.history.replaceState(null, '', '/login');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username or email')).toBeInTheDocument();
  });

  it('renders the create-account route from /sign-up', () => {
    stubSignedOutBackend();
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

  it('renders the character creation route from /characters/new', () => {
    window.history.replaceState(null, '', '/characters/new');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Start a character draft.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fill the sheet myself/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Help me choose/ })).toBeInTheDocument();
  });

  it('shows not found for unknown routes and returns home', () => {
    window.history.replaceState(null, '', '/missing');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Home' })[0]);

    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();
  });

  it('does not load character summaries while signed out', async () => {
    const fetchMock = stubSignedOutBackend();

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

  it('opens character creation from the signed-out home action', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Create character' }));

    expect(window.location.pathname).toBe('/characters/new');
    expect(screen.getByRole('heading', { name: 'Start a character draft.' })).toBeInTheDocument();
  });

  it('updates the URL from home account actions', () => {
    stubSignedOutBackend();

    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' })[0]);

    expect(window.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);

    expect(window.location.pathname).toBe('/sign-up');
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
  });

  it('updates the URL from account form switches', () => {
    stubSignedOutBackend();
    window.history.replaceState(null, '', '/login');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Need an account? Create one' }));

    expect(window.location.pathname).toBe('/sign-up');
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));

    expect(window.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('registers and returns to the signed-in home', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'authentication required' }, 401))
      .mockResolvedValueOnce(jsonResponse({ user: maraUser }))
      .mockResolvedValueOnce(jsonResponse({ characters: [] }));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);
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

    expect(await screen.findByRole('button', { name: 'Mara account menu' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No saved characters yet' })).toBeInTheDocument();
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

  it('restores a signed-in session and signs out', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    const fetchMock = signedInFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const accountMenu = await screen.findByRole('button', { name: 'Mara account menu' });
    expect(screen.getByRole('heading', { name: 'No saved characters yet' })).toBeInTheDocument();

    fireEvent.click(accountMenu);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

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
    expect(screen.getAllByRole('button', { name: 'Create account' })[0]).toBeInTheDocument();
  });

  it('supports browser Back and Forward between routes', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Create character' }));

    expect(window.location.pathname).toBe('/characters/new');
    expect(screen.getByRole('heading', { name: 'Start a character draft.' })).toBeInTheDocument();

    window.history.back();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
    fireEvent(window, new PopStateEvent('popstate'));

    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument();

    window.history.forward();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/characters/new');
    });
    fireEvent(window, new PopStateEvent('popstate'));

    expect(screen.getByRole('heading', { name: 'Start a character draft.' })).toBeInTheDocument();
  });
});

const stubSignedOutBackend = () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'authentication required' }, 401));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
