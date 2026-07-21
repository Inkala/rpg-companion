# T-030 Plan: Durable Playwright Browser Regression Foundation

Status: approved

## Parallel-work assessment

- Classification: Red.
- Can start in a separate worktree now: Yes, Slice 1 only.
- Required base branch or commit: `main` at
  `5ce887e366e4bac4d8b98b3d8bd7d3ead0e063f9`.
- Files/folders this task owns: `frontend/package.json`, `frontend/pnpm-lock.yaml`,
  `frontend/playwright.config.ts`, `frontend/e2e/**`, Playwright artifact ignore entries,
  `.github/workflows/ci.yml`, `CHECKS.md`, `tasks/T-030/**`, and optional isolated E2E scripts.
- Shared files it must not modify: product frontend/backend behavior, existing task folders, shared
  coordination records, provider configuration, deployment configuration, and production data.
- Dependencies or tasks that must merge first: T-025, then T-029.
- Planned integration point: one dedicated T-030 worktree from the exact integrated main SHA.
- Intended merge order: T-025, T-029, T-030, then later character editing, resource tracking,
  portrait, profile-editing, and Party-administration work.

## Goal

Replace repeated proof of core browser journeys with a reproducible Playwright suite that runs
against a disposable local stack and produces privacy-safe failure evidence.

## Current gap

Certain:

- Frontend behavior is covered by Vitest and React Testing Library.
- Backend behavior is covered by Go tests and disposable PostgreSQL integration tests.
- GitHub Actions runs frontend, backend, dependency, build, and secret-history gates.
- No Playwright package, browser config, E2E folder, axe integration, or browser CI job exists.
- Responsive, focus, route, and multi-user evidence is repeatedly gathered manually.
- T-025 still has intentional uncommitted Slice 5 work.
- T-029 is committed on its task branch but is not integrated into `origin/main`.

## Slice 1: harness and isolated environment

Estimate: 2 to 3 focused days.

1. Reconfirm the final main base and ownership boundaries.
2. Add exactly pinned `@playwright/test` and `@axe-core/playwright` development dependencies after
   package, license, and audit review.
3. Add Playwright configuration, project definitions, reporters, failure artifact policy, and ignore
   entries.
4. Add the safe wrapper for local PostgreSQL 17 lifecycle, migration, environment guards, process
   cleanup, and redacted service logs.
5. Configure automatic Go backend and built frontend startup with readiness probes.
6. Add a minimal smoke proving a clean stack can register, sign in, and load Home.
7. Run the smoke repeatedly and stop for review.

## Slice 2: auth, creation, and reference smoke

Estimate: 2 to 3 focused days.

1. Add isolated persona, API, route, console, and cleanup fixtures.
2. Cover registration, explicit sign in, restoration, and sign-out confirmation.
3. Cover signed-out draft continuation through registration and sign in.
4. Cover V2 Fighter save/reopen and Wizard prepared-versus-spellbook persistence.
5. Cover no default subclass selection.
6. Cover Mara and persisted V1 compatibility.
7. Stop for review after focused and complete validation.

## Slice 3: Level Up, Party, reliability, and privacy

Estimate: 3 to 4 focused days.

1. Cover Fighter subclass, ASI, and level-5 cap.
2. Cover Warlock Pact Boon, invocation prerequisites, and `requiredFeatureIndexes`.
3. Cover Party creation, invitation link/code, separate Player join, link preservation, and separate
   GM read-only reference.
4. Cover delayed duplicate submit, one-shot save failure, one-shot join failure, retry-only join, and
   stale-result protection.
5. Add the invitation privacy fixture, post-scrub trace handling, and artifact secret scan.
6. Stop for security and privacy review.

## Slice 4: accessibility and responsive assertions

Estimate: 1 to 2 focused days.

1. Add representative axe scans.
2. Add exact 320, 390, 720, and 1280 width/overflow checks.
3. Add 44-pixel target geometry, including error-summary targets.
4. Add keyboard order, visible focus, dialog Escape/focus return, and long-content checks.
5. Validate desktop and mobile Chromium projects without broad screenshots.
6. Stop for accessibility review.

## Slice 5: CI stabilization and documentation

Estimate: 2 to 3 focused days.

1. Add the dedicated PostgreSQL-backed E2E CI job.
2. Run tagged Chromium smoke on pull requests and full Chromium on main.
3. Configure one CI retry, timeout, deterministic cleanup, and failure-only short-retention artifacts.
4. Document local commands, environment guards, one-spec execution, reports, traces, and cleanup in
   `CHECKS.md`.
5. Prove 10 consecutive clean smoke runs and three consecutive clean full Chromium runs.
6. Confirm runtime targets and artifact privacy.
7. Make the smoke check required only after stabilization and explicit provider-setting approval.
8. Stop for final review before commit, PR, merge, or any provider setting change.

## Validation

Implementation validation must include:

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm audit --audit-level high
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e:smoke
pnpm test:e2e
```

```sh
cd backend
TEST_DATABASE_URL="postgres://hunin:hunin@127.0.0.1:<port>/hunin_test?sslmode=disable" go test -p 1 ./...
go vet ./...
go build ./...
```

Repository and harness validation:

```sh
git diff --check
git status --short --branch
```

Additional evidence:

- the smoke command succeeds from a clean checkout;
- database and processes are absent after success, failure, and interruption;
- no destination is production or non-loopback;
- no credential appears in artifact scans;
- Player and GM cookies are isolated;
- exact viewport checks report 320, 390, 720, and 1280;
- 10 consecutive smoke runs and three complete runs pass;
- PR smoke remains under 12 minutes and full Chromium under 25 minutes.

## Non-goals

- No production behavior or testability hook.
- No provider credentials, production access, or deployment.
- No paid service.
- No exhaustive browser rules matrix.
- No required Firefox/WebKit PR matrix.
- No broad visual snapshots.

## Realistic estimate

Total: 10 to 15 focused implementation days, excluding review and merge pauses. A minimal harness
plus auth/character smoke may be usable after 4 to 6 days, but T-030 should not be marked complete
until Party/privacy, accessibility, CI stabilization, and repeat-run evidence are finished.

## Next action

Create one dedicated T-030 implementation worktree from
`5ce887e366e4bac4d8b98b3d8bd7d3ead0e063f9` and implement Slice 1 only.
