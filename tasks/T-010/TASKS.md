# T-010 Tasks

Status: approved for planning. Implementation not started.

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

- [x] Review and approve the manual character entry requirements and design.

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
- [ ] Add or update focused tests before implementation where practical.
- [ ] Cover validation and error states.

## 3. Build first manual entry flow UI slice

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: separate worktree after route and home integration points are stable.
- Reason: The flow will likely add `/characters/new` behavior and app-level coordination.
- Expected owned files or folders: `frontend/src/character-creation/`, focused component tests.
- Shared files or dependencies: `frontend/src/App.tsx`, `frontend/src/app/router.ts`,
  `frontend/src/features/home/`, shared form styles.

- [ ] Add a one-page `Fill the sheet myself` path inside `/characters/new`.
- [ ] Add review before save.
- [ ] For signed-in users, save through the existing `createCharacter` helper.
- [ ] For signed-out users, show a save prompt and do not call the backend.
- [ ] Cover signed-in and signed-out behavior with focused tests.
- [ ] Keep larger multi-step optional sections deferred unless separately approved.

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
- [ ] Cover successful create/save flow.
- [ ] Cover `CharacterSheetV1` mapping.

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

- [ ] Run focused tests for the changed manual entry behavior.
- [ ] Run frontend lint.
- [ ] Run frontend typecheck.
- [ ] Run frontend test.
- [ ] Run frontend build.
- [ ] Run `git diff --check`.
- [ ] Run `git status --short --untracked-files=all`.

Implementation without tests requires an explicit justification in `NOTES.md`.

## Commit message

```text
docs(characters): plan manual character entry
```
