import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CharacterSummaryDTO } from './apiTypes';
import { CharactersApiError, listCharacterSummaries } from './api';

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
