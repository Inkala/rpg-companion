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

## 2026-07-05: Frontend Node and pnpm versions

Context:
Local dependency installation failed because different pnpm major versions wanted different stores,
and the Homebrew pnpm 11 binary requires a newer Node runtime than the default Node 20 on the
machine.

Decision:
Standardize frontend development on Node 24 LTS and pnpm 11.7.0. Keep `.node-version` set to `24`,
pin `packageManager` to `pnpm@11.7.0`, and use the same pnpm version in CI.

Reason:
Node 24 satisfies the current pnpm 11 runtime requirements, matches the existing `.node-version`,
and keeps local installs, lockfile updates, and CI on one package-manager major version.

Consequences:
Developers should switch to Node 24 before running frontend pnpm commands. Existing Node 20 shells
may fail with pnpm 11. Larger dependency upgrades remain separate from this toolchain alignment.

## 2026-07-05: Manual character entry persistence boundary

Context:
Hunin needs a future `Fill the sheet myself` flow for players who already have character sheets. The
current backend stores required core character fields as relational columns and rich sheet detail as
`reference_payload` JSONB.

Decision:
Manual character entry V1 will save through the existing `POST /characters` contract. Required
summary/core fields map to existing top-level request fields, and richer manual sheet data maps into
`referencePayload` as `CharacterSheetV1`. The first version will not require a database migration.

Reason:
This supports real existing-character transfer while preserving the current backend boundary and
avoiding premature schema changes for skills, features, spells, equipment, and notes.

Consequences:
Manual entry implementation must keep backend top-level fields limited to the current contract.
Rules-rich data should stay in `CharacterSheetV1` JSON until a later task proves a relational column
is needed. Backend validation hardening can be planned separately after the frontend payload shape is
stable.

## 2026-07-10: First public backend deployment provider

Context:
Hunin has a deployed static frontend at `https://hunin.marceramirez.com`, but public signup and
login need a deployed Go backend, hosted PostgreSQL, HTTPS, environment variables, manual
migrations, and a backend custom domain at `https://api.hunin.marceramirez.com`.

Decision:
Use Railway for the first public backend deployment with Railway PostgreSQL, a Go backend service
from the `backend` directory, and the custom backend domain `api.hunin.marceramirez.com`.

Reason:
Railway is one of the course-favored options and is the simplest fit for this MVP because it can keep
the backend service and PostgreSQL in one project, supports environment-variable references, supports
custom domains with HTTPS, and avoids adding Docker or heavier deployment infrastructure for the
first public test.

Consequences:
Deployment remains manual for now. Production migrations still run explicitly with
`golang-migrate`. Frontend deployment must set
`VITE_API_BASE_URL=https://api.hunin.marceramirez.com`. If Hunin later moves the backend to a
different registrable domain, session cookie and CSRF settings must be reviewed again.

## 2026-07-11: Final-week submission priority

Context:
The course-derived project checklist contains a broad set of engineering and product ambitions. The
authoritative TFM document requires a complete README, source repository, deployment when possible,
slides, a narrated screen-capture video, and test credentials. The deadline is 20 July 2026.

Decision:
Use `docs/submission-checklist.md` as the final-week delivery source of truth. Formal submission
artifacts and a stable review path outrank optional product breadth. Treat
`docs/project-checklist.md` as a broader course-evidence backlog, not as the formal submission
contract. Defer AI and large new product flows until the submission package is secure.

Reason:
The project is educational and only needs to remain operational through teacher review. Shipping
slides, video, credentials, accurate documentation, and a reliable demo is more valuable than
starting incomplete party, account, or combat features.

Consequences:
Long-term production operation, indefinite data retention, deletion cleanup, and optional feature
continuity are not final-week requirements. High-value engineering evidence such as ADRs, OpenAPI,
E2E accessibility, coverage, and structured logging may proceed in isolated tasks after required
artifacts are safely scheduled.

## 2026-07-11: Orchestrator owns shared coordination state

Context:
Multiple Codex sessions can work in parallel worktrees, but independent edits to `CURRENT.md`,
`WORKLOG.md`, checklists, and GitHub planning metadata create conflicts and stale status.

Decision:
Use one orchestrator session to assign worktrees, declare file ownership, prepare worker prompts,
review reports, coordinate integration, and update shared local/GitHub planning state. Worker
sessions normally edit only their task folder and declared implementation files.

Reason:
Central shared-state ownership preserves parallel coding while keeping one reliable status record
and merge order.

Consequences:
Worker prompts must require a structured investigation or implementation report. Workers must not
edit shared coordination files, stage, commit, push, rebase, merge, or alter infrastructure unless
explicitly authorized. `docs/orchestration.md` defines the operating contract.
