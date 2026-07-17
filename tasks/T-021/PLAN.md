# T-021 Plan: Save and Invite Reliability

Status: complete

## Scope

Implement the smallest save-flow reliability slice:

1. Lock character save synchronously.
2. Keep Save disabled after success.
3. Show `Character saved.`
4. Navigate ordinary saves to the saved Character Reference.
5. Complete invite-launched save by attempting Party join with the returned character ID.
6. Remove the Draft state summary and its dead CSS.

## Invite-save state machine

1. Engage the synchronous character-save lock before async work or React state updates.
2. If character creation fails, release the character-save lock.
3. If character creation succeeds, keep the lock permanently locked for that mounted creation flow.
4. Emit exactly one `Character saved.` toast.
5. For ordinary creation, navigate to the returned Character Reference.
6. For invite creation, snapshot the active invite token and returned character ID.
7. Start automatic join exactly once from that continuation, not from a rerendering effect.
8. On successful join, clear active and pending invite state and navigate to Party detail.
9. On `invite_unavailable`, clear only matching invite state and show the existing generic
   unavailable state.
10. On recoverable join failure, retain the matching token and saved character ID and expose Retry.
11. Retry repeats only Party join and never calls character creation.
12. Treat replacement or cancellation as making older join results stale. Ignore stale success or
    failure.
13. Never delete the successfully saved character because Party joining failed.
14. Never put tokens or identifiers in toast copy, rendered errors, logs, paths, or query strings.
15. Keep existing-member linked-character replacement deferred.

## Expected file ownership

- `frontend/src/character-creation/CharacterCreationPage.tsx`
- `frontend/src/character-creation/CharacterCreationPage.test.tsx`
- `frontend/src/character-creation/characterCreation.css`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/parties/JoinPartyPage.tsx`
- `frontend/src/parties/JoinPartyPage.test.tsx`
- `frontend/src/parties/api.ts`
- `frontend/src/parties/api.test.ts`
- `frontend/src/parties/apiTypes.ts`

Additional files require approval before editing.

## Files explicitly not owned

- `frontend/src/characters/`
- `frontend/src/features/home/home.css`
- `frontend/src/features/home/SignedInHomeContent.tsx`
- Party card presentation components and CSS.

## Validation commands

Focused:

```sh
pnpm --dir frontend test -- CharacterCreationPage App JoinPartyPage api
```

Complete frontend:

```sh
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
```

Complete backend regression:

```sh
cd backend
go test -p 1 ./...
go vet ./...
go build ./...
```

Repository:

```sh
git diff --check
git status --short --branch
```

## Stop point

Stop for review before commit, push, PR, deployment, or starting another task.
