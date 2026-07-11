# T-014A Notes

## 2026-07-11 planning

- Certain: T-014 completed GM feedback triage and recommended compact Character Reference header
  and stat polish as the next small implementation slice.
- Certain: `characterSheetToReference` currently synthesizes `No concentration` when source
  concentration is absent.
- Certain: `CharacterReference` renders any truthy concentration string as a status line between
  primary and secondary statistics.
- Certain: The reference view model already makes concentration optional, so absence can map to
  `undefined` without a data model change.
- Certain: Existing Character Reference markup uses semantic `<dl>`, `<dt>`, and `<dd>` elements.
- Certain: Generated Fighter and manual character creation currently provide null concentration
  and share the same saved-reference mapper.
- Certain: Generic avatar fallback is handled inside `CharacterReference` when no portrait is
  present.
- Assumption: Scoped CSS changes are sufficient to reduce stat density without changing component
  structure.

## TDD direction

Start with failing tests for absent concentration, identity content, primary and secondary stat
availability, Mara regression behavior, and generic avatar fallback. Implement only after
`TASKS.md` is explicitly approved.

## Deferred work

- Attack reminder badges.
- Calculation breakdown modal.
- HP and resource controls.
- Rest behavior.
- Advantage or disadvantage controls.
- Combat modes and tactical assistance.

## Expected implementation files

- `frontend/src/characters/CharacterReference.test.tsx`
- `frontend/src/characters/characterSheetToReference.test.ts`
- `frontend/src/characters/characterSheetToReference.ts`
- `frontend/src/characters/characters.css`
