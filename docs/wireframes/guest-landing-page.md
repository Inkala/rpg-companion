# Guest Landing Page Wireframe

## Purpose

Let a new visitor try Hunin before signing in, understand the product quickly, and choose a first path without feeling pushed into account creation.

This is not a marketing landing page. It is the first working screen for a guest.

## Mobile-first structure

### 1. Header / brand block

Purpose: establish the product name and immediate context.

Contains:

- Hunin name
- short tagline or value statement

Hierarchy:

- Most prominent: Hunin name
- Secondary: short value statement
- Quiet: any supporting copy

### 2. Compact sample-character preview

Purpose: make the product tangible before the visitor commits to a flow.

Contains:

- character name
- class and level
- HP and AC
- 1 to 2 recognizable abilities or features
- `Explore [character name]` action

Hierarchy:

- Most prominent: character name and `Explore [character name]` action
- Secondary: class, level, HP, AC
- Quiet: ability labels or one-line reminders

Rules:

- preview is visible on the landing page
- preview is read-only
- it should feel like a real character snapshot, not a full sheet

### 3. Primary actions

Purpose: show the supported starting paths after the sample preview.

Actions:

- Create a new character
- Add an existing character

Hierarchy:

- Most prominent: sample-character preview and `Explore [character name]` action
- Secondary: Create a new character, Add an existing character

### 4. Secondary actions

Purpose: support users who already know where they want to go.

Actions:

- Sign in
- I have a party invite

Hierarchy:

- Quiet and compact
- visually below primary actions
- never stronger than the sample exploration path

### 5. Brief supporting copy

Purpose: explain the value of the app in one sentence without turning the page into a pitch.

Contains:

- one short sentence about building or understanding a character

Hierarchy:

- Quiet
- compact
- optional if space is tight on small screens

## Action behavior

- `Create a new character`: starts character creation for a guest.
- `Add an existing character`: starts the transfer flow for a guest.
- `Sign in`: opens the sign-in path.
- `I have a party invite`: opens the party-join path.
- `Explore [character name]`: opens the sample character in the guest Character Reference.

Important:

- do not show guest-storage messaging during sample-character exploration
- do not force account prompts before the visitor has started their own character path

## Visual hierarchy

Most prominent:

- sample-character preview
- `Explore [character name]` action

Secondary:

- Create a new character
- Add an existing character
- brief supporting copy

Quiet or compact:

- Sign in
- I have a party invite
- any extra explanatory text

## Accessibility and small-screen considerations

- Keep the first screen readable without scrolling on common phone heights as much as possible.
- Make the sample preview and primary actions large enough to tap comfortably.
- Preserve clear text contrast and avoid low-priority text competing with the main actions.
- Use semantic headings for the brand block and section labels.
- Keep the sample preview keyboard-focusable as a single useful unit, with a clear action target.
- If content does not fit on a narrow screen, reduce supporting copy before reducing the prominence of the main actions.
- Do not rely on color alone to distinguish the preview, actions, or secondary options.

## ASCII wireframe

```text
┌───────────────────────────────────────┐
│ Hunin                                 │
│ Your party companion                  │
│                                       │
│ Build a character you understand      │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ Aric the Swift                    │ │
│ │ Ranger 3                          │ │
│ │ HP 24  |  AC 15                   │ │
│ │ [Hunter's Mark] [Colossus Slayer] │ │
│ │                                   │ │
│ │ Explore Aric                      │ │
│ └───────────────────────────────────┘ │
│                                       │
│ [ Create a new character ]            │
│ [ Add an existing character ]         │
│                                       │
│ Sign in                               │
│ I have a party invite                 │
└───────────────────────────────────────┘
```

## Notes

- This wireframe only defines layout and behavior, not final styling.
- The sample preview should stay compact and readable, not resemble a full character sheet.
- The page should feel like the start of the app, not a separate promotional surface.
