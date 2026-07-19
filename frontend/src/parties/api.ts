import type { CharacterDTO } from '../characters/apiTypes';
import type {
  CreatePartyRequestDTO,
  CreatePartyResponseDTO,
  JoinPartyByCodeRequestDTO,
  JoinPartyRequestDTO,
  JoinPartyResponseDTO,
  PartyDetailDTO,
  PartyErrorCodeDTO,
  PartyErrorResponseDTO,
  PartyInviteDTO,
  PartyInviteCodeInspectionRequestDTO,
  PartyInviteInspectionRequestDTO,
  PartyInviteInspectionResponseDTO,
  PartyListResponseDTO,
  PartySummaryDTO,
} from './apiTypes';

export type PartiesApiClientOptions = {
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
};

export class PartiesApiError extends Error {
  status: number;
  code?: PartyErrorCodeDTO;

  constructor(message: string, status: number, code?: PartyErrorCodeDTO) {
    super(message);
    this.name = 'PartiesApiError';
    this.status = status;
    this.code = code;
  }
}

export const createPartiesApiClient = ({
  apiBaseUrl,
  fetchImpl = globalThis.fetch,
}: PartiesApiClientOptions) => {
  const normalizedApiBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '');

  const request = async <T>(path: string, init: RequestInit): Promise<T> => {
    if (normalizedApiBaseUrl === '') {
      throw new PartiesApiError('The party service is unavailable.', 0);
    }

    let response: Response;
    try {
      response = await fetchImpl(`${normalizedApiBaseUrl}${path}`, init);
    } catch {
      throw new PartiesApiError('Could not reach the party service.', 0);
    }

    if (!response.ok) {
      const code = await readPartyErrorCode(response);
      throw new PartiesApiError(safePartyErrorMessage(response.status, code), response.status, code);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new PartiesApiError('The party response could not be read.', response.status);
    }
  };

  const listParties = async (): Promise<PartySummaryDTO[]> => {
    const response = await request<PartyListResponseDTO>('/parties', getRequestInit());
    return response.parties;
  };

  const createParty = (input: CreatePartyRequestDTO): Promise<CreatePartyResponseDTO> => {
    return request<CreatePartyResponseDTO>('/parties', postRequestInit(input));
  };

  const getParty = (partyId: string): Promise<PartyDetailDTO> => {
    return request<PartyDetailDTO>(`/parties/${encodeURIComponent(partyId)}`, getRequestInit());
  };

  const createPartyInvite = (partyId: string): Promise<PartyInviteDTO> => {
    return request<PartyInviteDTO>(
      `/parties/${encodeURIComponent(partyId)}/invites`,
      postRequestInit(),
    );
  };

  const inspectPartyInvite = (
    input: PartyInviteInspectionRequestDTO,
  ): Promise<PartyInviteInspectionResponseDTO> => {
    return request<PartyInviteInspectionResponseDTO>(
      '/party-invites/inspect',
      postRequestInit(input),
    );
  };

  const inspectPartyInviteByCode = (
    input: PartyInviteCodeInspectionRequestDTO,
  ): Promise<PartyInviteInspectionResponseDTO> => {
    return request<PartyInviteInspectionResponseDTO>(
      '/party-invites/code/inspect',
      postRequestInit(input),
    );
  };

  const joinParty = (input: JoinPartyRequestDTO): Promise<JoinPartyResponseDTO> => {
    return request<JoinPartyResponseDTO>('/party-invites/join', postRequestInit(input));
  };

  const joinPartyByCode = (
    input: JoinPartyByCodeRequestDTO,
  ): Promise<JoinPartyResponseDTO> => {
    return request<JoinPartyResponseDTO>('/party-invites/code/join', postRequestInit(input));
  };

  const getPartyCharacter = (
    partyId: string,
    characterId: string,
  ): Promise<CharacterDTO> => {
    return request<CharacterDTO>(
      `/parties/${encodeURIComponent(partyId)}/characters/${encodeURIComponent(characterId)}`,
      getRequestInit(),
    );
  };

  return {
    listParties,
    createParty,
    getParty,
    createPartyInvite,
    inspectPartyInvite,
    inspectPartyInviteByCode,
    joinParty,
    joinPartyByCode,
    getPartyCharacter,
  };
};

const getRequestInit = (): RequestInit => ({
  method: 'GET',
  credentials: 'include',
  headers: {},
});

const postRequestInit = (body?: object): RequestInit => ({
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

const partyErrorCodes: readonly PartyErrorCodeDTO[] = [
  'validation_error',
  'invite_unavailable',
  'authentication_required',
  'forbidden',
  'not_found',
  'already_member',
  'character_already_linked',
  'rate_limited',
  'server_error',
];

const readPartyErrorCode = async (response: Response): Promise<PartyErrorCodeDTO | undefined> => {
  try {
    const body = (await response.json()) as Partial<PartyErrorResponseDTO>;
    return isPartyErrorCode(body.code) ? body.code : undefined;
  } catch {
    return undefined;
  }
};

const isPartyErrorCode = (value: unknown): value is PartyErrorCodeDTO => {
  return (
    typeof value === 'string' &&
    partyErrorCodes.includes(value as PartyErrorCodeDTO)
  );
};

const safePartyErrorMessage = (
  status: number,
  code: PartyErrorCodeDTO | undefined,
): string => {
  switch (code) {
    case 'validation_error':
      return 'Check the party details and try again.';
    case 'invite_unavailable':
      return 'This party invite is unavailable.';
    case 'authentication_required':
      return 'Sign in to continue.';
    case 'forbidden':
      return 'You do not have permission to perform this party action.';
    case 'not_found':
      return 'The requested party resource was not found.';
    case 'already_member':
      return 'You are already a member of this party.';
    case 'character_already_linked':
      return 'This character is already linked to a party.';
    case 'rate_limited':
      return 'Too many party requests. Please try again later.';
    case 'server_error':
      return 'The party request failed. Please try again.';
  }

  switch (status) {
    case 400:
      return 'The party request was invalid.';
    case 401:
      return 'Sign in to continue.';
    case 403:
      return 'You do not have permission to perform this party action.';
    case 404:
      return 'The requested party resource was not found.';
    case 409:
      return 'The party request conflicts with the current state.';
    case 429:
      return 'Too many party requests. Please try again later.';
    default:
      return 'The party request failed. Please try again.';
  }
};
