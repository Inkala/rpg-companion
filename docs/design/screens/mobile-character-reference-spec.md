# Mobile Character Reference Screen Specification

## Purpose and Screen Role

The Character Reference is the read-only mobile screen opened from:

`Explore Mara` -> `Character Reference`

Its job is to help a visitor quickly find and understand something about Mara Velard when needed. It should answer practical questions such as what Mara can do, what her key stats are, and which abilities or spells are worth opening for a quick explanation.

Character Reference is a supporting capability within Hunin. Hunin's primary product value remains character creation, adding an existing character, understanding character options, party onboarding, and later level-up guidance.

Character Reference is not:

- a turn-by-turn combat dashboard;
- an initiative tracker;
- a mutable character sheet;
- a resource editing screen;
- the whole character-management experience.

Later, this screen can coexist with character creation, character editing, level-up guidance, party membership, and GM sheet access. Those flows may lead to or from Character Reference, but they should not be collapsed into this first read-only sample screen.

## 1. Screen Hierarchy

### Top-to-bottom mobile order

1. App-level mobile shell
   - Warm parchment page background.
   - Compact top navigation row.
   - Back action: `Back`.
   - Screen label or route title: `Character Reference`.
2. Character summary block
   - Character name: `Mara Velard`
   - Identity line: `Human Ranger · Level 3`
   - Supporting line: `Hunter · Outlander`
3. Primary stat area
   - `HP 26 / 26`
   - `AC 14`
   - `Speed 30 ft.`
4. Quiet current-status line
   - `No concentration`
5. Secondary stat row
   - `Initiative +3`
   - `Passive Perception 14`
   - `Proficiency +2`
6. Reference sections
   - `Actions` expanded by default
   - `Features` collapsed by default
   - `Spells` collapsed by default
7. Lower page padding

### Above the fold on a typical phone

The first viewport should show:

- the back action and `Character Reference` context;
- `Mara Velard`;
- `Human Ranger · Level 3`;
- primary stats: `HP 26 / 26`, `AC 14`, `Speed 30 ft.`;
- the quiet `No concentration` state;
- the `Actions` heading;
- both visible action rows: `Longbow` and `Shortsword`, whenever practical.

If vertical space is constrained, keep the primary stats and first action visible before preserving the secondary stat row. Secondary stats may move lower on very short screens.

### May require scrolling

The following may require scrolling:

- the full secondary stat row on very short screens;
- the `Features` section;
- the `Spells` section;
- any expanded section content below `Actions`.

Do not add search, tabs, marketing content, account prompts, inventory, notes, or a combat timeline to this screen.

### Back and navigation behavior

The top navigation has a `Back` control that returns to the guest landing page.

For the static first slice, the back control can be non-functional if routing is not implemented yet, but the intended behavior must be clear. It should be visually quiet and must not compete with the character summary or the ability rows.

Do not show a sign-in prompt when the visitor opens, browses, or leaves the sample Character Reference.

## 2. Character Summary

### Exact identity text

Show:

- Character name: `Mara Velard`
- Identity line: `Human Ranger · Level 3`
- Supporting line: `Hunter · Outlander`

Do not show alignment in the top summary. `Neutral Good` is valid sample content, but it is lower priority than class, level, subclass, and background for this screen.

### Primary stat trio and always-visible status

Always show this primary stat trio in the primary stat area:

- `HP 26 / 26`
- `AC 14`
- `Speed 30 ft.`

HP is the strongest stat in the trio. AC and Speed are secondary within the trio, but still visible without opening any section.

Always show `No concentration` as a quiet current-status line adjacent to or directly below the primary stat area. It is always visible, but it is not part of the primary stat trio.

### Secondary stats

Show these below the primary stats in a compact secondary row:

- `Initiative +3`
- `Passive Perception 14`
- `Proficiency +2`

These are useful for reference, but they should not crowd HP, AC, Speed, or the first Actions.

### Stat presentation rules

- `HP 26 / 26`: use a larger value, tabular numbers, and `color.state.hp` as a restrained accent. Do not imply HP can be edited.
- `AC 14`: use tabular numbers and `color.state.ac` as a restrained accent.
- `Speed 30 ft.`: use the normal stat display style. Keep the unit visible.
- `Initiative +3`: keep the plus sign.
- `Passive Perception 14`: spell out `Passive Perception` rather than using an unexplained abbreviation.
- `Proficiency +2`: use `Proficiency`, not `PB`, in this first screen.
- `No concentration`: show as quiet text or a low-emphasis badge. Do not use warning styling because nothing is wrong.

### Not concentrating state

Mara is not concentrating at screen load.

Display `No concentration` in the overview area with muted styling:

- text colour: `color.text.secondary` or `color.text.muted`;
- optional soft background: `color.bg.surfaceMuted`;
- no alert icon;
- no large empty-state block;
- no reserved combat-dashboard space.

## 3. Reference Sections

Use vertical expandable sections only. Do not use horizontal tabs for the first sample Character Reference.

### Exact section order for Mara

1. `Actions`
2. `Features`
3. `Spells`

### Shown sections

Show these sections because Mara has canonical sample content for them:

- `Actions`
- `Features`
- `Spells`

### Hidden sections

Hide these sections because Mara has no sample content for them yet:

- `Bonus Actions`
- `Reactions`

Do not render disabled or empty section headers for hidden sections in the normal state.

### Default expanded state

- `Actions`: expanded by default.
- `Features`: collapsed by default.
- `Spells`: collapsed by default.

The default view should make Mara's main actions immediately visible without making the screen feel like a full character sheet.

### Actions content

Rows, in order:

1. `Longbow`
2. `Shortsword`

Actions contains attacks and entries that consume the character's Action. It does not contain every spell or feature that happens during play.

### Features content

Rows, in order:

1. `Archery`
2. `Colossus Slayer`

`Colossus Slayer` is the first quick-reference target for the later bottom sheet.

### Spells content

Rows, in order:

1. `Hunter's Mark`
2. `Fog Cloud`
3. `Cure Wounds`

Keep `Hunter's Mark` under `Spells`, even though it uses a Bonus Action. Its row can show `Bonus Action` as timing metadata, but its section remains `Spells`.

## 4. Ability Row Specification

Ability rows show only the information needed to decide whether to open a quick explanation. They should not show full rules text, long reminders, editing controls, inventory details, or character-data modeling fields.

### Row layout

Each row should contain:

- primary name;
- one-line effect hint;
- compact metadata badges or chips;
- optional trailing affordance that indicates the row opens detail.

Metadata must stay scannable:

- Put timing first when timing matters: `Action`, `Bonus Action`, or `Passive`.
- Put spell level near the spell name or first metadata group: `1st-level spell`.
- Put concentration as a clear text badge: `Concentration`.
- Put duration as compact text: `Up to 1 hour` or `Instantaneous`.
- Put attack bonus and damage together for attacks.
- Do not show more than three compact metadata items per row before wrapping or moving lower-priority detail into the quick-reference sheet.

### Longbow row

Section: `Actions`

Visible row content:

- Name: `Longbow`
- Effect hint: `Reliable ranged attack.`
- Metadata: `Action`, `+7 to hit`, `1d8 + 3 piercing`
- Optional range metadata if space allows: `150 / 600 ft.`

Belongs in the later quick-reference sheet, not the row:

- explanation of why the attack bonus is +7;
- full weapon rules;
- detailed range reminder.

### Shortsword row

Section: `Actions`

Visible row content:

- Name: `Shortsword`
- Effect hint: `A close-range backup weapon.`
- Metadata: `Action`, `+5 to hit`, `1d6 + 3 piercing`

Belongs in the later quick-reference sheet, not the row:

- inventory context;
- dual-wielding assumptions;
- full melee attack explanation.

### Archery row

Section: `Features`

Visible row content:

- Name: `Archery`
- Effect hint: `+2 to ranged weapon attack rolls.`
- Metadata: `Fighting Style`, `Passive`

Belongs in the later quick-reference sheet, not the row:

- `This bonus is already included in Mara's longbow attack bonus.`
- any longer explanation of how the bonus is calculated.

### Colossus Slayer row

Section: `Features`

Visible row content:

- Name: `Colossus Slayer`
- Effect hint: `Add 1d8 after hitting an already wounded enemy.`
- Metadata: `Hunter feature`, `Once per turn`

Belongs in the later quick-reference sheet, not the row:

- `The enemy must be below its hit point maximum before the hit.`
- `The bonus applies once per turn, not once per attack.`
- resource text: `No limited resource`

### Hunter's Mark row

Section: `Spells`

Visible row content:

- Name: `Hunter's Mark`
- Effect hint: `Mark one creature and add 1d6 damage on weapon hits.`
- Metadata: `1st-level spell`, `Bonus Action`, `Concentration`
- Duration metadata if space allows: `Up to 1 hour`

Belongs in the later quick-reference sheet, not the row:

- moving the mark to a new target later also uses a Bonus Action;
- spell slot cost detail;
- longer targeting and damage reminder.

### Fog Cloud row

Section: `Spells`

Visible row content:

- Name: `Fog Cloud`
- Effect hint: `Create a sphere of heavily obscuring fog.`
- Metadata: `1st-level spell`, `Action`, `Concentration`
- Duration metadata if space allows: `Up to 1 hour`

Belongs in the later quick-reference sheet, not the row:

- tactical examples such as blocking sight, escaping, hiding movement, or making ranged attacks difficult;
- spell slot cost detail.

### Cure Wounds row

Section: `Spells`

Visible row content:

- Name: `Cure Wounds`
- Effect hint: `Restore hit points to a creature you touch.`
- Metadata: `1st-level spell`, `Action`, `Instantaneous`
- Optional state badge if space allows: `No concentration`

Belongs in the later quick-reference sheet, not the row:

- reminder that it can heal an adjacent ally or yourself if allowed by the situation;
- spell slot cost detail;
- longer touch-range context.

## 5. Visual Application

Apply the approved light parchment theme only.

The screen should feel like Tabletop Utility with Field Journal warmth: practical, calm, scan-friendly, and lightly inspired by old paper. It should not look like fake parchment, a medieval themed website, or a dense traditional character sheet.

### Theme tokens

Use semantic tokens from `docs/design/visual-direction.md`:

- Page background: `color.bg.app`
- Main summary surface: `color.bg.surface`
- Stat area background: `color.bg.surfaceMuted`
- Ability row surface: `color.bg.surface`
- Elevated or sticky navigation surface, if needed: `color.bg.surfaceRaised`
- Primary text: `color.text.primary`
- Secondary text: `color.text.secondary`
- Muted labels: `color.text.muted`
- Subtle border: `color.border.subtle`
- Strong summary border: `color.border.strong`
- Accent: `color.accent.primary`
- Accent hover or pressed state: `color.accent.primaryHover`
- Soft accent background: `color.accent.soft`
- Brass detail: `color.detail.brass`
- HP accent: `color.state.hp`
- AC accent: `color.state.ac`
- Action badge accent: `color.state.action`
- Bonus Action badge accent: `color.state.bonus`
- Spell badge accent: `color.state.spell`
- Concentration badge accent: `color.state.concentration`
- Focus outline: `color.focus`

### Typography hierarchy

- Navigation label `Character Reference`: body font, 14-16px, medium, `color.text.secondary`.
- Character name `Mara Velard`: display font, 28-34px, semibold, `color.text.primary`.
- Identity line `Human Ranger · Level 3`: body font, 15-16px, medium, `color.text.secondary`.
- Supporting line `Hunter · Outlander`: body font, 14-15px, regular, `color.text.muted`.
- Primary stat values: body font with tabular numbers, 24-32px, semibold or bold.
- Secondary stat values: body font with tabular numbers, 15-16px, medium.
- Section headings: body font, 16-18px, semibold.
- Row names: body font, 16px, semibold, `color.text.primary`.
- Row effect hints: body font, 14-15px, regular, `color.text.secondary`.
- Badges and compact metadata: body font, 12-13px, medium.

Use `Fraunces` only for `Mara Velard`. Use the body font for rules text, labels, stats, buttons, and metadata.

### Density and spacing

- Page padding: `space.4` on mobile.
- Top navigation bottom gap: `space.3`.
- Summary block internal padding: `space.4`.
- Gap between summary and sections: `space.4`.
- Section header vertical padding: at least `space.3`, while preserving a 44px tap target.
- Ability row internal padding: `space.3` to `space.4`.
- Gap between rows: `space.2`.
- Bottom page padding: `space.6`.

Keep the screen dense enough for reference, but not cramped. If a row becomes too busy, move lower-priority metadata into the later quick-reference sheet rather than shrinking text below readable sizes.

### Surfaces, borders, dividers, and badges

- The page itself is unframed.
- The summary block may use `color.bg.surface`, `1px solid color.border.strong`, `radius.lg`, and `shadow.card`.
- Stat cells may sit inside `color.bg.surfaceMuted` blocks, but do not nest cards inside cards.
- Ability rows use `color.bg.surface`, `1px solid color.border.subtle`, `radius.md`, and no heavy shadow.
- Section headers use a subtle divider with `color.border.subtle`.
- Use `radius.pill` only for badges.
- Use badges for action type, spell level, concentration, duration, passive state, and timing.
- Badge text must carry the meaning. Do not rely on colour alone.
- Use brass sparingly for section dividers or a small identity accent, not as a dominant colour.

### Interactive states

- Row hover or pressed state: subtle background shift to `color.accent.soft` or a stronger border using `color.accent.primary`.
- Expanded section header: visible chevron state plus text state such as count or expanded affordance. Do not rely on chevron direction alone.
- Focus state: 2px outline using `color.focus`, offset by 2px.
- Disabled states are not needed in the normal sample screen because hidden sections are omitted.

## 6. Interaction and Accessibility

### Expand and collapse behavior

- Section headers are buttons.
- `Actions` starts expanded.
- `Features` and `Spells` start collapsed.
- Tapping a collapsed section expands it in place.
- Tapping an expanded section collapses it in place.
- Expanding one section does not need to collapse another section.
- Preserve scroll position when expanding or collapsing a section.

### Rows that open quick explanation

Long term, every visible row can open a quick-reference sheet:

- `Longbow`
- `Shortsword`
- `Archery`
- `Colossus Slayer`
- `Hunter's Mark`
- `Fog Cloud`
- `Cure Wounds`

For the first interactive implementation, only `Colossus Slayer` needs to be wired to the first quick-reference bottom sheet. Other rows should keep a consistent future-detail affordance so the interaction model is clear, but their detail behavior is out of scope for the first implementation slice.

This spec does not define the bottom-sheet content or behavior. It only marks row-level launch intent for the current and future quick explanations.

### Keyboard and focus behavior

Focus order follows visual order:

1. `Back`
2. `Actions` section header
3. `Longbow`
4. `Shortsword`
5. `Features` section header
6. `Archery`, if `Features` is expanded
7. `Colossus Slayer`, if `Features` is expanded
8. `Spells` section header
9. spell rows, if `Spells` is expanded

When a section is collapsed, its hidden rows must not be focusable.

Rows and section headers must be real buttons or links according to final routing behavior. For this first static screen, use button semantics for expandable section headers and row activation.

### Accessible names and labels

- Back control accessible name: `Back to guest landing page`.
- Page `h1`: `Character Reference`.
- Prominent character heading within the page hierarchy: `Mara Velard`.
- Section header names:
  - `Actions, 2 items, expanded`
  - `Features, 2 items, collapsed`
  - `Spells, 3 items, collapsed`
- Row accessible names should include the name and key type, for example:
  - `Longbow, Action, plus 7 to hit, 1d8 plus 3 piercing`
  - `Colossus Slayer, Hunter feature, once per turn`
  - `Hunter's Mark, 1st-level spell, Bonus Action, Concentration`

Do not expose decorative icons as meaningful text.

### Tap targets and small screens

- Back control: minimum 44px tap target.
- Section headers: minimum 44px height.
- Ability rows: minimum 44px height. Prefer taller rows when metadata wraps.
- Badges do not need to be individually interactive.
- No horizontal scrolling at narrow mobile widths.
- Long labels wrap cleanly within their row.
- Do not scale font sizes based on viewport width.

### Icon and colour constraints

- Icons may support scanning, but no meaning can be icon-only.
- Chevron state must be paired with accessible expanded/collapsed state.
- Action type, concentration, spell level, duration, and passive state must be stated in text.
- Preserve readable contrast for every label, badge, stat, and row.

## 7. First Implementation Boundary

For the first implementation slice:

- use static Mara Velard sample content only;
- keep the screen read-only;
- do not add authentication;
- do not add persistence;
- do not call an API;
- do not add editing;
- do not add inventory;
- do not add notes;
- do not add party functions;
- do not add combat tracker behavior;
- do not add HP, spell slot, concentration, or resource editing;
- do not add search;
- do not add theme switching;
- do not create the quick-reference bottom-sheet specification yet;
- do not write React, CSS, TypeScript, Go, or tests from this document.

The first interactive implementation only needs to wire `Colossus Slayer` to the first quick-reference bottom sheet. Other rows should retain a consistent future-detail affordance, but their detail behavior is out of scope for the first implementation slice. The quick-reference bottom sheet itself remains a separate specification.

## Implementation Acceptance Checklist

- The screen is titled `Character Reference`.
- The screen is opened by `Explore Mara`.
- The screen has a `Back` action intended to return to the guest landing page.
- The character name is `Mara Velard`.
- The identity line is `Human Ranger · Level 3`.
- The supporting line is `Hunter · Outlander`.
- Primary stat trio shows `HP 26 / 26`, `AC 14`, and `Speed 30 ft.`
- `No concentration` is always visible as a quiet current-status line adjacent to or directly below the primary stat area.
- Secondary stats show `Initiative +3`, `Passive Perception 14`, and `Proficiency +2`.
- `No concentration` is quiet and not styled as a warning.
- Sections are vertical expandable sections only.
- Visible section order is `Actions`, `Features`, `Spells`.
- `Actions` is expanded by default.
- `Features` and `Spells` are collapsed by default.
- `Bonus Actions` and `Reactions` are hidden because Mara has no sample content for them.
- `Actions` contains `Longbow` and `Shortsword`.
- `Features` contains `Archery` and `Colossus Slayer`.
- `Spells` contains `Hunter's Mark`, `Fog Cloud`, and `Cure Wounds`.
- `Hunter's Mark` remains under `Spells`, not under `Actions`.
- Every ability row shows only at-a-glance information and avoids full rules text.
- Every visible row is marked with consistent future-detail affordance.
- The first interactive implementation only needs to wire `Colossus Slayer` to the first quick-reference bottom sheet.
- The light parchment visual direction uses semantic tokens from `docs/design/visual-direction.md`.
- The layout preserves Tabletop Utility with Field Journal warmth.
- All interactive controls have visible focus states.
- Section headers and rows have at least 44px tap targets.
- Collapsed rows are not focusable.
- `Character Reference` is the page `h1`.
- `Mara Velard` is the prominent character heading within the page hierarchy.
- Accessible names include useful row and section context.
- No icon-only meaning is required.
- No horizontal scrolling is introduced.
- The first slice remains static, read-only, and free of auth, persistence, API, editing, party functions, combat tracking, resource editing, theme switching, and bottom-sheet specification work.
