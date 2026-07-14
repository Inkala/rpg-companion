# T-019 Tasks: Account and character UX polish

Status: approved

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

- [ ] Add backend tests proving successful registration creates a user but no session row or cookie.
- [ ] Preserve registration validation, collision privacy, throttling, hashing, and error statuses.
- [ ] Remove automatic session creation from registration only.
- [ ] Add Sonner `2.0.7` with pnpm and update only the authoritative lockfile.
- [ ] Add frontend tests for Sign in navigation and the exact accessible success toast.
- [ ] Separate registration success from authentication success without accepting return URLs.
- [ ] Preserve typed authentication destinations without editing Party code.
- [ ] Run focused auth tests plus full backend/frontend validation.
- [ ] Stop for review before commit or Slice 2.

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

- [ ] Add failing tests for required markers and optional-field exclusions.
- [ ] Add failing tests for summary alert, first-invalid focus, and scroll behavior.
- [ ] Add visible and accessible required semantics without changing validation rules.
- [ ] Focus and scroll to the first invalid field after Review character.
- [ ] Add failing guided and manual tests for immediate navigation after ordinary save.
- [ ] Remove the extra ordinary `Open Character Reference` action.
- [ ] Preserve save failure/retry and the existing custom Party-return behavior.
- [ ] Run focused creation/App tests plus full frontend validation.
- [ ] Stop for review before commit or Slice 3.

Expected files:

- `frontend/src/character-creation/CharacterCreationPage.tsx`
- `frontend/src/character-creation/CharacterCreationPage.test.tsx`
- `frontend/src/character-creation/characterCreation.css`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`

## Slice 3: Shared character card and Home layout

- [ ] Add failing backend exact-contract tests for the four approved summary presentation values.
- [ ] Extend the owner-scoped summary query/model/response without exposing full payload or owner ID.
- [ ] Add failing frontend API tests for the extended summary DTO.
- [ ] Add a tested shared character-card component used by Mara and saved characters.
- [ ] Normalize Mara to the shared DTO and preserve its portrait and audited preview content.
- [ ] Use the generic avatar for absent or unknown user-character portraits.
- [ ] Change every card action to `Expand`.
- [ ] Move Create character into the full-width My characters header.
- [ ] Render full-width cards below the header in every loaded state.
- [ ] Verify wrapping, 44px controls, keyboard behavior, and no overflow at 320px, 390px, and 720px.
- [ ] Run disposable-PostgreSQL backend tests and complete backend/frontend gates.
- [ ] Stop for final review before commit, push, PR, or deployment.

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

- [ ] Do not edit `frontend/src/parties/`.
- [ ] Do not edit `backend/internal/parties/`.
- [ ] Do not edit Party migrations, routes, DTOs, invite state, join logic, authorization, or tests.
- [ ] Do not implement automatic Party linking after character creation in T-019.
- [ ] Do not change CI, deployment, providers, or infrastructure.

## Proposed commit messages

```text
fix(accounts): require sign in after registration
fix(characters): improve required fields and save navigation
feat(characters): unify home character cards
```
