# Current Work

Submission deadline: 20 July 2026

Active task: T-017 Party MVP

State: T-018 whole-application security hardening is complete. The T-017 Security amendment is
approved. Both Party branches are rebased onto orchestration checkpoint `a82bb34`, fully validated,
pushed, and synchronized with origin. T-017 may resume through bounded backend and isolated
frontend increments. Shared server and central frontend integration remain sequential gates.

## Active T-017 worktrees

### T-017A backend

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-backend`
- Branch: `codex/t017a-party-backend`
- Current HEAD: `f305d9c`
- Classification: Yellow for the next Party-package handler slice. Later server routing is Red and
  requires a separate integration gate.
- Status: migration, repositories, invite/join transactions, scoped GM character query, and response
  DTO mappings are committed and pushed. The rebased PostgreSQL-backed baseline passed. Next is the
  strict request/error contract plus create/list/detail handlers inside `internal/parties`.
- Expected ownership after rebase: Party migration, `backend/internal/parties/`, narrow
  server/character integration, Party-specific abuse controls, and focused tests.
- Prohibited: frontend and orchestrator-owned shared records.

### T-017B isolated frontend

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-frontend`
- Branch: `codex/t017b-party-frontend`
- Current HEAD: `c4bb107`
- Classification: Green while work remains inside `frontend/src/parties/`. Central routing and App
  integration are Red and remain prohibited.
- Status: isolated Party API, create/join/list/detail/invite/reference components, and fragment helper
  are committed and pushed. The rebased frontend baseline passed 339 tests. A narrowly scoped Party
  accessibility/styling increment may proceed without central integration.
- Expected ownership after rebase: `frontend/src/parties/` only.
- Prohibited: central App/router/Home files, backend, and orchestrator-owned shared records.

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
- CI on `main` at `cab97da` passed frontend, backend, govulncheck, build, and secret-history gates.

## Final-week constraints

- Formal submission artifacts outrank optional product features.
- No new coding task starts in the dirty main checkout.
- Parallel coding uses separate worktrees with disjoint ownership.
- Worker sessions do not edit shared coordination records.
- Party is the active product priority. Guest draft migration, unrelated account features, resource
  tracking, AI, and post-MVP Party administration remain deferred.

## Single next action

Review and commit this T-017 contract checkpoint. Then run the next backend handler slice and the
isolated frontend accessibility/styling slice in parallel, with both workers stopping before commit
and before any shared server or central frontend integration.

Last updated: 2026-07-13
