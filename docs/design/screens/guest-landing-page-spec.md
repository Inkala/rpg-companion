# Guest Landing Page Screen Specification

## Purpose

The Guest Landing Page is the first screen for a visitor who is not signed in and has no saved character yet.

It should:

- communicate what Hunin is without becoming a marketing site;
- make exploring Mara Vale the obvious first action;
- keep account-related actions present but quiet;
- feel like the beginning of an app, not a generic product homepage.

This specification applies the agreed **Tabletop Utility** foundation with **Field Journal** warmth. It does not change the agreed guest flow.

## 1. Screen hierarchy

### Top-to-bottom content order

1. App shell background
2. Brand block
   - Page title: `Hunin`
   - Product tagline: `Your party companion.`
   - Supporting sentence: `Understand your character quickly when it is time to play.`
3. Primary sample-character preview card
   - Small badge: `Sample character`
   - Character identity: `Mara Vale`
   - Character summary: `Human Ranger 3`
   - Stat strip: `HP 26 / 26`, `AC 14`, `Speed 30 ft.`
   - Ability badges: `Longbow`, `Colossus Slayer`
   - Short preview note: `A steady wilderness scout with a clear attack, useful spells, and quick rules reminders.`
   - Primary CTA: `Explore Mara`
4. Own-character action group
   - Section label: `Start your own`
   - Secondary button: `Create a character`
   - Secondary button: `Add an existing character`
5. Quiet account action group
   - Text link: `Sign in`
   - Text link: `I have a party invite`

### Above the fold on a typical phone

On a typical phone viewport, the first screen should show:

- the full brand block;
- the full Mara Vale preview card;
- the `Explore Mara` CTA;
- at least the beginning of the `Start your own` action group.

The `Explore Mara` CTA must remain visible without scrolling on common phone heights whenever practical. If vertical space is constrained, reduce the supporting sentence and preview note before reducing the size or prominence of the Mara card and CTA.

### May require scrolling

The following may require a short scroll on small phones:

- full `Start your own` action group;
- quiet account links;
- any extra vertical breathing room after the main content.

Do not add marketing sections, feature lists, testimonials, artwork, screenshots, or explanatory onboarding content to this screen.

## 2. Concrete copy

### Brand block

- Page title: `Hunin`
- Tagline: `Your party companion.`
- Supporting sentence: `Understand your character quickly when it is time to play.`

### Sample preview card

- Badge: `Sample character`
- Character name: `Mara Vale`
- Character identity line: `Human Ranger 3`
- Stat labels:
  - `HP`
  - `AC`
  - `Speed`
- Stat values:
  - `26 / 26`
  - `14`
  - `30 ft.`
- Ability badges:
  - `Longbow`
  - `Colossus Slayer`
- Preview note: `A steady wilderness scout with a clear attack, useful spells, and quick rules reminders.`
- Primary action: `Explore Mara`

### Own-character actions

- Section label: `Start your own`
- Button: `Create a character`
- Button: `Add an existing character`

### Account actions

- Link: `Sign in`
- Link: `I have a party invite`

## 3. Mara preview-card specification

### Identity information shown

Show only:

- `Mara Vale`
- `Human Ranger 3`
- `Outlander` may be omitted from the card to keep the preview compact.

Do not show ancestry, subclass, alignment, background, ability scores, inventory, notes, or personality content in the landing-page preview.

### Exact stats shown

Show these stats in a compact stat strip:

- `HP 26 / 26`
- `AC 14`
- `Speed 30 ft.`

Do not show temporary hit points because Mara has none. Do not show initiative, passive perception, proficiency bonus, or concentration on the landing page.

### Abilities shown

Show these two compact ability badges:

- `Longbow`
- `Colossus Slayer`

Rationale:

- `Longbow` communicates that Mara has a clear primary combat action.
- `Colossus Slayer` previews the quick-reference value of the app and connects to the first bottom-sheet example later in the flow.

Do not show `Hunter's Mark`, `Fog Cloud`, or `Cure Wounds` on the landing card. Spells are useful in the Play View, but the landing preview should stay compact.

### Primary visual treatment

The Mara preview card is the strongest visual object on the page.

Use:

- surface: `color.bg.surface`;
- border: `1px solid color.border.strong`;
- shadow: `shadow.card`;
- radius: `radius.lg`;
- internal padding: `space.4`;
- a restrained brass detail, such as a thin top rule or small badge accent using `color.detail.brass`;
- stat strip background: `color.bg.surfaceMuted`;
- primary CTA fill: `color.accent.primary`;
- primary CTA text: `color.text.inverse`.

The card should feel like a practical character snapshot, not a full sheet. Avoid fake parchment texture, decorative corners, seals, or ornamental fantasy styling.

### Primary CTA

The CTA text is `Explore Mara`.

It is the strongest action on the page. It should be full-width inside the card on mobile, at least 44px tall, and placed after the preview content.

## 4. Secondary account actions

### Create a character

Placement:

- Below the Mara preview card.
- Under the section label `Start your own`.
- Rendered as a secondary full-width button.

Hierarchy:

- Visually below `Explore Mara`.
- Strong enough to be tappable and discoverable.
- Weaker than the sample-character CTA.

### Add an existing character

Placement:

- Directly below `Create a character`.
- Rendered as a secondary full-width button with the same weight.

Hierarchy:

- Equal to `Create a character`.
- Weaker than `Explore Mara`.

### Sign in

Placement:

- Below the own-character action group.
- Rendered as a quiet text link.

Hierarchy:

- Present for returning users.
- Visually compact and not competing with sample exploration.

### I have a party invite

Placement:

- Next to or below `Sign in`, depending on available width.
- Rendered as a quiet text link.

Hierarchy:

- Present for users with a specific goal.
- Visually compact and not competing with sample exploration.

### Why these actions must not interrupt sample exploration

The sample flow is guest-first. A visitor should be able to inspect Mara Vale without creating an account, signing in, acknowledging guest-storage behavior, or choosing a party path.

Account-related actions should remain visible for users who need them, but they must not appear as dialogs, banners, popovers, blockers, or prompts before or during sample exploration.

## 5. Visual application

### Theme application

Apply the light parchment theme only.

Use semantic tokens:

- App background: `color.bg.app`
- Main card: `color.bg.surface`
- Card stat strip: `color.bg.surfaceMuted`
- Primary action: `color.accent.primary`
- Primary action hover or pressed state: `color.accent.primaryHover`
- Quiet actions: `color.text.secondary`
- Metadata and low-priority labels: `color.text.muted`
- Primary text: `color.text.primary`
- Secondary text: `color.text.secondary`
- Main card border: `color.border.strong`
- Default secondary button border: `color.border.subtle`
- Brass detail: `color.detail.brass`

### Typography hierarchy

- `Hunin`: display font, 34-40px on mobile, semibold or bold, `color.text.primary`.
- Tagline: body font, 16px, medium, `color.text.secondary`.
- Supporting sentence: body font, 16px, regular, `color.text.secondary`.
- Card badge: body font, 12-13px, medium, `color.accent.text`.
- Character name: display font, 28-34px, semibold, `color.text.primary`.
- Character identity line: body font, 15-16px, medium, `color.text.secondary`.
- Stat labels: body font, 12-13px, medium, `color.text.muted`.
- Stat values: body font with tabular numbers, 20-24px, semibold, `color.text.primary`.
- Ability badges: body font, 13px, medium.
- Button labels: body font, 16px, semibold.
- Quiet links: body font, 15-16px, medium.

Use `Fraunces` only for `Hunin` and `Mara Vale`. Use the body font for all functional copy.

### Spacing

- Page padding: `space.4` on mobile.
- Top padding: `space.6`.
- Brand block bottom margin: `space.5`.
- Space between tagline and supporting sentence: `space.2`.
- Space between brand block and Mara card: `space.5`.
- Mara card internal gap: `space.3` to `space.4`.
- Space between Mara card and own-character actions: `space.5`.
- Button stack gap: `space.3`.
- Quiet account link group top margin: `space.4`.
- Bottom padding: `space.6`.

### Border and card treatment

- Page itself is unframed.
- The Mara preview is a single card, not nested in another card.
- Secondary action buttons are controls, not cards.
- Use `radius.lg` for the Mara card.
- Use `radius.md` for buttons.
- Use `radius.pill` only for badges.
- Use `shadow.card` on the Mara card.
- Avoid decorative dividers except for one restrained brass accent on the Mara card.

## 6. Interaction and accessibility

### Tap targets

- `Explore Mara`: minimum 44px height.
- `Create a character`: minimum 44px height.
- `Add an existing character`: minimum 44px height.
- `Sign in`: minimum 44px tap area, even if the visual text is smaller.
- `I have a party invite`: minimum 44px tap area, even if the visual text is smaller.

### Focus order

Keyboard and screen-reader focus should follow visual order:

1. `Explore Mara`
2. `Create a character`
3. `Add an existing character`
4. `Sign in`
5. `I have a party invite`

The Mara preview card itself should not create an extra focus stop unless the whole card is implemented as the sample exploration control. If the whole card is clickable, it must have an accessible name equivalent to `Explore Mara`, and the internal CTA should not create a duplicate focus target.

Recommended first implementation: make only the `Explore Mara` button interactive.

### Visible focus behavior

All interactive controls must use a visible focus state:

- outline: 2px solid `color.focus` or `color.detail.brass`;
- outline offset: 2px;
- do not remove browser focus visibility unless replacing it with an equally visible custom style.

### Semantic landmarks and headings

- Use a single page-level `main` landmark.
- Use `h1` for `Hunin`.
- The Mara preview card should have a heading for `Mara Vale`.
- The own-character action group should have a heading or accessible label: `Start your own`.
- Quiet account links can live in a small navigation region or a labeled group.
- Use real buttons or links according to behavior in the eventual app. For this static spec, visible entry points may be non-functional, but their intended semantics should remain clear.

### Other accessibility constraints

- Do not use icon-only meaning.
- Do not rely on colour alone to identify the sample card, abilities, stats, or actions.
- Keep all text readable against its surface.
- Keep the page free of horizontal scrolling at narrow mobile widths.
- Do not use decorative typography for functional labels, rules content, stats, or button text.

## 7. Implementation boundary

For the first implementation slice:

- use static Mara Vale sample content only;
- do not add authentication;
- do not add persistence;
- do not call an API;
- do not require routing yet;
- do not add account creation UI beyond the visible non-functional entry points;
- do not add theme switching;
- do not add image generation prompts, portraits, artwork, or visual assets;
- do not create Play View or bottom-sheet details from this document.

The visible controls can be wired later. This spec only defines the landing-page visual and content target.

## Acceptance checklist

- The screen title is `Hunin`.
- The tagline is `Your party companion.`
- The supporting sentence is `Understand your character quickly when it is time to play.`
- Mara Vale is the primary visual element.
- The Mara card shows `Human Ranger 3`.
- The Mara card shows `HP 26 / 26`, `AC 14`, and `Speed 30 ft.`
- The Mara card shows `Longbow` and `Colossus Slayer`.
- The primary CTA is `Explore Mara`.
- `Create a character` and `Add an existing character` appear below the Mara card as secondary actions.
- `Sign in` and `I have a party invite` appear as quiet account actions.
- No sign-in, account, storage, or invite prompt blocks sample exploration.
- The light parchment theme uses semantic tokens from `docs/design/visual-direction.md`.
- All primary interactive controls have at least 44px touch targets.
- Focus order follows the visible top-to-bottom order.
- Interactive controls have visible focus states.
- The page uses semantic headings and a `main` landmark.
- No icon-only meaning is required.
- The layout avoids horizontal scrolling on narrow mobile screens.
- The implementation boundary remains static: no auth, persistence, API, routing requirement, theme picker, app code, or Play View specification.
