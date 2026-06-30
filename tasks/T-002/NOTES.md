# T-002 Notes: Authentication and Owner-Scoped Characters

## Startup state

`CURRENT.md` still referenced T-001 persistence review when this milestone began. That state is
stale because the repository already contains the persistence foundation and GitHub issue #7 is now
approved for implementation.

T-001 persistence history is preserved in its original task files and worklog entries. T-002 only
records the authentication and owner-scoped character milestone.

## Scope decisions

- Use one `users` table with password fields.
- Use `user_sessions` for PostgreSQL-backed sessions.
- Use Argon2id password hashing.
- Use opaque cookie session tokens and store only token hashes.
- Do not use JWT.
- Protect existing character endpoints during this milestone.
- Do not add a guest draft claim endpoint or draft idempotency field.
- Public static deployment remains guest-only until backend deployment exists.
- Registration requires username, email, and password.
- Username is the public in-app identity.
- Email is required but unverified; no confirmation email is sent and password reset remains
  deferred.

## Validation status

Implementation and validation are complete.

Completed validation:

- Backend PostgreSQL integration tests with `TEST_DATABASE_URL` against the disposable `hunin_test`
  database.
- Backend `go test ./...`, `go vet ./...`, and `go build ./...`.
- Frontend typecheck, lint, test, and build.
- `git diff --check`.
- Manual browser smoke testing for guest Mara access, registration, refresh session persistence,
  sign-out, username sign-in, email sign-in, invalid password handling, and inline registration
  validation.

The normal local `hunin` database was recreated only after confirming it had zero characters and an
obsolete local auth schema. T-001 persistence history remains preserved in its original task files
and worklog entries.

## Public deployment limitation

The deployed static frontend has no live backend yet. Account forms are hidden when
`VITE_API_BASE_URL` is absent, and the Mara Velard guest flow remains usable. Do not claim public
authentication is live until the backend is deployed.
