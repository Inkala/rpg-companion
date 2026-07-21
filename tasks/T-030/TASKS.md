# T-030 Tasks: Durable Playwright Browser Regression Foundation

Status: approved

## Gate and ownership

- [ ] Confirm T-025 is complete and integrated.
- [ ] Confirm T-029 is complete and integrated after T-025.
- [ ] Record the exact final `main` SHA.
- [ ] Create one dedicated T-030 implementation worktree from that SHA.
- [ ] Confirm no product-code change or testability hook is required.

## Slice 1: harness and isolated environment

- [ ] Add exactly pinned `@playwright/test` and `@axe-core/playwright` development dependencies.
- [ ] Add desktop/mobile Chromium projects, reporters, retries, timeouts, and failure artifact policy.
- [ ] Add local PostgreSQL 17 lifecycle with loopback-only exposure and disposable storage.
- [ ] Add safe CI-service detection and E2E database URL guards.
- [ ] Apply migrations deterministically with a pinned tool.
- [ ] Start the Go backend and built frontend automatically with observable readiness checks.
- [ ] Capture bounded redacted console and service logs.
- [ ] Clean containers, processes, credentials, and temporary files on every exit path.
- [ ] Add a clean-stack registration/sign-in/Home smoke.
- [ ] Stop for review before Slice 2.

## Slice 2: auth, creation, and reference smoke

- [ ] Add unique run/test IDs and independent fictional account/data builders.
- [ ] Add isolated Player and GM context fixtures without committed storage state.
- [ ] Test registration, explicit sign in, restoration, and sign-out confirmation.
- [ ] Test signed-out draft continuation through registration/sign in.
- [ ] Test V2 Fighter save, complete reference, reload, and Home reopen.
- [ ] Test Wizard prepared versus spellbook state after persistence and mapping.
- [ ] Test that subclass is not silently selected.
- [ ] Test Mara and persisted V1 compatibility.
- [ ] Stop for review before Slice 3.

## Slice 3: Level Up, Party, reliability, and privacy

- [ ] Test Fighter subclass, ASI, and level-5 cap.
- [ ] Test Warlock Pact Boon and invocation `requiredFeatureIndexes`.
- [ ] Test Party creation plus invitation-link and invitation-code generation.
- [ ] Test separate Player join exactly once and Party-character link preservation.
- [ ] Test separate GM read-only Character Reference without Level Up.
- [ ] Test duplicate save locking with an observable delayed request.
- [ ] Test one-shot save failure and safe retry.
- [ ] Test one-shot join failure, retry-only joining, and no duplicate creation.
- [ ] Test stale results cannot replace current state.
- [ ] Test fragment scrubbing, back/forward behavior, browser storage, cookies, rendered output, and
  console privacy.
- [ ] Disable credential-bearing capture until scrubbed and scan all uploadable artifacts.
- [ ] Stop for security/privacy review before Slice 4.

## Slice 4: accessibility and responsive assertions

- [ ] Add representative `@axe-core/playwright` checks.
- [ ] Add exact 320, 390, 720, and 1280 inner-width and horizontal-overflow assertions.
- [ ] Add representative 44 by 44 pixel target checks.
- [ ] Add error-summary target geometry, scrolling, and first-invalid-field focus checks.
- [ ] Add keyboard order and visible focus assertions.
- [ ] Add dialog focus, Escape, close, and focus-return assertions.
- [ ] Add long-content containment assertions.
- [ ] Stop for accessibility review before Slice 5.

## Slice 5: CI stabilization and documentation

- [ ] Add the dedicated PostgreSQL 17 E2E CI job.
- [ ] Run tagged Chromium smoke on pull requests.
- [ ] Run complete Chromium on pushes to main.
- [ ] Keep Firefox and WebKit optional manual or scheduled checks.
- [ ] Configure one CI retry, explicit timeout, safe cleanup, and failure-only short-retention
  artifacts.
- [ ] Document local setup, commands, one-spec execution, UI mode, reports, traces, and cleanup.
- [ ] Prove no production URL or provider credential is used.
- [ ] Prove 10 consecutive smoke passes and three consecutive full Chromium passes.
- [ ] Confirm PR smoke is under 12 minutes and full Chromium is under 25 minutes.
- [ ] Run complete existing frontend, backend, PostgreSQL, audit, and build gates.
- [ ] Run `git diff --check` and inspect the complete scope.
- [ ] Stop for final review before commit, PR, merge, deployment, or provider-setting changes.
