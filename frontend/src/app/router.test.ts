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
    expect(parseAppRoute(appPaths.newCharacter)).toEqual({ name: 'new-character' });
    expect(parseAppRoute(appPaths.sampleCharacter)).toEqual({ name: 'sample-character' });
    expect(parseAppRoute('/characters/abc-123')).toEqual({
      name: 'saved-character',
      id: 'abc-123',
    });
  });

  it('parses unknown routes as not found', () => {
    expect(parseAppRoute('/missing')).toEqual({ name: 'not-found' });
    expect(parseAppRoute('/characters')).toEqual({ name: 'not-found' });
    expect(parseAppRoute('/characters/abc-123/extra')).toEqual({ name: 'not-found' });
  });

  it('normalizes trailing slashes except for home', () => {
    expect(parseAppRoute('/login/')).toEqual({ name: 'account', mode: 'sign-in' });
    expect(parseAppRoute('/sign-up/')).toEqual({ name: 'account', mode: 'register' });
    expect(parseAppRoute('/characters/new/')).toEqual({ name: 'new-character' });
    expect(parseAppRoute('/characters/sample/')).toEqual({ name: 'sample-character' });
    expect(parseAppRoute('/characters/abc-123/')).toEqual({
      name: 'saved-character',
      id: 'abc-123',
    });
    expect(parseAppRoute('/')).toEqual({ name: 'home' });
  });

  it('builds paths from account modes and routes', () => {
    expect(pathForAccountMode('sign-in')).toBe(appPaths.login);
    expect(pathForAccountMode('register')).toBe(appPaths.signUp);

    expect(pathForRoute({ name: 'home' })).toBe(appPaths.home);
    expect(pathForRoute({ name: 'account', mode: 'sign-in' })).toBe(appPaths.login);
    expect(pathForRoute({ name: 'account', mode: 'register' })).toBe(appPaths.signUp);
    expect(pathForRoute({ name: 'new-character' })).toBe(appPaths.newCharacter);
    expect(pathForRoute({ name: 'sample-character' })).toBe(appPaths.sampleCharacter);
    expect(pathForRoute({ name: 'saved-character', id: 'abc-123' })).toBe(
      '/characters/abc-123',
    );
    expect(pathForRoute({ name: 'not-found' })).toBe(appPaths.home);
  });
});
