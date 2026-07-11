# T-014A Tasks: Compact Character Reference header and stats

Status: planned

Implementation is not approved. Do not edit frontend files until this document is explicitly
changed to `Status: approved`.

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

- [ ] Add a failing mapper test proving absent concentration maps to `undefined`, not
  `No concentration`.
- [ ] Add a failing component test proving a character without active concentration does not show
  `No concentration`.
- [ ] Add or refine a component test proving identity content still renders.
- [ ] Add a component test proving the Primary stats group contains HP, AC, and Speed.
- [ ] Add a component test proving the Secondary stats group contains Proficiency and, for Mara,
  Initiative and Passive Perception.
- [ ] Confirm existing Mara behavior remains covered.
- [ ] Confirm generic avatar fallback remains covered.
- [ ] Run the focused tests and record the expected red result before implementation.

## 2. Implement the smallest slice

- [ ] Map absent source concentration to `undefined` without changing the source or view-model data
  shapes.
- [ ] Preserve display of meaningful active concentration text.
- [ ] Keep HP and AC prominent.
- [ ] Keep Speed visible with lower visual weight if appropriate.
- [ ] Compact Initiative, Passive Perception, and Proficiency.
- [ ] Preserve semantic `<dl>`, `<dt>`, and `<dd>` markup.
- [ ] Keep CSS scoped to Character Reference.

## 3. Regression validation

- [ ] Run focused Character Reference and mapper tests.
- [ ] Run the full frontend test suite.
- [ ] Run the frontend build.
- [ ] Check a narrow mobile width for readability, wrapping, and horizontal overflow.
- [ ] Confirm Mara sample rendering.
- [ ] Confirm generated and manual-style saved reference rendering.
- [ ] Confirm generic avatar fallback.
- [ ] Run `git diff --check`.
- [ ] Run `git status --short --branch`.

## 4. Bookkeeping

- [ ] Update `NOTES.md` with implementation and validation evidence.
- [ ] Update `CURRENT.md` with one clear next action.
- [ ] Append a short `WORKLOG.md` entry.

## Expected implementation files

- `frontend/src/characters/CharacterReference.test.tsx`
- `frontend/src/characters/characterSheetToReference.test.ts`
- `frontend/src/characters/characterSheetToReference.ts`
- `frontend/src/characters/characters.css`

## Proposed implementation commit message

```text
feat(characters): compact reference header stats
```
