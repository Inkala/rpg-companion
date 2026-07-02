# T-005 Requirements

## Problem

Hunin's current UI foundation has a strong product identity, but the next guided character creation
slice needs clearer design direction before implementation.

Current observed issues:

- Account actions feel too low in the landing hierarchy.
- Too many actions are full-width on desktop and tablet.
- Form error text is visually too large and heavy.
- Home top-level actions need clearer grouping. Create character, Create party, and Join party are
  peers, while manual character entry belongs inside Create character.
- Account UI should not appear as a large content card titled "Accounts."
- Signed-in home does not yet have target information architecture.
- Character Reference is good enough for now, but it needs a scalable section model for future
  character data.
- Guided creation needs a clear structure for Help me choose and I know what I want paths.

## Goals

- Preserve Hunin's warm, calm fantasy-companion identity.
- Define signed-out and signed-in home information architecture.
- Define account action placement and hierarchy.
- Define button hierarchy rules for mobile, tablet, and desktop.
- Define form and inline error text rules.
- Define a scalable Character Reference section model.
- Define guided character creation UX direction for the T-003 Fighter-only implementation and later
  growth.
- Record a Figma-ready deliverable plan that can be used manually or through Figma MCP later.
- Sequence future implementation tasks so polish, home hierarchy, and creation work can happen in
  small releases.

## Non-Goals

- No code implementation.
- No CSS edits.
- No backend changes.
- No API or migration changes.
- No dependency, CI, or deployment changes.
- No Figma file creation.
- No Figma MCP troubleshooting.
- No full all-sections character sheet for the MVP.
- No heavy UI library.
- No required complex animation.
- No dark mode implementation.
- No character image upload/storage implementation.
- No major quick-reference redesign.

## Visual Direction Requirements

- Keep the current parchment, forest green, brass, and ink palette direction.
- Refine visual hierarchy without replacing the brand feel.
- Use fantasy flavor sparingly and keep readability higher priority than ornament.
- Keep panels restrained, with clear information density.
- Avoid copying official D&D character sheet visuals.
- Prepare semantic token names that can support future light/dark mode.

## Signed-out Home Requirements

- Show Hunin brand and product promise first.
- Place account actions in a lightweight header or account menu.
- Keep account actions visually lighter than the main product actions.
- Do not use a large content card titled "Accounts" for normal account actions.
- Keep Mara as sample/demo content.
- Prioritize the main home action group over exploring Mara.
- Keep the page welcoming without making every action a large full-width button on wider screens.

Required signed-out hierarchy:

1. Header with brand and lightweight account actions.
2. Main action group:
   - Create character.
   - Create party.
   - Join party.
3. Mara sample/demo preview.

Signed-out party actions:

- Create party and Join party may be visible while signed out.
- They must be disabled, planned, or otherwise clearly unavailable.
- They should explain that login is required through hover/focus help text or an accessible
  disclosure.
- They must not look functional until the party flows exist.

Create character requirement:

- Create character is the single top-level character action.
- Add existing character must not be a separate top-level home action.
- Manual character entry belongs inside the Create character flow as Fill the sheet myself.

## Signed-in Home Requirements

- Design signed-in home now as target information architecture.
- Implementation can wait for a future character list/home task.
- Prioritize My characters.
- Show My parties second.
- When empty, show create/add actions near the empty state.
- Move Mara lower as secondary demo/example content.
- Keep account identity and sign-out accessible but not dominant.

Required signed-in empty hierarchy:

1. Header with account identity and compact account controls.
2. My characters empty state with a Create character action.
3. My parties empty state with Create party and Join party affordances when in scope.
4. Mara sample as secondary demo content.

Required future signed-in populated hierarchy:

1. My characters list/grid.
2. My parties list.
3. Recommended next actions.
4. Mara sample lower down or hidden behind a demo link if user content is present.

## Form And Error Requirements

- Inline errors must be close to the field they explain.
- Error text should be smaller, lighter, and less bold than current `.form-error`.
- Error text should not visually overpower labels or fields.
- Fields must keep accessible labels.
- Required validation should appear after blur or submit, not aggressively while the user is still
  typing from an empty state.
- Avoid hover-only help. Descriptions must also be available on focus or through a disclosure.

## Button Requirements

- One primary action per screen or major panel when practical.
- Secondary actions should be visually lighter.
- Text or quiet buttons should be used for sign-in, account switching, back, and low-risk secondary
  navigation.
- Desktop and tablet layouts should use intrinsic-width or side-by-side actions when appropriate.
- Narrow mobile can keep stacked full-width actions for tap comfort.
- Disabled or planned actions must not look like available primary actions.
- Main home actions should be grouped together instead of split above and below the sample card.
- Signed-out party actions must communicate login-required and planned states.

## Header And Account Requirements

- Desktop/web header should show inline account actions such as Sign in and Create account.
- Signed-in desktop/web header should show compact account identity and sign-out or account menu.
- Mobile should use a compact burger or account menu affordance.
- Mobile account menu should contain sign-in/create-account or account controls.
- Account UI must not dominate the home content.
- Account state should not appear as a large content card titled "Accounts."

## Character Reference Requirements

- Keep Character Reference mobile-first.
- Do not turn Character Reference into a full character sheet for the MVP.
- Use a scalable section model that can grow from Mara's current sample to fuller character data.
- Show the most frequently needed in-game reference information first.
- Keep quick-reference cards/dialogs mostly as-is for now.
- Collapse lower-priority sections by default on mobile.

Required future section model:

- Overview
- Combat
- Actions / Attacks
- Features & Traits
- Skills & Saves
- Equipment
- Personality / Story
- Spells, when applicable
- Notes

## Character-sheet IA Reference Requirements

Use the Ninea Crowny D&D sheet as information architecture reference only. Do not copy its visual
style.

The scalable Character Reference model should leave room for:

- core identity: character name, race, class/level, background, alignment;
- combat stats: AC, initiative, speed, HP, hit dice, death saves;
- ability scores and saving throws;
- skills and passive perception;
- attacks and spellcasting;
- equipment and currency;
- features and traits;
- personality traits, ideals, bonds, flaws;
- appearance, backstory, allies/organizations, additional features/traits, treasure;
- spellcasting ability, spell save DC, spell attack bonus, spell slots, and spells.

## Guided Creation Requirements

- Creation is mostly desktop/browser-first because it contains lots of information.
- The mobile version must remain usable, but it does not need to be the ideal creation environment.
- The first implementation remains narrow and must not imply broad D&D creation support.
- Create character is the only top-level character action on home.
- After selecting Create character, ask the user to choose between:
  - Fill the sheet myself,
  - Help me choose.
- Fill the sheet myself is for users who already know their character or are transferring a paper
  sheet such as Ninea.
- Fill the sheet myself eventually supports direct entry, dropdowns, and textareas.
- Help me choose can initially choose only between:
  - Strength melee Fighter,
  - Dexterity archer Fighter.
- Help me choose uses fun preference questions and recommendations.
- "I know what I want" language is replaced by Fill the sheet myself for the top creation-mode
  choice.
- Manual choices should have helpful descriptions, tooltips, or disclosures.
- Include space for:
  - background story textarea,
  - character image upload placeholder,
  - future image upload implementation.
- Actual image upload/storage is deferred.
- Review must show the derived character summary before save or guest preview.

## Figma-ready Requirements

Document a future Figma structure with:

- pages,
- frames,
- components,
- frame descriptions,
- screenshots or references to collect later.

Because Figma MCP is unavailable, Markdown is the deliverable.

## Acceptance Criteria

This task is complete when:

- T-005 task folder exists with plan, requirements, design, tasks, and notes.
- The design direction records all product-owner decisions listed above.
- Figma-ready pages, frames, and components are documented.
- Future implementation tasks include parallel-work assessments.
- Remaining product-owner questions are concise and only cover blocking design decisions.
- `CURRENT.md` points to T-005 review as the next action.
- `WORKLOG.md` has a short entry.
- `tasks/T-003/TASKS.md` marks Character Reference extraction as completed/merged.
- `git diff --check` passes.
