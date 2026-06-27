# Design Direction

**Status:** Early draft
**Purpose:** Record design decisions, priorities, and open questions for the app.

---

## Product Experience Goal

The app should help D&D 5E players create or bring in a character, understand their options, and manage progression without decoding dense character sheets or rulebooks.

The experience should feel:

* clear and quick when reviewing character information
* friendly to people new to D&D
* useful for occasional players returning after a few weeks
* fantasy-inspired without becoming visually busy
* modern and readable on a phone

The app should not require users to understand D&D terminology before they can begin.

---

## Primary Design Priorities

1. **Character creation, transfer, and understanding**

   * A player should be able to start from a new or existing character and understand what the character can do.

2. **Mobile-friendly character reference**

   * A player should be able to find an ability, spell, or important stat within a few seconds.

3. **Guided progression**

   * Level-up support should help players understand what changed, what is automatic, and what requires a choice.

4. **Progressive disclosure**

   * Show the most useful information first.
   * Reveal detailed rules, explanations, and editing controls only when needed.

5. **Optional guidance**

   * During character creation, users can choose:

     * Help me choose
     * I know what I want
     * Decide later

6. **Guest-first onboarding**

   * Visitors can explore the app and begin a character without logging in.
   * An account is required only for saving across devices, joining a party, creating a party, or sharing with a GM.

---

## Visual Direction

### Intended style

Modern, polished interface with playful fantasy-game accents.

Reference mood:

* clear game-like panels and visual hierarchy
* subtle magical/fantasy details
* card-based information layout
* readable typography
* strong distinction between actions, spells, resources, and passive abilities

### Avoid

* dense fake-parchment backgrounds
* tiny decorative fantasy fonts for important content
* overly ornate borders around every element
* low-contrast text
* a desktop-first character sheet squeezed onto a phone

### Possible visual elements

* deep blue, forest green, dark purple, or charcoal surfaces
* warm gold, teal, magical cyan, or violet accents
* subtle rune, creature, compass, lantern, or familiar motifs
* original fantasy-inspired icons and illustrations
* parchment-inspired styling reserved for print/export views, if used

---

## Initial Screens to Design

The first design work should focus only on these screens.

### 1. Guest Landing Screen

Purpose: let a new visitor try the app before creating an account.

Primary actions:

* Create a new character
* Add an existing character
* Explore a sample character

Secondary actions:

* I have a party invite
* Sign in

Suggested message:

> Build a character you understand.

Supporting text:

> Create one from scratch, bring in one you already play, or explore how the app works.

---

### 2. Sample Character — Mobile Play View

Purpose: demonstrate clear character information and quick explanations through a read-only sample character.

Prioritise:

* character name, class, level
* HP and temporary HP
* AC
* key ability modifier
* main attacks
* Actions
* Bonus Actions
* Reactions
* spells
* active concentration
* trackable resources
* quick search

Do not attempt to show the entire detailed character sheet on this screen.

---

### 3. Ability / Spell Quick Reference

Purpose: answer the question:

> “How does this work again?”

Recommended mobile interaction:

* tap an ability/spell card
* open a bottom sheet or modal
* show a short, scannable explanation first
* allow optional expansion for detailed notes or rules text

Information to prioritise:

* quick effect summary
* Action / Bonus Action / Reaction / Passive
* duration
* concentration
* resource cost
* uses per rest, if applicable
* important reminders
* relevant character modifier, if applicable

Example structure:

```text
Colossus Slayer

Quick effect:
Once per turn, when you hit a creature below its hit-point maximum
with a weapon attack, deal an extra 1d8 damage.

Type:
Passive feature

Limit:
Once per turn

Remember:
The creature must already be injured.
```

---

## Design System Approach

Do not build a large component library before designing real screens.

Create the system in this order:

1. Design tokens
2. Reusable UI primitives
3. RPG-specific components

### Design Tokens

Define later in Figma and code:

* color roles
* typography scale
* spacing scale
* border radius
* shadows
* icon sizing
* focus states
* breakpoints

Use semantic names where possible.

Examples:

```text
surface-primary
surface-secondary
text-primary
text-muted
accent-primary
accent-danger
border-default
focus-ring
```

Avoid naming colors only by their visual value, such as `purple-500`, in product-level documentation.

---

## Initial UI Primitives

Build or adopt only when a real screen needs them:

* Button
* Icon button
* Text input
* Select / combobox
* Card
* Tabs
* Badge
* Modal / dialog
* Bottom sheet / drawer
* Accordion
* Empty state
* Loading state
* Error message

Accessible component foundations may be provided by a UI library, then customised to fit the product design.

---

## Initial RPG-Specific Components

These are likely to become reusable product components:

* `CharacterHeader`
* `CharacterStat`
* `AbilityCard`
* `SpellCard`
* `ActionTypeBadge`
* `ResourceTracker`
* `ConcentrationIndicator`
* `PartyMemberCard`
* `QuickReferenceSheet`
* `CharacterSearchResult`

Do not create these until the relevant screen is designed.

---

## Accessibility Requirements

Accessibility should be considered during design, not added after implementation.

Minimum expectations:

* sufficient color contrast
* visible keyboard focus states
* controls must not rely only on color
* readable font sizes on mobile
* labels for icon-only controls
* predictable navigation
* clear error messages
* no important information hidden behind hover-only interactions
* touch targets large enough for mobile use
* support for screen readers through meaningful headings and labels
* avoid long dense blocks of rule text when a short summary is possible

The app should support players who benefit from clear structure, low cognitive load, and explicit information without presenting itself as only an accessibility or neurodivergence product.

---

## Responsive Strategy

### Phone

Primary use: quick character review and reminders.

Optimise for:

* one-hand-friendly interaction
* quick scanning
* bottom sheets for detail
* clear access to important character information
* clear action categories

### Tablet / Laptop

Primary use:

* character transfer
* guided character creation
* editing
* GM party overview
* detailed sheet review

---

## Open Design Decisions

* [ ] Final app name
* [ ] Final color palette
* [ ] Mascot, animal, or familiar motif
* [ ] Exact fantasy-vs-modern visual balance
* [ ] Whether Play View has light and dark modes
* [ ] Whether printable character sheets use a parchment-inspired appearance
* [ ] Which sample character to use for guest exploration
* [ ] Whether the app uses illustration, icons only, or both
* [ ] Which first screen to prototype in Figma
