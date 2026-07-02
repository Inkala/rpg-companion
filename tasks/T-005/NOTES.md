# T-005 Notes

## Read Context

Read before creating this task:

- `README.md`
- `CURRENT.md`
- `DECISIONS.md`
- `docs/design.md`
- `docs/product-decisions.md`
- `tasks/T-003/REQUIREMENTS.md`
- `tasks/T-003/DESIGN.md`
- `tasks/T-003/TASKS.md`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/characters/`

## Observed Current UI State

- The app uses a warm parchment background, forest green accent, brass detail, and ink text.
- The landing page currently presents Mara before the start-your-own actions.
- Account actions currently live lower on the landing page in an account card.
- The shared `.button` rule currently makes buttons full-width.
- `.form-error` is currently heavy and bold.
- Character Reference has been extracted under `frontend/src/characters/`.
- Character Reference already supports sections, default-open behavior, reusable rows, stats, and a
  quick-reference dialog/card.
- The Colossus Slayer quick-reference interaction exists and can stay mostly as-is for now.

## Figma Status

- Figma MCP is not available in this Codex session.
- Neither `figma` nor `figma-local` is exposed.
- No Figma files should be created or modified in this task.
- The T-005 deliverable is Markdown that can later drive manual Figma work or Figma MCP frame
  creation.

## Stale Status Notes

- `CURRENT.md` still pointed at T-003 and Character Reference extraction.
- `tasks/T-003/TASKS.md` still had the Character Reference extraction item unchecked.
- T-004 Character Reference extraction has merged into `main`, so T-005 may update those stale
  status references only.

## Product-owner Inputs Captured

- Keep the current visual direction.
- Refine hierarchy and polish rather than redesigning from scratch.
- Move account actions upward.
- Prioritize signed-in user content over Mara.
- Design signed-in home now as target IA, even if implementation waits.
- Make creation desktop/browser-first and Character Reference mobile-first.
- Keep Help me choose narrow for the first implementation.
- Design an image upload slot but defer upload/storage.
- Prepare for future light/dark tokens without implementing dark mode.
- Add favicon later.

## Reference IA

The Ninea Crowny character sheet is used only for information architecture. It informs future
sections and data coverage, but Hunin should not copy official sheet visuals or build a full
all-sections sheet for the MVP.
