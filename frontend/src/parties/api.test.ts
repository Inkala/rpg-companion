import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPartiesApiClient, PartiesApiError } from './api';

const partySummary = {
  id: 'party-1',
  name: 'The Lantern Guard',
  role: 'gm' as const,
  gm: { username: 'lantern-gm' },
  linkedCharacters: [
    { characterName: 'Mara Vale', username: 'mara-player' },
  ],
};

const createdPartySummary = {
  id: 'party-1',
  name: 'The Lantern Guard',
  role: 'gm' as const,
};

const partyDetail = {
  id: 'party-1',
  name: 'The Lantern Guard',
  role: 'gm' as const,
  members: [
    {
      username: 'Mara',
      role: 'gm' as const,
      character: null,
    },
  ],
};

const partyInvite = {
  token: 'opaque-invite-token',
  code: 'ABCD-EFGH',
  createdAt: '2026-07-12T10:00:00Z',
  expiresAt: '2026-07-19T10:00:00Z',
};

const joinResponse = {
  partyId: 'party-1',
  membershipId: 'membership-1',
  role: 'player' as const,
  characterId: 'character-1',
  joinedAt: '2026-07-12T11:00:00Z',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('parties API client', () => {
  it('lists parties with credentials through the configured API base URL', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ parties: [partySummary] }),
    );
    const client = createPartiesApiClient({
      apiBaseUrl: ' https://api.hunin.test/ ',
      fetchImpl: fetchMock,
    });

    await expect(client.listParties()).resolves.toEqual([partySummary]);
    expect(fetchMock).toHaveBeenCalledWith('https://api.hunin.test/parties', {
      method: 'GET',
      credentials: 'include',
      headers: {},
    });
  });

  it('creates a party with JSON and credentials', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(createdPartySummary, 201),
    );
    const client = createClient(fetchMock);

    await expect(client.createParty({ name: 'The Lantern Guard' })).resolves.toEqual(
      createdPartySummary,
    );
    expect(fetchMock).toHaveBeenCalledWith('https://api.hunin.test/parties', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'The Lantern Guard' }),
    });
  });

  it('gets a party with an encoded path segment', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(partyDetail));
    const client = createClient(fetchMock);

    await expect(client.getParty('party/with spaces')).resolves.toEqual(partyDetail);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.hunin.test/parties/party%2Fwith%20spaces',
      {
        method: 'GET',
        credentials: 'include',
        headers: {},
      },
    );
  });

  it('creates a party invite with JSON headers and credentials', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(partyInvite, 201));
    const client = createClient(fetchMock);

    await expect(client.createPartyInvite('party/one')).resolves.toEqual(partyInvite);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.hunin.test/parties/party%2Fone/invites',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  });

  it('inspects an invite with the token only in the JSON body', async () => {
    const token = 'opaque/token?with=sensitive-data';
    const inspection = {
      party: { id: 'party-1', name: 'The Lantern Guard' },
      expiresAt: '2026-07-19T10:00:00Z',
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(inspection));
    const client = createClient(fetchMock);

    await expect(client.inspectPartyInvite({ token })).resolves.toEqual(inspection);
    expect(fetchMock).toHaveBeenCalledWith('https://api.hunin.test/party-invites/inspect', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    expect(fetchMock.mock.calls[0][0]).not.toContain(token);
  });

  it('inspects an invitation code only in the authenticated JSON request body', async () => {
    const code = 'ABCDEFGH';
    const inspection = {
      party: { id: 'party-1', name: 'The Lantern Guard' },
      expiresAt: '2026-07-19T10:00:00Z',
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(inspection));
    const client = createClient(fetchMock);

    await expect(client.inspectPartyInviteByCode({ code })).resolves.toEqual(inspection);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.hunin.test/party-invites/code/inspect',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      },
    );
    expect(fetchMock.mock.calls[0][0]).not.toContain(code);
  });

  it('joins a party with the token and character id only in the JSON body', async () => {
    const token = 'opaque/token?with=sensitive-data';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(joinResponse, 201));
    const client = createClient(fetchMock);

    await expect(
      client.joinParty({ token, characterId: 'character-1' }),
    ).resolves.toEqual(joinResponse);
    expect(fetchMock).toHaveBeenCalledWith('https://api.hunin.test/party-invites/join', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, characterId: 'character-1' }),
    });
    expect(fetchMock.mock.calls[0][0]).not.toContain(token);
  });

  it('joins with an invitation code only in the authenticated JSON request body', async () => {
    const code = 'ABCDEFGH';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(joinResponse, 201));
    const client = createClient(fetchMock);

    await expect(
      client.joinPartyByCode({ code, characterId: 'character-1' }),
    ).resolves.toEqual(joinResponse);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.hunin.test/party-invites/code/join',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, characterId: 'character-1' }),
      },
    );
    expect(fetchMock.mock.calls[0][0]).not.toContain(code);
  });

  it('gets a party character with both path segments encoded', async () => {
    const character = { id: 'character/one', name: 'Branna Shieldhand' };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(character));
    const client = createClient(fetchMock);

    await expect(
      client.getPartyCharacter('party/one', 'character/two with spaces'),
    ).resolves.toEqual(character);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.hunin.test/parties/party%2Fone/characters/character%2Ftwo%20with%20spaces',
      {
        method: 'GET',
        credentials: 'include',
        headers: {},
      },
    );
  });

  it('returns a safe API error with a recognized error code', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ error: 'internal detail', code: 'forbidden' }, 403),
    );
    const client = createClient(fetchMock);

    await expect(client.getParty('party-1')).rejects.toEqual(
      new PartiesApiError('You do not have permission to perform this party action.', 403, 'forbidden'),
    );
  });

  it('supports shared errors without an error code', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ error: 'authentication required' }, 401),
    );
    const client = createClient(fetchMock);

    await expect(client.listParties()).rejects.toEqual(
      new PartiesApiError('Sign in to continue.', 401),
    );
  });

  it('handles non-JSON error responses safely', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('upstream infrastructure detail', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      }),
    );
    const client = createClient(fetchMock);

    await expect(client.listParties()).rejects.toEqual(
      new PartiesApiError('The party request failed. Please try again.', 503),
    );
  });

  it('handles network failures without retaining their sensitive details', async () => {
    const sensitiveDetail = 'opaque-token-in-network-error';
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(
      new Error(`request failed for ${sensitiveDetail}`),
    );
    const client = createClient(fetchMock);

    const error = await client.listParties().catch((caught: unknown) => caught);

    expect(error).toEqual(new PartiesApiError('Could not reach the party service.', 0));
    expect(String(error)).not.toContain(sensitiveDetail);
    expect(JSON.stringify(error)).not.toContain(sensitiveDetail);
  });

  it('never retains an invite token or server request details in an API error', async () => {
    const token = 'opaque-token-that-must-not-escape';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: `invite ${token} from /party-invites/inspect is unavailable`,
          code: 'invite_unavailable',
        },
        400,
      ),
    );
    const client = createClient(fetchMock);

    const error = await client.inspectPartyInvite({ token }).catch((caught: unknown) => caught);

    expect(error).toEqual(
      new PartiesApiError('This party invite is unavailable.', 400, 'invite_unavailable'),
    );
    expect(String(error)).not.toContain(token);
    expect(JSON.stringify(error)).not.toContain(token);
    expect(error).not.toHaveProperty('url');
    expect(error).not.toHaveProperty('body');
    expect(error).not.toHaveProperty('token');
  });

  it('never retains a submitted invitation code in API errors', async () => {
    const code = 'ABCDEFGH';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        { error: `invite code ${code} is unavailable`, code: 'invite_unavailable' },
        400,
      ),
    );
    const client = createClient(fetchMock);

    const error = await client.inspectPartyInviteByCode({ code }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toEqual(
      new PartiesApiError('This party invite is unavailable.', 400, 'invite_unavailable'),
    );
    expect(String(error)).not.toContain(code);
    expect(JSON.stringify(error)).not.toContain(code);
    expect(error).not.toHaveProperty('url');
    expect(error).not.toHaveProperty('body');
    expect(error).not.toHaveProperty('code', code);
  });
});

const createClient = (fetchImpl: typeof fetch) => {
  return createPartiesApiClient({
    apiBaseUrl: 'https://api.hunin.test',
    fetchImpl,
  });
};

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
