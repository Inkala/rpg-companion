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

Exact byte limits remain pending the investigation report and fixture-size evidence.

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
