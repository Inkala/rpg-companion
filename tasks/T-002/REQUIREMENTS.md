# T-002 Requirements: Authentication and Owner-Scoped Characters

## Goal

Implement local account creation, sign-in, sign-out, current-session lookup, and owner-scoped
character persistence for GitHub issue #7.

## Required behavior

- Guests can continue using the Mara Velard sample flow without an account.
- Local development supports registration, sign-in, current authenticated state, and sign-out with
  the frontend at `http://localhost:5173` and backend at `http://localhost:8080`.
- Public static deployment remains graceful when `VITE_API_BASE_URL` is absent. It must not show
  interactive forms that submit to a missing or invented backend.
- Passwords are hashed with Argon2id.
- Sessions are server-side records in PostgreSQL.
- The browser receives an opaque random session token in an HttpOnly cookie.
- PostgreSQL stores only the SHA-256 hash of the session token.
- Existing character endpoints are protected.
- `POST /characters` derives `owner_subject_id` from the authenticated session.
- `POST /characters` rejects a non-null client-supplied `ownerSubjectId`.
- `GET /characters/{id}` returns a character only when owned by the authenticated user.
- `GET /characters/{id}` returns 404 for missing records and records owned by another user.
- CORS uses an explicit allowlist and unsafe cookie-authenticated requests require an allowed
  `Origin`.

## Non-goals

- No password reset.
- No email verification or confirmation email.
- No OAuth or social login.
- No MFA.
- No account deletion.
- No parties, GM access, invitations, or party authorization.
- No character builder, transfer UI, saved-character list, or account settings page.
- No separate guest draft claim endpoint.
- No draft idempotency migration.

## Username policy

- Usernames are required.
- Usernames are trimmed before validation.
- Usernames are unique and signed in case-insensitively through `username_canonical`.
- `username` stores the trimmed casing entered by the user and is the public in-app identity.
- MVP usernames are ASCII-only.
- Allowed characters are lowercase and uppercase English letters, digits, `_`, and `-`.
- Accented characters, spaces, and other Unicode characters are not supported yet.
- Length is 3-32 characters.
- Profanity filtering, username recovery, and advanced account-management behavior are deferred.

## Email and password policy

- Email is required for registration.
- Email is unique and signed in case-insensitively through `email_canonical`.
- Email is stored as a private, unverified contact/recovery foundation.
- No confirmation email is sent in this milestone.
- Password reset is not implemented in this milestone.
- Sign-in accepts `usernameOrEmail` plus password. Because usernames cannot contain `@`, the
  backend uses the presence of `@` to choose the email lookup path.
- Registration passwords must use 8–128 characters with an uppercase English letter, lowercase
  English letter, digit, and special character.
- A special character is any character that is not an English letter or digit.
- Sign-in failures remain generic and do not reveal password-policy details.

## Acceptance criteria

- Backend auth, session, CORS, and owner access tests pass against PostgreSQL.
- Frontend account UI tests pass.
- Mara Velard guest flow remains usable without backend configuration.
- Local auth works with `VITE_API_BASE_URL=http://localhost:8080`.
- Documentation clearly states public authentication is unavailable until backend deployment.
