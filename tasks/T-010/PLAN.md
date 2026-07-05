# T-010: Manual character entry planning

Status: planning

## Parallel-work assessment

- Classification: Green
- Recommendation: current worktree for docs only.
- Reason: This is a product/data planning task for a future manual entry flow. It does not touch
  frontend implementation files, backend code, migrations, dependencies, infrastructure, generated
  artifacts, or Git history.
- Expected owned files or folders: `tasks/T-010/`.
- Shared files or dependencies: `CURRENT.md`, `WORKLOG.md`, `DECISIONS.md`, current
  `CharacterSheetV1` direction, current character API contract.

## Goal

Plan the future manual character entry flow for Hunin:

> Fill the sheet myself.

This flow is for players who already have a D&D 5E character and want to transfer enough sheet data
into Hunin to save, view, and share the character.

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
- A separate frontend task is active for signed-in My characters and `GET /characters`; future
  manual-entry implementation must not collide with that work.

Use the uploaded Mara sheet only as rough internal sample context. Do not use Ninea as an app
fixture.

## Scope

In scope:

- Define first-version manual entry support.
- Separate required and optional fields.
- Split the flow into steps.
- Identify first `CharacterSheetV1` sections.
- Identify what can be saved without migrations.
- Defer complex or risky parts.
- Distinguish manual entry from guided Help me choose.
- List future tests.
- List future implementation tasks with parallel-work assessments.

Out of scope:

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

## Recommended next action

Review and approve the T-010 manual entry plan after the active signed-in My characters frontend
task is merged and pushed.
