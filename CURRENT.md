# Current Work

Submission deadline: 20 July 2026

Active task: T-017 Party MVP

State: T-018 whole-application security hardening is complete. PR #22 merged the Security baseline,
PR #23 stabilized the post-merge session-restoration test, and `main` is green at `cab97da`. The
deployed Railway backend and Cloudflare frontend are available. Safe production checks confirmed
HTTPS, exact CORS, private-response `no-store`, API security headers, HSTS, and Secure HttpOnly
SameSite cookies. T-017 may resume only after its backend and isolated frontend branches are rebased
onto this verified baseline.

## Active T-017 worktrees

### T-017A backend

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-backend`
- Branch: `codex/t017a-party-backend`
- Current HEAD: `96f9adf`
- Classification: Red during rebase because the branch overlaps Security-owned character repository
  code and will later integrate server routing.
- Status: implementation through response DTO mappings is committed and pushed. Rebase onto the
  orchestration checkpoint on `origin/main`, resolve only rebase conflicts, run PostgreSQL-backed
  baseline checks, and stop before new Party handler work.
- Expected ownership after rebase: Party migration, `backend/internal/parties/`, narrow
  server/character integration, Party-specific abuse controls, and focused tests.
- Prohibited: frontend and orchestrator-owned shared records.

### T-017B isolated frontend

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-frontend`
- Branch: `codex/t017b-party-frontend`
- Current HEAD: `22b2806`
- Classification: Yellow during rebase. The branch contains only isolated `frontend/src/parties/`
  work, but it must validate against the hardened frontend baseline.
- Status: isolated Party API and components are committed and pushed. Rebase onto the orchestration
  checkpoint on `origin/main`, run the full frontend baseline, and stop before central
  App/router/Home integration.
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

Commit and push this orchestration checkpoint. Then rebase T-017A and T-017B in parallel onto that
`origin/main`, perform no new feature edits, validate each rebased baseline, and return both reports
before Party handlers or central frontend integration resumes.

Last updated: 2026-07-13
