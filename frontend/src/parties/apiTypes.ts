export type PartyRoleDTO = 'gm' | 'player';

export type PartySummaryDTO = {
  id: string;
  name: string;
  role: PartyRoleDTO;
};

export type PartyListResponseDTO = {
  parties: PartySummaryDTO[];
};

export type CreatePartyRequestDTO = {
  name: string;
};

export type CreatePartyResponseDTO = PartySummaryDTO;

export type PartyMemberDTO = {
  username: string;
  role: PartyRoleDTO;
  character: {
    id: string;
    name: string;
  } | null;
};

export type PartyDetailDTO = {
  id: string;
  name: string;
  role: PartyRoleDTO;
  members: PartyMemberDTO[];
};

export type PartyInviteDTO = {
  token: string;
  createdAt: string;
  expiresAt: string;
};

export type PartyInviteInspectionRequestDTO = {
  token: string;
};

export type PartyInviteInspectionResponseDTO = {
  party: {
    id: string;
    name: string;
  };
  expiresAt: string;
};

export type JoinPartyRequestDTO = {
  token: string;
  characterId: string;
};

export type JoinPartyResponseDTO = {
  partyId: string;
  membershipId: string;
  role: 'player';
  characterId: string;
  joinedAt: string;
};

export type PartyErrorCodeDTO =
  | 'validation_error'
  | 'invite_unavailable'
  | 'authentication_required'
  | 'forbidden'
  | 'not_found'
  | 'already_member'
  | 'character_already_linked'
  | 'rate_limited'
  | 'server_error';

export type PartyErrorResponseDTO = {
  error: string;
  code?: PartyErrorCodeDTO;
};
