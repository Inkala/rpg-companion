import type { AccountMode, AppRoute } from './appTypes';

export const appPaths = {
  home: '/',
  login: '/login',
  signUp: '/sign-up',
  sampleCharacter: '/characters/sample',
} as const;

export function parseAppRoute(pathname: string): AppRoute {
  switch (normalizePathname(pathname)) {
    case appPaths.home:
      return { name: 'home' };
    case appPaths.login:
      return { name: 'account', mode: 'sign-in' };
    case appPaths.signUp:
      return { name: 'account', mode: 'register' };
    case appPaths.sampleCharacter:
      return { name: 'sample-character' };
    default:
      return { name: 'not-found' };
  }
}

export function pathForAccountMode(mode: AccountMode) {
  return mode === 'register' ? appPaths.signUp : appPaths.login;
}

export function pathForRoute(route: AppRoute) {
  switch (route.name) {
    case 'home':
      return appPaths.home;
    case 'account':
      return pathForAccountMode(route.mode);
    case 'sample-character':
      return appPaths.sampleCharacter;
    case 'not-found':
      return appPaths.home;
  }
}

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}
