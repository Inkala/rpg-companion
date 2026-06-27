# Visual Direction

## Design principles and visual mood

Hunin uses **Tabletop Utility** as its usability foundation, with **Field Journal** warmth.

The interface should feel like a practical D&D session companion: fast to scan, calm under pressure, and clear enough for a player who only needs the next useful answer. It should also carry a little warmth from notebooks, table references, and old paper without becoming decorative.

The default visual mode is light. The light theme uses warm beige, old-paper, and parchment-inspired surfaces. The app should feel polished and modern, not like fake parchment, a medieval website, or a dense traditional character sheet.

The main accent is muted forest green. Brass and ochre details are used sparingly for emphasis, dividers, state accents, or small moments of character.

Dark mode is planned for a later feature. The eventual theme preference should support System, Light, and Dark. Do not implement theme switching yet. Future UI should use semantic tokens so light and dark values can be swapped cleanly.

## Light semantic colour tokens

```text
color.bg.app              #F7F1E6  warm parchment page
color.bg.surface          #FFFCF4  main card/sheet surface
color.bg.surfaceMuted     #F1E6D3  stat bands, quiet grouped areas
color.bg.surfaceRaised    #FFFFFF  modal and elevated surfaces

color.text.primary        #201B15  dark ink
color.text.secondary      #5B5145  readable muted text
color.text.muted          #7B6F60  low-priority labels
color.text.inverse        #FFF8EA

color.border.subtle       #E2D4BE
color.border.strong       #BFAE91

color.accent.primary      #2F5D46  muted forest green
color.accent.primaryHover #254A38
color.accent.soft         #DDE8DC
color.accent.text         #1F4634

color.detail.brass        #A67832  restrained brass
color.detail.ochreSoft    #E8D4A8

color.state.hp            #8F2F2F  readable muted red
color.state.ac            #2F4F73  steel blue
color.state.action        #2F5D46  forest green
color.state.bonus         #7A5A22  ochre brown
color.state.reaction      #5A4B8A  muted violet
color.state.spell         #365F7C  muted arcane blue
color.state.concentration #8A5A1F  brass/amber

color.feedback.error      #9B2C2C
color.feedback.errorBg    #F8E3DE
color.feedback.warning    #8A5A1F
color.feedback.success    #2F5D46

color.focus               #1F6F56  visible focus outline
```

## Dark semantic colour tokens

Dark mode should feel like ink, leather, and dim table light, not a neon fantasy UI.

```text
color.bg.app              #181511
color.bg.surface          #211D17
color.bg.surfaceMuted     #2B261E
color.bg.surfaceRaised    #302A21

color.text.primary        #F5ECDD
color.text.secondary      #D8CBB8
color.text.muted          #A99A85
color.text.inverse        #181511

color.border.subtle       #443A2E
color.border.strong       #6C5B45

color.accent.primary      #7FA889
color.accent.primaryHover #9BBEA2
color.accent.soft         #253A2D
color.accent.text         #D7E8D9

color.detail.brass        #C99A4A
color.detail.ochreSoft    #47391F

color.state.hp            #E07A70
color.state.ac            #8FB3D9
color.state.action        #8FBE99
color.state.bonus         #D2A74D
color.state.reaction      #B2A4E6
color.state.spell         #8CBBD6
color.state.concentration #D6A24A

color.feedback.error      #F08A7D
color.feedback.errorBg    #3E211E
color.feedback.warning    #D6A24A
color.feedback.success    #8FBE99
```

## Typography

Recommended practical web font stack:

```text
font.body: "Inter", "Source Sans 3", system-ui, sans-serif
font.display: "Fraunces", "Georgia", serif
font.mono: "IBM Plex Mono", "SFMono-Regular", monospace
```

Usage rules:

- Use `Inter` or `Source Sans 3` for almost everything.
- Use `Fraunces` only for Hunin, major character names, or small identity moments.
- Body text should be at least 16px.
- Compact labels can be 12-13px, medium weight, and must never be low contrast.
- Character names should be 28-34px on mobile.
- Section headings should be 16-18px and semibold.
- HP and AC values should be 24-32px, semibold or bold.
- Avoid decorative fantasy fonts for rules text.
- Use tabular numbers for HP, AC, durations, and resource counts.

## Surface, border, radius, shadow, and spacing

Surfaces:

- App background: warm parchment.
- Cards: near-white old-paper surface.
- Stat areas: slightly darker muted parchment.
- Bottom sheet: raised surface with stronger border and shadow.

Borders:

- Default border: `1px solid color.border.subtle`.
- Interactive or selected border: `color.accent.primary`.
- Avoid heavy outlines except for focus states.

Radius:

```text
radius.sm    4px
radius.md    6px
radius.lg    8px
radius.sheet 12px top corners only
radius.pill  999px only for badges
```

Shadows:

```text
shadow.card   0 1px 2px rgba(32, 27, 21, 0.08)
shadow.raised 0 8px 24px rgba(32, 27, 21, 0.16)
shadow.sheet  0 -12px 32px rgba(32, 27, 21, 0.22)
```

Spacing:

```text
space.1  4px
space.2  8px
space.3  12px
space.4  16px
space.5  20px
space.6  24px
space.8  32px
```

Use 16px page padding on mobile. Cards should generally use 12-16px internal padding. Keep Play View dense, but not cramped.

## Component guidance

### Buttons

- Primary buttons use forest green fill, inverse text, and a clear 44px minimum tap height.
- Secondary buttons use parchment surface, ink text, and subtle border.
- Quiet actions use text-button styling, muted but still readable.
- Focus states use a visible 2px outline in brass or forest green, offset by 2px.

### Cards

- Use cards for the sample character preview and ability rows.
- Use white or old-paper surfaces with subtle borders.
- Do not nest cards.
- Ability rows should be compact, tappable, and scan-friendly.
- Important stats can sit in small `color.bg.surfaceMuted` blocks inside the card, but avoid visual clutter.

### Badges

- Use pill badges for action type, spell, concentration, duration, and passive state.
- Badge colours should use soft backgrounds with dark readable text.
- Do not rely on colour alone. Label text must always say `Action`, `Bonus Action`, `Reaction`, `Spell`, `Concentration`, or the relevant state.

### Expandable sections

- Use vertical disclosure rows only.
- Header rows show section name, count if useful, and chevron.
- Actions are expanded by default.
- Collapsed sections should feel quiet but clearly tappable.
- Section content uses ability rows with consistent spacing.

### Ability rows

- Show only the information needed to decide whether to open the row.
- Include name, one-line effect hint, and any brief type, timing, duration, or usage hint that helps scanning.
- Do not show full rules text, long reminders, editing controls, or dense character-sheet data.
- Keep the full row tappable with a visible focus state.

### Quick-reference bottom sheet

- Use a raised parchment surface over a dimmed Play View.
- Use a top handle in muted border colour.
- Put a close icon button in the top-right with an accessible label.
- Show the name and action-type badge immediately.
- Make the summary the strongest content after the title.
- Show duration, concentration, and cost in compact stat or badge rows.
- Show `Show more details` as a secondary action only when real detail exists.

## Accessibility constraints

- Preserve readable contrast for all text, labels, badges, buttons, and states.
- Provide visible focus states for all interactive controls.
- Use 44px minimum touch targets for primary interactive controls.
- Use text labels in addition to colour for action types, concentration, duration, status, and other key states.
- Do not use decorative typography for rules content.
- Do not rely on icons alone to communicate section meaning, dismissal, expansion, or state.
- Keep HP, AC, actions, concentration, and durations fast to identify visually.
- Keep mobile layouts free of horizontal scrolling.

## First implementation boundary

- Render the light theme only.
- Structure future CSS around semantic tokens.
- Do not add a theme picker, persistence, or system-preference behaviour yet.
- Do not implement React, CSS, or theme-switching changes as part of this design-documentation task.
