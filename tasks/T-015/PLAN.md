# T-015: Read-only profile page foundation

Status: planned

T-015 is a small frontend-only account slice. Implementation is not approved by this planning
step. Start implementation only after `TASKS.md` says `Status: approved`.

## Parallel-work assessment

- Classification: Green for implementation files and Yellow for shared bookkeeping at merge time.
- Recommendation: separate worktree.
- Reason: T-015 is isolated to frontend routing, account navigation, app coordination, and a new
  profile page. T-014A owns only Character Reference implementation files.
- Expected owned files or folders: `tasks/T-015/` and the nine declared frontend implementation
  files.
- Shared files or dependencies: `CURRENT.md` and `WORKLOG.md` only during final bookkeeping.

## Goal

Make the existing `My profile` account-menu action open a safe, read-only profile page at
`/profile` without changing the backend or authentication contract.

## Scope

- Add a dedicated `/profile` frontend route.
- Connect the existing `My profile` account-menu action to that route and close the menu.
- Show the authenticated username and neutral read-only/demo copy to signed-in users.
- Provide sign-out and home or back actions for signed-in users.
- Show a sign-in-required state and sign-in action to signed-out users.
- Show a private-content-safe loading state during direct session restoration.
- Show a recoverable, accessible error state when session lookup fails.
- Preserve existing registration, sign-in, sign-out, and account-menu behavior.

## Out of scope

- Email display or verification.
- Forgot password, password reset, or change password.
- Profile or display-name editing.
- Profile-picture upload.
- Account or character deletion.
- Backend, migration, persistence, or API contract changes.
- Dependencies.
- Character Reference changes.
- T-014A changes.

## Proposed route design

- Add `{ name: 'profile' }` to `AppRoute`.
- Add `/profile` to the central app paths.
- Parse `/profile` as the profile route and serialize the profile route to `/profile`.
- Keep `/profile/edit` and other unsupported nested paths in the not-found state.
- Navigate through the existing app route coordinator rather than dispatching a custom browser
  event.
- Keep the route publicly addressable and render its content from session state.

## Proposed UI design

Use a focused `ProfilePage` with explicit signed-in, signed-out, loading, and error states.

- Signed in: show `My profile`, the username, neutral read-only/demo copy, sign out, and home or
  back.
- Signed out: show `Sign in to view your profile`, explanatory copy, sign in, and home or back.
- Loading: show `Checking your account...` without username, sign-out, or signed-out prompt.
- Error: show `Could not load your profile`, announce the error with `role="alert"`, provide
  recovery navigation, and hide private content.

Reuse existing account-page and account-card presentation styles unless a focused profile style is
proven necessary during implementation.

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

Do not edit these files until implementation is explicitly approved.

## Recommended implementation shape

1. Add focused failing router tests, then add only the profile route contract.
2. Add failing account-menu tests, then wire a dedicated profile navigation callback.
3. Add failing isolated profile-page tests for all session states, then add the page component.
4. Add failing app integration tests, then connect profile routing and loading-safe session state in
   the app coordinator.
5. Run focused and full frontend validation plus a manual narrow-width check.

## Risks

- The current session-loading state begins as false and is set inside an effect, which could flash
  a signed-out profile state before direct session restoration begins.
- Session errors could accidentally leave stale identity content visible.
- Adding an `AppRoute` variant requires every route parser and serializer switch to remain
  exhaustive.
- Reused account CSS could create unintended changes if broad selectors are modified.
- T-014A and T-015 may both update `CURRENT.md` and `WORKLOG.md` during final bookkeeping.

Mitigate these risks with loading-first integration tests, error-state privacy assertions,
exhaustive router tests, no broad CSS changes, disjoint implementation ownership, and an explicit
merge order for shared bookkeeping.

## Planning validation

Run:

```sh
git diff --check
git status --short --branch
```

## Proposed docs commit message

```text
docs(accounts): plan read-only profile page
```
