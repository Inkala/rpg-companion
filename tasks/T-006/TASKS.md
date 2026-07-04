# T-006 Tasks

Status: approved

## 1. Task docs and status

- [x] Create T-006 task planning docs.
- [x] Update `CURRENT.md` for active T-006 implementation.
- [x] Append `WORKLOG.md` entry after implementation.

## 2. Home hierarchy

- [x] Move account controls into the landing header.
- [x] Add text-labeled mobile Menu affordance.
- [x] Replace top-level Create character/Add existing character with Create character, Create party,
  and Join party.
- [x] Move Mara below the main action group.
- [x] Add signed-in My characters and My parties empty-state structure before Mara.

## 3. Polish

- [x] Make form errors smaller and lighter.
- [x] Reduce full-width desktop/tablet button heaviness.
- [x] Preserve stacked mobile action layout.

## 4. Tests

- [x] Update signed-out home hierarchy tests.
- [x] Add account-header/menu coverage.
- [x] Add signed-in empty-home order coverage.
- [x] Preserve auth validation and Character Reference regression coverage.

## 5. Validation

- [x] Run `pnpm --dir frontend lint`.
- [x] Run `pnpm --dir frontend typecheck`.
- [x] Run `pnpm --dir frontend test`.
- [x] Run `pnpm --dir frontend build`.
- [x] Run `git diff --check`.
- [x] Run `git status --short`.
