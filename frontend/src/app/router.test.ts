import { describe, expect, it } from 'vitest';
import {
  appPaths,
  parseAppRoute,
  pathForAccountMode,
  pathForRoute,
} from './router';

describe('router', () => {
  it('parses supported routes', () => {
    expect(parseAppRoute(appPaths.home)).toEqual({ name: 'home' });
    expect(parseAppRoute(appPaths.login)).toEqual({ name: 'account', mode: 'sign-in' });
    expect(parseAppRoute(appPaths.signUp)).toEqual({ name: 'account', mode: 'register' });
    expect(parseAppRoute('/profile')).toEqual({ name: 'profile' });
    expect(parseAppRoute(appPaths.newCharacter)).toEqual({ name: 'new-character' });
    expect(parseAppRoute(appPaths.sampleCharacter)).toEqual({ name: 'sample-character' });
    expect(parseAppRoute('/characters/abc-123')).toEqual({
      name: 'saved-character',
      id: 'abc-123',
    });
  });

  it('parses all Party routes with static routes taking precedence', () => {
    expect(parseAppRoute(appPaths.newParty)).toEqual({ name: 'new-party' });
    expect(parseAppRoute(appPaths.joinParty)).toEqual({ name: 'join-party' });
    expect(parseAppRoute('/parties/party-123')).toEqual({
      name: 'party',
      partyId: 'party-123',
    });
    expect(parseAppRoute('/parties/party-123/characters/character-456')).toEqual({
      name: 'party-character',
      partyId: 'party-123',
      characterId: 'character-456',
    });
  });

  it('splits Party route segments before safely decoding identifiers', () => {
    expect(parseAppRoute('/parties/party%20one')).toEqual({
      name: 'party',
      partyId: 'party one',
    });
    expect(parseAppRoute('/parties/party%2Fone/characters/character%20%231')).toEqual({
      name: 'party-character',
      partyId: 'party/one',
      characterId: 'character #1',
    });
  });

  it('returns not found for malformed Party identifier encodings', () => {
    expect(parseAppRoute('/parties/%')).toEqual({ name: 'not-found' });
    expect(parseAppRoute('/parties/%E0%A4%A')).toEqual({ name: 'not-found' });
    expect(parseAppRoute('/parties/party-123/characters/%')).toEqual({
      name: 'not-found',
    });
  });

  it('parses unknown routes as not found', () => {
    expect(parseAppRoute('/missing')).toEqual({ name: 'not-found' });
    expect(parseAppRoute('/characters')).toEqual({ name: 'not-found' });
    expect(parseAppRoute('/characters/abc-123/extra')).toEqual({ name: 'not-found' });
    expect(parseAppRoute('/profile/edit')).toEqual({ name: 'not-found' });
  });

  it.each([
    '/parties',
    '/parties//',
    '/parties//characters/character-456',
    '/parties/party-123/characters',
    '/parties/party-123/characters/',
    '/parties/party-123//character-456',
    '/parties/party-123/characters//',
    '/parties/party-123/extra',
    '/parties/party-123/characters/character-456/extra',
    '/parties/new//',
    '/parties/join/extra',
  ])('rejects missing, doubled, or extra Party route segments: %s', (pathname) => {
    expect(parseAppRoute(pathname)).toEqual({ name: 'not-found' });
  });

  it('normalizes trailing slashes except for home', () => {
    expect(parseAppRoute('/login/')).toEqual({ name: 'account', mode: 'sign-in' });
    expect(parseAppRoute('/sign-up/')).toEqual({ name: 'account', mode: 'register' });
    expect(parseAppRoute('/profile/')).toEqual({ name: 'profile' });
    expect(parseAppRoute('/characters/new/')).toEqual({ name: 'new-character' });
    expect(parseAppRoute('/characters/sample/')).toEqual({ name: 'sample-character' });
    expect(parseAppRoute('/characters/abc-123/')).toEqual({
      name: 'saved-character',
      id: 'abc-123',
    });
    expect(parseAppRoute('/parties/new/')).toEqual({ name: 'new-party' });
    expect(parseAppRoute('/parties/join/')).toEqual({ name: 'join-party' });
    expect(parseAppRoute('/parties/party-123/')).toEqual({
      name: 'party',
      partyId: 'party-123',
    });
    expect(parseAppRoute('/parties/party-123/characters/character-456/')).toEqual({
      name: 'party-character',
      partyId: 'party-123',
      characterId: 'character-456',
    });
    expect(parseAppRoute('/')).toEqual({ name: 'home' });
  });

  it('builds paths from account modes and routes', () => {
    expect(pathForAccountMode('sign-in')).toBe(appPaths.login);
    expect(pathForAccountMode('register')).toBe(appPaths.signUp);

    expect(pathForRoute({ name: 'home' })).toBe(appPaths.home);
    expect(pathForRoute({ name: 'account', mode: 'sign-in' })).toBe(appPaths.login);
    expect(pathForRoute({ name: 'account', mode: 'register' })).toBe(appPaths.signUp);
    expect(pathForRoute({ name: 'profile' })).toBe('/profile');
    expect(pathForRoute({ name: 'new-character' })).toBe(appPaths.newCharacter);
    expect(pathForRoute({ name: 'sample-character' })).toBe(appPaths.sampleCharacter);
    expect(pathForRoute({ name: 'saved-character', id: 'abc-123' })).toBe(
      '/characters/abc-123',
    );
    expect(pathForRoute({ name: 'new-party' })).toBe(appPaths.newParty);
    expect(pathForRoute({ name: 'join-party' })).toBe(appPaths.joinParty);
    expect(pathForRoute({ name: 'party', partyId: 'party-123' })).toBe(
      '/parties/party-123',
    );
    expect(
      pathForRoute({
        name: 'party-character',
        partyId: 'party-123',
        characterId: 'character-456',
      }),
    ).toBe('/parties/party-123/characters/character-456');
    expect(pathForRoute({ name: 'not-found' })).toBe(appPaths.home);
  });

  it('encodes Party and Character identifiers when serializing', () => {
    expect(pathForRoute({ name: 'party', partyId: 'party/one' })).toBe(
      '/parties/party%2Fone',
    );
    expect(
      pathForRoute({
        name: 'party-character',
        partyId: 'party/one',
        characterId: 'character #1',
      }),
    ).toBe('/parties/party%2Fone/characters/character%20%231');
  });

  it('never serializes an invite token or fragment into the join route', () => {
    const validToken = `${'a'.repeat(41)}_-`;
    const path = pathForRoute({ name: 'join-party' });

    expect(path).toBe('/parties/join');
    expect(path).not.toContain('#');
    expect(path).not.toContain(validToken);
  });
});
