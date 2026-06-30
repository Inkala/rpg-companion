# Decisions

Record durable choices here. Keep entries short.

## Template

```text
## YYYY-MM-DD: Decision title

Context:

Decision:

Reason:

Consequences:
```

## Entries

## 2026-06-27: Product name

Context:
The project needed a one-word name that sounded natural in both English and Spanish, felt fantasy-adjacent, and connected to the idea of a wise animal guide.

Decision:
The product name is **Hunin**.

Reason:
It is inspired by the names of Odin’s ravens, suggests memory and guidance, and is easy to pronounce in English and Spanish.

Consequences:
Future UI, documentation, repository naming, domain research, and branding should use Hunin.

## 2026-06-28: Character persistence foundation

Context:
Hunin needs the first backend foundation for future saved characters without implementing accounts,
sessions, parties, or the character-creation UI.

Decision:
Use PostgreSQL, direct SQL through pgxpool, and versioned SQL migrations with golang-migrate.
Start local PostgreSQL with a root `compose.yaml` database service only. Store explicit relational
core character fields and keep initial actions, features, and spells content in `reference_payload`
JSONB. Keep `owner_subject_id` nullable and reserved for future authenticated ownership.

Reason:
The character core is relational and benefits from schema constraints, while quick-reference content
is still too early to normalize into a full D&D rules model.

Consequences:
Normal API startup does not run migrations. Developers apply migrations explicitly. Integration
tests use `TEST_DATABASE_URL` only and must point at a disposable test database.

## 2026-06-28: Local app-managed authentication

Context:
Hunin needs account creation, sign-in, sign-out, session lookup, and authenticated character
ownership before party features. The deployed frontend is static and the backend is not deployed yet.

Decision:
Use one `users` table with required username, required email, and password authentication. Username
is the public in-app identity. Email is stored as a private, unverified contact/recovery foundation.
Users can sign in with username or email. Use Argon2id password hashes,
PostgreSQL-backed server-side sessions, opaque random session tokens stored only as SHA-256 hashes,
and an HttpOnly cookie. Do not use JWT, OAuth, email verification, confirmation email, password
reset, MFA, account deletion, parties, or GM access in this milestone. Guest drafts remain
localStorage-only until a future UI submits the draft payload to the authenticated `POST /characters`
endpoint.

Reason:
This is the smallest secure design for one Go backend and PostgreSQL. Server-side sessions support
logout and revocation directly, while JWT would add unnecessary token lifecycle complexity.

Consequences:
Character create and read endpoints become protected. The backend derives ownership from the
authenticated session and returns 404 for records the user does not own. The public static frontend
must keep the Mara guest flow usable and present account actions as unavailable until a backend is
deployed.
