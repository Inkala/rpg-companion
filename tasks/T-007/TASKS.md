# T-007 Tasks

Status: approved

## 1. Task docs and status

- [x] Create T-007 task planning docs.
- [x] Update `CURRENT.md` for active T-007 implementation.
- [x] Append final `WORKLOG.md` entry after implementation and validation.

## 2. Shared app types

- [x] Add `AppView` and `AccountMode` to `frontend/src/app/appTypes.ts`.

## 3. Home extraction

- [x] Move the home page shell to `pages/HomePage.tsx`.
- [x] Move header/brand/account header composition to `features/home/HomeHeader.tsx`.
- [x] Move signed-out home content to `features/home/SignedOutHomeContent.tsx`.
- [x] Move signed-in home content to `features/home/SignedInHomeContent.tsx`.
- [x] Move home action group to `features/home/HomeActions.tsx`.
- [x] Move Mara sample card to `features/home/SampleCharacterCard.tsx`.
- [x] Move planned action card to `features/home/PlannedActionCard.tsx`.

## 4. Account extraction

- [x] Move account header actions to `features/account/AccountHeaderActions.tsx`.
- [x] Move account page shell to `pages/AccountPage.tsx`.
- [x] Move account unavailable/current-user/form panel switching to `features/account/AccountPanel.tsx`.
- [x] Move auth form UI and submission handling to `features/account/AuthForm.tsx`.
- [x] Move auth validation helpers and messages to `features/account/authValidation.ts`.

## 5. App coordinator

- [x] Reduce `App.tsx` to view state, account mode state, session state/effect, sign-out handling,
  high-level view selection, and Character Reference integration.

## 6. Tests

- [x] Keep `frontend/src/App.test.tsx` as the main behavior-preservation test.
- [x] Update tests only as needed for imports or stable queries.

## 7. Validation

- [x] Run `pnpm --dir frontend lint`.
- [x] Run `pnpm --dir frontend typecheck`.
- [x] Run `pnpm --dir frontend test`.
- [x] Run `pnpm --dir frontend build`.
- [x] Run `git diff --check`.
- [x] Run `git status --short`.
