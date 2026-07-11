# Hunin Public Backend Deployment Runbook

## Public Deployment Goal

Make public signup and login work for the deployed Hunin frontend while keeping the current MVP
backend small and provider-neutral.

The deployed frontend remains:

```text
https://hunin.marceramirez.com
```

The recommended production backend URL is:

```text
https://api.hunin.marceramirez.com
```

This keeps the frontend and backend under the same registrable domain, which fits the current
HttpOnly cookie session design better than a provider-generated backend URL on another domain.

## Current Deployment Status

Status as of 2026-07-11: public Railway deployment is complete and smoke-tested.

Verified:

- Backend health passed at `https://api.hunin.marceramirez.com/healthz` with
  `{"status":"ok","service":"hunin-backend"}`.
- Frontend availability passed at `https://hunin.marceramirez.com` with HTTP 200 through
  Cloudflare.
- Account UI showed Sign in and Create account.
- Public manual smoke test passed: create account, signup, logout, login, generate Fighter through
  Help me choose, save Fighter, return to My characters, saved character listed, open saved
  Character Reference, refresh saved Character Reference URL, and saved character still displayed.
- T-010 Fill the sheet myself V1 public smoke test passed: choose Fill the sheet myself, fill a
  minimum valid manual character, include one optional action and one optional feature, reach
  review, save, open saved Character Reference, refresh saved Character Reference URL, and confirm
  the saved manual character still displayed.
- Both public creation paths now work: Help me choose and Fill the sheet myself.
- Generic avatar fallback displayed for saved generated and manual characters without custom
  portraits.
- Optional manual action displayed in Character Reference.
- Optional manual feature displayed after expanding the existing collapsed Features section.
- Mara sample still opens.
- Quick mobile-width check found no horizontal overflow on home/My characters or sample Character
  Reference.
- No Hunin app bugs were found.

Production residue:

- Disposable account `t010cglx3py@example.com` and characters `Smoke Fighter t010cglx3py` and
  `Smoke Manual t010cglx3py` remain in production because there is no deletion flow yet.

Known non-blocking note:

- Manual features are collapsed by default after refresh because Features is an existing collapsed
  Character Reference section. This is consistent with current behavior.

## Recommended Architecture

- Frontend: static React app at `https://hunin.marceramirez.com`.
- Backend: Go API at `https://api.hunin.marceramirez.com`.
- Database: hosted PostgreSQL.
- Sessions: PostgreSQL-backed server sessions with the `hunin_session` HttpOnly cookie.
- Migrations: manual `golang-migrate` execution for now.
- Provider: Railway for the first public backend deployment.

The current backend entrypoint is:

```text
backend/cmd/server/main.go
```

## Required Backend Environment Variables

Configure these in the backend hosting provider. Do not commit production values.

```sh
APP_ENV=production
DATABASE_URL=<hosted-postgres-url>
ALLOWED_ORIGINS=https://hunin.marceramirez.com
PORT=<provider-managed-or-8080>
```

Notes:

- `DATABASE_URL` is required. The server exits at startup if it is missing.
- `APP_ENV=production` makes the session cookie `Secure`.
- `ALLOWED_ORIGINS` must exactly match the frontend origin. Do not include a trailing slash.
- `PORT` may be injected by the provider. If not, use `8080`.
- Use the PostgreSQL SSL mode required by the provider, commonly `sslmode=require` for public
  managed databases.

## Required Frontend Environment Variables

Configure this in the frontend hosting provider and redeploy the frontend:

```sh
VITE_API_BASE_URL=https://api.hunin.marceramirez.com
```

If `VITE_API_BASE_URL` is absent, the frontend intentionally keeps accounts unavailable and leaves
the Mara guest demo usable.

## DNS Requirements

Create a DNS record for:

```text
api.hunin.marceramirez.com
```

The exact record type depends on the selected provider:

- Use `CNAME` when the provider gives a hostname target.
- Use `A` or `AAAA` records only when the provider gives fixed IP addresses.
- Enable provider-managed HTTPS/TLS for the custom domain.

Do not open public tester access until `https://api.hunin.marceramirez.com/healthz` works over
HTTPS.

## Manual Migration Command

Normal API startup does not run migrations. Apply migrations manually before the first production
backend start, and again before deploying any future schema change.

From the repository root:

```sh
migrate -path backend/migrations \
  -database "$DATABASE_URL" up
```

Use the hosted PostgreSQL production `DATABASE_URL` for production migrations. Confirm the provider's
SSL requirement before running the command.

## Backend Build And Start Commands

The Go module lives in `backend`, so provider root configuration should point there when possible.

Build:

```sh
cd backend
go build -o hunin-backend ./cmd/server
```

Start:

```sh
./hunin-backend
```

Provider alternatives may use:

```sh
cd backend
go run ./cmd/server
```

Prefer a compiled binary for production if the provider supports separate build and start commands.

## CORS And Cookie Requirements

Current behavior:

- Frontend API calls use credentialed requests.
- Backend CORS allows credentials.
- Backend CORS only allows exact configured origins.
- Session cookies are `HttpOnly`.
- Session cookies are `Secure` when `APP_ENV=production`.
- Session cookies use `SameSite=Lax`.
- Session cookies are host-only because no `Domain` attribute is set.

Required production setup:

```sh
APP_ENV=production
ALLOWED_ORIGINS=https://hunin.marceramirez.com
VITE_API_BASE_URL=https://api.hunin.marceramirez.com
```

With the backend under `api.hunin.marceramirez.com`, the app uses different origins but remains
same-site under `marceramirez.com`. That should work with the current `SameSite=Lax` cookie design.

Avoid using a provider-generated backend URL on a different registrable domain for public auth. If
that becomes necessary, plan a small backend security task to make cookie `SameSite=None; Secure`
configurable and review the resulting CSRF posture.

## Deployment Checklist

- [ ] Choose backend and PostgreSQL provider.
- [ ] Provision hosted PostgreSQL.
- [ ] Record production secrets only in provider environment configuration.
- [ ] Configure backend env vars.
- [ ] Run production migrations manually with `golang-migrate`.
- [ ] Deploy the Go backend from the `backend` module.
- [ ] Configure `api.hunin.marceramirez.com` DNS.
- [ ] Enable HTTPS/TLS for the backend custom domain.
- [ ] Confirm `GET https://api.hunin.marceramirez.com/healthz`.
- [ ] Configure frontend `VITE_API_BASE_URL`.
- [ ] Redeploy frontend.
- [ ] Run the public smoke test checklist.
- [ ] Document provider choice and any provider-specific commands.

## Public Smoke Test Checklist

Run against:

```text
https://hunin.marceramirez.com
```

API health check:

```sh
curl https://api.hunin.marceramirez.com/healthz
```

Expected:

```json
{"status":"ok","service":"hunin-backend"}
```

Browser smoke:

- [ ] Signup with a test username, email, and compliant password.
- [ ] Confirm signup sets a `hunin_session` cookie for the backend host.
- [ ] Confirm the signed-in account state appears in the frontend.
- [ ] Logout.
- [ ] Login again with username.
- [ ] Confirm `GET /auth/session` returns the current session.
- [ ] Logout again.
- [ ] Login again with email.
- [ ] Create a generated Fighter.
- [ ] Confirm the saved character appears in My characters.
- [ ] Open the saved Character Reference.
- [ ] Refresh the saved Character Reference URL and confirm the generated character still displays.
- [ ] Create a manual character through Fill the sheet myself.
- [ ] Include one optional manual action and one optional manual feature.
- [ ] Save the manual character.
- [ ] Open the saved manual Character Reference.
- [ ] Refresh the saved manual Character Reference URL and confirm the manual character still
  displays.
- [ ] Confirm the optional manual action displays.
- [ ] Expand Features and confirm the optional manual feature displays.
- [ ] Confirm generic avatar fallback appears for saved characters without custom portraits.
- [ ] Confirm the Mara guest demo remains available without an account.

API smoke, optional:

- [ ] `GET /auth/session` without a valid cookie returns `401`.
- [ ] `GET /characters` without a valid cookie returns `401`.
- [ ] Authenticated `GET /characters` returns only the current user's summaries.
- [ ] Authenticated `GET /characters/{id}` opens only owned characters.

## Known MVP Limitations

- No email verification.
- No password reset.
- No MFA.
- No account deletion flow.
- No production admin panel.
- Public data is early-demo data and should be treated as subject to reset unless a retention policy
  is documented.
- Migrations are manual for now.
- Railway is selected for the first public backend deployment.
- Public Railway deployment is complete and smoke-tested as of 2026-07-11.
- T-010 Fill the sheet myself V1 is complete and publicly smoke-tested as of 2026-07-11.
- Observability and alerting are not yet production-grade.
- Public D&D content must remain limited to content that is safe to publish.

## Deployment-Focused Security Review

Course materials found in the repo:

- `docs/course-rubric.md` section 4: Security by Design, OWASP, SSDLC, DevSecOps, secrets
  management, validation, and auth/authz.
- `docs/course-rubric.md` sections 5, 6, 8, and 10: cloud deployment, CI/CD, DevSecOps,
  observability, logging, and deployment evidence.
- `docs/course-material-index.md`: Module 4 Lesson 5, Module 6 Lessons 1-5, and Module 7 backend
  project references.
- `docs/risks.md`: R-005 guest migration and R-006 party permission exposure.

### OWASP Top 10 Review

| OWASP category | Affected for Hunin? | Current mitigation in repo | MVP risk | Required before public tester access | Deferred hardening |
|---|---|---|---|---|---|
| Broken Access Control | Yes. Character ownership and future party access are security boundaries. | Authenticated character routes derive owner from the session. Owner-scoped character list and detail endpoints are tested. | Medium | Smoke test that users cannot list or open another user's characters. | Party permission matrix and GM access tests before party features. |
| Cryptographic Failures | Yes. Passwords, session tokens, and database credentials are sensitive. | Passwords use Argon2id. Session tokens are random, stored as SHA-256 hashes, and sent in HttpOnly cookies. | Medium | Use HTTPS only. Set `APP_ENV=production`. Store secrets only in provider env vars. | Review password hash parameters periodically. Add backup and retention policy for user data. |
| Injection | Yes. Usernames, emails, character names, and JSON sheet content are user-controlled. | Backend uses pgx parameterized queries and endpoint validation. | Low to Medium | Confirm production endpoints use existing handlers and do not add raw SQL string interpolation. | Add security-focused tests for future free-text fields and notes. |
| Insecure Design | Yes. Deployment decisions affect auth, cookies, and data exposure. | Current design avoids JWT complexity, keeps sessions server-side, and documents manual migration boundaries. | Medium | Use the custom backend subdomain under `marceramirez.com`. Do not switch to cross-site cookies without review. | Add threat model for party sharing, GM visibility, and guest draft migration. |
| Security Misconfiguration | Yes. CORS, cookie security, database URLs, and provider settings can break auth or expose data. | Explicit CORS allowlist. `.env.example` documents local env shape. Production cookie security is tied to `APP_ENV=production`. | Medium | Configure exact `ALLOWED_ORIGINS`. Enable HTTPS. Do not expose database publicly beyond provider requirements. | Add provider-specific deployment docs after provider selection. |
| Vulnerable and Outdated Components | Yes. Go and frontend dependencies need maintenance. | CI and lockfiles exist. Course rubric identifies DevSecOps and security scanning expectations. | Medium | Run existing build/test checks before deploy. Review dependency alerts if available. | Add Dependabot, Snyk, or equivalent security scanning if not already enabled. |
| Identification and Authentication Failures | Yes. Public signup/login is the feature being deployed. | Password policy, generic invalid-login message, server-side sessions, logout revocation, and session tests exist. | Medium | Public smoke test signup, login, current session, logout, expired/revoked session behavior if possible. | Add email verification, password reset, rate limiting, and account recovery. |
| Software and Data Integrity Failures | Some. Deployment artifacts, dependencies, and migrations must be trusted. | Versioned migrations and committed lockfiles provide reproducibility. | Low to Medium | Deploy from main or a reviewed commit. Run migrations from the repository version being deployed. | Add signed releases or stricter deployment provenance if needed. |
| Security Logging and Monitoring Failures | Yes. Public testers may hit auth and persistence failures. | Basic server logs exist through standard logging. | Medium | Ensure provider logs are accessible before tester access. | Add structured JSON logs, request IDs, error tracking, and alerts. |
| Server-Side Request Forgery | Minimal currently. The backend does not fetch arbitrary user-provided URLs. | No URL-fetching feature is in scope. | Low | No action for this deployment. | Re-review if external avatar URLs, imports, AI tools, or remote rules sources are added. |
| Software Supply Chain Failures | Yes, as covered in newer OWASP material. | Dependencies are declared in Go and pnpm lockfiles. | Medium | Deploy from trusted provider and reviewed repository state. Do not install unreviewed packages as part of deploy. | Add dependency scanning and update policy. |
| Exceptional Condition Handling | Yes, as covered in newer OWASP material. Auth and database failures should not leak internals. | Handlers return generic errors for invalid credentials and many auth failures. | Medium | Smoke test failed login, unavailable session, and invalid character access for safe messages. | Add structured error policy and production logging redaction review. |

### Security Review Checklist

Authentication and sessions:

- [ ] `APP_ENV=production` is set before public access.
- [ ] Signup creates an HttpOnly `hunin_session` cookie.
- [ ] The cookie is `Secure` in production.
- [ ] Logout revokes the server-side session.
- [ ] Invalid credentials return a generic message.
- [ ] No email verification or password reset is documented as an MVP limitation.

Password handling:

- [ ] Passwords are never logged.
- [ ] Passwords are never returned by API responses.
- [ ] Password hashes remain Argon2id.
- [ ] Registration password policy is still enforced.

CORS and credentialed requests:

- [ ] `ALLOWED_ORIGINS=https://hunin.marceramirez.com`.
- [ ] Frontend uses `VITE_API_BASE_URL=https://api.hunin.marceramirez.com`.
- [ ] Credentialed requests work in the browser.
- [ ] Disallowed origins cannot complete unsafe credentialed requests.

HTTPS and cookies:

- [ ] Backend custom domain has valid HTTPS.
- [ ] Frontend remains HTTPS.
- [ ] No public auth flow uses plain HTTP.
- [ ] Provider-generated cross-site backend URL is not used for tester access.

Secrets and environment variables:

- [ ] `DATABASE_URL` is configured only in the provider.
- [ ] No production secret is committed.
- [ ] Provider dashboard access is limited to trusted maintainers.
- [ ] Production values are not copied into issue comments, screenshots, or logs.

Database access:

- [ ] Hosted PostgreSQL is not broadly exposed beyond provider requirements.
- [ ] Migrations are run intentionally against the production database.
- [ ] Production migrations are not tested first on production.
- [ ] Backup and retention expectations are documented before treating data as durable.

SQL injection and validation:

- [ ] Existing parameterized queries are used.
- [ ] No deployment hotfix introduces raw SQL string concatenation.
- [ ] Public character creation still uses backend validation.

Sensitive data exposure and errors:

- [ ] Invalid login does not reveal whether username or email exists.
- [ ] API responses do not return password hashes or session token hashes.
- [ ] Character list responses do not include full `referencePayload`.
- [ ] Provider logs do not expose cookies, passwords, or database URLs.

Dependency and update process:

- [ ] Existing checks pass before deployment.
- [ ] Dependency alerts are reviewed before public tester access if available.
- [ ] A follow-up DevSecOps task is created for dependency scanning if missing.

Public demo data expectations:

- [ ] Testers know accounts are early-demo accounts.
- [ ] Testers know data may be reset unless a retention policy is announced.
- [ ] No private campaign secrets or paid D&D book content should be entered for public testing.

## Provider Decision

Railway has been chosen for the first public backend deployment. See `docs/railway-deployment.md`
for the beginner-friendly manual checklist.

The chosen provider must support:

- Go backend service.
- Hosted PostgreSQL or safe connection to hosted PostgreSQL.
- Environment variables.
- Custom domain with HTTPS.
- Access to runtime logs.
- A way to run manual migrations or a separate one-off command.

Record any future provider changes in the project decision log and provider-specific deployment docs.
