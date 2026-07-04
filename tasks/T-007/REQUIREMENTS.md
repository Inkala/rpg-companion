# T-007 Requirements: Frontend app-shell architecture refactor

## Problem

`frontend/src/App.tsx` owns too many responsibilities. It currently mixes app coordination,
session state, home page layout, account UI, auth form validation, signed-in and signed-out home
content, Mara sample presentation, and planned action cards.

This makes the next guided character creation work harder to add without further growing the app
shell.

## Goal

Move existing UI components out of `App.tsx` into a small React folder structure with pages and
feature folders while preserving current behavior and visuals.

## Non-goals

- No visual redesign.
- No route library or URL routing.
- No guided character creation.
- No party functionality.
- No backend changes.
- No auth behavior changes.
- No migrations.
- No dependency changes.
- No CI, deployment, or Figma changes.
- No new UI library.

## Behavior to preserve

- Signed-out home layout from T-006.
- Signed-in home layout from T-006.
- Desktop account actions.
- Mobile Menu affordance.
- Planned and disabled party actions.
- Registration and sign-in validation timing and messages.
- Account form `noValidate` behavior.
- `aria-invalid` and `aria-describedby` behavior.
- Session restore.
- Sign-out.
- Backend-unavailable account behavior.
- Explore Mara opens Character Reference.
- Character Reference and quick-reference dialog behavior.

## Target structure

Keep `frontend/src/App.tsx` as the app coordinator.

Add:

```text
frontend/src/app/appTypes.ts
frontend/src/pages/HomePage.tsx
frontend/src/pages/AccountPage.tsx
frontend/src/features/home/HomeHeader.tsx
frontend/src/features/home/HomeActions.tsx
frontend/src/features/home/SignedInHomeContent.tsx
frontend/src/features/home/SignedOutHomeContent.tsx
frontend/src/features/home/SampleCharacterCard.tsx
frontend/src/features/home/PlannedActionCard.tsx
frontend/src/features/account/AccountHeaderActions.tsx
frontend/src/features/account/AccountPanel.tsx
frontend/src/features/account/AuthForm.tsx
frontend/src/features/account/authValidation.ts
```

## App coordinator responsibilities

`App.tsx` should keep:

- app view state;
- account mode state;
- session state;
- session restore effect;
- sign-out handling;
- high-level view selection;
- passing Mara into Character Reference.

## Moved responsibilities

Move out of `App.tsx`:

- home page shell;
- signed-out home content;
- signed-in home content;
- account header actions;
- account panel and form UI;
- auth form validation helpers and messages;
- planned action cards;
- Mara sample card.
