# T-018 Tasks: Whole-application security baseline

Status: pending exact implementation contract

Marcela approved the whole-application scope on 2026-07-12. Implementation remains gated on the
Security worker's exact numeric limits, proxy/configuration assumptions, file ownership, test-first
slices, and proposed deferrals. The orchestrator must reconcile that report and change this status to
`approved` before code edits begin.

## 1. Freeze the security contract

- [ ] Confirm the report covers the full current application and record every finding disposition.
- [ ] Freeze exact request, string, numeric, collection, and CharacterSheetV1 limits.
- [ ] Freeze HTTP timeout and header-size values.
- [ ] Freeze proxy-aware authentication limiter keys, limits, windows, cleanup, and response behavior.
- [ ] Freeze generic registration-collision and missing-user timing behavior.
- [ ] Decide which dependency/secret scans enter CI now and which are explicitly deferred.
- [ ] Freeze deployed frontend/backend header and configuration verification steps.
- [ ] Approve exact file ownership and implementation slices.

## 2. Backend request and server baseline

- [ ] Add failing tests for bounded JSON bodies and required media types.
- [ ] Implement bounded shared decoding across current JSON-writing endpoints.
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

## 6. Validation and deployment evidence

- [ ] Run focused security tests and full backend tests, vet, and build.
- [ ] Run full frontend lint, typecheck, tests, and build.
- [ ] Run diff, secret, dependency, and CI validation.
- [ ] Verify production HTTPS, Secure cookie, exact CORS, no-store behavior, and practical security
  headers.
- [ ] Update the security finding matrix with fixed, protected, accepted, or deferred status.
- [ ] Update rubric/submission evidence, orchestration records, and GitHub planning.
- [ ] Resume T-017 only after T-018 is integrated, CI is green, and the deployed baseline passes.
