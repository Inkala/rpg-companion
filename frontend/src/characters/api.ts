import { getApiBaseUrl } from '../config/apiBaseUrl';
import type {
  CharacterDTO,
  CharacterListResponse,
  CharacterSummaryDTO,
  CreateCharacterRequestDTO,
  LevelUpCharacterRequestDTO,
} from './apiTypes';
import type { CharacterV2DTO, CreateCharacterV2RequestDTO } from './characterSheetV2';

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

export function createCharacter(character: CreateCharacterV2RequestDTO): Promise<CharacterV2DTO>;
export function createCharacter(character: CreateCharacterRequestDTO): Promise<CharacterDTO>;
export function createCharacter(
  character: CreateCharacterRequestDTO | CreateCharacterV2RequestDTO,
): Promise<CharacterDTO | CharacterV2DTO> {
  return characterRequest<CharacterDTO | CharacterV2DTO>('/characters', {
    method: 'POST',
    body: JSON.stringify(character),
  });
}

export const getCharacterById = async (id: string): Promise<CharacterDTO> => {
  return characterRequest<CharacterDTO>(`/characters/${id}`);
};

export const levelUpCharacter = async (
  id: string,
  decisions: LevelUpCharacterRequestDTO,
): Promise<CharacterDTO> => {
  return characterRequest<CharacterDTO>(`/characters/${id}/level-up`, {
    method: 'PATCH',
    body: JSON.stringify(decisions),
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
