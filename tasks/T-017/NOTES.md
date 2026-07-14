# T-017 Notes

## 2026-07-12 planning

- Certain: authentication, owner-scoped characters, My characters, and saved Character Reference
  already provide the identity and character prerequisites.
- Certain: there is no party migration, backend package, endpoint, frontend route, API helper, or
  functional Home party action today.
- Certain: the original docs define Party, PartyMembership, per-party roles, GM-scoped read access,
  one linked character per party membership, and backend-enforced authorization.
- Certain: the stricter current documented rule says a character can be linked to at most one party
  at a time.
- Certain: the course security rubric requires explicit Broken Access Control tests.
- Certain: Marcela later approved a reusable opaque copied invite link as the delivery mechanism.
- Certain: Marcela later approved a seven-day invite lifetime.
- Certain: Marcela later approved no linked character for the creating GM in this MVP.

## 2026-07-12 approval

- Certain: Marcela approved T-017 and all seven proposed defaults.
- Certain: the invite is a copied opaque link with no email/SMS delivery, reusable for seven days,
  and regeneration invalidates the old link.
- Certain: joining atomically links one owned saved character, and one character can be linked to
  only one simultaneous party.
- Certain: members see basic roster identity, while only the GM opens another member's read-only
  Character Reference.
- Certain: the creating GM has no linked character in this MVP.
- Certain: the dedicated Security review may still require P0 corrections before backend coding.

## Current state

The Security blocker is resolved. T-018 is integrated and verified. The amended Party contract is
approved, and both Party branches are rebased onto `a82bb34`, validated, pushed, and clean.

## 2026-07-12 Security review reconciliation

- Certain: no Critical or High current data-access vulnerability was confirmed.
- Certain: no production secret was found in the current tree or 93 reachable commits.
- Certain: Argon2id password hashing, opaque hashed server sessions, parameterized SQL, exact-origin
  CSRF checks, and owner-scoped character reads are a strong base.
- Certain: Party must not put raw invite tokens in backend URL paths. The proposed replacement is a
  frontend URL fragment scrubbed immediately and a POST-body token.
- Certain: Party needs one-GM, role/character-nullability, one-active-invite, timestamp, transaction,
  locking, idempotency, and race-test requirements.
- Certain: bounded JSON requests, HTTP timeouts, login/register throttling, no-store responses,
  current character validation, dependency authority, and deployed verification apply to the entire
  existing application rather than only Party.
- User correction: complete whole-application security review/hardening before continuing new tasks.
- Decision proposed: T-018 owns the whole-app baseline. T-017 retains Party-specific token,
  membership, transaction, join-throttling, authorization, and race-test requirements.
- Resolved on 2026-07-13: T-018 completed, the amended Party contract was approved, and both Party
  branches were rebased and validated.

## 2026-07-13 Security amendment approval and rebase

- Certain: T-018 completed whole-application request, authentication, CharacterSheetV1,
  configuration, dependency, secret-history, CI, and deployed-security controls.
- Certain: Marcela approved continuing T-017 after the amended contract and rebase reports.
- Certain: the frozen Party additions are a 4,096-byte JSON limit, authenticated invite inspection,
  10 valid join attempts per authenticated user per minute, Party-path `no-store`, generic safe
  invite failures, and strict cross-user CharacterSheetV1 validation.
- Certain: T-017A rebased from `96f9adf` to `f305d9c`. One additive conflict in
  `backend/internal/characters/repository_test.go` preserved both Security database-error tests and
  the Party GM authorization matrix. Full disposable-PostgreSQL and backend validation passed.
- Certain: T-017B rebased from `22b2806` to `c4bb107` without conflicts. Its Party folder remained
  byte-for-byte unchanged, and all 339 frontend tests plus static checks and build passed.
- Certain: both rewritten branches were pushed with guarded leases and now match origin.
- Next: complete the Party HTTP boundary in T-017A while T-017B remains isolated from central App,
  router, and Home ownership.

## Links

- Original roadmap: `docs/product-decisions.md`
- Party checklist: `docs/project-checklist.md`
- Permission model: `docs/architecture/data-auth-permissions-options.md`
- Security requirements: `docs/course-rubric.md` section 4
- GitHub party issue: `https://github.com/Inkala/rpg-companion/issues/9`
- GitHub authorization issue: `https://github.com/Inkala/rpg-companion/issues/10`

## 2026-07-14 completion

- Certain: PR #26 merged T-017C as `4f7116f0febe020438e37687b03de0756ef5d98c`.
- Certain: main CI run `29279508474` passed Frontend, Backend, and Secret history.
- Certain: disposable PostgreSQL migration up/down/up validation passed at version 3 without
  damaging baseline user or character data.
- Certain: production was backed up, restored into disposable PostgreSQL, and verified before
  applying exactly migration `000003`.
- Certain: production is at migration version 3 with `dirty=false`, and the three Party tables,
  expected constraints, and indexes are present.
- Certain: Railway deployment `687f8c8c-c186-4a21-b1cf-06edf58c9692` and Cloudflare deployment
  `06f55411` serve the exact merge SHA.
- Certain: the public two-account GM/Player smoke test passed creation, invitation, fragment
  scrubbing, authentication return, join, roster, read-only GM reference, refresh, regeneration,
  invalid invite privacy, authorization, and 320px/390px/720px layout checks.
- Certain: automatic Railway and Cloudflare production deployments were restored after validation.
- Certain: no confirmed T-017 application defect remains. A naturally time-expired production
  invite was not manufactured; expiry remains covered by automated and disposable-database tests.
