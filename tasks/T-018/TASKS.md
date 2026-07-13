# T-018 Tasks: Whole-application security baseline

Status: completed

Marcela approved the whole-application scope and exact contract on 2026-07-12. All six sequential
slices were reviewed, committed, and integrated through PR #22. The post-merge frontend timing
follow-up was integrated through PR #23. Final `main` CI and safe deployed verification passed on
2026-07-13.

## 1. Freeze the security contract

- [x] Confirm the report covers the full current application and record every finding disposition.
- [x] Freeze exact request, string, numeric, collection, and CharacterSheetV1 limits.
- [x] Freeze HTTP timeout and header-size values.
- [x] Freeze proxy-aware authentication limiter keys, limits, windows, cleanup, and response behavior.
- [x] Freeze generic registration-collision and missing-user timing behavior.
- [x] Decide which dependency/secret scans enter CI now and which are explicitly deferred.
- [x] Freeze deployed frontend/backend header and configuration verification steps.
- [x] Approve exact file ownership and implementation slices.

Proposed sequential slices after approval:

1. bounded JSON decoder and current endpoint limits;
2. server timeouts, fail-closed config, no-store, API headers, and safe startup logs;
3. authentication limiter, Argon2 concurrency gate, dummy verification, generic collisions, and
   logout failure;
4. backend/frontend CharacterSheetV1 validation;
5. Compose, lockfile, dependency, and secret CI changes, with separate deletion/infrastructure
   approval;
6. full validation and deployed evidence.

## 2. Backend request and server baseline

- [x] Authorize Slice 1 ownership only:
  - add `backend/internal/httpjson/decode.go` and `decode_test.go`;
  - add `backend/internal/auth/handler_test.go` if focused tests cannot remain in server tests;
  - edit `backend/internal/auth/handler.go`;
  - edit `backend/internal/characters/handler.go` and `handler_test.go`.
- [x] Add failing tests for bounded JSON bodies and required media types.
- [x] Implement bounded shared decoding across current JSON-writing endpoints.
- [x] Stop after Slice 1 diff and validation report. Do not begin server/configuration work without
  orchestrator approval.
- [x] Add failing server timeout, header-size, safe-startup-error, and production-config tests.
- [x] Implement the approved server and configuration hardening.
- [x] Add and verify `Cache-Control: no-store` on private responses.

## 3. Authentication and session hardening

- [x] Add failing login/register throttling tests with a controllable clock.
- [x] Implement bounded authentication throttling and `429`/`Retry-After` behavior.
- [x] Add failing registration-enumeration and missing-user timing-mitigation tests.
- [x] Implement generic collision handling and approved constant-work behavior.
- [x] Add failing logout-revocation-error behavior and implement the approved response.
- [x] Preserve all existing password, session, cookie, CORS, CSRF, expiry, and revocation tests.

## 4. Character validation hardening

- [x] Measure current generated/manual fixture sizes and nested shapes.
- [x] Add failing boundary tests for strings, numbers, arrays, and payload size/schema.
- [x] Implement storage-safe semantic validation without rejecting current valid fixtures.
- [x] Map client-caused database range/conflict cases to safe client errors.
- [x] Preserve owner-scoped `404` behavior and Character Reference rendering.

## 5. Repository, dependency, and local configuration

- [x] Confirm pnpm is the only supported frontend package manager.
- [x] Remove stale `frontend/package-lock.json` only after explicit approval.
- [x] Bind local PostgreSQL to loopback unless investigation finds a documented need not to.
- [x] Run and record pnpm and Go dependency verification.
- [x] Add or explicitly defer lightweight dependency and secret scanning.
- [x] Obtain explicit infrastructure approval before editing `.github/workflows/ci.yml` or adding
  external security actions.

## 6. Validation and deployment evidence

- [x] Run focused security tests and full backend tests, vet, and build.
- [x] Run full frontend lint, typecheck, tests, and build.
- [x] Run diff, secret, dependency, and CI validation.
- [x] Verify production HTTPS, Secure cookie, exact CORS, no-store behavior, and practical security
  headers.
- [x] Update the security finding matrix with fixed, protected, accepted, or deferred status.
- [x] Update rubric/submission evidence, orchestration records, and GitHub planning.
- [x] Resume T-017 only after T-018 is integrated, CI is green, and the deployed baseline passes.
