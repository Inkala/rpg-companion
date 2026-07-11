# T-014A: Compact Character Reference header and stats

Status: planned

T-014A is a small frontend-only Character Reference polish slice. Implementation is not approved
by this planning step. Start implementation only after `TASKS.md` says `Status: approved`.

## Parallel-work assessment

- Classification: Green.
- Recommendation: current worktree.
- Reason: The planned implementation is isolated to Character Reference presentation, mapping, and
  focused tests. It does not touch backend contracts, routes, dependencies, or shared schemas.
- Expected owned files or folders: `tasks/T-014A/` and the four declared Character Reference
  implementation files.
- Shared files or dependencies: `CURRENT.md` and `WORKLOG.md` for task bookkeeping only.

## Goal

Make the Character Reference summary feel more like a quick in-game reference by reducing header
and stat density without changing character data, rules logic, or existing creation and viewing
flows.

## Scope

- Hide synthetic `No concentration` copy when no active concentration exists.
- Keep HP and AC prominent.
- Keep Speed visible with lower visual weight where appropriate.
- Make Initiative, Passive Perception, and Proficiency more compact.
- Preserve semantic `<dl>`, `<dt>`, and `<dd>` markup.
- Preserve sample, generated, and manual characters.
- Preserve generic avatar fallback.

## Out of scope

- Attack badges.
- Calculation breakdown modal.
- HP increment or decrement controls.
- Resource tracker or rest buttons.
- Advantage or disadvantage toggle.
- Combat or exploration mode.
- `It's my turn` assistant.
- Backend, API, routing, persistence, or data model changes.
- Dependencies.

## Expected implementation files

- `frontend/src/characters/CharacterReference.test.tsx`
- `frontend/src/characters/characterSheetToReference.test.ts`
- `frontend/src/characters/characterSheetToReference.ts`
- `frontend/src/characters/characters.css`

Do not edit these files until implementation is explicitly approved.

## Recommended implementation shape

1. Add focused failing mapper and component tests.
2. Stop synthesizing `No concentration` when the source concentration is absent.
3. Compact the existing primary and secondary stat presentation through scoped CSS.
4. Preserve the current semantic structure, active concentration rendering, and avatar behavior.
5. Run focused tests, the full frontend suite, the frontend build, and manual narrow-width checks.

## Risks

- Three secondary stats may wrap or become cramped on narrow phones.
- Broad CSS selectors could unintentionally affect landing or saved-reference state cards.
- Removing concentration rendering entirely could hide a future active concentration value.
- Position-based styling for Speed could become brittle.

Mitigate these risks with selectors scoped to Character Reference, preservation of truthy active
concentration copy, focused component tests, and a manual narrow-width check.

## Planning validation

Run:

```sh
git diff --check
git status --short --branch
```

## Proposed docs commit message

```text
docs(characters): plan compact reference header polish
```
