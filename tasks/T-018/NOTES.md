# T-018 Notes

## 2026-07-12 origin

- Certain: the dedicated review assessed the full repository and current application architecture.
- Certain: it found no current Critical/High data-access vulnerability and no observed production
  secret in the current tree or 93 reachable commits.
- Certain: Argon2id, opaque hashed server sessions, HttpOnly cookies, exact-Origin protection,
  parameterized SQL, React escaping, and owner-scoped character reads are strong existing controls.
- Certain: registration enumeration, unrestricted authentication resource use, unbounded request and
  character payloads, and missing HTTP timeouts are confirmed current weaknesses.
- Certain: production HTTPS, Secure cookie, CORS, frontend headers, and hosting secret state were not
  independently verified by the repository-only review.
- User direction: complete whole-app security review/hardening before continuing new tasks.

## Scope correction

The first orchestration pass incorrectly placed app-wide request limits, timeouts, authentication
throttling, cache behavior, payload validation, and supply-chain work inside T-017A. Those controls
belong to T-018. T-017 retains only Party-specific token, membership, transaction, authorization,
join-throttling, and invite-response requirements and remains paused.

## Current blocker

The Security implementation-readiness report is complete and reconciled into `DESIGN.md`. Marcela
approved the exact contract and authorized Slice 1 only. Slices 2 through 6 remain gated on worker
reports and orchestrator prompts.

## 2026-07-12 scope approval

- Certain: Marcela approved T-018 as the whole-application security gate before new feature work.
- Certain: approval covers the requirements, design approach, paused Party dependency, and dedicated
  Security worktree.
- Completed: the Security worker returned exact implementation values and file ownership for
  orchestrator reconciliation.

## 2026-07-12 implementation-readiness report

- Certain: the report was produced from the clean Security worktree at `5c57fa1` without edits.
- Certain: current fixtures measure from 1,778 to 4,002 request bytes and 1,466 to 6,601 payload
  bytes, supporting the proposed 128 KiB request and 64 KiB payload limits with substantial headroom.
- Certain: the report proposes six sequential TDD slices and exact runtime, validation, limiter,
  response, and configuration values.
- Orchestrator refinement: map only known client-caused character database range/constraint errors
  to `400`; unrelated database errors must remain server errors.
- Orchestrator refinement: update evaluator-facing setup documentation before integration because
  making `APP_ENV` required changes the documented local start contract.
- Separate approval gates: deletion of `frontend/package-lock.json`, CI workflow edits/external
  actions, production configuration changes, and deployed mutation/smoke testing.
- Recommendation: approve the exact contract, authorize Slice 1 only, and require its diff/validation
  report before Slice 2.

## 2026-07-12 exact-contract approval

- Certain: Marcela approved the exact request, payload, validation, timeout, limiter, response,
  configuration, file-ownership, and sequential-slice contract.
- Certain: only Slice 1 is authorized for implementation now.
- Certain: the worker must stop after the Slice 1 diff and validation report.
- Certain: file deletion, CI/external actions, production configuration, and deployed mutation remain
  separately gated.

## 2026-07-13 completion evidence

- Certain: PR #22 integrated the full Security baseline and PR #23 integrated the test-only
  session-restoration stability correction.
- Certain: final `main` commit `cab97da` passed frontend lint, typecheck, 239 tests, build, pnpm
  audit, backend PostgreSQL tests, vet, build, govulncheck, and full-history Gitleaks.
- Certain: Railway reported a successful backend deployment and Cloudflare Pages reported a
  successful frontend deployment for `cab97da`.
- Certain: safe deployed checks confirmed HTTPS, exact allowed-Origin reflection, no credential
  headers for disallowed origins, `403` for disallowed preflight, `Cache-Control: no-store` on
  private auth/character responses, and no `no-store` requirement on health.
- Certain: deployed API responses include `nosniff`, `no-referrer`, frame denial, restrictive API
  CSP, Permissions Policy, and production HSTS.
- Certain: no-session logout returned the clearing `hunin_session` cookie with `HttpOnly`, `Secure`,
  and `SameSite=Lax` without creating or changing production account data.
- Certain: the public frontend returned HTTP 200. Its provider-controlled referrer policy remains
  `strict-origin-when-cross-origin`; stricter frontend CSP and immutable Action SHA pinning remain
  approved post-submission deferrals.
- Certain: T-017 may resume from the verified `cab97da` baseline.

## Final finding disposition matrix

| Review area | Disposition | Evidence or boundary |
|---|---|---|
| Parameterized SQL, opaque sessions, password hashing, owner-scoped character reads | Verified protected | Existing controls preserved by full backend and authorization regression tests |
| Unbounded JSON bodies and permissive decoding | Fixed | Shared bounded strict decoder, endpoint limits, media-type enforcement |
| Missing server timeouts and unsafe configuration defaults | Fixed | Bounded HTTP server and fail-closed validated configuration |
| Missing API security and private cache headers | Fixed | Deployed API header and `no-store` verification |
| Authentication resource exhaustion | Fixed for one instance | Argon2 concurrency gate plus registration and login throttling |
| Account enumeration and missing-user timing | Fixed | Generic collision responses and dummy Argon2 verification |
| Logout persistence failures reported as success | Fixed | Retriable generic `503` without clearing the cookie |
| Shallow or unbounded CharacterSheetV1 payload validation | Fixed | Complete backend and frontend intrinsic validation with boundary tests |
| Client-caused character database constraints exposed as server failures | Fixed | Allowlisted PostgreSQL validation mapping with generic public responses |
| Unsafe or malformed frontend API base configuration | Fixed | Strict environment-aware origin parser and fail-closed clients |
| Stale npm lockfile and broad local PostgreSQL publication | Fixed | pnpm-only lock authority and loopback Compose binding |
| Dependency and historical secret drift | Fixed as repeatable gates | pnpm audit, pinned govulncheck, digest-pinned redacted Gitleaks |
| Production HTTPS, exact CORS, Secure cookies, and private caching | Verified protected | Safe deployed checks on 2026-07-13 |
| Process-local rate-limit state and global shared quotas | Accepted limitation | Suitable for the single-instance educational review deployment |
| Provider-managed frontend CSP/HSTS and immutable Action SHA pinning | Deferred | Current frontend stays HTTPS; API is hardened; revisit after submission |
| Distributed limiting, MFA, OAuth, SBOM, provenance, and long-term monitoring | Deferred/out of scope | Disproportionate to the one-week educational delivery window |
