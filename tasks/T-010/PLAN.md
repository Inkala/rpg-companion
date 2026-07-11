# T-010: Fill the sheet myself V1

Status: complete

Planning, implementation, validation, push, and public smoke testing are complete.

## Parallel-work assessment

- Classification: Green
- Recommendation: current worktree for docs only.
- Reason: This status update is docs-only and records the completed manual entry milestone. It does
  not touch frontend implementation files, backend code, migrations, dependencies, infrastructure,
  generated artifacts, or Git history.
- Expected owned files or folders: `tasks/T-010/`.
- Shared files or dependencies: `CURRENT.md`, `WORKLOG.md`, `DECISIONS.md`, current
  `CharacterSheetV1` direction, current character API contract.

## Goal

Add the first manual character entry flow for Hunin:

> Fill the sheet myself.

This flow is for players who already have a D&D 5E character and want to transfer enough sheet data
into Hunin to save and view the character in Character Reference.

## Completion Summary

Completed commits:

- `911fef1 feat(characters): add manual entry mapper`
- `b3fca28 feat(characters): add manual entry form review`
- `a0df4b9 feat(characters): save manual entry characters`

Public smoke test passed on 2026-07-11 at `https://hunin.marceramirez.com`.

Verified:

- backend health passed at `https://api.hunin.marceramirez.com/healthz`;
- frontend availability passed;
- account signup, logout, and login passed;
- Help me choose generated Fighter path still works publicly;
- Fill the sheet myself manual entry path works publicly;
- signed-in save works for generated and manual characters;
- My characters lists saved generated and manual characters;
- saved Character Reference opens and survives refresh;
- generic avatar fallback displays when no custom portrait exists;
- optional manual action displays in Character Reference;
- optional manual feature displays after expanding the existing collapsed Features section;
- Mara sample still opens;
- quick mobile-width check found no horizontal overflow on home/My characters or sample Character
  Reference;
- no blocking bugs were found.

Known non-blocking note: manual features are collapsed by default after refresh because Features is
an existing collapsed Character Reference section. This is consistent with current behavior.

Disposable production data remains because no deletion flow exists:

- account: `t010cglx3py@example.com`;
- characters: `Smoke Fighter t010cglx3py`, `Smoke Manual t010cglx3py`.

## Context

Hunin's v1 roadmap prioritizes real players joining a party, manually adding existing characters,
and viewing those characters on a phone.

Current relevant direction:

- T-005 says `Create character` is the top-level home action, and `Fill the sheet myself` belongs
  inside that flow.
- T-009 defines `CharacterSheetV1` as the rich app-level character model.
- T-003 guided creation remains a narrow Help me choose MVP for level-1 Human Fighters.
- The backend persists explicit character summary/core columns plus rich JSON in `referencePayload`.
- The frontend already has a `CharacterSheetV1` type direction and Character Reference mapper
  foundation under `frontend/src/characters/`.
- Signed-in My characters and saved Character Reference support were completed before T-010 save
  work, so manual entry now reuses the existing character API and saved-reference flow.

Use the uploaded Mara sheet only as rough internal sample context. Do not use Ninea as an app
fixture.

## Historical Planning Scope

Originally in scope:

- Define first-version manual entry support.
- Separate required and optional fields.
- Split the flow into steps.
- Identify first `CharacterSheetV1` sections.
- Identify what can be saved without migrations.
- Defer complex or risky parts.
- Distinguish manual entry from guided Help me choose.
- List future tests.
- List future implementation tasks with parallel-work assessments.

Originally out of scope for the planning task:

- No frontend implementation.
- No backend implementation.
- No migrations.
- No fixture changes.
- No Mara or Ninea app-data changes.
- No dependency, CI, deployment, branch, worktree, staging, commit, or push work inside the planning
  task itself.

## Deliverables

- `PLAN.md`
- `REQUIREMENTS.md`
- `DESIGN.md`
- `TASKS.md`
- `NOTES.md`

## Validation

Planning validation:

```sh
git diff --check
git status --short --untracked-files=all
```

No app checks are required because this task does not change application code.

## Implemented First Slice

- Add a one-page `Fill the sheet myself` manual entry path inside `/characters/new`.
- Include review before save.
- Save signed-in characters through the existing frontend `createCharacter` helper and backend
  `POST /characters` contract.
- Show a signed-out save prompt without calling the backend.
- Map the manual draft to `CharacterSheetV1` in `referencePayload`.
- Do not change the backend for the first slice.

## TDD And Validation Expectations

- Write or adjust focused tests before implementation where practical.
- Cover signed-in and signed-out behavior.
- Cover validation and error states.
- Cover the successful create/save flow.
- Cover `CharacterSheetV1` mapping.
- Run frontend lint, typecheck, test, and build.
- Do not implement without tests unless the exception is documented in `NOTES.md`.

## Recommended next action

Ask Marcela to choose the next product slice: Character Reference polish from GM feedback, public
demo data/deletion cleanup, or party creation/join planning.
