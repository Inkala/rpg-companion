# Mobile Character Reference Wireframe

## Purpose

Show the guest sample character in a fast, readable mobile reference view that answers the question: “How does this work again?”

This screen is read-only. It is for quick reference, not character editing.

The mobile screen opened from `Explore Mara` is named `Character Reference`. It provides a compact, mobile-friendly, read-only way to understand a character and open quick explanations.

It is a supporting capability within Hunin. It is not a turn-by-turn combat dashboard and not the whole character-management experience. It may later coexist with character creation, editing, level-up guidance, and party features.

## Mobile-first structure

### 1. Top summary block

Purpose: orient the visitor immediately.

Contains:

- character name
- class and level
- a compact identity line or subtitle, if needed

Hierarchy:

- Most prominent: character name
- Secondary: class and level
- Quiet: any supporting subtitle

### 2. Immediate stat row / overview

Purpose: show the key facts a player checks first when reviewing the character.

Shown without scrolling:

- current HP
- temporary HP
- AC
- active concentration, when relevant
- the most useful immediate actions or abilities

Hierarchy:

- Most prominent: current HP
- Secondary: temporary HP and AC
- Quiet: concentration state and compact action reminders

### 3. Grouped browsing section list

Purpose: organize the character into scan-friendly sections without turning the screen into a full sheet.

Sections:

- Actions
- Bonus Actions
- Reactions
- Features
- Spells

Behavior:

- only show sections that actually have content
- do not show Items or Notes
- no search in this first flow
- keep grouped browsing simple and predictable
- use vertically stacked expandable sections, not horizontal tabs

## How the default sections work

### Overview

Contains:

- HP
- temporary HP
- AC
- speed
- active concentration
- trackable resources

Use:

- the top summary and stat area
- not a separate browsable section header below the stat row

### Actions

Contains:

- action abilities
- attack entries
- actions and attacks that consume the character’s Action

Use:

- quick access to Mara's main actions and attacks
- expanded by default for the read-only sample character
- show one or more main action or attack cards immediately

### Bonus Actions

Contains:

- abilities that use the Bonus Action economy

Use:

- fast access to abilities that use the Bonus Action economy
- collapsed by default unless a user opens the section

### Reactions

Contains:

- reaction abilities

Use:

- quick reminders for interrupt-style abilities
- collapsed by default unless a user opens the section

### Features

Contains:

- passive abilities
- abilities that do not consume an action

Use:

- long-lived traits that matter when understanding the character
- collapsed by default unless a user opens the section

### Spells

Contains:

- spells the character can use
- spell entries with quick-reference detail

Use:

- quick access to spell name, effect, and timing
- collapsed by default unless a user opens the section
- Hunter's Mark belongs here, even though it may note its Bonus Action use in the summary or detail

## What is visible by default

Visible without scrolling:

- top summary block
- immediate stat row / overview
- the Actions section expanded by default
- a few immediate ability or attack cards

May require scrolling:

- the rest of the grouped sections
- longer ability lists
- lower-priority spells and traits

May require switching:

- opening an ability, feature, or spell bottom sheet
- moving between section groups by tapping their headers

Scan speed is more important than full sheet completeness.

## Ability row / card before open

An ability row or compact card should show only the minimum useful preview before it is opened.

Contains:

- ability, feature, or spell name
- one-line effect hint
- type marker, if useful
- duration or usage hint, if useful
- a clear tap target

Should not try to show:

- full rules text
- long reminders
- editing controls

## Primary and secondary actions

Primary actions:

- tap an ability, feature, or spell to open the bottom-sheet quick reference
- tap a grouped section header to expand or collapse it

Secondary actions:

- scroll through the grouped sections
- return to the guest landing page from app navigation, if available

In this first flow there is no search, no edit action, and no account prompt on this screen.

## Empty and unusual states

### No concentration active

- show a calm `No concentration` or equivalent empty state in the overview area
- do not reserve too much vertical space for it

### No content in a section

- hide the section entirely in the normal Character Reference
- if the whole Character Reference would otherwise be sparse, show a calm empty state rather than a broken list

### Sample content cannot load

- show a clear fallback state
- include a retry action
- keep the page readable even without the sample data

### Guest / read-only state

- the character cannot be edited
- the page should never ask the visitor to sign in just to inspect the sample character
- guest-state messaging should stay out of the way unless the visitor leaves the sample flow

## Accessibility and small-screen considerations

- Keep the top summary and immediate overview readable without forcing dense scanning.
- Make the ability rows and section headers large enough to tap comfortably.
- Use semantic headings and section labels so the structure is clear to assistive technology.
- Preserve clear contrast between summary, stats, and section content.
- Keep the first screen usable on a narrow phone without horizontal scrolling.
- Do not rely on icons alone for section meaning.
- If the screen gets crowded, reduce secondary text before hiding the most important current state.
- Bottom-sheet quick reference should be easy to dismiss and should not trap the user.

## ASCII wireframe

```text
┌─────────────────────────────────┐
│ Aric the Swift                  │
│ Ranger 3                        │
│                                 │
│ HP 24  Temp 0  AC 15            │
│ Concentration: None             │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Longbow                     │ │
│ │ Action                      │ │
│ │ 1d8 + Dex piercing...       │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Hunter's Mark               │ │
│ │ Bonus Action                │ │
│ │ Marks a target for extra... │ │
│ └─────────────────────────────┘ │
│                                 │
│ > Bonus Actions                 │
│ > Reactions                     │
│ > Features                      │
│ > Spells                        │
└─────────────────────────────────┘
```

## Notes

- This wireframe stays low-fidelity and avoids final visual style choices.
- The screen is intentionally quieter than a full character sheet.
- The main job is to let a guest understand what the character can do right now.
