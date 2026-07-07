# T-013 Tasks

Status: T-013A implementation complete

This is a documentation-only planning task. Do not modify application code, backend code,
migrations, tests, dependencies, CI, deployment config, Git history, branches, worktrees, staging,
commits, or pushes as part of the planning task itself.

## 1. Approve generated Fighter save plan

## Parallel-work assessment

- Classification: Green.
- Recommendation: current worktree for docs only.
- Reason: Review only. No implementation files are owned.
- Expected owned files or folders: `tasks/T-013/`.
- Shared files or dependencies: `CURRENT.md`, `WORKLOG.md`.

- [x] Review and approve the generated Fighter save requirements and design.

## 2. Add generated Fighter build data and mappers

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: current worktree after T-012 is closed, or a separate coordinated worktree if
  T-012 remains active.
- Reason: This touches the same character creation model area as T-012 and introduces reusable
  mapping into shared character types.
- Expected owned files or folders: `frontend/src/character-creation/`,
  `frontend/src/characters/`.
- Shared files or dependencies: `CharacterBuildId`, `CharacterSheetV1`, character API request
  types, T-012 selected-build state.

- [x] Define exact fixed data for Strength melee Fighter.
- [x] Define exact fixed data for Dexterity archer Fighter.
- [x] Map selected build plus name to the backend create request.
- [x] Map selected build plus name to `CharacterSheetV1`.
- [x] Add focused mapper tests.

T-013A boundary:

- [x] No review step.
- [x] No save UI.
- [x] No backend call.
- [x] No `/characters/:id` route.
- [x] No My characters card change.
- [x] No Character Reference loading route change.

## 3. Add frontend character create and detail API helpers

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: same implementation worktree as the save UI.
- Reason: API helpers are shared by creation, My characters, and saved Character Reference.
- Expected owned files or folders: `frontend/src/characters/api.ts`,
  `frontend/src/characters/apiTypes.ts`, `frontend/src/characters/api.test.ts`.
- Shared files or dependencies: existing `listCharacterSummaries`, backend create/detail contract,
  auth session cookies.

- [ ] Add `CreateCharacterRequestDTO`.
- [ ] Add `createCharacter`.
- [ ] Add `getCharacterById`.
- [ ] Preserve existing list behavior.
- [ ] Test credentials, JSON headers, success shape, and error handling.

## 4. Build review step and save states

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: current worktree after T-012 is closed.
- Reason: The review UI extends the T-012 Help me choose flow and state machine.
- Expected owned files or folders: `frontend/src/character-creation/`.
- Shared files or dependencies: current auth session state, account navigation callbacks, global app
  shell.

- [ ] After choosing a recommended or alternate build, show generated-character review.
- [ ] Add name entry or name confirmation.
- [ ] Show build, ancestry, background, HP, AC, speed, main attack, and key features.
- [ ] For signed-in users, enable save.
- [ ] For signed-out users, show sign-in-required save prompt and do not call the backend.
- [ ] Disable duplicate submits while save is in flight.
- [ ] Keep review state intact after errors.
- [ ] Add component tests for signed-in save, signed-out prompt, and save errors.

## 5. Open saved generated character in Character Reference

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: same worktree as route/API work, or a follow-up if route changes are risky.
- Reason: This touches shared router and app-level coordination.
- Expected owned files or folders: `frontend/src/app/`, `frontend/src/App.tsx`,
  `frontend/src/characters/`.
- Shared files or dependencies: `/characters/sample`, home navigation, authenticated detail API,
  Character Reference component.

- [ ] Add a saved character route such as `/characters/:id`.
- [ ] Load `GET /characters/{id}` for saved character detail.
- [ ] Convert `referencePayload` to Character Reference via `CharacterSheetV1`.
- [ ] Show clear loading and error states.
- [ ] Preserve Mara sample route behavior.
- [ ] Add route and rendering tests.

## 6. Refresh or show My characters after save

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: same implementation worktree as save completion.
- Reason: This touches the signed-in home character list and saved character card interaction.
- Expected owned files or folders: `frontend/src/features/home/`, `frontend/src/pages/`,
  possibly `frontend/src/App.tsx`.
- Shared files or dependencies: `listCharacterSummaries`, saved character route, app shell
  navigation.

- [ ] Ensure the saved generated character appears in My characters after returning home.
- [ ] Make saved character cards open Character Reference.
- [ ] Keep empty, loading, and error states intact.
- [ ] Add focused tests for summary display and open behavior.

## 7. Backend fallback only if contract blocks implementation

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: planning only unless frontend implementation proves the backend contract is
  insufficient.
- Reason: Backend changes affect auth, persistence, API contract, and integration tests.
- Expected owned files or folders: `backend/internal/characters/`, backend tests.
- Shared files or dependencies: migrations, frontend API helpers, authenticated session behavior.

- [ ] Confirm no backend change is needed.
- [ ] If needed, plan a separate backend task before changing code.

## Validation For Future Implementation

- [x] Run `pnpm --dir frontend test -- generatedFighterBuilds.test.ts`.
- [x] Run `pnpm --dir frontend lint`.
- [x] Run `pnpm --dir frontend typecheck`.
- [x] Run `pnpm --dir frontend test`.
- [x] Run `pnpm --dir frontend build`.
- [x] Run backend tests only if backend code changes. Not needed for T-013A.
- [x] Run `git diff --check`.
- [x] Run `git status --short --branch`.

## Planning Validation

- [ ] Run `git diff --check`.
- [ ] Run `git status --short`.

## Commit message

```text
docs(characters): plan generated fighter save flow
```
