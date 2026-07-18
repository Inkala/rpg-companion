# T-024 Design: Quick QA Consistency Fixes

Status: approved

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: separate implementation worktree.
- Reason: compact but cross-cutting frontend UI task touching app shell, account form, Home,
  Character Reference, guided selection, and Party presentation.
- Expected owned files or folders: app shell, account components, Home components, Character
  Reference components, Party presentation components, and focused frontend tests.
- Shared files or dependencies: Sonner toast surface, Lucide icons, route serializer, auth/session
  state, Party read-only Character Reference route, and shared CSS tokens.

## Ownership boundary

Expected owned files:

- `frontend/src/app/AppShell.tsx`
- `frontend/src/app/AppShell.test.tsx`
- `frontend/src/app/appShell.css`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/accounts/AuthForm.tsx`
- `frontend/src/accounts/AuthForm.test.tsx`
- `frontend/src/accounts/AccountHeaderActions.tsx`
- `frontend/src/accounts/AccountHeaderActions.test.tsx`
- `frontend/src/accounts/accounts.css`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/features/home/HomeActions.tsx`
- `frontend/src/features/home/SignedInHomeContent.tsx`
- `frontend/src/features/home/home.css`
- `frontend/src/character-creation/CharacterCreationPage.tsx`
- `frontend/src/character-creation/CharacterCreationPage.test.tsx`
- `frontend/src/character-creation/characterCreation.css`
- `frontend/src/characters/ReferenceItemRow.tsx`
- `frontend/src/characters/QuickReferenceSheet.tsx`
- `frontend/src/characters/CharacterReference.tsx`
- `frontend/src/characters/CharacterReference.test.tsx`
- `frontend/src/characters/SavedCharacterReferencePage.tsx`
- `frontend/src/characters/SavedCharacterReferencePage.test.tsx`
- `frontend/src/characters/characters.css`
- `frontend/src/parties/PartyPage.tsx`
- `frontend/src/parties/PartyPage.test.tsx`
- `frontend/src/parties/PartyList.tsx`
- `frontend/src/parties/PartyList.test.tsx`
- `frontend/src/parties/PartyCharacterReferencePage.tsx`
- `frontend/src/parties/PartyCharacterReferencePage.test.tsx`
- `frontend/src/parties/parties.css`

Additional files require approval before editing.

## Accessibility contract

- All new controls must be keyboard reachable and at least 44px where touch-target sizing applies.
- Sign-out dialog traps focus, closes on Escape, returns focus, and has clear accessible naming.
- Menu destinations are equivalent across desktop and mobile.
- Toast close control remains keyboard reachable with opaque focus styling.
- Guided selection preserves radio/checked semantics after visible `Selected` text is removed.
- Quick Reference modal preserves focus trap, Escape, close button, focus return, headings, and
  screen-reader naming.
- Party Eye action has a complete accessible label and visible tooltip where appropriate.

## Validation contract

- Focused tests for account confirmation, navigation menu, sign-out dialog, toast variants, empty
  Home copy, guided selection, Quick Reference detail/clickability, and Party presentation.
- Full frontend gates.
- Backend regression.
- Browser checks at `320px`, `390px`, `720px`, and desktop.
