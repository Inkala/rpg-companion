# Current Work

Submission deadline: 20 July 2026

Active task: T-019 account and character UX polish

State: T-017 Party MVP is complete, deployed, and publicly smoke-tested at merge SHA `4f7116f`.
Marcela completed an initial production review and approved planning three T-019 slices covering
registration confirmation, character-entry usability, ordinary post-save navigation, shared
character cards, and the My characters layout. Marcela approved the exact three-slice T-019
checklist. The planning checkpoint must be committed before creating the dedicated worktree.

## Completed T-017 feature worktrees

### T-017A backend

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-backend`
- Branch: `codex/t017a-party-backend`
- Final branch HEAD: `8f69c94`
- Integration: PR #24 merged as `02b0bc8`.
- Status: complete. Migration, repositories, authenticated routes, invite and join security,
  authorization, GM Character Reference, PostgreSQL integration, race, and server-flow tests passed.
- Cleanup requires explicit approval later.

### T-017B isolated frontend

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-frontend`
- Branch: `codex/t017b-party-frontend`
- Final branch HEAD: `8073d4a`
- Integration: PR #25 merged as `af592ec` after rebasing onto the backend merge.
- Status: complete. Party API client, create/join/list/detail/invite/reference components, secure
  fragment helper, stale-state protections, avatars, accessibility hooks, and responsive styling
  passed 350 frontend tests, lint, typecheck, and build.
- Cleanup requires explicit approval later.

## Completed T-017C integration worktree

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-integration`
- Branch: `codex/t017c-party-integration`
- Base: orchestration checkpoint `1c448d0`.
- Final branch HEAD: `38bb93c`.
- Status: complete and merged through PR #26 as `4f7116f`. Route/bootstrap, typed invite
  authentication return, create/join,
  Party detail, invite tools, GM Character Reference, Home integration, responsive behavior, and
  central route focus passed 436 frontend tests, lint, typecheck, build, and manual 320px, 390px, and
  768px signed-out checks.
- Integration: deployed and publicly validated through T-017D.

## T-017D release result

- Production migration version: 3, clean.
- Railway deployment: `687f8c8c-c186-4a21-b1cf-06edf58c9692`.
- Cloudflare deployment: `06f55411`.
- Public flow: GM creation/invite, Player authentication/join, roster, GM read-only reference,
  refresh, invalid/revoked invites, authorization, and narrow widths passed.
- Automatic Railway and Cloudflare production deployments are restored.

## Completed T-018 worktrees

### Security baseline

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-security-hardening`
- Branch: `codex/t018-security-hardening`
- Final branch HEAD: `8fa4df0`
- Integration: PR #22 merged as `e1ea298`.
- Status: complete. Cleanup requires explicit approval later.

### CI stability follow-up

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-ci-stability`
- Branch: `codex/t018-ci-stability`
- Final branch HEAD: `bb1deff`
- Integration: PR #23 merged as `cab97da`.
- Status: complete. Cleanup requires explicit approval later.

## Recent orchestration reconciliation

- The approved post-MVP GM member-removal follow-up is recorded in `BACKLOG.md` and `DECISIONS.md`.
- T-018 completion evidence and the T-017 Security-baseline rebase gate are recorded in the shared
  coordination documents.
- The frozen Party request, inspection, join-throttle, no-store, replay-status, and cross-user
  Character Reference rules are approved in the T-017 task documents.
- T-017A and T-017B are merged. Their PR checks passed on the combined backend baseline.
- T-017 is complete and deployed at `4f7116f`; final Party smoke validation passed.
- The approved invite-refresh clarification keeps raw tokens memory-only. Reloading a scrubbed
  `/parties/join` is safely unavailable and requires reopening the original link.
- No product work starts directly in the main checkout.

## Source of truth

1. `docs/submission-checklist.md`: final-week delivery priorities.
2. This file: active worktrees, integration state, and one next action.
3. Active task documents: scope, checklist, and validation evidence.
4. `docs/project-checklist.md`: broader course-evidence backlog.
5. GitHub project board: mirrored planning view.

## Delivered baseline

- Public frontend and backend are deployed and smoke-tested.
- Registration, sign-in, sign-out, and session restoration work.
- Signed-in users can create, save, list, and reopen generated or manual characters.
- Mara Vale remains a public guest sample with quick reference.
- T-014A compact Character Reference polish is merged.
- T-015 read-only profile page and mobile profile navigation are merged.
- T-018 whole-application Security baseline is merged, deployed, and verified.
- T-017 Party creation, secure invitation, atomic joining, roster, and GM read-only access are
  deployed and publicly smoke-tested.

## Final-week constraints

- Formal submission artifacts outrank optional product features.
- No new coding task starts in the dirty main checkout.
- Parallel coding uses separate worktrees with disjoint ownership.
- Worker sessions do not edit shared coordination records.
- T-019 may proceed only through its approved sequential slices. Presentation work is paused at
  Marcela's request while she performs short production-review sessions, but the 20 July submission
  package remains the hard deadline.

## Single next action

Commit this approved planning checkpoint. Then create one dedicated T-019 worktree from the clean
planning commit and start Slice 1 only.

Last updated: 2026-07-14
