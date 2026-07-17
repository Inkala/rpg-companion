# T-022 Design: Character Reference Visual QA

Status: complete

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: separate worktree.
- Reason: this is mostly presentation work, but it touches shared character and Home CSS. It can run
  beside T-021 only if it avoids App, character creation, Join Party, Party API, and Party component
  files.
- Expected owned files or folders: Character Reference components, Character Summary card, character
  stat mapping files/tests, `characters.css`, and `home.css`.
- Shared files or dependencies: design tokens, shared card/stat tile patterns, Mara sample data, and
  Home visual regression coverage.

## Exact expected ownership

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

Do not edit `frontend/src/characters/maraCharacterSheet.ts` or
`frontend/src/characters/maraReference.ts` unless a concrete implementation need is identified and
approved.

## Visual design

- Keep Hunin's current parchment page background and card rhythm.
- Use CSS changes first where possible.
- Normalize stat-tile sizing through a shared class or local component pattern already present in the
  Character Reference surface.
- Treat AC as the defensive stat with the approved blue value color in both summary and expanded
  views.
- Keep Initiative, Passive Perception, and Proficiency visually equivalent to primary stat tiles but
  retain semantic colors approved by the current mappings.
- Semantic value colors:
  - Initiative: `var(--color-state-action)`.
  - Passive Perception: `var(--color-state-ac)`.
  - Proficiency: `var(--color-state-bonus)`.
  - AC: `var(--color-state-ac)`.
- Character Reference labels on muted stat backgrounds use `var(--color-text-secondary)`.
- Colors are supplemental only. Visible labels remain the primary meaning carrier.
- Both primary and secondary expanded stat groups use three equal `minmax(0, 1fr)` columns.
- Both expanded stat groups use matching muted backgrounds, padding, and gap.
- Tiles stay at least `72px` high, wrap labels safely, and match computed dimensions within `1px`
  during browser validation.
- Use `var(--color-bg-surface-muted)` for `.section-panel`.

## Accessibility and responsive design

- Preserve visible focus states and keyboard behavior.
- Preserve valid headings and section semantics.
- Preserve semantic `dl`/`dt`/`dd` markup for expanded stat hooks.
- Preserve `.section-panel` content semantics after the background change.
- Confirm text wraps safely at 320px, 390px, 720px, and desktop.
- Confirm no horizontal overflow and no tile content clipping.

## Merge order

- Prefer T-021 first, then rebase T-022 onto current main and run visual/browser checks.
- If T-022 merges first, T-021 must rebase and rerun route/save/Party focused tests.
