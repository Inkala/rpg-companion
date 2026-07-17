# Work Log

Append one short entry at the end of each work session.

## Entry Template

```text
## YYYY-MM-DD

Task:
What changed:
Validation:
Decisions:
Next action:
```

## Entries

## 2026-06-28

Task: T-001 CI pipeline
What changed: Added the first GitHub Actions CI workflow and documented the automatic checks.
Validation: Local frontend and backend checks passed. First GitHub Actions run pending.
Decisions: CI uses GitHub Actions with separate frontend and backend jobs.
Next action: Review the CI workflow output after it runs on GitHub.

## 2026-06-28

Task: Character persistence foundation
What changed: Implemented PostgreSQL schema, pgx-backed character persistence, minimal character HTTP endpoints, database-only Compose, CI PostgreSQL service, and documentation updates.
Validation: Local backend unit checks and frontend checks passed. PostgreSQL integration tests skipped locally because Docker and `TEST_DATABASE_URL` are unavailable here.
Decisions: PostgreSQL with pgxpool, golang-migrate SQL files, nullable future owner boundary, and `TEST_DATABASE_URL`-only integration tests.
Next action: Review changed files, migration SQL, API behavior, and validation output before any commit.

## 2026-06-28

Task: T-002 authentication and owner-scoped characters
What changed: Added local username/email/password auth with Argon2id, PostgreSQL sessions, HttpOnly cookies, CORS/Origin checks, protected owner-scoped character endpoints, and a minimal account UI that hides forms when no backend URL is configured.
Validation: Pending after final cleanup. Full backend PostgreSQL integration tests, backend checks, frontend checks, and diff checks still need to be rerun before commit.
Decisions: Username is the public in-app identity. Email is required but unverified, no confirmation email is sent, and password reset remains deferred. Public static auth remains unavailable until backend deployment. Guest draft conversion will use authenticated `POST /characters` later, not a separate claim endpoint.
Next action: Run validation before any commit.

## 2026-06-30

Task: T-002 authentication and owner-scoped characters
What changed: Completed the username/email/password auth milestone with inline registration validation and owner-scoped character access.
Validation: Local PostgreSQL-backed backend tests, backend vet/build, frontend lint/typecheck/test/build, diff checks, and manual browser smoke testing passed.
Decisions: No confirmation email, password reset, OAuth, phone number, account settings, parties, or character-creation UI were added.
Next action: Review final changed files and approve the T-002 commit.

## 2026-06-30

Task: T-003 guided character creation MVP requirements and design
What changed: Created and approved planning documents for the Fighter-only guided creation MVP and made T-003 the active task.
Validation: `git diff --check` passed.
Decisions: First creation slice is D&D 5E 2014, level 1, Fighter-only, Human-only, Soldier or Outlander, with Strength melee and Dexterity archer guided builds.
Next action: Extract reusable Character Reference foundation. Implementation has not started.

## 2026-07-02

Task: T-005 UI direction for home, account, Character Reference, and guided creation
What changed: Created documentation-only planning for the next Hunin UI direction and updated stale status references after Character Reference extraction merged.
Validation: `git diff --check` passed. `git status --short --branch` showed docs-only changes on
main with no staging.
Decisions: Keep the current warm visual direction, refine hierarchy and form/button polish, design signed-in home as target IA, keep creation desktop-first, keep Character Reference mobile-first, and defer Figma work until MCP is available.
Next action: Review and approve T-005 before starting implementation tasks.

## 2026-07-02

Task: T-006 Home and form UI polish
What changed: Started the approved home hierarchy and form polish implementation task.
Validation: Frontend lint, typecheck, test, build, and `git diff --check` passed.
Decisions: Keep future character, party, and creation actions as planned empty-state affordances only.
Next action: Validate the T-006 UI polish and review before staging or committing.

## 2026-07-02

Task: T-005 UI direction update after T-006 review
What changed: Updated the design direction to group home actions as Create character, Create party, and Join party; moved manual character transfer inside Create character as Fill the sheet myself; and clarified lightweight header/account menu direction.
Validation: Pending `git diff --check`.
Decisions: Pause T-006 code polish until the corrected home IA is approved in design or Figma-ready wireframes.
Next action: Review the revised T-005 IA and decide whether to revise or replace the uncommitted T-006 implementation.

## 2026-07-04

Task: T-006 Home action hierarchy and form/button polish
What changed: Implemented the corrected home IA from T-005/Figma with lightweight account header controls, grouped planned home actions, signed-in empty-state structure, Mara as secondary demo content, calmer form errors, and focused frontend tests.
Validation: Frontend lint, typecheck, test, build, and `git diff --check` passed.
Decisions: Party actions and Create character remain planned/non-functional in this slice; actual creation, party flows, routing, and character list data remain deferred.
Next action: Review before staging or committing.

## 2026-07-04

Task: T-007 frontend app-shell architecture refactor
What changed: Split home and account UI out of `frontend/src/App.tsx` into page and feature folders while keeping `App.tsx` as the coordinator.
Validation: Frontend lint, typecheck, test, build, and `git diff --check` passed.
Decisions: Keep `App.tsx` at `frontend/src/App.tsx`, keep CSS in `App.css`, and preserve T-006 behavior without adding routes or features.
Next action: Review the T-007 refactor before staging or committing.

## 2026-07-04

Task: T-008 lightweight frontend routing
What changed: Added a custom History API router for home, sign-in, sign-up, Mara sample Character Reference, and a simple not-found view.
Validation: Frontend lint, typecheck, test, build, and `git diff --check` passed.
Decisions: Use `/characters/sample` for the Mara sample route and defer `/characters/new`, `/characters/:id`, `/account`, and deployment fallback config.
Next action: Review the T-008 routing implementation before staging or committing.

## 2026-07-05

Task: Frontend toolchain alignment and UI dependency install
What changed: Standardized frontend tooling docs and CI on Node 24 with pnpm 11.7.0, added Lucide React icons and Radix Tooltip dependencies, and checked available package updates.
Validation: Frontend frozen install, lint, typecheck, test, build, and `git diff --check` passed.
Decisions: Keep broader framework/package major upgrades separate from this cleanup.
Next action: Commit and push the toolchain cleanup.

## 2026-07-05

Task: T-010 manual character entry planning
What changed: Created the docs-only plan for the future `Fill the sheet myself` flow, including first-version scope, required and optional fields, step split, CharacterSheetV1 mapping, deferred work, tests, and future implementation tasks.
Validation: Pending `git diff --check`.
Decisions: Manual entry V1 should save through the existing `POST /characters` contract, with rich sheet detail stored in `referencePayload` as `CharacterSheetV1` and no migration required.
Next action: Review and approve T-010 after the signed-in My characters frontend work is pushed.

## 2026-07-05

Task: T-003/T-005 Help me choose questionnaire planning
What changed: Added the approved 3-question MVP questionnaire, scoring model, recommendation copy, override behavior, accessibility notes, edge cases, and future-only expansion boundaries to the guided creation planning docs.
Validation: `git diff --check` passed.
Decisions: Help me choose recommends only between Strength melee Fighter and Dexterity archer Fighter for the first level-1 Human Fighter slice; magic, healing, stealth, social, and tactical complexity questions remain future-only until supported rules exist.
Next action: Review the planning-doc update before staging or committing.

## 2026-07-06

Task: T-011 character creation entry and draft foundation
What changed: Added `/characters/new`, connected home Create character actions to the new route, created the character creation shell, and added initial in-memory draft state types for mode, name, concept, and selected build.
Validation: Frontend lint, typecheck, test, build, and `git diff --check` passed.
Decisions: Keep this slice entry-only. Saving, localStorage, manual sheet fields, questionnaire steps, backend changes, and CharacterSheetV1 save mapping remain deferred.
Next action: Review T-011 implementation after validation before staging or committing.

## 2026-07-07

Task: T-012 revised Help me choose questionnaire planning
What changed: Created docs-only T-012 planning for a 5-question, 4-answer Help me choose quiz with broader fantasy buckets, supported Fighter fallback scoring, honest future-path messaging, accessibility requirements, edge cases, and an implementation plan.
Validation: Pending `git diff --check`.
Decisions: Keep MVP output limited to Strength melee Fighter and Dexterity archer Fighter, do not reveal scoring or build mappings while answering, and keep global app header/navigation as a separate task.
Next action: Review and approve revised T-012 before implementation.

## 2026-07-07

Task: T-012 revised Help me choose questionnaire implementation
What changed: Implemented the 5-question, 4-answer Help me choose quiz inside `frontend/src/character-creation/`, including fantasy bucket scoring, supported Fighter fallback recommendations, honest future-path messaging, accept/override actions, and component-level tests.
Validation: Frontend lint, typecheck, test, build, and `git diff --check` passed.
Decisions: Keep questionnaire testing in `frontend/src/character-creation/CharacterCreationPage.test.tsx` and do not touch global app header/navigation or route-level app tests in this task.
Next action: Review T-012 implementation and validation results before staging or committing.

## 2026-07-07

Task: T-013 generated Fighter save flow planning
What changed: Created docs-only planning for generating fixed level-1 Human Fighter builds from Help me choose, reviewing before save, persisting through the authenticated character API, showing saved summaries in My characters, and opening saved characters in Character Reference.
Validation: Pending `git diff --check`.
Decisions: Prefer review before save; signed-out users may preview but must sign in to save; use `CharacterSheetV1` as the full `referencePayload`; no backend migration appears necessary.
Next action: Review and approve T-013 before implementation.

## 2026-07-07

Task: T-013A generated Fighter build data and pure mappers
What changed: Added fixed Strength melee Fighter and Dexterity archer Fighter data plus pure mappers for backend-ready create payloads and complete `CharacterSheetV1` reference payloads.
Validation: Focused generated Fighter mapper tests, frontend lint, typecheck, test, and build passed.
Decisions: Keep create-request typing local to the mapper for this slice and avoid review UI, backend calls, routes, API helper changes, My characters changes, and Character Reference loading changes.
Next action: Review the T-013A diff before staging or committing.

## 2026-07-07

Task: T-013B generated Fighter review and save UI
What changed: Added the generated character review step after Help me choose selection, editable name, signed-in save through the authenticated character create API, signed-out save prompt, and loading/error/success states.
Validation: Focused character creation/API tests, frontend lint, typecheck, test, and build passed.
Decisions: Defer saved-character opening, `/characters/:id`, clickable My characters cards, and saved Character Reference loading to T-013C.
Next action: Review the T-013B diff before staging or committing.

## 2026-07-07

Task: T-013C open saved characters in Character Reference
What changed: Added `/characters/:id`, saved character detail loading, valid `CharacterSheetV1` rendering in Character Reference, invalid-payload fallback, My characters open buttons, and an Open Character Reference action after generated save success.
Validation: Focused route/API/saved-reference/app tests, frontend lint, typecheck, test, and build passed.
Decisions: Use a small local `CharacterSheetV1` guard instead of adding a runtime schema dependency. Keep invalid saved reference payloads in a calm unsupported state.
Next action: Review the T-013C diff before staging or committing.

## 2026-07-08

Task: T-013 MVP loop status cleanup
What changed: Updated status docs after the first local MVP character loop was completed and
pushed. The loop now works locally from Help me choose through generated Fighter review, save, My
characters, and saved Character Reference opening.
Validation: Manual smoke test passed locally. Frontend validation passed during T-013C and the
follow-up back-label fix. Docs-only `git diff --check` passed.
Decisions: Treat T-013 as complete. The only smoke-test bug found was the saved Character Reference
back label, fixed in `70e80e6 fix(characters): label saved reference back action`.
Next action: Review T-010 and plan or implement Fill the sheet myself V1.

## 2026-07-09

Task: T-014 GM feedback triage for Character Reference
What changed: Created docs-only triage for early Spanish GM feedback, classified every suggestion
by scope, separated small Character Reference polish from future combat assistant ideas, and
recommended compact stat/header polish as the immediate next slice.
Validation: Pending `git diff --check`.
Decisions: Defer `It's my turn`, full spell/resource tracking, rest buttons, and combat/exploration
mode. Treat attack reminder badges and calculation breakdowns as focused follow-ups, not MVP
requirements.
Next action: Review T-014 and decide whether to implement Character Reference compact stat/header
polish next.

## 2026-07-11

Task: Status reconciliation after Rain Check audit
What changed: Reconciled stale status docs after the audit. T-014 is now treated as complete,
Railway deployment docs are documented as complete, and public Railway deployment is the active
deployment priority. T-010 remains the next product feature after deployment.
Validation: Docs-only `git diff --check` passed. `git status --short --branch` showed only the
allowed documentation files modified.
Decisions: Deployment is not complete until the Railway deployment and security smoke checklist
passes. Future implementation tasks should use TDD or test-first workflow where practical, with
explicit exceptions when tests are not added.
Next action: Run docs-only validation, then execute the Railway public backend deployment checklist.

## 2026-07-11

Task: Public Railway deployment smoke test
What changed: Updated status docs after successful public Railway deployment. Backend health passed
at `https://api.hunin.marceramirez.com/healthz`, frontend availability passed at
`https://hunin.marceramirez.com`, account actions were available, and the public manual smoke loop
passed from signup through saved Character Reference refresh.
Validation: Public smoke test passed. No Hunin app bugs were found. Docs-only `git diff --check`
passed. `git status --short --branch` showed only documentation files modified.
Decisions: Treat public Railway deployment as complete and smoke-tested. One disposable smoke-test
account and character remain in production because there is no account-deletion flow.
Next action: Start T-010 Fill the sheet myself V1 as the next product feature.

## 2026-07-11

Task: T-010 Fill the sheet myself V1 public smoke milestone
What changed: Recorded that T-010 is complete, committed, pushed, validated, and publicly
smoke-tested. Both public creation paths now work at `https://hunin.marceramirez.com`: Help me
choose and Fill the sheet myself. Manual entry can save a signed-in character, list it in My
characters, open saved Character Reference, survive URL refresh, show generic avatar fallback, and
display the first optional action and first optional feature.
Validation: Public smoke test passed. Backend health passed at
`https://api.hunin.marceramirez.com/healthz`. Frontend availability passed. No blocking bugs were
found. Docs-only `git diff --check` passed. `git status --short --branch` showed only documentation
files modified.
Decisions: Treat T-010 as complete. Manual features remain collapsed by default after refresh
because Features is an existing collapsed Character Reference section; this is a non-blocking note.
Disposable production data remains because no deletion flow exists:
`t010cglx3py@example.com`, `Smoke Fighter t010cglx3py`, and `Smoke Manual t010cglx3py`.
Next action: Ask Marcela to choose between Character Reference polish from GM feedback, public demo
data/deletion cleanup, or party creation/join planning.

## 2026-07-11

Task: T-014A compact Character Reference header/stat polish planning
What changed: Created the T-014A plan, requirements, test-first task checklist, and notes for a
small frontend-only Character Reference polish slice. Updated current status to require explicit
implementation approval before frontend edits.
Validation: Pending docs-only `git diff --check` and `git status --short --branch`.
Decisions: Preserve HP and AC prominence, keep Speed visible, compact secondary stats, and stop
synthesizing `No concentration` when no concentration is active. Keep backend, routes, data models,
dependencies, and larger combat-assistant ideas out of scope.
Next action: Review T-014A planning documents and approve `TASKS.md` before starting the first
failing test.

## 2026-07-11

Task: T-014A compact Character Reference header/stat polish implementation
What changed: Removed the synthetic absent-concentration status in the reference mapper, preserved
real active concentration display, kept HP and AC prominent, reduced Speed visual weight, and made
secondary stats denser without changing semantic markup or data models. Added focused mapper and
component regression coverage first.
Validation: Recorded the expected red mapper failure before implementation. Focused tests, frontend
lint, typecheck, all 141 tests, and the production build passed. Narrow-width CSS constraints were
reviewed for wrapping and overflow risk.
Decisions: Keep this slice frontend-only and presentation-focused. Preserve active concentration
text and all existing sample, generated, manual, and generic-avatar paths.
Next action: Review the T-014A diff and validation evidence before staging or committing.

## 2026-07-11

Task: T-016 orchestration reset and TFM submission alignment
What changed: Verified the authoritative TFM requirements and 20 July 2026 deadline, added the
formal submission checklist and parallel-session orchestration contract, rewrote stale current,
backlog, and README state, reconciled high-context status documents, and updated durable workflow
decisions. Closed completed GitHub issue 8, narrowed issue 7 to remaining guest-draft conversion,
and populated project-board Status, Priority, Release, and Area metadata.
Validation: Visually reviewed the two-page TFM PDF, read back GitHub issue and board state, confirmed
T-016 changed no product code, and passed `git diff --check` before final bookkeeping.
Decisions: Formal submission artifacts and a stable review path outrank optional feature breadth.
The orchestrator owns shared coordination records and GitHub planning state; worker sessions use
isolated worktrees and return structured reports.
Next action: Review the validated T-015 mobile profile diff and explicitly decide whether to commit
it before committing the separate T-016 docs reset.

## 2026-07-12

Task: T-017 Party MVP vertical-slice planning
What changed: Drafted requirements, design, task sequence, security rules, API/data/frontend shape,
and a four-phase worktree/merge plan for party creation, copied invite link, atomic join with an
owned character, party list/roster, and GM read-only Character Reference access.
Validation: Reviewed the original product roadmap, party permission model, course security rubric,
current migrations, backend auth/character boundaries, and frontend route/Home/API structure.
Implementation remains unapproved and product code was not changed.
Decisions: Recommend a reusable opaque copied link with no email/SMS service, seven-day expiry,
one simultaneous party per character, member-visible basic roster, and GM-only access to other
character sheets. These defaults require Marcela's approval.
Next action: Review and approve or revise the T-017 invite, roster, character-link, and GM rules.

## 2026-07-12

Task: T-017 Party MVP contract approval
What changed: Marcela approved the Party MVP requirements, design, task sequence, and all seven
proposed invite, roster, character-link, and GM-scope defaults.
Validation: Planning-only update. `TASKS.md` is approved; product code remains unchanged.
Decisions: Party work may split into T-017A backend and T-017B isolated frontend after the planning
checkpoint is integrated. Backend coding must first incorporate any P0 Security review findings.
Next action: Commit the approved planning checkpoint, then prepare the two child tasks from one clean
base.

## 2026-07-12: Reconciled the Security review and created a whole-app security gate

- Confirmed the review found no current Critical/High data-access vulnerability and no observed
  production secret in the current tree or reachable Git history.
- Created T-018 to own app-wide request limits, server timeouts, authentication hardening, character
  validation, secret/configuration evidence, dependency authority, CI disposition, and deployed
  security verification.
- Kept Party-specific token transport, constraints, transactions, authorization, join throttling,
  and race tests in T-017.
- Recorded the clean T-017A and T-017B investigation worktrees at base `3a327e2`.
- Paused T-017 and all new product implementation until T-018 is approved, integrated, passes CI,
  and completes deployed verification.
- Marcela approved the whole-application T-018 scope. Exact implementation values remain gated on
  the Security worker's investigation report.

## 2026-07-12: Reconciled the T-018 implementation-readiness report

- Confirmed the Security worktree remained clean at `5c57fa1` and no system or repository state was
  changed during investigation.
- Reconciled evidence-based request, payload, character, HTTP, authentication, cache, configuration,
  logging, dependency, and deployment proposals into the T-018 design.
- Preserved separate approval gates for file deletion, CI/external actions, production configuration,
  and deployed mutation/smoke testing.
- Proposed approval of the exact contract followed by Slice 1 only, with a required diff and
  validation report before advancing.

## 2026-07-12: Approved T-018 exact contract and Slice 1

- Marcela approved the evidence-based implementation values, file ownership, and six-slice order.
- Authorized only bounded JSON decoding and current auth/character endpoint body limits.
- Kept server/configuration, auth limiter, deep character validation, repository/CI, production, and
  deployment work gated on later reports and prompts.
- Kept file deletion and CI/external actions behind separate explicit approval.

## 2026-07-13: Integrated and verified T-018 Security baseline

- Merged PR #22 with the whole-application Security baseline and PR #23 with the isolated frontend
  timing-test stabilization.
- Confirmed final `main` CI passed frontend, backend, govulncheck, build, and full-history secret
  scanning at `cab97da`.
- Confirmed successful Railway backend and Cloudflare frontend deployments.
- Verified deployed HTTPS, exact CORS and preflight rejection, private `no-store`, API security
  headers, production HSTS, and Secure HttpOnly SameSite cookie attributes without creating test
  production data.
- Closed T-018 and resumed T-017 with a required rebase of both Party worktrees onto `cab97da`.
- Preserved the approved post-MVP GM member-removal decision as a separate unstaged orchestration
  change.

## 2026-07-13: Rebased Party branches and approved the Security amendment

- Committed and pushed orchestration checkpoint `a82bb34` after closing T-018 and resuming T-017.
- Rebased T-017A from `96f9adf` to `f305d9c`. Resolved one additive character-repository test
  conflict by preserving both Security error-classification coverage and the Party GM authorization
  matrix. Full disposable-PostgreSQL tests, race tests, vet, and build passed.
- Rebased T-017B from `22b2806` to `c4bb107` without conflicts. The isolated Party folder remained
  unchanged, and 339 frontend tests, lint, typecheck, and build passed.
- Pushed both rewritten branches with guarded leases and confirmed each local and remote hash
  matches.
- Approved and froze the Party-specific 4,096-byte request limit, authenticated invite inspection,
  10-per-user-per-minute join throttle, Party-path `no-store`, new-versus-replay join statuses, and
  strict GM Character Reference response boundary.
- Next action: review and commit the reconciled task records, then resume one bounded T-017A handler
  slice and one isolated T-017B accessibility/styling slice.

## 2026-07-13: Integrated T-017A backend and T-017B isolated frontend

- Completed the Party migration, repositories, strict handlers, authenticated routes, invite and
  join security, authorization matrix, GM Character Reference boundary, and PostgreSQL server-flow
  tests on T-017A.
- Merged backend PR #24 as `02b0bc8` after frontend, backend, secret-history, and Cloudflare checks
  passed.
- Completed the isolated Party API client, create/join/list/detail/invite/reference components,
  secure fragment helper, stale-state protections, avatars, accessibility hooks, and responsive
  styling on T-017B.
- Rebased T-017B onto the backend merge without conflicts, passed 350 frontend tests, lint,
  typecheck, and build, and merged PR #25 as `af592ec` after all required checks passed.
- No central App, router, Home, or authentication-return wiring is implemented yet. The Party
  backend and isolated frontend are merged but not reachable as one user flow.
- Next action: create one Red T-017C worktree and begin central route and secure invite bootstrap
  integration.

## 2026-07-13: Completed T-017C central Party frontend integration

- Completed secure pre-React invite capture, typed authentication return, Party routes, create and
  join flows, GM invite tools, Party Character Reference, character-creation return, Home Party
  integration, and central route focus across five reviewed slices.
- Pushed the clean T-017C branch at `6aaa298` after 432 frontend tests, lint, typecheck, build, and
  signed-out browser checks at 320px, 390px, and 768px passed.
- Reconciled the contradictory invite-refresh acceptance statement. Marcela approved preserving
  immediate fragment scrubbing and memory-only token state. Reloading scrubbed `/parties/join` is
  intentionally unavailable; reopening the original link restarts the flow.
- Kept T-017D deployment gated on PR CI, disposable-database validation, a local two-user smoke
  test, and confirmation of Railway and Cloudflare Pages deployment triggers.

## 2026-07-14: Completed and deployed the Party MVP

- Merged T-017C through PR #26 as `4f7116f` after the mounted invite-fragment correction and 436
  frontend tests passed.
- Validated migration up/down/up, complete backend/frontend gates, authorization, two-account local
  flow, and responsive Party screens.
- Verified a protected production backup and applied exactly migration `000003`, leaving production
  at version 3 with `dirty=false` and existing user/character/session counts unchanged.
- Deployed the exact merge SHA to Railway and Cloudflare, then passed the public GM/Player Party
  flow, privacy-safe invalid/revoked invites, authorization, refresh, and narrow-width checks.
- Restored automatic production deployments after validation.
- Next action: let Marcela test the deployed MVP and triage selected post-MVP improvements.

## 2026-07-14: Planned T-019 account and character UX polish

- Captured Marcela's first production-review findings for registration confirmation, required form
  fields, post-save navigation, saved-character card consistency, and full-width My characters
  layout.
- Selected Sonner `2.0.7` for one accessible registration success toast and documented the required
  backend no-session registration change.
- Split the Red task into three sequential review checkpoints and prohibited all Party implementation.
- Recorded automatic linking after invite-launched character creation as a separate future Party
  requirement.
- Marcela approved the exact three-slice checklist and requested a separate implementation session.
- Next action: commit the planning checkpoint, then create the dedicated T-019 worktree and start
  Slice 1 only.

## 2026-07-14: Completed T-019 and planned T-020 Party card polish

- Merged T-019 through PR #27 as `66a17402aba74e80eb4f921f258390d66b66e89b` after Frontend,
  Backend, Secret history, and Cloudflare Pages passed.
- Verified automatic production rollout: Railway and Cloudflare Pages deployed the same merge SHA,
  the public frontend returned HTTP 200, and backend health returned
  `{"status":"ok","service":"hunin-backend"}`.
- Investigated the reported registration problem against current production from a fresh signed-out
  browser. It was not reproducible: registration returned no `Set-Cookie`, immediate session check
  remained 401, the browser showed `/login`, and the exact success toast appeared.
- Created the proposed T-020 planning checkpoint for Party quest-board cards and Home section
  contrast. Marcela approved the exact two-slice checklist on 2026-07-16. The task is Yellow, uses
  one future dedicated worktree, and has two sequential slices: backend Party-list contract, then
  frontend Party/Home presentation.
- Next action: commit this approved planning checkpoint, create the dedicated T-020 implementation
  worktree, and start Slice 1 only.

## 2026-07-17: Reconciled T-020 and approved T-021/T-022 QA lanes

- Reconciled local `main` with `origin/main` by fast-forward pull. Both now match the final
  T-020 merge/deployment SHA `e7053fb72f8b52e73e08dfdd8668b9a429abb803`.
- Recorded T-020 as complete, deployed, and validated after the controlled production rollout passed.
- Marcela approved two non-overlapping QA implementation lanes:
  - T-021 Save and invite reliability owns character creation, App route orchestration, Join Party,
    Party API helpers, and their focused tests.
  - T-022 Character Reference visual QA owns Character Reference components, mappings/tests,
    `characters.css`, `CharacterSummaryCard`, and `home.css`.
- Recorded deferred backlog items outside both lanes: built-in portrait bank, gender selector/data
  contract, character/profile/account editing and deletion, Party editing/deletion/description/member
  removal, and existing-member linked-character replacement.
- Next action: commit and push the planning checkpoint on a non-main branch before creating any
  worktrees or implementing code.
