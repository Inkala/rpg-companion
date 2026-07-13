import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CharacterDTO, CharacterSummaryDTO, CreateCharacterRequestDTO } from './apiTypes';
import {
  CharactersApiError,
  createCharacter,
  getCharacterById,
  listCharacterSummaries,
} from './api';

const maraSummary: CharacterSummaryDTO = {
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

const fighterCreateRequest: CreateCharacterRequestDTO = {
  name: 'Branna Shieldhand',
  className: 'Fighter',
  subclassName: null,
  level: 1,
  ancestry: 'Human',
  background: 'Soldier',
  abilityScores: {
    strength: 16,
    dexterity: 11,
    constitution: 15,
    intelligence: 9,
    wisdom: 13,
    charisma: 14,
  },
  hitPoints: { current: 12, max: 12 },
  armorClass: 19,
  speedFt: 30,
  referencePayload: { schemaVersion: 'CharacterSheetV1' },
};

const createdFighter: CharacterDTO = {
  id: '22222222-2222-2222-2222-222222222222',
  ownerSubjectId: '33333333-3333-3333-3333-333333333333',
  ...fighterCreateRequest,
  createdAt: '2026-07-07T10:00:00Z',
  updatedAt: '2026-07-07T10:00:00Z',
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('characters API', () => {
  it('lists character summaries through the configured backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ characters: [maraSummary] }));
    vi.stubEnv('VITE_API_BASE_URL', ' http://localhost:8080/ ');
    vi.stubGlobal('fetch', fetchMock);

    await expect(listCharacterSummaries()).resolves.toEqual([maraSummary]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/characters',
      expect.objectContaining({
        credentials: 'include',
        headers: {},
      }),
    );
  });

  it('preserves the expected character summary response shape', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ characters: [maraSummary] })));

    const [summary] = await listCharacterSummaries();

    expect(summary).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      className: expect.any(String),
      subclassName: expect.any(String),
      level: expect.any(Number),
      ancestry: expect.any(String),
      background: expect.any(String),
      hitPoints: {
        current: expect.any(Number),
        max: expect.any(Number),
      },
      armorClass: expect.any(Number),
      speedFt: expect.any(Number),
      updatedAt: expect.any(String),
    });
  });

  it('creates a character through the configured backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(createdFighter, 201));
    vi.stubEnv('VITE_API_BASE_URL', ' http://localhost:8080/ ');
    vi.stubGlobal('fetch', fetchMock);

    await expect(createCharacter(fighterCreateRequest)).resolves.toEqual(createdFighter);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/characters',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fighterCreateRequest),
      }),
    );
  });

  it('gets a character by id through the configured backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(createdFighter));
    vi.stubEnv('VITE_API_BASE_URL', ' http://localhost:8080/ ');
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCharacterById(createdFighter.id)).resolves.toEqual(createdFighter);

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:8080/characters/${createdFighter.id}`,
      expect.objectContaining({
        credentials: 'include',
        headers: {},
      }),
    );
  });

  it('uses the canonical shared API origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ characters: [maraSummary] }));
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.hunin.example:443/');
    vi.stubGlobal('fetch', fetchMock);

    await expect(listCharacterSummaries()).resolves.toEqual([maraSummary]);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.hunin.example/characters',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('makes no request when the API configuration is invalid', async () => {
    const fetchMock = vi.fn();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.hunin.example/api');
    vi.stubGlobal('fetch', fetchMock);

    await expect(listCharacterSummaries()).rejects.toEqual(
      new CharactersApiError('Characters are unavailable until the backend is configured.', 0),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when the character API is not configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');

    await expect(listCharacterSummaries()).rejects.toEqual(
      new CharactersApiError('Characters are unavailable until the backend is configured.', 0),
    );
  });

  it('throws useful API errors from response bodies', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Could not list characters.' }, 500)),
    );

    await expect(listCharacterSummaries()).rejects.toEqual(
      new CharactersApiError('Could not list characters.', 500),
    );
  });

  it('falls back to the generic character error when the response body is not JSON', async () => {
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

    await expect(listCharacterSummaries()).rejects.toEqual(
      new CharactersApiError('The character request failed.', 503),
    );
  });
});

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
