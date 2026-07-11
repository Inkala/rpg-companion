# T-014A Tasks: Compact Character Reference header and stats

Status: approved

Implementation was explicitly approved on 2026-07-11. Follow the test-first checklist and edit only
the declared files.

## Parallel-work assessment

- Classification: Green.
- Recommendation: current worktree.
- Reason: Isolated frontend presentation, mapper, and focused test changes with no backend, route,
  dependency, or shared-schema work.
- Expected owned files or folders: `tasks/T-014A/`,
  `frontend/src/characters/CharacterReference.test.tsx`,
  `frontend/src/characters/characterSheetToReference.test.ts`,
  `frontend/src/characters/characterSheetToReference.ts`, and
  `frontend/src/characters/characters.css`.
- Shared files or dependencies: `CURRENT.md` and `WORKLOG.md` for bookkeeping only.

## 1. Test first

- [x] Add a failing mapper test proving absent concentration maps to `undefined`, not
  `No concentration`.
- [x] Add a failing component test proving a character without active concentration does not show
  `No concentration`.
- [x] Add or refine a component test proving identity content still renders.
- [x] Add a component test proving the Primary stats group contains HP, AC, and Speed.
- [x] Add a component test proving the Secondary stats group contains Proficiency and, for Mara,
  Initiative and Passive Perception.
- [x] Confirm existing Mara behavior remains covered.
- [x] Confirm generic avatar fallback remains covered.
- [x] Run the focused tests and record the expected red result before implementation.

## 2. Implement the smallest slice

- [x] Map absent source concentration to `undefined` without changing the source or view-model data
  shapes.
- [x] Preserve display of meaningful active concentration text.
- [x] Keep HP and AC prominent.
- [x] Keep Speed visible with lower visual weight if appropriate.
- [x] Compact Initiative, Passive Perception, and Proficiency.
- [x] Preserve semantic `<dl>`, `<dt>`, and `<dd>` markup.
- [x] Keep CSS scoped to Character Reference.

## 3. Regression validation

- [x] Run focused Character Reference and mapper tests.
- [x] Run the full frontend test suite.
- [x] Run the frontend build.
- [x] Check narrow-width CSS constraints for wrapping and horizontal overflow risk.
- [x] Confirm Mara sample rendering.
- [x] Confirm generated and manual-style saved reference rendering.
- [x] Confirm generic avatar fallback.
- [x] Run `git diff --check`.
- [x] Run `git status --short --branch`.

## 4. Bookkeeping

- [x] Update `NOTES.md` with implementation and validation evidence.
- [x] Update `CURRENT.md` with one clear next action.
- [x] Append a short `WORKLOG.md` entry.

## Expected implementation files

- `frontend/src/characters/CharacterReference.test.tsx`
- `frontend/src/characters/characterSheetToReference.test.ts`
- `frontend/src/characters/characterSheetToReference.ts`
- `frontend/src/characters/characters.css`

## Proposed implementation commit message

```text
feat(characters): compact reference header stats
```
