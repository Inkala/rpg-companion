# T-022 Requirements: Character Reference Visual QA

Status: complete

## Goal

Polish Character Reference and related Home summary visuals without touching save, invite, Party
API, or character-creation behavior.

## Required behavior

- Center signed-out Home `Create character`, `Create party`, and `Join party` button text.
- Make expanded HP, AC, and Speed tiles visually identical in size and background.
- Make AC blue on Home and expanded Character Reference.
- Make Initiative, Passive Perception, and Proficiency match the primary stat-tile size/background
  with their approved semantic colors.
- Use the exact semantic color contract:
  - Initiative value: `var(--color-state-action)`.
  - Passive Perception value: `var(--color-state-ac)`.
  - Proficiency value: `var(--color-state-bonus)`.
  - AC value: `var(--color-state-ac)`.
  - Character Reference labels on the muted stat background: `var(--color-text-secondary)`.
- Treat colors as supplemental. Visible labels must continue carrying the meaning.
- Use three equal `minmax(0, 1fr)` columns for both primary and secondary expanded stat groups.
- Use matching muted backgrounds, padding, and gap for both expanded stat groups.
- Keep stat tiles at least `72px` high with safe label wrapping.
- Confirm matching computed tile dimensions within `1px` during browser validation.
- Give `.section-panel` the muted beige background.
- Preserve semantics, contrast, focus visibility, and responsive behavior.

## Non-goals

- Do not edit `CharacterCreationPage`, central App routing, Join Party pages, Party API files, or
  Party card components.
- Do not change save behavior, invite behavior, backend code, migrations, or API contracts.
- Do not implement portrait-bank, gender, editing/deletion, or Party management features.

## Acceptance criteria

- Home action text is centered at desktop, tablet, and mobile widths.
- Primary and secondary stat tiles have consistent dimensions and backgrounds in expanded Character
  Reference.
- AC uses the approved blue treatment consistently on Home and expanded Character Reference.
- Secondary stat values retain semantic color meaning while matching tile scale.
- `.section-panel` uses the muted beige surface without lowering text contrast.
- Home AC receives `stat--ac`.
- Mapped Initiative, Passive Perception, and Proficiency expose their exact emphasis values.
- Expanded stat hooks retain semantic `dl`/`dt`/`dd` markup.
- `.section-panel` content remains semantically intact after the background change.
- Browser checks at 320px, 390px, 720px, and desktop show no horizontal overflow.
