# T-005 Design

## Design Verdict

The current Hunin direction works. The warm parchment base, forest green primary accent, brass
details, ink text, compact stat tiles, and restrained fantasy tone are a good fit for a calm D&D
companion.

This task should not lead to a full redesign. The needed change is hierarchy:

- account actions become lightweight header/menu affordances,
- home main actions become Create character, Create party, and Join party,
- Add existing character moves inside Create character as Fill the sheet myself,
- user-owned content outranks Mara when signed in,
- desktop and tablet actions become less full-width,
- error text becomes smaller and calmer,
- Character Reference keeps its current quick-reference structure while gaining a scalable section
  model,
- guided creation gets clear Help me choose and I know what I want paths.

## Information Architecture

### Signed-out Home

Purpose: let a visitor understand Hunin and begin a useful path without forcing account creation.

Recommended order:

1. Header
   - Hunin mark or compact logo.
   - Desktop/web: inline Sign in and Create account actions.
   - Mobile: compact burger or account menu.
   - Do not use a large "Accounts" content card.
2. Intro block
   - Short value statement.
   - Main action group:
     - Create character.
     - Create party.
     - Join party.
   - Create party and Join party can be visible while signed out, but must be disabled/planned and
     explain that login is required.
3. Mara demo
   - Compact sample card.
   - Keep Explore Mara as a demo action.
   - Do not let Mara visually outrank the main action group.

Important hierarchy rule: Add existing character is not a top-level home action. It belongs inside
Create character as the Fill the sheet myself path.

### Signed-in Empty Home

Purpose: help an authenticated user create or add their first character and see where parties will
live.

Recommended order:

1. Header
   - Account identity.
   - Compact sign-out or account menu.
2. My characters
   - Empty state copy.
   - Primary action: Create character.
3. My parties
   - Empty state.
   - Create party and Join party affordances when that slice is in scope.
4. Mara demo
   - Lower page example content.
   - Smaller than user-owned empty states.

### Future Signed-in Populated Home

Purpose: prioritize the user's real content.

Recommended order:

1. My characters
   - Character cards with name, ancestry/class/level, party association, and status summary.
   - Quick open to Character Reference.
   - Create character remains available but secondary.
2. My parties
   - Party cards with role, linked character, and invite/join status when available.
   - Create party and Join party remain available but secondary.
3. Suggested next actions
   - Finish a draft.
   - Link character to party.
   - Review level-up when future functionality exists.
4. Mara demo
   - Lower priority, optional, or available through a demo link.

### Character Reference

Purpose: mobile-first quick reminder for what a character can do.

Rules:

- Keep the current quick-reference card/dialog mostly as-is.
- Show fast reference content before full sheet completeness.
- Use vertical sections on mobile.
- Hide empty sections.
- Collapse lower-priority content by default.
- Do not create a full official-style sheet for MVP.

Recommended mobile-first order:

1. Overview
2. Combat
3. Actions / Attacks
4. Features & Traits
5. Skills & Saves
6. Equipment
7. Personality / Story
8. Spells, when applicable
9. Notes

### Frontend Routing And Navigation

Current behavior: Explore Mara changes React view state and opens Character Reference, but the
browser URL does not change. That was acceptable for the early static demo, but Hunin should add
meaningful frontend routes before or during guided character creation.

Future routes should likely include `/`, `/sample/mara`, `/characters/new`, `/characters/:id`, and
possibly `/account`.

Reason: browser Back behavior, refresh without losing location, shareable/debuggable URLs, clearer
navigation, and future saved-character and character-creation flows.

Scope boundary: do not implement routing in T-005. Track this as a near-term architecture/design
task or open question titled "Add lightweight frontend routing for app views."

### Create Character Flow

Purpose: help a player make a valid level-1 Human Fighter without learning every D&D term first.

Recommended flow:

1. Creation entry
   - User clicks the single top-level Create character action.
2. Creation mode choice
   - Fill the sheet myself.
   - Help me choose.
3. Basics
   - Name.
   - Short concept.
   - Optional image placeholder.
4. Build path
   - Fill the sheet myself: manual entry or direct selectors for users who already know their
     character, including users transferring a paper sheet like Ninea.
   - Help me choose: preference questions that recommend Strength melee or Dexterity archer for the
     first MVP.
5. Background
   - Soldier or Outlander with descriptions.
6. Story and image
   - Background story textarea.
   - Visible image upload placeholder, with actual upload deferred.
7. Review
   - Derived summary.
   - Guest preview.
   - Authenticated save.

The previous "I know what I want" idea is now expressed as Fill the sheet myself.

### Party Actions

Create party and Join party belong in the main home action group.

Signed-out behavior:

- visible but disabled/planned;
- explain login is required through hover/focus help text or accessible helper copy;
- do not look functional yet.

Signed-in behavior:

- visible in home/party empty states when in scope;
- still planned until party implementation exists.

### Account/Header Direction

Desktop/web:

- brand/logo on the left;
- Sign in and Create account inline on the right when signed out;
- account identity and a compact sign-out/account menu when signed in;
- no large "Accounts" title or heavy account content card.

Mobile:

- compact header;
- burger or account menu affordance;
- sign-in/create-account lives inside the menu;
- account controls must not dominate the home content.
2. Basics
   - Name.
   - Short concept.
   - Optional image placeholder.
3. Build path
   - Help me choose: preference questions that recommend Strength melee or Dexterity archer.
   - I know what I want: direct build selector.
4. Background
   - Soldier or Outlander with descriptions.
5. Story and image
   - Background story textarea.
   - Visible image upload placeholder, with actual upload deferred.
6. Review
   - Derived summary.
   - Guest preview.
   - Authenticated save.

## Button Hierarchy Rules

### Primary Button

Use for the main forward action:

- Create character.
- Create party when party creation exists.
- Join party when party joining exists.
- Continue.
- Save character.
- Open guest preview when save is unavailable.

Rules:

- Prefer one primary action per screen or major panel.
- On desktop/tablet, primary buttons can be intrinsic-width.
- On narrow mobile, primary buttons may be full-width.

### Secondary Button

Use for available alternatives:

- Fill the sheet myself when Help me choose is primary, or the reverse depending on screen intent.
- Back to review.
- Explore Mara when it is demo content below primary start actions.

Rules:

- Do not make all secondary buttons visually equal to the primary path.
- Side-by-side is preferred on desktop/tablet when labels fit.
- Stack on narrow mobile.

### Quiet/Text Button

Use for low-emphasis actions:

- Sign in.
- Switch account mode.
- Back.
- Sign out.
- Account menu actions on mobile.

### Planned Or Disabled Actions

Use disabled styling or quiet planned tags. Do not present planned actions as strong primary calls to
action.

For signed-out party actions, include login-required helper text. Help must work on focus/touch, not
only hover.

## Form And Error-text Rules

### Inline Error Style

Target style:

- Font size: about `0.8125rem`.
- Font weight: `400` or `500`.
- Line height: about `1.35`.
- Color: semantic danger text that is readable but calmer than the current heavy red.
- Placement: directly below the field or field group.

Avoid:

- Bold, large error blocks for normal field validation.
- Repeating long policy messages on every keystroke.
- Hover-only explanations.

### Validation Behavior

- Validate required fields after blur or submit.
- Keep submit errors near the action or form summary.
- Field-specific errors stay with the field.
- Use `aria-invalid` and `aria-describedby`.
- Keep labels visible.

## Character Reference Section Model

### Overview

Contains:

- name,
- race/ancestry,
- class and level,
- background,
- alignment when useful,
- HP,
- AC,
- speed,
- concentration or current state.

Mobile default: visible first.

### Combat

Contains:

- AC,
- initiative,
- speed,
- HP,
- hit dice,
- death saves,
- short resource state if available.

Mobile default: visible or directly below Overview. Avoid duplicating too much if Overview already
contains the combat snapshot.

### Actions / Attacks

Contains:

- weapon attacks,
- common actions,
- bonus actions,
- reactions,
- attack bonuses,
- damage,
- range,
- quick-reference entry points.

Mobile default: expanded early, because it answers "what can I do?"

### Features & Traits

Contains:

- class features,
- ancestry traits,
- background features,
- passive abilities,
- limited-use features.

Mobile default: collapsed unless the character has a small number of crucial features.

### Skills & Saves

Contains:

- ability scores,
- modifiers,
- saving throws,
- skill proficiencies,
- passive perception.

Mobile default: collapsed.

### Equipment

Contains:

- important equipment,
- armor and weapons,
- currency,
- treasure,
- attuned or notable items when future rules support them.

Mobile default: collapsed.

### Personality / Story

Contains:

- personality traits,
- ideals,
- bonds,
- flaws,
- appearance,
- backstory,
- allies and organizations.

Mobile default: collapsed.

### Spells

Contains when applicable:

- spellcasting ability,
- spell save DC,
- spell attack bonus,
- slots,
- prepared/known spells,
- spell quick-reference rows.

Mobile default: collapsed unless the character is spell-focused or actively using spells.

### Notes

Contains:

- additional features and traits,
- table notes,
- session reminders,
- future custom notes.

Mobile default: collapsed.

## Guided Creation UX Direction

### Creation Entry

Use two clear mode cards:

- Fill the sheet myself
- Help me choose

Fill the sheet myself should feel efficient and direct for users who already know their character or
are transferring a sheet. Help me choose should feel friendly and playful. Neither path should trap
the user.

### Help Me Choose

First implementation:

- Ask one or a few preference questions.
- Recommend between the two approved Fighter presets:
  - Strength melee Fighter,
  - Dexterity archer Fighter.
- Explain the recommendation in plain language.
- Allow override before review.

Example question direction:

```text
Trouble starts across the room. What sounds more like you?

- Step forward, shield up, and hold the line.
- Find the best angle and end the threat from range.
```

### Fill The Sheet Myself

Use direct entry and selectors for the approved option set:

- build preset,
- background,
- later race/class/spell choices when scope expands.

Each option should have:

- one-line summary,
- "good if you want..." description,
- accessible details disclosure for extra explanation.

Long term, this path should support manual transfer of an existing paper or PDF sheet, such as the
Ninea reference sheet, through dropdowns, textareas, and section-by-section entry.

### Descriptions, Tooltips, And Disclosures

- Descriptions must be available on focus and touch, not only hover.
- Prefer inline helper text or disclosure buttons for important explanations.
- Use hover tooltips only as an enhancement.
- Future race, class, background, and spell choices should all have short descriptions.

### Story Textarea

Include a story/backstory textarea as optional.

Rules:

- It should not block completion.
- It should have a friendly prompt.
- It can support a short character concept in T-003 and grow into fuller story later.

### Image Upload Placeholder

Show a visible image slot during creation.

Rules:

- The slot can say upload is planned or allow placeholder selection if implemented later.
- Actual upload, storage, cropping, and profile image processing are deferred.
- Review should show the placeholder or selected future image.

### Review Step

Show:

- name,
- image placeholder,
- Human Fighter level 1,
- background,
- build summary,
- HP,
- AC,
- speed,
- ability scores,
- attacks,
- equipment,
- Second Wind,
- Fighting Style,
- story if provided.

Guest state:

- Save disabled or unavailable.
- Explain that an account is required to save.
- Allow temporary Character Reference preview.

Authenticated state:

- Save enabled.
- On success, open Character Reference from create response.

## Responsive Rules

### Desktop And Browser-first Creation

Use wider layouts for creation:

- step/progress rail or header,
- main form panel,
- live summary or review side panel,
- side-by-side action rows where labels fit.

Avoid making every button full-width on desktop.

### Mobile Creation

Keep usable but simpler:

- single column,
- one step at a time,
- stacked full-width actions,
- helper text and disclosures below controls,
- no dense side panels.

### Mobile-first Character Reference

Optimize for:

- quick scan,
- visible HP/AC/speed,
- first useful action rows above or near the fold,
- bottom sheet/dialog for quick-reference details,
- collapsed lower-priority sections.

### Tablet Reference

Tablet can use:

- slightly wider summary,
- two-column section layout only if scan speed improves,
- same section order as mobile.

Do not turn tablet reference into a dense all-field sheet.

## Figma-ready Deliverable Plan

Figma MCP status:

- Not available in this Codex session.
- Neither `figma` nor `figma-local` is exposed.
- Do not create or modify Figma files in this task.

### Pages

- Design Direction
- Mobile Character Reference
- Desktop Character Creation
- Home States
- Components

### Frames

#### Signed-out Home

Shows:

- desktop header with inline Sign in and Create account,
- mobile header with compact burger/account menu,
- brand/value statement,
- main action group: Create character, Create party, Join party,
- signed-out disabled/planned party actions with login-required help,
- Mara sample as demo,
- no large Accounts content card.

#### Signed-in Empty Home

Shows:

- account identity,
- My characters empty state,
- Create character action,
- My parties empty state,
- Create party and Join party planned affordances,
- Mara sample lower down.

#### Signed-in Populated Home Placeholder

Shows:

- example character cards,
- example party cards,
- Create character, Create party, and Join party secondary actions,
- Mara reduced or lower-priority.

#### Character Reference Mobile

Shows:

- Overview,
- Combat snapshot,
- Actions / Attacks expanded,
- lower sections collapsed.

#### Character Reference Desktop/Tablet

Shows:

- same information architecture as mobile,
- roomier layout,
- no full sheet clone.

#### Quick-reference Dialog/Card

Shows:

- current structure mostly preserved,
- title,
- label,
- summary,
- metadata,
- reminder,
- optional details.

#### Create Character Mode Choice

Shows:

- two mode cards,
- Fill the sheet myself,
- Help me choose,
- short descriptions,
- clear primary/secondary choice.

#### Guided Question

Shows:

- playful preference question,
- answer options,
- recommendation preview.

#### Fill The Sheet Myself / Manual Entry

Shows:

- build selector,
- background selector,
- direct entry fields or placeholders,
- descriptions/disclosures.

#### Story And Image Step

Shows:

- story textarea,
- image upload placeholder,
- helper text.

#### Review Step

Shows:

- derived Fighter summary,
- stats,
- actions/features,
- story/image preview,
- save/preview actions.

#### Guest Preview / Sign In To Save State

Shows:

- guest can preview,
- save requires account,
- account actions are present but not overwhelming.

### Components

- Button variants
- Text field + inline error
- Header account action row
- Mobile burger/account menu
- Main home action group
- Character card
- Party card
- Stat tile
- Section header
- Reference row
- Badge
- Quick-reference dialog/card
- Choice card
- Step/progress indicator
- Image upload placeholder

### Screenshots Or References To Use Later

- Current Hunin landing page.
- Current account form and inline errors.
- Current Mara Character Reference.
- Current Colossus Slayer quick-reference dialog/card.
- Hunin logo and mark assets.
- Mara portrait asset.
- Ninea Crowny sheet as IA reference only.

## Implementation Sequencing

### Safe Small CSS Polish

- Reduce form error text size and weight.
- Make account switch and secondary account actions quieter.
- Stop using global full-width buttons on desktop/tablet.
- Add intrinsic-width action rows for wider screens.
- Add favicon later as small polish.

### Home Hierarchy Changes

- Move account actions into a top/header area.
- Replace separate Create/Add top-level actions with main home actions: Create character, Create
  party, Join party.
- Move Fill the sheet myself inside the Create character flow.
- Keep signed-out party actions disabled/planned with login-required help.
- Add target signed-in empty home structure when implementation scope allows.
- Keep Mara sample lower for signed-in users.

### Guided Creation Design And Implementation

- Build Create character mode choice with Fill the sheet myself and Help me choose.
- Implement narrow Help me choose recommendation between the two Fighter presets.
- Add Fill the sheet myself manual entry with descriptions/disclosures.
- Add story textarea.
- Add image placeholder without upload/storage.
- Add review and guest preview/sign in to save state.

### Changes To Defer

- Actual image upload and storage.
- Dark mode implementation.
- Full character list/home backend and UI if no list endpoint exists yet.
- Party home implementation until party scope is approved.
- Major quick-reference redesign.
- Full all-section character sheet.
- Heavy UI library adoption.
- Complex animation.

## Open Questions

1. Should the first creation implementation include a dedicated story step, or should story remain
   part of the basics step until the flow grows?
2. Should the image placeholder allow choosing from a local placeholder gallery, or only show the
   future upload slot?
3. For signed-in populated home, should character cards prioritize party association or next
   session/reference readiness?
4. Should the mobile header use a generic burger menu, an account avatar/menu, or a combined menu
   until profile pictures exist?
