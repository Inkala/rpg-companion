# T-007: Frontend app-shell architecture refactor

## Status

Approved for implementation in the current main checkout.

## Purpose

Make `App.tsx` a focused coordinator before continuing guided character creation work.

## Scope

- Move existing home and account components out of `App.tsx`.
- Move auth form validation helpers out of `App.tsx`.
- Add small page and feature folders.
- Preserve all current CSS classes, copy, behavior, auth flows, and Character Reference behavior.
- Keep `frontend/src/App.css` unchanged unless an unavoidable tiny class-name adjustment is needed.

## Non-goals

- No visual redesign.
- No routing.
- No guided character creation.
- No party functionality.
- No backend, migration, dependency, CI, deployment, or Figma changes.
- No new UI library.

## Parallel-work assessment

- Classification: Yellow
- Recommendation: current worktree
- Reason: The worktree is clean and the task is behavior-preserving, but it intentionally touches
  shared app-shell and auth/home integration files.
- Expected owned files or folders: `frontend/src/App.tsx`, `frontend/src/App.test.tsx`,
  `frontend/src/app/`, `frontend/src/pages/`, `frontend/src/features/home/`,
  `frontend/src/features/account/`, `tasks/T-007/`, `CURRENT.md`, `WORKLOG.md`
- Shared files or dependencies: `frontend/src/App.css`, `frontend/src/auth/api.ts`,
  `frontend/src/characters/`, `frontend/src/assets/brand/hunin-logo.svg`

## Implementation approach

1. Create T-007 task docs and update active task state.
2. Add shared app types.
3. Extract home page and home feature components without changing markup semantics.
4. Extract account page, account panel, auth form, and auth validation without changing behavior.
5. Reduce `App.tsx` to coordinator responsibilities.
6. Update tests only if imports or stable queries require it.
7. Run validation.

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
refactor(frontend): split app shell into pages and features
```
