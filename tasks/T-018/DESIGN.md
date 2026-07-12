# T-018 Design: Whole-application security baseline

Status: approved

## Approach

Treat security as a release gate across the existing application. Preserve Hunin's current
architecture and add narrow controls at existing HTTP, authentication, character-validation,
configuration, dependency, and deployment boundaries. Do not mix Party implementation into this
task.

## Backend Control Points

### Bounded JSON decoding

Create or reuse one small decoding pattern that applies `http.MaxBytesReader`, validates JSON media
type, rejects unknown fields and trailing values, and maps oversized input to a stable client error.
Apply it consistently to registration, login, and character creation without broad handler rewrites.

The implementation-readiness report measured current fixtures and proposed the candidate limits
below. They remain pending Marcela's final contract approval.

### Authentication abuse protection

Add a bounded in-process limiter appropriate for one Railway application instance. The worker must
first determine a safe key strategy behind Railway's proxy, memory bounds, cleanup behavior, testable
clock design, limit/window values, and `Retry-After` semantics. Do not trust forwarding headers
without a documented proxy boundary.

Keep the existing Argon2id and opaque server-session design. Use a dummy password-hash verification
or another measured constant-work approach for missing users. Use generic public collision behavior
without logging passwords or private email values.

### Character validation

Strengthen existing character validation rather than introduce a second character model. Validate
storage-safe numeric ranges, bounded core strings, serialized payload size, supported schema version,
and the nested shapes/collections needed by current generated and manual CharacterSheetV1 data.
Existing saved fixtures define compatibility evidence.

### Server and response hardening

Replace the bare server startup with an `http.Server` configured with approved timeouts and maximum
header size. Keep detailed startup errors out of provider logs. Add no-store behavior at the narrowest
shared boundary that reliably covers session and private character responses without affecting
public static assets.

### Configuration

Validate production-only assumptions explicitly. Local development remains convenient, but a
production deployment must not silently use insecure cookie or CORS behavior because `APP_ENV` or an
origin variable is missing.

## Proposed Exact Implementation Contract

Status: approved by Marcela on 2026-07-12

### JSON and payload limits

| Boundary | Limit |
|---|---:|
| Registration and login JSON body | 8,192 bytes |
| Character creation JSON body | 131,072 bytes |
| Serialized `referencePayload` | 65,536 bytes |

Use `http.MaxBytesReader` before decoding. Accept `application/json` with optional valid parameters.
Return `415` for a missing/unsupported media type, `413` for an oversized body, and `400` for
malformed JSON, unknown fields, or trailing values.

### Character core and nested limits

Count user-visible limits in Unicode code points.

| Value | Limit or rule |
|---|---|
| Character name | 80 runes |
| Class, subclass, ancestry, background | 64 runes each |
| Nested identifiers and portrait asset IDs | 128 lowercase ASCII letters, digits, or hyphens |
| Nested labels, names, categories, tags, dice, damage/casting/duration/list values | 200 runes |
| Concepts, summaries, notes, audit/source/reminder/detail text | 1,000 runes |
| Character/class level | 1 to 20; class levels sum to top-level level |
| Ability score | 1 to 30 |
| HP current/max/temporary | 0 to 9,999; current cannot exceed max |
| Armor Class | 0 to 100 |
| Speed | 0 to 1,000 feet |
| Initiative, skill, attack, damage modifiers | -100 to 100 |
| Proficiency bonus | 0 to 20 |
| Passive Perception | 0 to 100 |
| Action range | 0 to 10,000; long cannot be below normal |
| Spell level | 0 to 9 |
| Slot level | 1 to 9 |
| Slot max/used | 0 to 99; used cannot exceed max |
| Currency denomination | 0 to 1,000,000 |

All numeric values must be finite integers. Map only known client-caused character range and named
constraint failures to `400`; do not blanket-convert unrelated PostgreSQL errors.

| Collection | Limit |
|---|---:|
| `identity.classes` | 1 to 4 |
| `summary.referenceSections` | 0 to 3, unique IDs |
| `summary.featuredAbilities` | 16 |
| `combat.speed` | exactly one V1 `walk` entry |
| Proficiency skills | 30 |
| Actions | 32 |
| Features | 64 |
| Spells | 128 |
| Spell slots | 9 |
| Damage entries per action | 8 |
| Meta/tags/quick-reference collections | 16 each |
| Audited proficiency/equipment and audit arrays | 64 each |
| Personality lists | 32 each |

Support only `CharacterSheetV1`, system `dnd5e`, and existing rules-version/source-status enums.
Reject unknown nested fields, malformed structures, duplicate collection IDs, and inconsistent
top-level identity/level/ability/HP/armor/speed values. Preserve all current Mara, generated Fighter,
minimum manual, and full manual fixtures. Existing stored rows remain readable; stricter backend
validation applies to new character creation.

### HTTP server and response policy

| Setting | Value |
|---|---:|
| `ReadHeaderTimeout` | 5 seconds |
| `ReadTimeout` | 15 seconds |
| `WriteTimeout` | 30 seconds |
| `IdleTimeout` | 60 seconds |
| `MaxHeaderBytes` | 32 KiB |

Apply `Cache-Control: no-store` to all auth/session and character routes, including error responses.
Apply these headers to every API response:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- production only: `Strict-Transport-Security: max-age=31536000`

Frontend CSP changes remain deferred until staged provider testing proves they do not break the
review deployment.

### Authentication and session policy

Do not use proxy-derived IP headers in T-018 because the investigation did not establish a
spoof-resistant Railway trust boundary.

| Control | Limit |
|---|---:|
| Login global attempts | 30 per minute |
| Login identifier failures | 10 per 10 minutes |
| Registration global valid submissions | 10 per minute |
| Registration canonical-identity submissions | 5 per 60 minutes |
| Concurrent Argon2 operations | 2 across login and registration |

Hash canonical limiter identifiers with SHA-256. Store no raw username, email, password, or token.
Use a mutex-protected sliding-window store with at most 10,000 dynamic keys, event slices capped at
their bucket limit, an injected clock, lazy cleanup every 256 operations and at capacity, and
deterministic least-recently-seen eviction if still full. Do not use sleeps, a background goroutine,
or distributed coordination.

Return generic `429` with `Retry-After` equal to the rounded-up remaining window, clamped from one
second to the applicable window. Use one second for a concurrency-gate rejection. Do not reveal the
rejecting bucket.

Use the same `409` body for duplicate username and email:
`Account could not be created with those details.` Missing or invalid login identifiers must perform
one dummy Argon2id verification at the configured cost and return the existing generic `401` body.

Successful logout and logout without a cookie return `204` and clear the cookie. Repository
revocation failure returns `503` with `could not sign out; please try again` and retains the cookie
for retry.

### Configuration and logging policy

- Require `APP_ENV` to be exactly `local`, `test`, or `production`.
- Require a parseable PostgreSQL `DATABASE_URL` with a host.
- Require a nonempty exact `ALLOWED_ORIGINS` list.
- Reject origin credentials, paths, query, fragment, wildcard, `null`, and duplicates.
- In production require HTTPS origins and reject localhost/loopback.
- Default `PORT` to 8080; otherwise require 1 through 65,535.
- Keep `CookieSecure` derived from `APP_ENV=production`.
- Log only the failing startup stage, never the underlying database/configuration value.
- Align evaluator-facing setup documentation before integration so required `APP_ENV` does not make
  the documented local workflow stale.

Use one frontend API-base parser. Production accepts only an HTTPS origin without credentials, path,
query, or fragment. Development accepts HTTP only for loopback. Invalid/missing configuration keeps
accounts and persistence unavailable while preserving the public sample.

### Repository and CI policy

The proposed final slice will bind Compose PostgreSQL to `127.0.0.1`, keep `pnpm-lock.yaml` as the
package-manager authority, and add high-severity pnpm audit, official Go vulnerability checking, and
a redacted history-aware Gitleaks scan. Defer Dependabot, immutable Action SHA pinning, SBOM, and
provenance signing until after submission.

Deleting `frontend/package-lock.json` and changing CI remain separate approval gates before that
slice. They are not authorized by approval of runtime Slices 1 through 4.

## Repository and Deployment Controls

- Keep `pnpm-lock.yaml` as package-manager authority and remove stale npm lock state if investigation
  confirms npm is unsupported.
- Rerun `pnpm audit`, `go mod verify`, and an available Go vulnerability check.
- Evaluate a small repeatable secret/dependency scan in CI separately from product code. Do not add a
  paid service.
- Bind local PostgreSQL to loopback by default.
- Verify deployed HTTPS, Secure cookie, exact CORS, cache-control, and frontend headers with safe
  read-only requests and a dedicated disposable account when needed.

## Worktree Assessment

- Classification: Red for the whole task because auth, shared server behavior, character validation,
  configuration, CI, and deployment evidence are shared boundaries.
- Recommendation: one dedicated Security worktree, sequential implementation slices, no parallel
  product coding.
- Expected owned files: exact paths must come from the investigation report; likely backend auth,
  characters, server/config/startup and tests, Compose, lockfile/CI configuration, focused security
  documentation, and `tasks/T-018/` when explicitly assigned.
- Prohibited worker files: `CURRENT.md`, `WORKLOG.md`, `DECISIONS.md`, `BACKLOG.md`, shared checklists,
  T-017 task documents, and GitHub planning state.
- Merge dependency: T-018 must integrate and pass CI/deployed verification before T-017 resumes.

## Test Strategy

1. Add one failing focused test for each approved control before implementation.
2. Preserve existing auth/session/ownership regression tests.
3. Use a controllable clock for limiter tests. Do not add real sleeps.
4. Test boundary values immediately below, at, and above every approved limit.
5. Test that errors remain generic and that private responses receive no-store.
6. Run focused backend tests, full backend tests, vet, build, and race-relevant tests where practical.
7. Run full frontend validation for contract regressions.
8. Run dependency/secret checks and deployed read-only verification.

## Risks

- A naive IP limiter may treat every Railway request as one proxy or trust spoofable headers.
- Tight limits may reject current valid character fixtures.
- Dummy Argon2 verification can make tests slow unless dependency seams are narrow and explicit.
- Overbroad no-store or security headers can affect public/static caching or deployment behavior.
- Changing registration errors may require a small frontend copy/test update.
- CI security tooling can add network instability or consume final-week time.
- Broad refactoring would create risk without improving teacher-review security evidence.

## Validation Gate

Implementation cannot begin until the worker reports exact files, values, tests, proxy assumptions,
deployment checks, and deferrals, and Marcela approves the resulting `TASKS.md`.
