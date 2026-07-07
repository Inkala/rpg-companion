import type {
  CharacterDTO,
  CharacterListResponse,
  CharacterSummaryDTO,
  CreateCharacterRequestDTO,
} from './apiTypes';

type ErrorResponse = {
  error?: string;
};

export class CharactersApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CharactersApiError';
    this.status = status;
  }
}

export const listCharacterSummaries = async (): Promise<CharacterSummaryDTO[]> => {
  const response = await characterRequest<CharacterListResponse>('/characters');
  return response.characters;
};

export const createCharacter = async (
  character: CreateCharacterRequestDTO,
): Promise<CharacterDTO> => {
  return characterRequest<CharacterDTO>('/characters', {
    method: 'POST',
    body: JSON.stringify(character),
  });
};

const characterRequest = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  const apiBaseUrl = getApiBaseUrl();
  if (apiBaseUrl === '') {
    throw new CharactersApiError('Characters are unavailable until the backend is configured.', 0);
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
    throw new CharactersApiError(message, response.status);
  }

  return (await response.json()) as T;
};

const readErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as ErrorResponse;
    return body.error || 'The character request failed.';
  } catch {
    return 'The character request failed.';
  }
};

const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';
  return configured.replace(/\/$/, '');
};
