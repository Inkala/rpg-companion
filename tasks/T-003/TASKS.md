# T-003 Tasks

Status: approved

Implementation has not started. Begin with the first unchecked task only.

## 1. Extract reusable Character Reference foundation

## Parallel-work assessment
- Classification: Yellow
- Can start in a separate worktree now: Yes, after this plan is approved and with declared ownership.
- Required base branch or commit: Current `main` with T-003 planning merged.
- Files/folders this task owns: `frontend/src/characters/`, focused Character Reference tests.
- Shared files it must not modify: `tasks/T-002/`, backend migrations, backend auth, CI, deployment configuration.
- Dependencies or tasks that must merge first: T-003 planning.
- Planned integration point: `frontend/src/App.tsx` switches from inline Mara/reference rendering to reusable reference components.
- Intended merge order: Merge before guided UI and save integration tasks.

- [ ] Move reusable Character Reference types and rendering toward `frontend/src/characters/` while keeping Mara behavior unchanged.

## 2. Add draft types, option data, and derivation

## Parallel-work assessment
- Classification: Green
- Can start in a separate worktree now: Yes, after this plan is approved.
- Required base branch or commit: Current `main` with T-003 planning merged.
- Files/folders this task owns: `frontend/src/character-creation/draftTypes.ts`, `frontend/src/character-creation/creationOptions.ts`, `frontend/src/character-creation/deriveCharacter.ts`, related focused tests.
- Shared files it must not modify: `frontend/src/App.tsx`, global CSS, backend code, migrations, CI, deployment configuration, `tasks/T-002/`.
- Dependencies or tasks that must merge first: T-003 planning.
- Planned integration point: Export pure derivation utilities consumed by later guided UI.
- Intended merge order: Can merge before or after Character Reference extraction if tests remain isolated.

- [ ] Define Fighter-only draft types, option data, and pure draft-to-character derivation with tests.

## 3. Build guided creation UI

## Parallel-work assessment
- Classification: Yellow
- Can start in a separate worktree now: Yes, after draft derivation merges and with declared `App.tsx` coordination.
- Required base branch or commit: Branch containing draft types and derivation.
- Files/folders this task owns: `frontend/src/character-creation/`, focused creation flow tests.
- Shared files it must not modify: backend code, migrations, CI, deployment configuration, `tasks/T-002/`.
- Dependencies or tasks that must merge first: Draft types, option data, and derivation.
- Planned integration point: `frontend/src/App.tsx` adds a route/view entry into `CharacterCreationFlow`.
- Intended merge order: Merge after derivation and before authenticated save integration.

- [ ] Implement the step-by-step guided creation UI with in-memory draft state and guest save-disabled behavior.

## 4. Add authenticated saving and Character Reference transition

## Parallel-work assessment
- Classification: Yellow
- Can start in a separate worktree now: Yes, after Character Reference extraction and guided UI merge.
- Required base branch or commit: Branch containing reusable Character Reference and guided UI.
- Files/folders this task owns: `frontend/src/characters/api.ts`, save integration inside `frontend/src/character-creation/`, focused API integration tests.
- Shared files it must not modify: backend API shape, migrations, CI, deployment configuration, `tasks/T-002/`.
- Dependencies or tasks that must merge first: Character Reference extraction, draft derivation, guided UI.
- Planned integration point: Existing authenticated `POST /characters`; render Character Reference directly from the successful create response.
- Intended merge order: Merge after guided UI.

- [ ] Save authenticated created characters through `POST /characters` and open Character Reference directly from the successful create response.

## 5. Later optional localStorage draft persistence

## Parallel-work assessment
- Classification: Green
- Can start in a separate worktree now: Yes, after the in-memory DraftStore boundary exists.
- Required base branch or commit: Branch containing guided UI and `DraftStore` abstraction.
- Files/folders this task owns: `frontend/src/character-creation/draftStore.ts`, focused storage tests.
- Shared files it must not modify: auth token storage, backend code, migrations, CI, deployment configuration, `tasks/T-002/`.
- Dependencies or tasks that must merge first: Guided UI with DraftStore abstraction.
- Planned integration point: Replace or extend the first in-memory DraftStore implementation.
- Intended merge order: Merge after the first user-visible creation slice.

- [ ] Add localStorage-backed guest draft persistence without guest draft claiming.

## 6. Later character list/home

## Parallel-work assessment
- Classification: Yellow
- Can start in a separate worktree now: Yes, after a separate API contract is approved.
- Required base branch or commit: Branch containing authenticated character save behavior.
- Files/folders this task owns: future backend character list handler/repository tests, future frontend character home/list files.
- Shared files it must not modify: existing auth/session behavior, migrations without explicit approval, CI, deployment configuration, `tasks/T-002/`.
- Dependencies or tasks that must merge first: Authenticated save integration. Separate requirements/design approval for the list endpoint.
- Planned integration point: New `GET /characters` API and frontend character home.
- Intended merge order: Merge after guided creation MVP.

- [ ] Plan and implement character list/home in a separate future task, not in the guided creation MVP.
