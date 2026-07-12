# T-018 Tasks: Whole-application security baseline

Status: approved

Marcela approved the whole-application scope on 2026-07-12. Implementation remains gated on the
Security worker's implementation-readiness report arrived on 2026-07-12. The orchestrator reconciled
its proposed numeric limits, proxy/configuration assumptions, file ownership, test-first slices, and
deferrals into `DESIGN.md`. Marcela approved the exact contract and authorized Slice 1 on
2026-07-12. Later slices still require an orchestrator prompt, and deletion, CI/infrastructure, and
production changes retain their explicit approval gates.

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
- [ ] Add failing tests for bounded JSON bodies and required media types.
- [ ] Implement bounded shared decoding across current JSON-writing endpoints.
- [ ] Stop after Slice 1 diff and validation report. Do not begin server/configuration work without
  orchestrator approval.
- [ ] Add failing server timeout, header-size, safe-startup-error, and production-config tests.
- [ ] Implement the approved server and configuration hardening.
- [ ] Add and verify `Cache-Control: no-store` on private responses.

## 3. Authentication and session hardening

- [ ] Add failing login/register throttling tests with a controllable clock.
- [ ] Implement bounded authentication throttling and `429`/`Retry-After` behavior.
- [ ] Add failing registration-enumeration and missing-user timing-mitigation tests.
- [ ] Implement generic collision handling and approved constant-work behavior.
- [ ] Add failing logout-revocation-error behavior and implement the approved response.
- [ ] Preserve all existing password, session, cookie, CORS, CSRF, expiry, and revocation tests.

## 4. Character validation hardening

- [ ] Measure current generated/manual fixture sizes and nested shapes.
- [ ] Add failing boundary tests for strings, numbers, arrays, and payload size/schema.
- [ ] Implement storage-safe semantic validation without rejecting current valid fixtures.
- [ ] Map client-caused database range/conflict cases to safe client errors.
- [ ] Preserve owner-scoped `404` behavior and Character Reference rendering.

## 5. Repository, dependency, and local configuration

- [ ] Confirm pnpm is the only supported frontend package manager.
- [ ] Remove stale `frontend/package-lock.json` only after explicit approval.
- [ ] Bind local PostgreSQL to loopback unless investigation finds a documented need not to.
- [ ] Run and record pnpm and Go dependency verification.
- [ ] Add or explicitly defer lightweight dependency and secret scanning.
- [ ] Obtain explicit infrastructure approval before editing `.github/workflows/ci.yml` or adding
  external security actions.

## 6. Validation and deployment evidence

- [ ] Run focused security tests and full backend tests, vet, and build.
- [ ] Run full frontend lint, typecheck, tests, and build.
- [ ] Run diff, secret, dependency, and CI validation.
- [ ] Verify production HTTPS, Secure cookie, exact CORS, no-store behavior, and practical security
  headers.
- [ ] Update the security finding matrix with fixed, protected, accepted, or deferred status.
- [ ] Update rubric/submission evidence, orchestration records, and GitHub planning.
- [ ] Resume T-017 only after T-018 is integrated, CI is green, and the deployed baseline passes.
