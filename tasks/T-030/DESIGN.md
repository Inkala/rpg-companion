# T-030 Design: Durable Playwright Browser Regression Foundation

Status: approved

## Parallel-work assessment

- Classification: Red because dependency files, browser infrastructure, and later CI changes are
  shared integration surfaces.
- Recommendation: one dedicated T-030 worktree with exclusive ownership of the approved harness
  files.
- Implementation base: exact integrated `main` SHA
  `5ce887e366e4bac4d8b98b3d8bd7d3ead0e063f9` after T-025 and T-029.
- Reason: dependency files, the lockfile, CI, browser infrastructure, and cross-product E2E tests
  are shared integration surfaces.
- Planned merge order: T-025, T-029, T-030, then later product tasks.

## Architecture

### Local and CI stack

The suite uses one stack per Playwright invocation:

1. A wrapper creates a unique run ID and validates all environment values.
2. Locally, it starts `postgres:17-alpine` with a unique container name, loopback-only random host
   port, no named volume, and temporary database storage.
3. In CI, it uses the job-scoped PostgreSQL 17 service instead of starting a nested container.
4. It waits for `pg_isready` and applies every repository migration with the pinned migration tool.
5. Playwright `webServer` entries start the Go backend and built Vite frontend on strict loopback
   ports.
6. Readiness uses `/healthz` for the backend and an HTTP 200 check for the frontend.
7. Playwright runs against the local built application.
8. Teardown stops child processes, removes the local database container, and deletes temporary
   credentials and logs.

The wrapper must handle normal exit, test failure, timeout, `SIGINT`, and `SIGTERM`. It must refuse
to continue if any URL is non-loopback or if the database name does not match the bounded E2E naming
contract.

### Proposed structure

```text
frontend/
  playwright.config.ts
  e2e/
    auth-session.spec.ts
    character-creation.spec.ts
    level-up.spec.ts
    party-invite.spec.ts
    reliability.spec.ts
    compatibility.spec.ts
    responsive-accessibility.spec.ts
    fixtures/
      test.ts
      personas.ts
      data-builders.ts
    helpers/
      api.ts
      accessibility.ts
      artifacts.ts
      geometry.ts
      invitation-privacy.ts
      readiness.ts
      routes.ts
    scripts/
      run-e2e.mjs
      service-with-redacted-log.mjs
```

Names may be adjusted during implementation, but responsibilities must remain separated. No helper
may become a second copy of product rules.

## Database and migration lifecycle

The local wrapper owns the disposable database lifecycle. It should use Docker CLI commands rather
than the normal development Compose volume so E2E cannot erase or contaminate the developer's
`hunin` database. The container uses a unique `hunin-e2e-<run-id>` name, database `hunin_e2e`,
loopback exposure, and disposable storage.

CI supplies the same database name through a PostgreSQL 17 service. The wrapper detects the explicit
CI database URL, validates that it is loopback and E2E-named, applies migrations, and skips local
container creation. Migration execution must be pinned and documented. It must not depend on a
globally mutable latest version.

The initial suite may reset the complete E2E database once per run because the database is
disposable. Tests should create independent account and domain records through public APIs wherever
possible. Direct SQL fixtures require an explicit helper name and justification in the test.

## Playwright configuration

Initial required projects:

- `chromium-desktop`: 1280-pixel viewport.
- `chromium-mobile`: 390-pixel viewport with mobile browser characteristics.

Focused responsive tests explicitly set and verify 320, 390, 720, and 1280 viewport widths. This
keeps the general journey matrix small while preserving exact-width evidence.

Configuration defaults:

- local retries: zero;
- CI retries: one;
- one worker initially in CI until authentication throttling and database isolation are measured;
- parallel workers enabled later only for specs proven independent;
- per-test timeout around 45 seconds, with a bounded suite/job timeout;
- `forbidOnly` in CI;
- screenshot only on failure;
- trace and video retained on failure for non-secret tests;
- HTML plus concise line reporter;
- `test-results/`, `playwright-report/`, and generated auth state ignored by Git.

The required smoke set uses a `@smoke` tag. PR CI runs only that set. Main runs the complete Chromium
suite. Firefox and WebKit commands may be documented or added to a manual workflow after Chromium
stabilizes, but they are not initial merge gates.

## Web server startup and logs

Playwright `webServer` starts:

- backend from `backend/` with `APP_ENV=local`, the isolated `DATABASE_URL`, exact
  `ALLOWED_ORIGINS`, and a strict loopback port;
- frontend from `frontend/` using the built output and Vite preview on a strict loopback port with
  `VITE_API_BASE_URL` fixed at build time.

A small process wrapper captures stdout and stderr, replaces registered secrets before writing, and
keeps bounded service logs under the Playwright output directory. On failure, relevant redacted logs
are attached. On success, they are deleted unless explicitly requested for local debugging.

## Fixtures and browser contexts

Extend Playwright's base test with fixtures for:

- unique run, worker, and test identifiers;
- fictional account and character builders;
- API clients scoped to a browser context;
- isolated Player and GM contexts;
- console and uncaught-page-error collection;
- registered secret redaction;
- targeted geometry and accessibility assertions;
- deterministic cleanup.

Do not persist reusable storage state. Account setup is cheap enough to remain explicit, and checked
in auth journeys. Separate contexts prove cookie and authorization isolation naturally.

## Setup policy

Use public APIs for setup when the journey does not need to prove the setup UI. Use the actual UI for
the behavior under test. Examples:

- auth journey registers and signs in through UI;
- creation journey creates the character through UI;
- GM-reference test may create supporting fictional accounts and a V1 fixture through public APIs;
- impossible legacy or failure states may use bounded SQL fixtures in the isolated database;
- one-shot network failure and delayed-response tests use Playwright routing, not server hooks.

Test builders may produce input data. They must not calculate expected D&D rules by importing the
same production helper under assertion. Rule correctness remains in unit and integration tests.

## Journey inventory

### `auth-session.spec.ts`

- registration leaves the user signed out and shows the approved success toast;
- explicit sign in and reload restore the session;
- sign-out confirmation Cancel preserves the session;
- confirmed sign out removes it.

### `character-creation.spec.ts`

- signed-out draft survives registration and sign in;
- V2 Fighter saves once and reopens complete Character Reference;
- Wizard prepared and spellbook selections survive persistence and mapping;
- no default subclass is silently selected.

### `level-up.spec.ts`

- Fighter subclass, ASI, and level-5 cap journey;
- Warlock Pact Boon and `requiredFeatureIndexes` prerequisites;
- updated Character Reference renders after persistence.

### `party-invite.spec.ts`

- GM creates a Party and invitation link/code;
- Player uses a separate context and joins exactly once;
- Party-character link remains intact;
- GM opens the complete read-only Player reference and has no Level Up control.

### `reliability.spec.ts`

- delayed double submission creates one character;
- one failed save is retryable;
- one failed join retries only joining and never recreates the character;
- stale responses do not replace newer state.

### `compatibility.spec.ts`

- Mara remains readable while signed out;
- persisted CharacterSheetV1 remains readable after sign in.

### `responsive-accessibility.spec.ts`

- exact width and overflow checks at 320, 390, 720, and 1280;
- representative 44-pixel controls, including error-summary targets;
- visible focus and keyboard order;
- dialog Escape and focus return;
- long-content containment;
- axe scans on representative Home, account, creation, Character Reference, Party, and Level Up
  states.

## Invitation privacy design

The invitation credential itself must never be attached to a reporter step, test title, assertion
message, screenshot, video, trace, log, or persisted browser state.

Invitation tests therefore use a dedicated context with automatic tracing, video, and screenshots
disabled during credential entry or fragment navigation. After the application scrubs the fragment
and removes any visible credential, the test may begin a manual trace for the remainder of the
journey. Custom failure handling captures only redacted state. A final artifact scanner checks text
logs and report metadata against every registered credential before CI upload.

The test explicitly examines:

- `location.href` after navigation and after back/forward;
- rendered body text;
- browser console and page errors;
- localStorage and sessionStorage keys and values;
- cookies available to the test context;
- generated artifact names and text attachments.

## Accessibility design

Use `@axe-core/playwright` on representative stable states, initially failing on serious and
critical violations. Keep geometry and interaction helpers separate because axe cannot prove
44-pixel dimensions, visible focus quality, correct focus return, or horizontal overflow.

Use semantic locators by role, accessible name, label, and heading. `data-testid` is allowed only
where no stable user-facing semantic handle exists, and adding one to production code requires
renewed approval because T-030 must not change product behavior.

## CI design

Add one `E2E` job after the harness is stable. It runs independently from the existing Frontend,
Backend, and Secret history jobs.

PR behavior:

- install from the frozen lockfile;
- install Chromium and OS dependencies;
- start PostgreSQL 17;
- migrate and start the isolated stack;
- run `pnpm test:e2e:smoke`;
- upload redacted failure artifacts for a short retention period.

Main behavior:

- run the complete Chromium suite using the same clean setup.

This split is the smallest responsible gate. Running every browser journey on every PR would give
more immediate coverage but would increase feedback time and flake exposure before the suite has
earned that cost. The tagged smoke suite protects core routing and persistence quickly; the full
main run catches broader regressions and supplies release evidence.

After 10 consecutive smoke passes, make the smoke job required. Firefox and WebKit remain a manual
or scheduled release workflow until their maintenance value is demonstrated.

## Files owned during future implementation

- `frontend/package.json`
- `frontend/pnpm-lock.yaml`
- `frontend/playwright.config.ts`
- `frontend/e2e/**`
- `frontend/.gitignore` or root `.gitignore`, only for Playwright artifacts if needed
- `.github/workflows/ci.yml`
- `CHECKS.md`
- `tasks/T-030/**`
- optional scripts strictly for local isolated E2E orchestration

No frontend or backend production behavior is owned. If a product-code hook appears necessary,
implementation stops for renewed approval.

## Anti-flake controls

- Never use arbitrary `waitForTimeout` sleeps.
- Wait on roles, URLs, responses, health endpoints, or explicit state transitions.
- Generate unique data and avoid test-order dependence.
- Keep one narrative inside one test when it truly shares state.
- Begin with one CI worker; increase only after isolation and throttling evidence.
- Use one CI retry maximum and inspect first-attempt artifacts. A retry must not hide a defect.
- Pin Node, pnpm, Go source, migration tool, Playwright package, browser revision, PostgreSQL image,
  and GitHub Actions.
- Keep selectors semantic and user-facing.
- Fail with redacted domain-specific messages.
- Prohibit production and non-loopback destinations in both wrapper and Playwright config.

## Tradeoffs

- Chromium-only gating gives faster, more stable feedback but does not prove cross-engine behavior.
- API setup keeps journeys focused but requires a smaller number of separate UI tests for setup
  experiences.
- One initial CI worker is slower than parallel execution but avoids false failures from shared IP
  throttling until measured.
- Failure-only artifacts reduce storage and privacy risk but provide less data for successful runs.
- Disabling early traces for invitation credentials sacrifices some debugging detail to preserve the
  stronger privacy contract.

## Proposed durable decision

After approval, the orchestrator should add this concise entry to `DECISIONS.md`:

> **2026-07-20: Playwright is Hunin's durable browser regression layer.** Critical cross-browser-
> subsystem journeys run against a disposable PostgreSQL 17 database, the local Go backend, and a
> built frontend. Chromium desktop/mobile smoke becomes the required PR gate after stabilization;
> full Chromium runs on main; Firefox and WebKit remain optional release checks initially.
> `@axe-core/playwright` covers representative accessibility states, while focused geometry and
> keyboard assertions cover behavior axe cannot prove. Tests use fictional isolated Player and GM
> contexts, never access production, and retain redacted failure artifacts. Unit and PostgreSQL
> integration suites remain authoritative for exhaustive rules, contracts, concurrency, and
> persistence behavior.

## Risks

- Auth throttling may prevent safe worker parallelism from one CI IP.
- Invitation fragments can leak into automatic traces unless the privacy fixture controls capture.
- Multi-step character and Party journeys may exceed the runtime target if setup uses UI
  unnecessarily.
- CI service startup can become flaky if readiness is time-based rather than observable.
- Browser binaries and OS dependencies materially increase CI time.
- T-025 or T-029 route and contract changes could invalidate selectors if T-030 starts from an older
  base.
