export type AccountMode = 'sign-in' | 'register';

export type AppRoute =
  | { name: 'home' }
  | { name: 'account'; mode: AccountMode }
  | { name: 'profile' }
  | { name: 'new-character' }
  | { name: 'sample-character' }
  | { name: 'saved-character'; id: string }
  | { name: 'not-found' };
