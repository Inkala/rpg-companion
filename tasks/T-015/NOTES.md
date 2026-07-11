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

## 2026-07-11 implementation

- Certain: implementation was explicitly approved and `TASKS.md` was changed to
  `Status: approved` before frontend edits.
- Certain: tests were added before implementation for the route contract, account-menu navigation,
  isolated profile states, and app integration.
- Certain: the first test command was blocked by the shell's Node 20 runtime because pnpm requires
  Node 22.13 or newer. The unchanged tests were rerun with the bundled workspace Node and pnpm.
- Certain: the resulting red run had 9 expected failures and 138 passing regression tests. Missing
  route behavior, profile navigation, the profile component, and app integration caused the
  failures.
- Certain: the bundled pnpm restored the lockfile-defined frontend modules from local cache before
  that red run. No package manifest, lockfile, or dependency version changed.
- Certain: the profile route now parses and serializes as `/profile`; `/profile/edit` remains not
  found.
- Certain: the desktop `My profile` action closes its menu and navigates through the History API.
  `App` receives the existing `popstate` event and renders the central profile route.
- Certain: the profile page shows username-only signed-in content, signed-out sign-in guidance, a
  private-content-safe loading state, and a recoverable error announced with `role="alert"`.
- Certain: header account actions are hidden on the profile route to avoid duplicate account
  controls.
- Certain: no backend, API contract, dependency declaration, Character Reference, or T-014A file
  changed.

## Validation evidence

- Focused requested command: passed. The project test script ran all 15 test files and all 152
  tests passed.
- Frontend lint: passed.
- Frontend typecheck: passed.
- Full frontend tests: 15 files passed, 152 tests passed.
- Frontend production build: passed, 1,847 modules transformed.
- Manual narrow-width browser check: not run because this task did not authorize starting a server.
- Final diff and status checks are recorded in the implementation report.
