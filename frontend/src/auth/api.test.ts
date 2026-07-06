import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthApiError,
  authApiAvailable,
  currentSession,
  registerAccount,
  signIn,
  signOut,
} from './api';

const maraUser = {
  id: '00000000-0000-0000-0000-000000000001',
  usernameCanonical: 'mara',
  username: 'Mara',
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('auth API', () => {
  it('reports availability from the configured API base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');

    expect(authApiAvailable()).toBe(false);
    await expect(
      registerAccount({
        username: 'Mara',
        email: 'mara@example.com',
        password: 'Correct-horse-battery-staple1',
      }),
    ).rejects.toMatchObject({
      name: 'AuthApiError',
      message: 'Accounts are unavailable until the backend is configured.',
      status: 0,
    });

    vi.stubEnv('VITE_API_BASE_URL', ' http://localhost:8080/ ');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ user: maraUser })));

    expect(authApiAvailable()).toBe(true);
    await expect(currentSession()).resolves.toEqual(maraUser);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/auth/session',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('includes credentials and JSON headers for registration', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ user: maraUser }));
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      registerAccount({
        username: 'Mara',
        email: 'mara@example.com',
        password: 'Correct-horse-battery-staple1',
      }),
    ).resolves.toEqual(maraUser);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/auth/register',
      expect.objectContaining({
        body: JSON.stringify({
          username: 'Mara',
          email: 'mara@example.com',
          password: 'Correct-horse-battery-staple1',
        }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
    );
  });

  it('returns null for an unauthenticated current session', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'authentication required' }, 401)),
    );

    await expect(currentSession()).resolves.toBeNull();
  });

  it('handles sign-out 204 responses without reading JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', fetchMock);

    await expect(signOut()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/auth/session',
      expect.objectContaining({
        credentials: 'include',
        headers: {},
        method: 'DELETE',
      }),
    );
  });

  it('throws useful API errors from response bodies', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'That username is already taken.' }, 409)),
    );

    await expect(signIn({ usernameOrEmail: 'Mara', password: 'wrong password' })).rejects.toEqual(
      new AuthApiError('That username is already taken.', 409),
    );
  });

  it('falls back to the generic account error when the response body is not JSON', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('service unavailable', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    );

    await expect(currentSession()).rejects.toEqual(
      new AuthApiError('The account request failed.', 503),
    );
  });
});

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
