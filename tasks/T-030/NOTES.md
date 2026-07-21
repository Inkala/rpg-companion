# T-030 Notes: Durable Playwright Browser Regression Foundation

Status: approved

## Starting state

- Planning checkout: `/Users/marce/Documents/Desarrollo con IA/rpg-companion`.
- Branch at planning start: `codex/t021-t022-closure`.
- HEAD at planning start: `16a2c42aeba38e5ffdd6b594c32f0b01bc836441`.
- Pre-existing untracked directories: `.pnpm-store/` and `outputs/`. Neither belongs to T-030 and
  neither may be touched.
- T-030 was the next unused task ID in the repository task inventory.

## Integration observations

- T-025 merged, received its focused CI hotfix, deployed, and passed public production smoke at
  final release SHA `5ded9eda1c9b20008bdd5a8ed03171e3439539a8`.
- T-029 then merged, deployed, and passed exact-width public smoke at
  `5ce887e366e4bac4d8b98b3d8bd7d3ead0e063f9`.
- On 2026-07-21, `git fetch origin` confirmed `origin/main` exactly matches
  `5ce887e366e4bac4d8b98b3d8bd7d3ead0e063f9`.
- Marcela approved the T-030 plan, planning checkpoint, dedicated worktree, and Slice 1 only.

## Current test-gap assessment

Certain:

- Vitest and React Testing Library cover focused frontend behavior.
- Go tests cover backend behavior and exact contracts.
- Disposable PostgreSQL tests cover persistence, authorization, and concurrency.
- GitHub Actions runs frontend audit/lint/typecheck/test/build, backend vulnerability/test/vet/build,
  and full-history secret scanning.
- No Playwright or axe package, config, E2E test folder, browser artifact policy, or E2E CI job is
  present.
- Browser evidence currently depends on repeated task-specific manual or AI checks.

The durable gap is not another rules matrix. It is complete browser integration across cookies,
routing, persistence, multi-user authorization, invitation privacy, responsive geometry, and focus.

## Command contract

Planned commands from `frontend/`:

```sh
pnpm test:e2e
pnpm test:e2e:smoke
pnpm test:e2e:ui
pnpm exec playwright install chromium
```

Likely focused forms:

```sh
pnpm exec playwright test e2e/character-creation.spec.ts
pnpm exec playwright test -g "Wizard prepared state"
pnpm exec playwright show-trace test-results/<result>/trace.zip
pnpm exec playwright show-report
```

Exact scripts and report paths must be confirmed during implementation.

## Environment contract

Proposed bounded variables:

- `E2E_DATABASE_URL`: CI-only or explicitly supplied local E2E database URL. Must be loopback and
  E2E-named.
- `E2E_BACKEND_PORT`: optional strict loopback port with a safe default.
- `E2E_FRONTEND_PORT`: optional strict loopback port with a safe default.
- `E2E_KEEP_ARTIFACTS`: local debugging opt-in that never bypasses secret scanning.
- `CI`: controls one retry and reporter behavior through the standard CI variable.

No provider or production environment variable is accepted.

## Artifact privacy note

Playwright automatic traces can record the complete navigation URL, including a fragment used to
bootstrap an invitation. Redacting only custom logs is therefore insufficient. Credential-bearing
tests must delay tracing and video until the application has scrubbed the fragment, then use custom
redacted failure capture. This privacy boundary is required even though all test credentials are
fictional and disposable.

## Proposed orchestrator decision entry

After task approval, add to `DECISIONS.md` without reorganizing unrelated history:

> **2026-07-20: Playwright is Hunin's durable browser regression layer.** Critical cross-subsystem
> journeys run against a disposable PostgreSQL 17 database, the local Go backend, and a built
> frontend. Chromium desktop/mobile smoke becomes the required PR gate after stabilization; full
> Chromium runs on main; Firefox and WebKit remain optional release checks initially.
> `@axe-core/playwright` covers representative accessibility states, while focused geometry and
> keyboard assertions cover behavior axe cannot prove. Tests use fictional isolated Player and GM
> contexts, never access production, and retain redacted failure artifacts. Unit and PostgreSQL
> integration suites remain authoritative for exhaustive rules, contracts, concurrency, and
> persistence behavior.

## Anti-flake notes

- Authentication throttling from one CI IP may require one worker initially.
- Prefer response predicates, URL assertions, role state, health checks, and database readiness over
  elapsed time.
- Keep setup through APIs unless setup UI is the behavior under test.
- Route interception may produce exactly one deterministic save or join failure without adding a
  server hook.
- Retry is diagnostic only. A first-attempt failure remains visible in artifacts.
- Avoid shared global accounts and avoid spec-order dependence.

## Estimate

- Harness and isolated environment: 2 to 3 focused days.
- Auth, creation, and reference smoke: 2 to 3 focused days.
- Level Up, Party, reliability, and privacy: 3 to 4 focused days.
- Accessibility and responsive assertions: 1 to 2 focused days.
- CI stabilization and documentation: 2 to 3 focused days.
- Total: 10 to 15 focused days, excluding review and integration pauses.

## Open questions

No product approval question remains. Implementation must still confirm exact package versions,
GitHub Action pins, migration-tool invocation, and measured worker/runtime settings against the final
integrated base.
