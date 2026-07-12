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
- Assumption pending approval: a reusable opaque copied invite link is the smallest safe delivery
  mechanism.
- Assumption pending approval: invite lifetime is seven days.
- Assumption pending approval: the creating GM has no linked character in this MVP.

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

Party implementation cannot start from the current planning diff. The mobile-menu change is
integrated in `0a724fb`; the T-016 reset is integrated in `7f5e787`; both CI runs passed. The T-017
contract still needs approval and a reviewed planning commit before child worktrees start.

## Links

- Original roadmap: `docs/product-decisions.md`
- Party checklist: `docs/project-checklist.md`
- Permission model: `docs/architecture/data-auth-permissions-options.md`
- Security requirements: `docs/course-rubric.md` section 4
- GitHub party issue: `https://github.com/Inkala/rpg-companion/issues/9`
- GitHub authorization issue: `https://github.com/Inkala/rpg-companion/issues/10`
