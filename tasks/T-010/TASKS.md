# T-010 Tasks

Status: planning

This is a documentation-only planning task. Do not modify application code, backend code,
migrations, tests, dependencies, CI, deployment config, branches, worktrees, staging, commits, or
pushes as part of the planning task itself.

## 1. Approve manual entry plan

## Parallel-work assessment

- Classification: Green.
- Recommendation: current worktree for docs only.
- Reason: Review only. No implementation files are owned.
- Expected owned files or folders: `tasks/T-010/`.
- Shared files or dependencies: `CURRENT.md`, `WORKLOG.md`, `DECISIONS.md`.

- [ ] Review and approve the manual character entry requirements and design.

## 2. Add manual draft model and validation

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: separate worktree after the active signed-in My characters task is merged and
  pushed.
- Reason: The task touches character creation types and may need to align with current character API
  types and `CharacterSheetV1`.
- Expected owned files or folders: `frontend/src/character-creation/`, focused validation tests.
- Shared files or dependencies: `frontend/src/characters/characterSheet.ts`, character API request
  types, Character Reference mapper.

- [ ] Define `ManualCharacterEntryDraftV1`.
- [ ] Add validation for required fields, numeric ranges, and repeatable-row cleanup.

## 3. Build manual entry flow UI

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: separate worktree after route and home integration points are stable.
- Reason: The flow will likely add `/characters/new` behavior and app-level coordination.
- Expected owned files or folders: `frontend/src/character-creation/`, focused component tests.
- Shared files or dependencies: `frontend/src/App.tsx`, `frontend/src/app/router.ts`,
  `frontend/src/features/home/`, shared form styles.

- [ ] Add `Create character` mode choice.
- [ ] Implement `Fill the sheet myself` steps.
- [ ] Keep optional sections skippable.
- [ ] Add review and preview state.

## 4. Map manual draft to create payload

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: same worktree as the manual entry UI or immediately after.
- Reason: Mapping depends on the current frontend character API contract and `CharacterSheetV1`.
- Expected owned files or folders: `frontend/src/character-creation/`,
  `frontend/src/characters/`.
- Shared files or dependencies: `frontend/src/characters/api.ts`,
  `frontend/src/characters/apiTypes.ts`, `frontend/src/characters/characterSheet.ts`.

- [ ] Convert `ManualCharacterEntryDraftV1` to the current `POST /characters` payload.
- [ ] Store rich data in `referencePayload` as `CharacterSheetV1`.
- [ ] Open Character Reference from the successful save response.

## 5. Expand Character Reference mapping for manual data

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: separate worktree after the manual saved payload shape is approved.
- Reason: This changes shared character rendering and sample/reference tests.
- Expected owned files or folders: `frontend/src/characters/`.
- Shared files or dependencies: Mara sample fixture, Character Reference tests, manual draft mapper.

- [ ] Render manual actions, features, skills, saves, spells, equipment, and notes when present.
- [ ] Keep empty sections hidden.
- [ ] Preserve Mara sample behavior.

## 6. Add optional guest draft persistence later

## Parallel-work assessment

- Classification: Green if a `DraftStore` abstraction exists, otherwise Yellow.
- Recommendation: separate later task.
- Reason: Local storage should remain isolated, but guest persistence affects user expectations.
- Expected owned files or folders: `frontend/src/character-creation/draftStore.ts`, storage tests.
- Shared files or dependencies: auth flow and future guest draft migration decisions.

- [ ] Add localStorage persistence without account claiming.
- [ ] Keep sign-up migration as a separate approved task.

## 7. Backend validation hardening later

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: planning only until frontend payload shape stabilizes.
- Reason: Backend validation changes API behavior and contract expectations.
- Expected owned files or folders: backend character validation and backend tests.
- Shared files or dependencies: existing `POST /characters`, `GET /characters/{id}`, JSON storage,
  frontend save mapper.

- [ ] Decide whether backend should require `schemaVersion: "CharacterSheetV1"`.
- [ ] Add backend tests only if validation behavior changes.

## 8. Image upload and storage later

## Parallel-work assessment

- Classification: Red.
- Recommendation: defer.
- Reason: Image upload adds storage, file validation, security, infrastructure, and product-policy
  decisions.
- Expected owned files or folders: frontend image UI, backend upload/storage, configuration,
  security tests.
- Shared files or dependencies: auth, deployment configuration, storage provider choice.

- [ ] Plan image upload only after manual entry and saved character reference are stable.

## Validation

- [ ] Run `git diff --check`.
- [ ] Run `git status --short --untracked-files=all`.

## Commit message

```text
docs(characters): plan manual character entry
```
