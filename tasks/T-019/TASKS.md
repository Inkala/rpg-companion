# T-019 Tasks: Account and character UX polish

Status: complete

Marcela approved the three-slice checklist on 2026-07-14. Implement only one slice at a time and
stop for review before commit or continuation.

## Parallel-work assessment

- Classification: Red.
- Recommendation: one dedicated worktree and sequential slices.
- Reason: the work crosses auth behavior, a new dependency, App, character creation, a backend DTO,
  Home, and shared styling.
- Expected owned files or folders: the files declared per slice below.
- Shared files or dependencies: Party code is prohibited. Orchestrator records remain owned by the
  orchestrator.

## Slice 1: Registration success and toast

- [x] Add backend tests proving successful registration creates a user but no session row or cookie.
- [x] Preserve registration validation, collision privacy, throttling, hashing, and error statuses.
- [x] Remove automatic session creation from registration only.
- [x] Add Sonner `2.0.7` with pnpm and update only the authoritative lockfile.
- [x] Add frontend tests for Sign in navigation and the exact accessible success toast.
- [x] Separate registration success from authentication success without accepting return URLs.
- [x] Preserve typed authentication destinations without editing Party code.
- [x] Run focused auth tests plus full backend/frontend validation.
- [x] Stop for review before commit or Slice 2.

Completed in commit `cf79f919f3ef56b77f6e1779606c3bc7aa94e77d`.

Expected files:

- `backend/internal/auth/handler.go`
- `backend/internal/auth/handler_test.go`
- focused server tests only if the HTTP session assertion requires them
- `frontend/package.json`
- `frontend/pnpm-lock.yaml`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/accounts/AuthForm.tsx`
- `frontend/src/accounts/AuthForm.test.tsx`
- Account page/panel tests or styles only when required

## Slice 2: Required fields and ordinary post-save navigation

- [x] Add failing tests for required markers and optional-field exclusions.
- [x] Add failing tests for summary alert, first-invalid focus, and scroll behavior.
- [x] Add visible and accessible required semantics without changing validation rules.
- [x] Focus and scroll to the first invalid field after Review character.
- [x] Add failing guided and manual tests for immediate navigation after ordinary save.
- [x] Remove the extra ordinary `Open Character Reference` action.
- [x] Preserve save failure/retry and the existing custom Party-return behavior.
- [x] Run focused creation/App tests plus full frontend validation.
- [x] Stop for review before commit or Slice 3.

Completed in commit `c53de604388ff89d2750bc4b757155db7b6d0143`.

Expected files:

- `frontend/src/character-creation/CharacterCreationPage.tsx`
- `frontend/src/character-creation/CharacterCreationPage.test.tsx`
- `frontend/src/character-creation/characterCreation.css`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`

## Slice 3: Shared character card and Home layout

- [x] Add failing backend exact-contract tests for the four approved summary presentation values.
- [x] Extend the owner-scoped summary query/model/response without exposing full payload or owner ID.
- [x] Add failing frontend API tests for the extended summary DTO.
- [x] Add a tested shared character-card component used by Mara and saved characters.
- [x] Normalize Mara to the shared DTO and preserve its portrait and audited preview content.
- [x] Use the generic avatar for absent or unknown user-character portraits.
- [x] Change every card action to `Expand`.
- [x] Move Create character into the full-width My characters header.
- [x] Render full-width cards below the header in every loaded state.
- [x] Verify wrapping, 44px controls, keyboard behavior, and no overflow at 320px, 390px, and 720px.
- [x] Run disposable-PostgreSQL backend tests and complete backend/frontend gates.
- [x] Stop for final review before commit, push, PR, or deployment.

Completed in commit `b6ce49b457aa1225a505aa3be6ded8ef2a693f98`.

Expected files:

- `backend/internal/characters/model.go`
- `backend/internal/characters/repository.go`
- `backend/internal/characters/repository_test.go`
- focused character handler/response tests
- `frontend/src/characters/apiTypes.ts`
- `frontend/src/characters/api.test.ts`
- `frontend/src/characters/CharacterSummaryCard.tsx` (new)
- `frontend/src/characters/CharacterSummaryCard.test.tsx` (new)
- `frontend/src/characters/SampleCharacterCard.tsx`
- `frontend/src/characters/maraReference.ts`
- `frontend/src/features/home/SignedInHomeContent.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/features/home/home.css`
- Character CSS or portrait assets only if required

## Prohibited files and behavior

- [x] Do not edit `frontend/src/parties/`.
- [x] Do not edit `backend/internal/parties/`.
- [x] Do not edit Party migrations, routes, DTOs, invite state, join logic, authorization, or tests.
- [x] Do not implement automatic Party linking after character creation in T-019.
- [x] Do not change CI, deployment, providers, or infrastructure.

## Proposed commit messages

```text
fix(accounts): require sign in after registration
fix(characters): polish required fields and save navigation
feat(characters): share character summary cards
```
