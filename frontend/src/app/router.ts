import type { AccountMode, AppRoute } from './appTypes';

export const appPaths = {
  home: '/',
  login: '/login',
  signUp: '/sign-up',
  profile: '/profile',
  newCharacter: '/characters/new',
  sampleCharacter: '/characters/sample',
  newParty: '/parties/new',
  joinParty: '/parties/join',
} as const;

export const parseAppRoute = (pathname: string): AppRoute => {
  const normalizedPathname = normalizePathname(pathname);

  switch (normalizedPathname) {
    case appPaths.home:
      return { name: 'home' };
    case appPaths.login:
      return { name: 'account', mode: 'sign-in' };
    case appPaths.signUp:
      return { name: 'account', mode: 'register' };
    case appPaths.profile:
      return { name: 'profile' };
    case appPaths.newCharacter:
      return { name: 'new-character' };
    case appPaths.sampleCharacter:
      return { name: 'sample-character' };
    case appPaths.newParty:
      return { name: 'new-party' };
    case appPaths.joinParty:
      return { name: 'join-party' };
    default:
      if (normalizedPathname.startsWith('/characters/')) {
        const id = normalizedPathname.slice('/characters/'.length);
        if (id !== '' && !id.includes('/')) {
          return { name: 'saved-character', id };
        }
      }

      if (normalizedPathname.startsWith('/parties/')) {
        return parsePartyRoute(normalizedPathname);
      }

      return { name: 'not-found' };
  }
};

export const pathForAccountMode = (mode: AccountMode) => {
  return mode === 'register' ? appPaths.signUp : appPaths.login;
};

export const pathForRoute = (route: AppRoute) => {
  switch (route.name) {
    case 'home':
      return appPaths.home;
    case 'account':
      return pathForAccountMode(route.mode);
    case 'profile':
      return appPaths.profile;
    case 'new-character':
      return appPaths.newCharacter;
    case 'sample-character':
      return appPaths.sampleCharacter;
    case 'saved-character':
      return `/characters/${route.id}`;
    case 'new-party':
      return appPaths.newParty;
    case 'join-party':
      return appPaths.joinParty;
    case 'party':
      return `/parties/${encodeURIComponent(route.partyId)}`;
    case 'party-character':
      return `/parties/${encodeURIComponent(route.partyId)}/characters/${encodeURIComponent(route.characterId)}`;
    case 'not-found':
      return appPaths.home;
  }
};

const parsePartyRoute = (pathname: string): AppRoute => {
  const segments = pathname.split('/');

  if (segments.length === 3) {
    const partyId = decodeIdentifier(segments[2]);
    return partyId === null ? { name: 'not-found' } : { name: 'party', partyId };
  }

  if (segments.length === 5 && segments[3] === 'characters') {
    const partyId = decodeIdentifier(segments[2]);
    const characterId = decodeIdentifier(segments[4]);

    if (partyId !== null && characterId !== null) {
      return { name: 'party-character', partyId, characterId };
    }
  }

  return { name: 'not-found' };
};

const decodeIdentifier = (segment: string | undefined) => {
  if (segment === undefined || segment === '') {
    return null;
  }

  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
};

const normalizePathname = (pathname: string) => {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
};
