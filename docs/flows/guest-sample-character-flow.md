# Guest Sample Character Flow

## User goal

Let a visitor try Hunin immediately, understand the value of the app without signing in, and inspect a read-only sample character that demonstrates clear character information and quick explanations.

## Entry point

Guest landing page.

This is the first screen for a visitor who is not signed in and has no saved character yet.

## Flow order

1. Guest landing page
2. Sample character mobile Character Reference
3. Ability quick-reference detail

For the first guest flow, the user path is:

`Explore Mara` -> `Character Reference` -> `Quick explanation`

## 1. Guest landing page

### Purpose

Give the visitor a low-friction starting point and explain the three first actions the app supports.

### Visible information

- Hunin name and tagline
- Short value statement
- Primary entry actions
- Secondary sign-in / party invite action, if available in the product
- Compact sample-character preview

### Primary actions

- Explore a sample character
- Create a new character
- Add an existing character

### Secondary actions

- Sign in
- I have a party invite

### Empty / guest states

- No account is required to explore the sample character.

### Notes

- This screen should not feel like a marketing page.
- The visitor should be able to continue without reading much text.
- The sample-character preview should make the product feel tangible without becoming a full character sheet.

## 2. Sample character mobile Character Reference

### Purpose

Show a supporting product capability on a phone: a compact, readable character reference that helps a visitor understand Mara Vale and open quick explanations.

This screen is a supporting capability within Hunin. It is not a turn-by-turn combat dashboard and not the whole character-management experience.

### Visible information

- Character name
- Class and level
- HP
- Temporary HP
- AC
- Speed, if available in the Character Reference
- Main attacks
- Actions
- Bonus Actions
- Reactions
- Spells
- Active concentration
- Trackable resources
- A list or grouped view of abilities / features / spells that can be opened for detail

### Primary actions

- Open an ability, feature, or spell for quick-reference detail
- Browse the visible character content through grouped sections

### Secondary actions

- Switch between sections of the Character Reference
- Return to the guest landing page

### Empty / error / guest states

- If sample content fails to load, show a clear fallback state with a retry action.
- Hide empty content sections in the normal Character Reference. Use a calm empty state only when the character has no relevant reference content at all.
- Because this is a guest exploration path, no sign-in gate should interrupt the flow.

### Notes

- This view should be optimized for scan speed, not full sheet completeness.
- The sample character should demonstrate clear character understanding and quick-reference explanations, not a turn-by-turn combat dashboard.
- The sample character is strictly read-only in this first flow.
- Grouped browsing uses Overview, Actions, Bonus Actions, Reactions, Features, and Spells.
- Overview includes HP, temporary HP, AC, speed, active concentration, and trackable resources.
- Only show a section when the character has content for it.
- Items and Notes are out of scope for this first Character Reference.

## 3. Ability quick-reference detail

### Purpose

Answer the question: “How does this work again?”

### Visible information

- Ability, feature, or spell name
- Short effect summary
- Type: Action, Bonus Action, Reaction, Passive, or Spell
- Duration
- Concentration, if relevant
- Resource cost or use limit, if relevant
- Short reminder text
- Optional longer details, if the content supports it

### Primary actions

- Close the detail view
- Return to the Character Reference

### Secondary actions

- Expand for more detail, if available
- Move to the next or previous ability card, if the Character Reference supports that pattern

### Empty / error / guest states

- If a detail entry is missing, the card should still open with a clear fallback such as “No additional detail available.”
- If the character has no abilities yet, the Character Reference should show a calm empty state and keep the layout usable.

### Notes

- This detail view should be short and scannable by default.
- It should support quick reads when a player needs a reminder, not long-form rules browsing.
- On mobile, this opens as a bottom sheet over the Character Reference.

## Decisions made

- The sample character is strictly read-only in this first flow.
- On mobile, an ability, feature, or spell opens in a bottom sheet over the Character Reference.
- The mobile screen opened from `Explore Mara` is named `Character Reference`.
- The Character Reference provides a compact, mobile-friendly, read-only way to understand a character and open quick explanations.
- The Character Reference is a supporting capability within Hunin, not a turn-by-turn combat dashboard and not the whole character-management experience.
- Character Reference may later coexist with character creation, editing, level-up guidance, and party features.
- Search is out of scope for this first flow. Grouped browsing is the only browsing pattern here.
- The guest landing page includes a compact sample-character preview with character name, class and level, HP, AC, 1-2 recognizable abilities or features, and an `Explore [character name]` action.
- Guest-storage messaging appears only after someone starts creating or transferring their own character. Sample-character exploration remains pressure-free.
- Guest drafts are stored on the current device. An account is required to keep a character across devices, join a party, share it with a GM, or recover it later.
- Default Character Reference sections are Overview, Actions, Bonus Actions, Reactions, Features, and Spells.
- Overview contains HP, temporary HP, AC, speed, active concentration, and trackable resources.
- Only show sections that have content.
- Items and Notes are not part of this first Character Reference.

## Open questions

- None.
