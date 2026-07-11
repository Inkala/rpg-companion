# T-015 Requirements: Read-only profile page foundation

## Problem

The signed-in account menu includes a `My profile` action, but selecting it only closes the menu.
Hunin has no profile route or profile page, so users cannot open a stable place to view their
current account identity or sign out.

## Goals

- Make the existing `My profile` account-menu action functional.
- Give signed-in users a read-only profile page at `/profile`.
- Give signed-out users a clear sign-in-required state at the same route.
- Keep private account content hidden while the session is loading or has failed.
- Reuse the current frontend authentication contract without backend or API changes.

## Functional requirements

1. The router must parse `/profile` as the profile route.
2. The route builder must serialize the profile route as `/profile`.
3. `/profile/edit` and other unsupported nested profile paths must remain not found.
4. A signed-in user must be able to open `/profile` from the `My profile` account-menu action.
5. Selecting `My profile` must close the account menu.
6. A signed-in profile page must show the authenticated username.
7. The signed-in page must show a neutral message explaining that the profile is read-only or that
   additional account settings are not part of the current demo.
8. The signed-in page must provide sign-out and home or back actions.
9. A signed-out user who opens `/profile` must see a clear sign-in-required state.
10. The signed-out page must provide a sign-in action and a home or back action.
11. The signed-out page must not show private account content.
12. Direct `/profile` navigation must show the signed-in profile after successful session
    restoration.
13. While session restoration is pending, the page must show a loading state and must not briefly
    show the username, sign-out action, or signed-out prompt.
14. A session lookup failure must show a recoverable error state announced with `role="alert"` and
    must not show private account content.
15. Existing registration, sign-in, header account-menu, and sign-out behavior must remain intact.

## Data and privacy requirements

- Use only the existing frontend `AuthUser` fields.
- Display the current username only.
- Do not display, request, infer, or add an email address.
- Do not add profile fields or change the authentication API contract.

## Non-functional requirements

- Keep the page usable at narrow mobile widths without horizontal overflow.
- Use semantic headings, buttons, and status or alert behavior.
- Do not rely on color alone to distinguish loading, error, signed-in, or signed-out states.
- Reuse existing account presentation styles where practical.
- Add no dependencies.
- Keep all changes outside Character Reference files.

## Non-goals

- Email display or email verification.
- Forgot-password, password-reset, or change-password flows.
- Profile editing or display-name editing.
- Profile-picture upload.
- Account or character deletion.
- Backend, migration, persistence, or API contract changes.
- Dependency changes.
- Character Reference or T-014A changes.

## Acceptance criteria

- Focused router tests cover `/profile`, route serialization, and unsupported nested paths.
- Focused account-menu tests prove `My profile` navigates and closes the menu.
- Focused profile-page tests cover signed-in, signed-out, loading, and session-error states.
- App integration tests cover direct session restoration, sign-in navigation, and sign-out from the
  profile page.
- Tests prove email is not exposed when it is absent from the auth contract.
- Existing account behavior remains covered and passing.
- Focused tests, the full frontend suite, frontend lint, typecheck, build, and manual narrow-width
  validation pass before implementation completion.
