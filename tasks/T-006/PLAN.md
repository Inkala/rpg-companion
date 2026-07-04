# T-006: Home action hierarchy and form/button polish

## Status

Approved for implementation in the current main checkout.

## Purpose

Apply the approved T-005/Figma home IA polish without adding new product functionality.

## Scope

- Move account actions into a lightweight home header.
- Add a text-labeled mobile menu affordance.
- Group home actions as Create character, Create party, and Join party.
- Make Create character visually primary.
- Keep party actions visible but planned/disabled with inline login-required helper text.
- Move Mara below the main action group as secondary demo content.
- Show signed-in empty home structure for My characters and My parties before Mara.
- Make inline form errors smaller and lighter.
- Reduce full-width button heaviness on desktop/tablet while preserving stacked mobile actions.

## Non-goals

- No character creation implementation.
- No Create character mode-choice implementation.
- No party creation or joining.
- No character list API.
- No routing.
- No backend, migration, auth behavior, dependency, CI, deployment, dark mode, favicon, image
  upload, Character Reference redesign, or quick-reference polish.

## Source Of Truth

Use the second-pass Figma frames:

- Signed-out home / desktop.
- Signed-out home / mobile.
- Signed-in empty home / desktop.
- Signed-in empty home / mobile.
- Component examples.

Creation and Character Reference frames are reference only for later tasks.

## Parallel-work assessment

- Classification: Yellow
- Recommendation: current main checkout
- Reason: This task intentionally touches shared app shell files (`App.tsx`, `App.css`) and focused
  app tests, but the worktree is clean and no parallel frontend implementation is active.
- Expected owned files or folders: `frontend/src/App.tsx`, `frontend/src/App.css`,
  `frontend/src/App.test.tsx`, `tasks/T-006/`, `CURRENT.md`, `WORKLOG.md`
- Shared files or dependencies: auth API entry points, Mara Character Reference entry point, global
  button/form styles

