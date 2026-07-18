# T-027 Requirements: Party Empty-state Layout Correction

Status: approved

## Goal

Correct the signed-in empty `My parties` presentation so it matches the compact muted-panel
structure of the empty `My characters` section.

## Required behavior

- Keep one muted `My parties` panel using `var(--color-bg-surface-muted)`.
- Remove the nested white bordered empty-state card.
- Show exactly one visible `My parties` heading.
- Show `There are no quests in sight` and the exact supporting copy
  `Create or join an adventure to satisfy your thirst for aventura.`
- On desktop, keep copy on the left and the `Create` and `Join` actions together on the right.
- Keep `Create` primary, `Join` secondary, and both controls at least 44px high.
- On mobile, stack safely without horizontal overflow.
- Preserve loaded Party cards, Party navigation, and Home section order.
- Use existing design tokens only.

## Non-goals

- Do not change Level Up, Character Reference, App routing, backend, rules data, T-023, T-026,
  provider, or deployment files.
- Do not add the visual reference screenshots to Git.

## Acceptance criteria

- The empty Party state has no nested bordered surface and no excessive vertical whitespace.
- Desktop layout aligns its proportions and spacing with the empty Character panel.
- Mobile checks at 320px, 390px, and 720px remain usable and overflow-free.
- Loaded Party quest-board cards and navigation behavior remain unchanged.
