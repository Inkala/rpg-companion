# T-015 Tasks: Read-only profile page foundation

Status: planned

Implementation is not approved. Do not edit frontend files until this document is explicitly
changed to `Status: approved`.

## Parallel-work assessment

- Classification: Green for implementation files and Yellow for shared bookkeeping at merge time.
- Recommendation: separate worktree.
- Reason: T-015 routing, account navigation, app coordination, and profile-page files are disjoint
  from T-014A Character Reference ownership.
- Expected owned files or folders: `tasks/T-015/` and the nine declared frontend implementation
  files.
- Shared files or dependencies: `CURRENT.md` and `WORKLOG.md` only during final bookkeeping.

## 1. Test the route first

- [ ] Add a failing test proving `/profile` parses as `{ name: 'profile' }`.
- [ ] Add a failing test proving the profile route serializes to `/profile`.
- [ ] Add a test proving `/profile/edit` remains not found.
- [ ] Run the focused router tests and record the expected red result.
- [ ] Add only the profile route type, path, parser, and serializer behavior.

## 2. Test account-menu navigation first

- [ ] Add a failing test proving `My profile` invokes profile navigation.
- [ ] Prove selecting `My profile` closes the account menu.
- [ ] Preserve existing signed-in, signed-out, and sign-out account-menu tests.
- [ ] Run the focused account-header tests and record the expected red result.
- [ ] Add the smallest dedicated profile-navigation callback.

## 3. Test profile states first

- [ ] Add a failing signed-in test proving the username renders.
- [ ] Add a test proving the signed-in page does not expose email when email is absent from the auth
  contract.
- [ ] Add a signed-in test for neutral read-only/demo copy, sign out, and home or back.
- [ ] Add a signed-out test for clear sign-in-required copy.
- [ ] Add a signed-out test proving the sign-in action invokes sign-in navigation.
- [ ] Add a loading-state test proving username, sign out, and the signed-out prompt remain hidden.
- [ ] Add a session-error test proving the error uses `role="alert"` and private content remains
  hidden.
- [ ] Run the focused profile-page tests and record the expected red result.
- [ ] Implement the smallest `ProfilePage` component for the tested states.

## 4. Test app integration first

- [ ] Add a failing test proving direct `/profile` navigation restores and shows a valid session.
- [ ] Add a test proving pending session restoration does not briefly show private content or the
  signed-out prompt.
- [ ] Add a test proving an unauthenticated session shows the sign-in-required state.
- [ ] Add a test proving the profile sign-in action navigates to `/login`.
- [ ] Add a test proving a session lookup failure shows a recoverable error state.
- [ ] Add a test proving the account menu navigates to `/profile` and closes.
- [ ] Add a test proving sign out from the profile calls the current sign-out API behavior and
  returns home.
- [ ] Run the focused app tests and record the expected red result.
- [ ] Wire the profile route and loading-safe session state through `App`.

## 5. Regression validation

- [ ] Run focused router, account-header, profile-page, and app tests.
- [ ] Run the full frontend test suite.
- [ ] Run frontend lint.
- [ ] Run frontend typecheck.
- [ ] Run the frontend build.
- [ ] Check `/profile` at a narrow mobile width for readability and horizontal overflow.
- [ ] Confirm existing registration, sign-in, header account-menu, and sign-out behavior.
- [ ] Confirm no email or other unavailable account data is rendered.
- [ ] Confirm no Character Reference file changed.
- [ ] Run `git diff --check`.
- [ ] Run `git status --short --branch`.

## 6. Bookkeeping

- [ ] Update `NOTES.md` with red/green implementation and validation evidence.
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
