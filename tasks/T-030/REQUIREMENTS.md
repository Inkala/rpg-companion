# T-030 Requirements: Durable Playwright Browser Regression Foundation

Status: approved

## Problem

Hunin has strong Vitest, Go, and PostgreSQL integration coverage, but browser-level proof is still
performed repeatedly through manual or AI-driven sessions. Those sessions are expensive, hard to
reproduce, and poorly suited to proving routing, persistence, authorization, responsive layout, and
multi-user journeys on every change.

T-030 establishes a durable Playwright layer for critical integration journeys. It complements the
existing test suites. It does not replace unit, contract, PostgreSQL, or exploratory testing.

## Implementation gate

- T-025 is complete, integrated, deployed, and publicly validated.
- T-029 is complete, integrated after T-025, deployed, and publicly validated.
- The exact implementation base is `5ce887e366e4bac4d8b98b3d8bd7d3ead0e063f9`.
- Implementation may proceed in one dedicated worktree created from that exact `main` revision.
- Only Slice 1 is authorized for the first implementation checkpoint.
- T-030 must merge before character editing, resource tracking, portraits, profile editing, or Party
  administration work begins.
- Later product tasks must add browser coverage when they introduce or change a critical journey.

## Test pyramid

### Vitest and Go unit or contract tests

Use for rules, validators, state machines, mappers, exact DTO contracts, and focused component
behavior. Exhaustive class, level, rule-choice, and validation matrices remain here.

### Go and PostgreSQL integration tests

Use for atomic persistence, authorization, optimistic concurrency, rollback, migrations, and exact
privacy boundaries.

### Playwright browser tests

Use for complete journeys that cross browser routing, persistence, authentication, authorization,
responsive layout, or multiple subsystems. Do not duplicate all 12 Class or all 48 Level Up
transition matrices.

### Manual or AI exploratory QA

Use for subjective visual judgment, genuinely new interaction designs, narrative clarity, and final
release exploration. Core journey proof should not require a fresh AI browser session.

Every defect must receive a regression at the cheapest layer that can prove it. Add Playwright only
when the defect crosses browser, routing, persistence, authorization, responsive layout, or multiple
subsystems.

## Required environment

The E2E harness must:

- use `@playwright/test`;
- require no paid external testing service;
- run locally and in GitHub Actions;
- use Node 24, pnpm 11.7.0, and the Go version from `backend/go.mod`;
- start or use an isolated PostgreSQL 17 database;
- apply the repository migrations deterministically;
- start the Go backend with an exact loopback frontend origin;
- build and serve the frontend rather than depending on the Vite development server;
- wait on observable database, backend, and frontend readiness;
- clean up local containers and child processes on success, failure, interruption, and timeout;
- refuse production URLs, non-loopback database hosts, or unsafe database names;
- never access production or require provider credentials.

Local prerequisites may be limited to Git, Docker, Node 24, pnpm 11.7.0, Go, and the documented
migration command. Browser installation is a documented one-time step.

## Initial critical journeys

The initial suite must contain focused, maintainable browser journeys for:

1. Registration, explicit sign in, session restoration after reload, sign-out confirmation Cancel,
   and confirmed sign out.
2. A signed-out character draft surviving registration and sign in.
3. Creating and saving a V2 Fighter, opening the complete Character Reference, reloading its URL,
   and reopening it from Home.
4. Creating and saving a Wizard, proving prepared spells remain distinct from spellbook spells after
   persistence and mapping.
5. Fighter Level Up through the applicable subclass and Ability Score Improvement decisions, then
   proving the level-5 cap.
6. Warlock Pact Boon and Eldritch Invocation prerequisite behavior.
7. Party creation, invitation-link and invitation-code generation, a separate Player joining exactly
   once, and preservation of the Party-character link.
8. A separate GM browser context opening the complete Player Character Reference in read-only mode,
   without a Level Up action.
9. One-shot save and join failures followed by safe retry, plus duplicate-submission locking.
10. Mara and one persisted CharacterSheetV1 compatibility path.
11. Invitation privacy: the fragment is scrubbed, browser back and forward do not restore it, and no
    invitation credential appears in rendered text, console output, the current URL, localStorage,
    sessionStorage, cookies, or uploaded artifacts.
12. Responsive and accessibility smoke at exact viewport widths 320, 390, 720, and 1280 pixels.

Focused regressions must explicitly cover:

- Wizard prepared state surviving persistence and mapping;
- Warlock `requiredFeatureIndexes` prerequisites;
- no default subclass selection;
- error-summary targets measuring at least 44 by 44 pixels;
- invitation state and credential privacy;
- V2 save and reopen;
- GM authorization and read-only rendering.

Tests may use network interception to produce a one-shot save or join failure. They must not add a
production test endpoint or modify production behavior for testability.

## Browser projects

- Chromium is the required automated gate initially.
- Required Chromium projects cover a desktop viewport and representative mobile viewport.
- Exact 320, 390, 720, and 1280 checks may use explicit viewport changes or dedicated focused
  projects while asserting the real `window.innerWidth`.
- Firefox and WebKit are optional manual or scheduled release checks initially. They are not a
  required pull-request multiplier until runtime and stability evidence justify it.
- The initial suite must not introduce a broad screenshot-baseline system.
- Prefer semantic assertions and targeted geometry checks. Stable visual snapshots may be proposed
  later for a small number of high-value screens.

## Accessibility requirements

Add `@axe-core/playwright` as a development-only test dependency alongside Playwright, subject to
the normal dependency and license review during implementation.

Representative pages must receive automated axe checks. The suite must also include explicit checks
that automation does not infer reliably:

- keyboard focus order and visible focus;
- complete accessible names;
- representative controls at least 44 by 44 pixels;
- dialog focus entry, focus trap, Escape close, and focus return;
- no horizontal overflow at 320, 390, 720, and 1280 pixels;
- long-content containment;
- error-summary activation, target geometry, scrolling, and focused invalid field.

The first gate should fail on serious or critical axe violations. Any temporary allowlist requires a
specific rule, page, reason, owner, and removal condition. Accessibility automation does not replace
human review of readability, aesthetics, narrative clarity, or subjective interaction quality.

## Test data and isolation

- Every run has a unique run identifier.
- Every test or worker uses independent fictional accounts and data.
- No shared mutable global account is allowed.
- Player and GM journeys use separate browser contexts with separate cookie jars.
- Public application APIs should create setup state where practical.
- Direct SQL fixtures are allowed only for states impossible through the current UI or API, and only
  against the isolated E2E database.
- No production-only or test-only HTTP endpoint may be added.
- Tests sharing a single narrative may run serially inside one spec. Independent specs should run in
  parallel only after rate-limit and isolation behavior are proven reliable.
- Generated Playwright authentication state must never be committed.
- Teardown must remove the local disposable PostgreSQL container and temporary files.

## Credential and artifact privacy

- Accounts, passwords, Party names, characters, and invitation credentials are fictional and
  disposable.
- Known passwords and invitation credentials must be registered with a test-side redactor.
- Custom console and service logs must redact registered values before writing artifacts.
- Test names, assertion messages, snapshots, and attachments must not contain credentials.
- Backend logs must never receive URL fragments because fragments remain browser-side.
- Credential-bearing invitation tests must disable automatic trace and video capture until the
  fragment has been scrubbed. They may start a manual trace afterward.
- Failure screenshots for invitation tests may be captured only after credential-bearing UI has been
  removed or masked.
- Before upload, an artifact audit must scan text artifacts for registered secrets. Unsafe artifacts
  are deleted and the run fails with a redacted explanation.
- Generated auth-state files, reports, traces, videos, screenshots, and service logs must be ignored
  by Git.

## Failure artifacts

For non-secret tests, configure:

- screenshot on failure;
- trace retained on failure;
- video retained on failure;
- browser console and uncaught page errors captured;
- redacted backend and frontend service logs attached on failure;
- a Playwright HTML report retained locally and uploaded by CI only when useful.

Artifacts should be uploaded on failure with short retention. Successful CI runs should not retain
large videos or traces.

## Developer commands

Commands run from `frontend/`:

```sh
pnpm test
pnpm test:e2e
pnpm test:e2e:smoke
pnpm test:e2e:ui
pnpm exec playwright install chromium
```

Documentation must also show:

- how to run one spec or one test by title;
- how to open the HTML report;
- how to inspect a failed trace;
- required environment variables and safe defaults;
- how the local PostgreSQL container and services are stopped;
- that no snapshot-update command is needed until a later approved visual-snapshot task exists.

## CI requirements

Add a dedicated E2E job to `.github/workflows/ci.yml` after the suite is stable:

- PostgreSQL 17 service with a job-scoped disposable database;
- Node 24 and pnpm 11.7.0;
- Go version from `backend/go.mod`;
- `pnpm install --frozen-lockfile`;
- Playwright Chromium plus system dependencies;
- deterministic migrations;
- backend and built frontend startup with readiness probes;
- PRs run the tagged Chromium smoke suite;
- pushes to `main` run the complete Chromium suite;
- Firefox and WebKit remain optional manual or scheduled release checks;
- one controlled retry in CI and zero retries locally;
- explicit job timeout and process cleanup;
- failure-only artifacts with short retention;
- no provider credentials or production URL.

The smoke job becomes a required merge gate only after the stabilization slice proves repeatability.
The full Chromium suite on `main` provides broader release evidence without multiplying every PR's
runtime.

## Acceptance criteria

- From a clean checkout with documented prerequisites installed, one documented smoke command starts
  the isolated stack, runs the smoke tests, and cleans up.
- CI can run from a clean checkout with no local state.
- The PR smoke target completes within 12 minutes under normal GitHub-hosted runner conditions.
- The complete Chromium target completes within 25 minutes.
- The smoke suite passes 10 consecutive isolated runs without a nondeterministic failure before it
  becomes required.
- The complete Chromium suite passes three consecutive clean runs before T-030 closes.
- No test uses a fixed sleep when a DOM, network, database, or health readiness signal exists.
- Player and GM contexts remain isolated.
- Invitation credentials never appear in reports, artifacts, browser storage, cookies, rendered
  errors, or logs.
- Every required critical journey has at least one durable browser regression.
- Representative axe checks, focus checks, 44-pixel geometry checks, and exact-width overflow checks
  pass.
- Failure output tells a developer how to reproduce one failed spec locally without an AI browser.
- Existing Vitest, Go, PostgreSQL, audit, lint, typecheck, and build gates remain green and retain
  their current responsibilities.
- No frontend or backend production behavior changes.

## Non-goals

- No paid testing service.
- No production smoke or provider access from Playwright.
- No exhaustive rules matrix in a browser.
- No broad visual snapshot suite.
- No Firefox or WebKit required PR matrix initially.
- No test-only production endpoint.
- No product-code testability hook without renewed approval.
- No feature implementation, migration, provider, or deployment change.

## Approval questions

No product decision is currently blocking. Exact dependency versions and action pins must be chosen
and reviewed at implementation time from the final integrated base.
