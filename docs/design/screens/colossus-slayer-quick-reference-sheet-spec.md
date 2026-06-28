# Colossus Slayer Quick-Reference Bottom-Sheet Specification

## Purpose and Role

This specification covers the first quick-reference bottom sheet opened from Mara Velard's `Colossus Slayer` row in Character Reference.

The sheet answers:

`How does Colossus Slayer work again?`

It helps the user quickly understand when Mara can add the extra damage, how often it can happen, and what condition must be true before the hit. It should be useful while preparing a character, reviewing the sample at home, or checking a reminder during a session.

The sheet is not:

- a combat tracker;
- a turn manager;
- a rules encyclopedia;
- a damage roller;
- a usage tracker;
- a place to edit Mara Velard;
- a substitute for the full feature text.

It opens as an overlay from Character Reference rather than navigating away so the user keeps Mara's character context visible underneath. Closing the sheet should return the user to the same `Colossus Slayer` row and section state they came from.

The first implementation only needs this one bottom sheet. Other rows may later use the same pattern, but their detail behavior is out of scope for this slice.

## 1. Sheet Hierarchy

### Top-to-bottom order

1. Modal overlay over Character Reference
2. Bottom sheet container
3. Top handle
4. Header row
   - Title: `Colossus Slayer`
   - Close control
5. Type badge
   - `Hunter feature`
6. One-line summary
   - `After you hit an enemy that is already wounded, add 1d8 damage.`
7. Compact metadata row
   - `Timing: Once per turn`
   - `Resource: No limited use`
8. Reminder block
   - Heading: `Remember`
   - Text: `The enemy must be below its hit point maximum before the hit.`
9. Expandable detail control
   - Collapsed label: `Show more details`
   - Expanded label: `Hide details`
10. Expanded detail text, only when opened
    - `The bonus applies once per turn, not once per attack.`

### Visible immediately without expansion

The sheet must show immediately:

- `Colossus Slayer`
- `Hunter feature`
- `After you hit an enemy that is already wounded, add 1d8 damage.`
- `Timing: Once per turn`
- `Resource: No limited use`
- `Remember`
- `The enemy must be below its hit point maximum before the hit.`
- `Show more details`
- close control

On a typical phone, all of this should fit without requiring scrolling. If a very short phone requires scrolling, the title, summary, timing, resource, and close control must still be visible first.

### Only after `Show more details`

Show only after expansion:

- `The bonus applies once per turn, not once per attack.`

Do not add extra examples, edge cases, official rules text, damage calculations, attack-roll explanation, or target-state tracking in this first sheet.

### Character Reference behind the sheet

The Character Reference remains visible behind a dim overlay. The visible background should preserve context, especially that the sheet came from Mara Velard's `Features` section and the `Colossus Slayer` row.

The background is visually present but not interactive while the sheet is open. Keyboard focus must stay inside the sheet until it closes.

## 2. Exact Colossus Slayer Content

Use Mara Velard's canonical sample content as the factual basis.

### Title

`Colossus Slayer`

### Type

`Hunter feature`

### One-line summary

`After you hit an enemy that is already wounded, add 1d8 damage.`

### Timing

Label: `Timing`

Value: `Once per turn`

### Resource

Label: `Resource`

Value: `No limited use`

### Reminder

Heading: `Remember`

Text: `The enemy must be below its hit point maximum before the hit.`

### Expandable detail

Collapsed label:

`Show more details`

Expanded label:

`Hide details`

Expanded text:

`The bonus applies once per turn, not once per attack.`

## 3. Visual Application

Apply the approved light parchment theme only.

The bottom sheet should feel practical, calm, and quick to scan. It should use Tabletop Utility with Field Journal warmth, not magical ornament, decorative fantasy styling, or a rules-book layout.

### Theme tokens

Use semantic tokens from `docs/design/visual-direction.md`:

- Backdrop overlay: dimmed layer over Character Reference using a warm ink-tinted transparent overlay.
- Sheet surface: `color.bg.surfaceRaised`
- Sheet border: `color.border.strong`
- Handle: `color.border.strong` or `color.text.muted`
- Primary text: `color.text.primary`
- Secondary text: `color.text.secondary`
- Muted labels: `color.text.muted`
- Type badge background: `color.accent.soft`
- Type badge text: `color.accent.text`
- Metadata background: `color.bg.surfaceMuted`
- Metadata border: `color.border.subtle`
- Reminder accent: `color.detail.ochreSoft`
- Reminder text: `color.text.primary`
- Expand control text: `color.accent.text`
- Close control text/icon: `color.text.secondary`
- Close hover or pressed state: `color.accent.soft`
- Focus outline: `color.focus`

### Sheet surface and structure

- Position: bottom-aligned modal sheet.
- Width: full mobile viewport width, constrained by page safe area.
- Surface: `color.bg.surfaceRaised`.
- Border: top and side border using `color.border.strong`.
- Radius: `radius.sheet`, top corners only.
- Shadow: `shadow.sheet`.
- Padding: `space.4` on mobile.
- Internal vertical gap: `space.3` to `space.4`.
- No nested cards.
- No decorative parchment texture, corner ornaments, seals, or fantasy flourishes.

### Overlay

- Dim the Character Reference enough to make the sheet clear.
- Keep Mara's underlying screen faintly recognizable.
- Do not blur the background so heavily that the user loses context.
- The overlay itself is not a separate content surface.

### Handle

- Show a centered horizontal handle at the top of the sheet.
- Use muted border colour and low visual weight.
- The handle is a visual affordance only in the first implementation. It does not need drag behavior.
- Do not rely on the handle as the only close affordance.

### Header and close control

- Title `Colossus Slayer`: body or display-adjacent font, 22-26px, semibold, `color.text.primary`.
- Close control: top-right icon button with accessible label `Close Colossus Slayer quick reference`.
- Close target: minimum 44px by 44px.
- Close icon must not be the only accessible meaning.

### Badge treatment

- `Hunter feature` appears immediately below or near the title.
- Use `radius.pill`.
- Use `color.accent.soft` background and `color.accent.text` text.
- Badge text must say `Hunter feature`; do not rely on colour alone.

### Compact metadata treatment

- Show `Timing: Once per turn` and `Resource: No limited use` as compact labelled metadata.
- Use `color.bg.surfaceMuted` with `color.border.subtle`.
- Labels use `color.text.muted`.
- Values use `color.text.primary`.
- Use tabular numbers for `1d8` if the implementation supports tabular numeric styling in surrounding text.

### Reminder treatment

- Use a small reminder block with heading `Remember`.
- Keep the reminder visually stronger than metadata but weaker than the one-line summary.
- Use a restrained accent such as a left border or soft background with `color.detail.ochreSoft`.
- Do not use warning or error styling. The reminder is guidance, not a failure state.

### Expansion treatment

- `Show more details` is a secondary action, visually quieter than the close control and main summary.
- Use text-button styling with `color.accent.text`.
- Include an expanded/collapsed affordance, but do not rely on an icon alone.
- Expanded detail text appears directly below the control.
- Expanded detail should use normal body text, not a card inside the sheet.

## 4. Interaction Behavior

### Opening behavior

- The sheet opens when the user activates Mara Velard's `Colossus Slayer` row in the `Features` section of Character Reference.
- Opening the sheet does not navigate away from Character Reference.
- The Character Reference remains visible underneath a dim overlay.
- Initial focus moves into the sheet.
- Recommended initial focus: close control, unless implementation chooses the sheet title for screen-reader announcement and then moves focus to the close control.

### Close button behavior

- Activating the close control dismisses the sheet.
- After close, focus returns to the `Colossus Slayer` row that opened the sheet.
- The `Features` section remains in the same expanded or collapsed state it had when the sheet opened.
- Do not prompt for sign-in, saving, or account creation on close.

### Escape key behavior

- Where supported, pressing `Escape` closes the sheet.
- Focus returns to the `Colossus Slayer` row.

### Tapping outside the sheet

- Tapping the dimmed overlay outside the sheet should close the sheet.
- This behavior must not be the only way to dismiss it.
- If a future accessibility test shows accidental dismissal is a problem, this can be changed later. The first spec allows outside tap dismissal because the sheet is read-only and has no unsaved state.

### Show more details behavior

- `Show more details` expands the optional detail text in place.
- When expanded, the control label changes to `Hide details`.
- `Hide details` collapses the detail text in place.
- Expansion should not navigate, replace the sheet, or open another modal.
- Focus remains on the expand/collapse control after activation.

### Focus trap

- While the sheet is open as a modal, keyboard focus remains inside the sheet.
- Focus must not move to Character Reference behind the overlay.
- Tabbing cycles through focusable controls in the sheet.
- Closing the sheet restores focus to the `Colossus Slayer` row.

### Scroll behavior

- On short phone screens, the sheet content area may scroll.
- The sheet should not grow beyond the practical viewport height.
- The title and close control should remain easy to reach.
- Do not introduce horizontal scrolling.
- Expanded detail may require a small amount of vertical scroll on short screens.

## 5. Accessibility

### Dialog semantics

- Present the sheet as a modal dialog.
- Use `role="dialog"` or the platform/framework equivalent.
- Mark it as modal, for example `aria-modal="true"` where appropriate.
- The accessible dialog name is `Colossus Slayer quick reference`.

### Headings and names

- The visible title is `Colossus Slayer`.
- The dialog accessible name should be derived from or equivalent to `Colossus Slayer quick reference`.
- Use clear content group labels for summary, timing/resource metadata, reminder, and details.

### Close control

- Accessible label: `Close Colossus Slayer quick reference`.
- Minimum tap target: 44px by 44px.
- Must be reachable by keyboard.
- Must have a visible focus state.

### Keyboard behavior

- Opening the sheet moves focus into the dialog.
- `Tab` and `Shift+Tab` stay within the dialog while it is open.
- `Escape` closes the sheet where supported.
- `Enter` or `Space` activates the close and expand/collapse controls.
- Closing returns focus to the `Colossus Slayer` row.

### Screen-reader announcement expectations

When the sheet opens, a screen reader should announce:

- that a dialog opened;
- `Colossus Slayer quick reference`;
- the visible title or first meaningful content.

The user should be able to reach:

- close control;
- type: `Hunter feature`;
- summary;
- timing;
- resource;
- reminder;
- `Show more details` or `Hide details`;
- expanded detail text when present.

### Touch targets and small screens

- Close control: minimum 44px by 44px.
- `Show more details` / `Hide details`: minimum 44px tap height.
- Any optional icon controls must also meet 44px touch target minimums.
- Content must wrap within the sheet.
- No horizontal scrolling.

### Contrast and icon constraints

- Preserve readable contrast for title, summary, badges, metadata, reminder, details, close control, and expand control.
- Do not communicate type, dismissal, expansion, or state through colour alone.
- Do not use icon-only meaning. Icons may support close or expansion, but visible text or accessible labels must carry the meaning.
- Do not use decorative typography for rules reminders.

## 6. First Implementation Boundary

For the first implementation slice:

- use static Colossus Slayer content only;
- open this sheet only from Mara Velard's `Colossus Slayer` row;
- keep the sheet read-only;
- do not call an API;
- do not add persistence;
- do not add rules search;
- do not add editing;
- do not add combat logic;
- do not add usage tracking;
- do not add damage rolling;
- do not add spell-slot tracking;
- do not add resource editing;
- do not add theme switching;
- do not define generic data models yet;
- do not write React, CSS, TypeScript, Go, or tests from this document.

Other ability, feature, attack, and spell rows may later reuse this pattern, but their sheets are outside this first implementation slice.

## Implementation Acceptance Checklist

- The sheet opens from Mara Velard's `Colossus Slayer` row in Character Reference.
- The sheet appears as a bottom modal overlay, not a new page.
- Character Reference remains visible but inactive behind the sheet.
- The title is `Colossus Slayer`.
- The type badge says `Hunter feature`.
- The one-line summary says `After you hit an enemy that is already wounded, add 1d8 damage.`
- Metadata shows `Timing: Once per turn`.
- Metadata shows `Resource: No limited use`.
- Reminder heading is `Remember`.
- Reminder text says `The enemy must be below its hit point maximum before the hit.`
- The collapsed expansion control says `Show more details`.
- The expanded control says `Hide details`.
- Expanded detail text says `The bonus applies once per turn, not once per attack.`
- Close control dismisses the sheet.
- Escape closes the sheet where supported.
- Tapping outside the sheet closes it.
- Focus stays inside the sheet while open.
- Focus returns to the `Colossus Slayer` row on close.
- The sheet uses parchment-light semantic tokens from `docs/design/visual-direction.md`.
- The sheet is practical and calm, not magical or ornamental.
- Dialog semantics and accessible naming are defined.
- Close and expand controls meet 44px touch target requirements.
- No icon-only meaning is required.
- No horizontal scrolling is introduced.
- The first slice remains static, read-only, and limited to Colossus Slayer only.
- The spec does not define APIs, persistence, rules search, editing, combat logic, usage tracking, spell-slot tracking, theme switching, generic data models, React, CSS, TypeScript, Go, or tests.
