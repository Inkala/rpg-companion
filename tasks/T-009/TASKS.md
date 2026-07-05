# T-009 Tasks

Status: planning

This is a docs-only modeling task. Do not modify application code, frontend code, backend code,
migrations, tests, dependencies, CI, deployment config, branches, worktrees, staging, commits, or
pushes.

## 1. Define docs model

## Parallel-work assessment

- Classification: Green.
- Recommendation: current worktree for docs only.
- Reason: The work is isolated to `tasks/T-009/` and does not touch active application files.
- Expected owned files or folders: `tasks/T-009/`.
- Shared files or dependencies: existing Mara sample docs, current backend character contract,
  future Character Reference mapper.

- [x] Create `PLAN.md`.
- [x] Create `REQUIREMENTS.md`.
- [x] Create `DESIGN.md`.
- [x] Create `TASKS.md`.
- [x] Create `NOTES.md`.
- [ ] Review and approve `CharacterSheetV1` model direction.

## 2. Create corrected Mara fixture

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: separate implementation task after T-009 approval and after active frontend
  cleanup work is resolved.
- Reason: This touches shared Mara sample data used by home and Character Reference flows.
- Expected owned files or folders: `frontend/src/characters/` sample fixture files and focused
  fixture tests.
- Shared files or dependencies: current Mara sample docs, Character Reference tests, home sample
  card.

- [ ] Create an audited Mara `CharacterSheetV1` fixture.
- [ ] Keep Ninea Crowny out of app fixtures.
- [ ] Mark or remove uncertain generated-sheet values.

## 3. Add frontend types

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: separate implementation task after T-009 approval.
- Reason: Type definitions affect later character creation, manual entry, and Character Reference
  mapping.
- Expected owned files or folders: `frontend/src/characters/`.
- Shared files or dependencies: current DTO types, Character Reference view-model types.

- [ ] Add `CharacterSheetV1` TypeScript types.
- [ ] Add focused type/fixture validation where practical.

## 4. Map rich JSON to Character Reference

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: separate implementation task after the fixture and frontend types exist.
- Reason: The mapper touches shared Character Reference behavior and tests.
- Expected owned files or folders: `frontend/src/characters/`.
- Shared files or dependencies: existing Character Reference components and Mara tests.

- [ ] Build a pure mapper from `CharacterSheetV1` to `CharacterReferenceViewModel`.
- [ ] Preserve current Mara visible sections: Actions, Features, Spells.
- [ ] Keep empty future sections hidden.

## 5. Later backend validation if needed

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: plan only until the frontend model is stable.
- Reason: Backend validation changes API behavior and should follow an approved contract.
- Expected owned files or folders: backend character validation and backend tests.
- Shared files or dependencies: existing `POST /characters`, `GET /characters/{id}`, JSON storage.

- [ ] Decide whether backend should validate only JSON object shape or require `schemaVersion`.
- [ ] Add backend tests only if validation behavior changes.

## 6. Later `GET /characters`

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: separate API task after `CharacterSheetV1` summary needs are approved.
- Reason: Adds new backend and frontend API surface.
- Expected owned files or folders: backend character handler/repository tests, future frontend API
  client and list/home files.
- Shared files or dependencies: auth ownership, current character persistence, future signed-in home.

- [ ] Add owner-scoped list endpoint.
- [ ] Return summaries only.
- [ ] Keep full `CharacterSheetV1` detail in `GET /characters/{id}`.

## Validation

- [x] Run `git diff --check`.
- [x] Run `git status --short --untracked-files=all`.

## Commit message

```text
docs(characters): define character sheet json model
```
