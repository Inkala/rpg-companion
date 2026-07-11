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

## 2026-07-11 implementation

- Certain: Tests were updated before production code.
- Certain: The first focused run failed because Mara still mapped absent concentration to
  `No concentration`. Two test queries were corrected from an unsupported implicit `group` role to
  the existing accessible labels, after which the intended mapper failure remained alone.
- Certain: Absent concentration now maps to `undefined`; meaningful active concentration strings
  still render through the existing component condition.
- Certain: HP and AC retain their existing emphasized cards. Speed remains in Primary stats with a
  lighter scoped treatment.
- Certain: Secondary stats use smaller gaps, padding, labels, and values with an inline compact
  layout.
- Certain: No component structure or data model changed. Semantic `<dl>`, `<dt>`, and `<dd>` markup
  remains intact.
- Certain: Existing generated and manual paths share the mapper and passed the full frontend suite.
- Certain: The existing generic avatar test and Mara behavior tests passed.

## Validation evidence

- Focused command: passed, 14 files and 141 tests (the current script runs the complete Vitest
  suite even when file arguments are supplied).
- Frontend lint: passed.
- Frontend typecheck: passed.
- Full frontend tests: passed, 14 files and 141 tests.
- Frontend production build: passed.
- Narrow-width source review: passed. Existing `minmax(0, 1fr)` columns and the 390px reduced-gap
  rules remain; the new rules add no fixed width or overflow behavior.
- `git diff --check`: passed.
- `git status --short --branch`: passed and showed only the eight approved files modified.
