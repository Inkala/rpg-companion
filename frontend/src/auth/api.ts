export type AuthUser = {
  id: string;
  usernameCanonical: string;
  username: string;
};

type SessionResponse = {
  user: AuthUser;
};

type ErrorResponse = {
  error?: string;
};

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

export const authApiAvailable = () => {
  return getApiBaseUrl() !== '';
};

export const registerAccount = async (input: {
  username: string;
  email: string;
  password: string;
}) => {
  const response = await authRequest<SessionResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: input.username,
      email: input.email,
      password: input.password,
    }),
  });
  return response.user;
};

export const signIn = async (input: { usernameOrEmail: string; password: string; }) => {
  const response = await authRequest<SessionResponse>('/auth/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.user;
};

export const currentSession = async () => {
  try {
    const response = await authRequest<SessionResponse>('/auth/session');
    return response.user;
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
};

export const signOut = async () => {
  await authRequest<void>('/auth/session', { method: 'DELETE' });
};

const authRequest = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  const apiBaseUrl = getApiBaseUrl();
  if (apiBaseUrl === '') {
    throw new AuthApiError('Accounts are unavailable until the backend is configured.', 0);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new AuthApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const readErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as ErrorResponse;
    return body.error || 'The account request failed.';
  } catch {
    return 'The account request failed.';
  }
};

const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';
  return configured.replace(/\/$/, '');
};
