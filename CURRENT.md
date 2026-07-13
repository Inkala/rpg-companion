# Current Work

Submission deadline: 20 July 2026

Active task: T-017 Party MVP

State: T-018 whole-application security hardening is complete. T-017A backend and T-017B isolated
frontend are merged. T-017C central frontend integration is complete, validated, committed, and
pushed at `6aaa298`, but is not merged. T-017D combined validation and deployment follows after the
T-017C PR passes CI and the production deployment-trigger order is confirmed.

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

## T-017C integration worktree

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-integration`
- Branch: `codex/t017c-party-integration`
- Base: orchestration checkpoint `1c448d0`.
- Final branch HEAD: `6aaa298`.
- Status: complete and pushed. Route/bootstrap, typed invite authentication return, create/join,
  Party detail, invite tools, GM Character Reference, Home integration, responsive behavior, and
  central route focus passed 432 frontend tests, lint, typecheck, build, and manual 320px, 390px, and
  768px signed-out checks.
- Integration: PR not yet created. Do not merge until deployment triggers and production migration
  order are confirmed.

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
- T-017C is complete and pushed at `6aaa298`; its PR and CI remain pending.
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
- T-017 backend and isolated Party frontend foundations are merged through `af592ec`. The completed
  central integration remains on `codex/t017c-party-integration` until its PR is reviewed.

## Final-week constraints

- Formal submission artifacts outrank optional product features.
- No new coding task starts in the dirty main checkout.
- Parallel coding uses separate worktrees with disjoint ownership.
- Worker sessions do not edit shared coordination records.
- Party is the active product priority. Guest draft migration, unrelated account features, resource
  tracking, AI, and post-MVP Party administration remain deferred.

## Single next action

Review and commit the approved orchestration correction, then open the T-017C PR. Before merging,
confirm Railway and Cloudflare Pages deployment triggers and decide the additive production
migration order.

Last updated: 2026-07-13
