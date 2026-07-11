# T-015 Notes

## 2026-07-11 planning

- Certain: the signed-in account menu currently renders a `My profile` action that only closes the
  menu and has no navigation callback.
- Certain: the frontend router currently supports home, sign-in, registration, character creation,
  sample Character Reference, saved Character Reference, and not-found routes, but no profile
  route.
- Certain: the existing frontend `AuthUser` contract includes ID, canonical username, and username.
  It does not include email.
- Certain: `App` already owns session restoration, current-user state, account navigation, and
  sign-out behavior.
- Certain: session lookup returns `null` for a 401 and exposes other failures as an app-level session
  error.
- Certain: T-014A declares ownership only of Character Reference mapper, component-test, and scoped
  CSS files.
- Assumption: existing account-page and account-card styles are sufficient for this foundation, so
  no CSS file is planned.

## TDD direction

Start with focused failing tests in four groups: route contract, account-menu navigation, isolated
profile states, and app integration. Record the expected red result before adding each smallest
implementation step. Pay particular attention to preventing private-content flashes while direct
session restoration is pending and hiding identity content after session lookup failures.

Implementation must not begin until `TASKS.md` is explicitly changed to `Status: approved`.

## Deferred work

- Email display and verification.
- Forgot password, password reset, and change password.
- Profile editing, display-name editing, and profile-picture upload.
- Account deletion and character deletion.
- Backend, migration, persistence, and API contract work.
- Character Reference and T-014A work.

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
