# T-022 Notes: Character Reference Visual QA

Status: complete

## Context

- T-020 merged and deployed as `e7053fb72f8b52e73e08dfdd8668b9a429abb803`.
- T-022 merged through PR #30 as `ce57d79f3465df6ae166622521c1c26379cbd5f3`.
- It is intentionally isolated from save/invite reliability, Party APIs, and character-creation code.

## Completion evidence

- PR: #30.
- Final merge SHA: `ce57d79f3465df6ae166622521c1c26379cbd5f3`.
- Final main CI: `https://github.com/Inkala/rpg-companion/actions/runs/29580552807`.
- Final main CI results: Frontend passed, Backend passed, and Secret history passed.
- Deployment evidence: Railway and Cloudflare deployed
  `ce57d79f3465df6ae166622521c1c26379cbd5f3` successfully.
- Public visual smoke at `390px` passed.
- No runtime errors were found.
- Implementation completed:
  - signed-out Home action button text is centered;
  - expanded HP, AC, and Speed tiles are normalized;
  - AC uses the approved blue emphasis on Home and expanded Character Reference;
  - Initiative, Passive Perception, and Proficiency use approved semantic color values;
  - primary and secondary stat groups use matching tile dimensions, muted backgrounds, padding, and
    gap;
  - `.section-panel` uses the muted beige background;
  - visible labels preserve the meaning beyond color.
- Tests covered Home AC `stat--ac`, stat mapping emphasis values, semantic `dl`/`dt`/`dd` hooks, and
  `.section-panel` semantic preservation.

## Deferred decisions

- Built-in portrait-bank integration is deferred.
- Gender selector and data contract are deferred.
- Character/profile/account editing and deletion are deferred.
- Party editing/deletion, description, and member removal are deferred.
- Existing-member linked-character replacement is deferred.
