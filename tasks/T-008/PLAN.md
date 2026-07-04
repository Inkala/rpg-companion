# T-008: Lightweight frontend routing

## Status

Approved for implementation in the current main checkout.

## Purpose

Give Hunin meaningful URLs for home, account entry, and the Mara sample Character Reference without
adding a routing dependency.

## Parallel-work assessment

- Classification: Yellow
- Recommendation: current worktree
- Reason: The worktree is clean and this is frontend-only, but it touches the shared app
  coordinator and focused app tests.
- Expected owned files or folders: `frontend/src/App.tsx`, `frontend/src/app/`,
  `frontend/src/pages/`, `frontend/src/features/account/`, `frontend/src/App.test.tsx`,
  `tasks/T-008/`, `CURRENT.md`, `WORKLOG.md`
- Shared files or dependencies: `frontend/src/main.tsx`, `frontend/src/auth/api.ts`,
  `frontend/src/characters/`, `frontend/src/App.css`

## Route map

```text
/                    -> home
/login               -> account page, sign-in mode
/sign-up             -> account page, register mode
/characters/sample   -> Mara sample Character Reference
*                    -> not found
```

## Future routes

Document only:

```text
/characters/new
/characters/:id
/account
```

## Implementation approach

1. Add a pure route parser/path helper in `frontend/src/app/router.ts`.
2. Update `App.tsx` to initialize from `window.location.pathname`.
3. Use `history.pushState` for app navigation.
4. Listen for `popstate` to support browser Back/Forward.
5. Map `/login` and `/sign-up` to account modes.
6. Map `/characters/sample` to Mara Character Reference.
7. Add a simple not-found view with a Home action.
8. Update account form internal switches to navigate to the matching account route.
9. Update `App.test.tsx` route coverage while preserving existing behavior tests.

## Validation

Run:

```sh
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
git diff --check
git status --short
```

## Commit message

```text
feat(frontend): add lightweight app routing
```
