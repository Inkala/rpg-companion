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
Validation: Pending `git diff --check`.
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
