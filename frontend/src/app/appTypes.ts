export type AccountMode = 'sign-in' | 'register';

export type AppRoute =
  | { name: 'home' }
  | { name: 'account'; mode: AccountMode }
  | { name: 'profile' }
  | { name: 'new-character' }
  | { name: 'sample-character' }
  | { name: 'saved-character'; id: string }
  | { name: 'new-party' }
  | { name: 'join-party' }
  | { name: 'party'; partyId: string }
  | { name: 'party-character'; partyId: string; characterId: string }
  | { name: 'not-found' };
