# T-015 Tasks: Read-only profile page foundation

Status: approved

Implementation was explicitly approved on 2026-07-11. Use the test-first sequence below and edit
only the approved T-015 files.

## Parallel-work assessment

- Classification: Green for implementation files and Yellow for shared bookkeeping at merge time.
- Recommendation: separate worktree.
- Reason: T-015 routing, account navigation, app coordination, and profile-page files are disjoint
  from T-014A Character Reference ownership.
- Expected owned files or folders: `tasks/T-015/` and the nine declared frontend implementation
  files.
- Shared files or dependencies: `CURRENT.md` and `WORKLOG.md` only during final bookkeeping.

## 1. Test the route first

- [x] Add a failing test proving `/profile` parses as `{ name: 'profile' }`.
- [x] Add a failing test proving the profile route serializes to `/profile`.
- [x] Add a test proving `/profile/edit` remains not found.
- [x] Run the focused router tests and record the expected red result.
- [x] Add only the profile route type, path, parser, and serializer behavior.

## 2. Test account-menu navigation first

- [x] Add a failing test proving `My profile` invokes profile navigation.
- [x] Prove selecting `My profile` closes the account menu.
- [x] Preserve existing signed-in, signed-out, and sign-out account-menu tests.
- [x] Run the focused account-header tests and record the expected red result.
- [x] Add the smallest dedicated profile-navigation callback.

## 3. Test profile states first

- [x] Add a failing signed-in test proving the username renders.
- [x] Add a test proving the signed-in page does not expose email when email is absent from the auth
  contract.
- [x] Add a signed-in test for neutral read-only/demo copy, sign out, and home or back.
- [x] Add a signed-out test for clear sign-in-required copy.
- [x] Add a signed-out test proving the sign-in action invokes sign-in navigation.
- [x] Add a loading-state test proving username, sign out, and the signed-out prompt remain hidden.
- [x] Add a session-error test proving the error uses `role="alert"` and private content remains
  hidden.
- [x] Run the focused profile-page tests and record the expected red result.
- [x] Implement the smallest `ProfilePage` component for the tested states.

## 4. Test app integration first

- [x] Add a failing test proving direct `/profile` navigation restores and shows a valid session.
- [x] Add a test proving pending session restoration does not briefly show private content or the
  signed-out prompt.
- [x] Add a test proving an unauthenticated session shows the sign-in-required state.
- [x] Add a test proving the profile sign-in action navigates to `/login`.
- [x] Add a test proving a session lookup failure shows a recoverable error state.
- [x] Add a test proving the account menu navigates to `/profile` and closes.
- [x] Add a test proving sign out from the profile calls the current sign-out API behavior and
  returns home.
- [x] Run the focused app tests and record the expected red result.
- [x] Wire the profile route and loading-safe session state through `App`.

## 5. Regression validation

- [x] Run focused router, account-header, profile-page, and app tests.
- [x] Run the full frontend test suite.
- [x] Run frontend lint.
- [x] Run frontend typecheck.
- [x] Run the frontend build.
- [ ] Check `/profile` at a narrow mobile width for readability and horizontal overflow.
- [x] Confirm existing registration, sign-in, header account-menu, and sign-out behavior.
- [x] Confirm no email or other unavailable account data is rendered.
- [x] Confirm no Character Reference file changed.
- [x] Run `git diff --check`.
- [x] Run `git status --short --branch`.

## 6. Bookkeeping

- [x] Update `NOTES.md` with red/green implementation and validation evidence.
- [ ] Update `CURRENT.md` with one clear next action after coordinating with T-014A.
- [ ] Append a short `WORKLOG.md` entry after coordinating merge order with T-014A.

## Expected implementation files

- `frontend/src/app/appTypes.ts`
- `frontend/src/app/router.ts`
- `frontend/src/app/router.test.ts`
- `frontend/src/accounts/AccountHeaderActions.tsx`
- `frontend/src/accounts/AccountHeaderActions.test.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/pages/ProfilePage.test.tsx`

## Proposed implementation commit message

```text
feat(accounts): add read-only profile page
```
