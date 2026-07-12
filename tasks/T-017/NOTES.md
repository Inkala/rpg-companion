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

## Current blocker

Party implementation cannot start until the 2026-07-12 Security report is reconciled and the amended
contract is approved. T-017 planning is integrated in `3a327e2`, CI passed, and both child worktrees
exist at that commit. Their read-only investigations may finish reports, but T-018 must integrate and
both worktrees must be rebased or recreated before Party implementation.

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
- Pending: complete T-018, then approve the amended Party contract on the updated base.

## Links

- Original roadmap: `docs/product-decisions.md`
- Party checklist: `docs/project-checklist.md`
- Permission model: `docs/architecture/data-auth-permissions-options.md`
- Security requirements: `docs/course-rubric.md` section 4
- GitHub party issue: `https://github.com/Inkala/rpg-companion/issues/9`
- GitHub authorization issue: `https://github.com/Inkala/rpg-companion/issues/10`
