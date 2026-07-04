export type AccountMode = 'sign-in' | 'register';

export type AppRoute =
  | { name: 'home' }
  | { name: 'account'; mode: AccountMode }
  | { name: 'sample-character' }
  | { name: 'not-found' };
