# T-018 Requirements: Whole-application security baseline

Status: approved

## Problem

The 2026-07-12 OWASP review covered the complete Hunin repository, not only Party. It confirmed a
strong authentication and ownership foundation, but also confirmed medium-risk weaknesses in the
currently deployed application: unthrottled Argon2 authentication, unbounded request bodies and
character payloads, missing HTTP timeouts, and account-enumeration behavior. Configuration,
cache-control, startup logging, dependency authority, and deployed security headers also need a
deliberate disposition before new product work continues.

## Goal

Establish and verify the smallest defensible security baseline for the entire existing application,
record evidence against `docs/course-rubric.md` section 4, and document explicitly accepted
educational-review limitations before resuming T-017 or another feature.

## Required Behavior

### Secrets and configuration

1. No real `.env`, database credential, session token, invite token, or provider secret is committed.
2. Tracked `.env.example` files document variable names with safe placeholders only.
3. Production values remain in Railway and frontend-hosting configuration.
4. `VITE_*` variables are treated as public browser configuration and never hold secrets.
5. Production configuration fails safely when required HTTPS, environment, database, or exact-origin
   assumptions are absent or invalid.
6. Local Compose PostgreSQL binds to loopback unless a broader local bind is explicitly required.

### Authentication and sessions

7. Registration and login have bounded, testable abuse protection suitable for the deployed
   single-instance educational application.
8. Rate-limited requests return `429` and a safe `Retry-After` value without disclosing whether an
   account exists.
9. Registration collision behavior does not reveal whether a private email is registered.
10. Missing-user login performs equivalent password-verification work unless measurement shows a
    different mitigation is more appropriate.
11. Logout does not silently report successful server revocation when revocation fails.
12. Existing Argon2id, opaque hashed server-session, HttpOnly cookie, SameSite, Secure-cookie, exact
    Origin, session-expiry, and session-revocation behavior remains intact.
13. JWT, OAuth, MFA, verification, reset, and session-management UI are not introduced.

### Request and data validation

14. Every JSON-writing endpoint requires an approved JSON media type, rejects unknown/trailing
    values, and enforces an explicit byte limit.
15. Oversized bodies fail safely without unbounded allocation or internal-error disclosure.
16. User-controlled character strings, numeric values, arrays, and `referencePayload` have explicit
    semantic and storage-safe bounds.
17. Character payload validation rejects malformed or unsupported structures before persistence.
18. Existing valid generated and manual `CharacterSheetV1` payloads remain accepted and renderable.
19. Database range or constraint violations caused by client input map to safe client errors rather
    than unexpected `500` responses.

### HTTP and response hardening

20. The production HTTP server has explicit header, read, write, and idle timeouts plus a bounded
    maximum header size.
21. Startup and database errors written to provider logs do not expose connection strings or other
    sensitive configuration.
22. Authenticated session and character responses use `Cache-Control: no-store`.
23. Error responses remain generic and contain no SQL, stack trace, password hash, session token, or
    configuration secret.
24. Security controls fail closed without breaking `/healthz`, exact CORS, or allowed frontend
    requests.

### Frontend, dependencies, and deployment

25. The frontend continues storing no password or authentication token in localStorage or
    sessionStorage and uses no unsafe HTML or dynamic-code API.
26. `pnpm-lock.yaml` is the single authoritative frontend dependency lockfile unless npm support is
    explicitly justified.
27. Frontend and Go dependency checks are rerun and their results recorded.
28. The repository either adds a lightweight repeatable dependency/secret scan or records why it is
    deferred for the submission window.
29. HTTPS, Secure cookies, exact production CORS, cache behavior, and practical frontend security
    headers are verified against the deployed application.
30. Every review finding receives one disposition: fixed, verified protected, accepted limitation,
    or deferred with reason.

## Non-Goals

- Party tables, invites, endpoints, UI, or authorization.
- JWT or OAuth migration.
- MFA, email verification, password reset, account deletion, or device-management UI.
- Enterprise WAF, SIEM, IDS, distributed rate limiting, or a comprehensive audit platform.
- Long-term backup, retention, encryption, or session-cleanup automation.
- Broad CSP tuning that risks breaking the review deployment without adequate validation time.
- AI integration or API keys.
- Unrelated feature work.

## Acceptance Criteria

- All confirmed current-app findings in Security report section 12 are fixed and tested, or an
  explicit user-approved exception is recorded.
- The relevant P1 items from section 15 are implemented or explicitly dispositioned.
- Existing auth, session, character creation, character listing, saved Character Reference, sample,
  and profile tests remain green.
- Focused security tests cover body limits, throttling, timing mitigation, safe collisions, logout
  failure, numeric/string/payload validation, no-store headers, and server configuration.
- Frontend lint, typecheck, tests, and build pass.
- Backend tests, race-sensitive focused checks where relevant, vet, and build pass.
- Dependency and secret checks have recorded evidence.
- Deployed HTTPS, cookie, CORS, and header smoke checks are recorded.
- `docs/course-rubric.md` section 4 evidence and accepted limitations are updated honestly.
- T-017 remains paused until T-018 is integrated and CI/deployed smoke validation passes.

## Approval Questions

The Security worker must investigate and propose exact values before implementation for:

1. request-body and `referencePayload` limits;
2. string, array, and numeric bounds;
3. HTTP timeouts and maximum header size;
4. authentication throttling keys, limits, windows, cleanup, and proxy behavior;
5. safe registration-collision response;
6. missing-user timing mitigation;
7. dependency/secret scanning included now versus explicitly deferred;
8. deployed frontend security headers that can be added without destabilizing the app.
