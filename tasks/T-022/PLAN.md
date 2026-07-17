# T-022 Plan: Character Reference Visual QA

Status: approved

## Scope

Implement the smallest visual QA slice:

1. Center Home action button text.
2. Normalize expanded Character Reference stat tiles.
3. Apply AC blue consistently.
4. Normalize secondary stat tile size/background and preserve semantic colors.
5. Apply muted beige to `.section-panel`.
6. Validate responsive behavior.

## Expected file ownership

- `frontend/src/characters/CharacterReference.tsx`
- `frontend/src/characters/CharacterReference.test.tsx`
- `frontend/src/characters/CharacterSummaryCard.tsx`
- `frontend/src/characters/CharacterSummaryCard.test.tsx`
- `frontend/src/characters/types.ts`
- `frontend/src/characters/characterSheetToReference.ts`
- `frontend/src/characters/characterSheetToReference.test.ts`
- `frontend/src/characters/CharacterStats.tsx` only if implementation requires a change
- `frontend/src/characters/characters.css`
- `frontend/src/features/home/home.css`

Additional files require approval before editing.

Do not edit `frontend/src/characters/maraCharacterSheet.ts` or
`frontend/src/characters/maraReference.ts` unless a concrete implementation need is identified and
approved. Visual QA should not modify Mara's character data.

## Files explicitly not owned

- `frontend/src/character-creation/`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/parties/`
- Party components.
- `frontend/src/features/home/SignedInHomeContent.tsx` unless approval expands scope.
- Backend files.

## Validation commands

Focused:

```sh
pnpm --dir frontend test -- CharacterReference CharacterSummaryCard HomePage
```

Complete frontend:

```sh
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
```

Browser checks:

```text
Check signed-out Home and expanded Character Reference at 320px, 390px, 720px, and desktop.
Confirm no horizontal overflow, centered Home action text, consistent stat tiles, visible focus,
safe wrapping, and preserved contrast.
```

Repository:

```sh
git diff --check
git status --short --branch
```

## Stop point

Stop for review before commit, push, PR, deployment, or starting another task.
