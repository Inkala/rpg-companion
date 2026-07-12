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

Implementation requires a read-only Security investigation report with exact numeric limits, file
ownership, proxy assumptions, dependency/CI choices, deployed checks, and proposed accepted
limitations. No product or security code is authorized yet.

## 2026-07-12 scope approval

- Certain: Marcela approved T-018 as the whole-application security gate before new feature work.
- Certain: approval covers the requirements, design approach, paused Party dependency, and dedicated
  Security worktree.
- Pending: exact implementation values and file ownership from the Security worker's read-only
  investigation report.
