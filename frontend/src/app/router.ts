import type { AccountMode, AppRoute } from './appTypes';

export const appPaths = {
  home: '/',
  login: '/login',
  signUp: '/sign-up',
  newCharacter: '/characters/new',
  sampleCharacter: '/characters/sample',
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
    case appPaths.newCharacter:
      return { name: 'new-character' };
    case appPaths.sampleCharacter:
      return { name: 'sample-character' };
    default:
      if (normalizedPathname.startsWith('/characters/')) {
        const id = normalizedPathname.slice('/characters/'.length);
        if (id !== '' && !id.includes('/')) {
          return { name: 'saved-character', id };
        }
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
    case 'new-character':
      return appPaths.newCharacter;
    case 'sample-character':
      return appPaths.sampleCharacter;
    case 'saved-character':
      return `/characters/${route.id}`;
    case 'not-found':
      return appPaths.home;
  }
};

const normalizePathname = (pathname: string) => {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
};
