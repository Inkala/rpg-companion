# T-008 Tasks

Status: approved

## 1. Task docs and status

- [x] Create T-008 task planning docs.
- [x] Update `CURRENT.md` for active T-008 implementation.
- [x] Append final `WORKLOG.md` entry after implementation and validation.

## 2. Router model

- [x] Add route types and route paths.
- [x] Add path parsing for implemented routes.
- [x] Add path generation for app navigation.

## 3. App routing

- [x] Initialize app route from `window.location.pathname`.
- [x] Navigate with `history.pushState`.
- [x] Handle browser Back/Forward with `popstate`.
- [x] Render a simple not-found view for unknown paths.

## 4. Route mappings

- [x] Map `/login` to account sign-in mode.
- [x] Map `/sign-up` to account register mode.
- [x] Map `/characters/sample` to Mara Character Reference.
- [x] Navigate home after successful auth or sign-out.

## 5. Account form route switches

- [x] Update switch to register to navigate to `/sign-up`.
- [x] Update switch to sign in to navigate to `/login`.

## 6. Tests

- [x] Add direct-route coverage.
- [x] Add click navigation URL coverage.
- [x] Add Back/Forward coverage.
- [x] Preserve existing auth validation, session, home, planned action, and Character Reference
  coverage.

## 7. Validation

- [x] Run `pnpm --dir frontend lint`.
- [x] Run `pnpm --dir frontend typecheck`.
- [x] Run `pnpm --dir frontend test`.
- [x] Run `pnpm --dir frontend build`.
- [x] Run `git diff --check`.
- [x] Run `git status --short`.
