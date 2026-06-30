# T-002 Plan: Authentication and Owner-Scoped Characters

## Approach

Implement backend first:

1. Add users and sessions migrations.
2. Add Argon2id password hashing with centralized parameters.
3. Add PostgreSQL-backed sessions with opaque cookie tokens.
4. Add auth handlers and middleware.
5. Add CORS and unsafe-origin checks.
6. Protect existing character endpoints with owner-scoped access.
7. Add integration tests.

Then implement the smallest frontend account surface:

1. Add an API client that uses `VITE_API_BASE_URL` and `credentials: "include"`.
2. Render register/sign-in/sign-out controls only when an API base URL exists.
3. Show a small unavailable message when no backend is configured.
4. Keep the Mara Velard guest flow unchanged.

## Argon2id configuration

Initial runtime values:

- memory: 64 MiB
- iterations: 3
- parallelism: 1
- salt length: 16 bytes
- key length: 32 bytes

Hash format:

```text
$argon2id$v=19$m=65536,t=3,p=1$<base64-salt>$<base64-hash>
```

Tests may construct lower-cost parameters directly in test code. Normal runtime behavior must not
accept password-cost parameters from public request input.

## Local deployment boundary

Local auth is supported with:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8080`

Future production shape is documented only:

- frontend: `https://hunin.marceramirez.com`
- backend: `https://api.hunin.marceramirez.com`

The public static frontend must not claim authentication is live until the backend is deployed.

## Username policy

Registration uses username, email, and password. Sign-in accepts username or email plus password.
Usernames are trimmed, normalized to lowercase for `username_canonical`, and kept as trimmed entered
casing in `username`. MVP usernames are ASCII-only: lowercase and uppercase English letters, digits,
`_`, and `-`; accented characters, spaces, and other Unicode characters are not supported yet.
Length is 3-32 characters.

Email is required, lowercased for `email_canonical`, unique case-insensitively, and stored as a
private unverified contact/recovery foundation. No confirmation email is sent and password reset is
not implemented in this milestone. Because usernames cannot contain `@`, the backend uses the
presence of `@` in `usernameOrEmail` to choose the email lookup path.
