# T-024 Requirements: Quick QA Consistency Fixes

Status: approved

## Goal

Implement a compact QA consistency pass across navigation, account creation, empty Home sections,
guided selection, Character Reference quick-reference behavior, and Party presentation.

## Screenshots

Use these screenshots as acceptance references:

- `/Users/marce/Desktop/Screenshot 2026-07-17 at 18.58.08.png`
- `/Users/marce/Desktop/Screenshot 2026-07-17 at 19.08.59.png`

## Global navigation

- Add a sign-out confirmation dialog.
- Dialog title: `Sign out?`
- Dialog message: `Are you sure you want to sign out?`
- Dialog actions: `Cancel` and `Sign out`.
- Every page uses the same application header/menu.
- The Hunin logo continues to navigate Home.
- Add Home to the menu with the Lucide House icon.
- Guest menu: Home, Sign in, Create account.
- Signed-in menu: Home, Profile, Sign out.
- Remove the Profile page's separate Home button.
- Preserve equivalent destinations on desktop and mobile.
- Preserve keyboard navigation, focus management, Escape behavior, and 44px controls.

## Account creation and toasts

- Add a required Confirm password field.
- Validate password equality before sending registration.
- Do not send or persist the confirmation value.
- Preserve the existing privacy-safe backend contract.
- Registration success toast keeps only its close X.
- Remove the additional Dismiss action.
- Add semantic toast variants:
  - green success;
  - yellow warning;
  - red error/destructive;
  - blue information.
- Approximately 85% opacity applies only to the toast surface.
- Text, icons, borders, and focus indicators remain opaque and must pass contrast checks.

## Empty signed-in Home

My characters:

- Small green section title: `My characters`.
- Empty heading: `No heroes have arrived yet`.
- Supporting copy: `Start with a guided character or fill in your sheet manually.`
- Action: `New character`.

My parties:

- Small green section title: `My parties`.
- Empty heading: `There are no quests in sight`.
- Supporting copy: `Create or join an adventure to satisfy your thirst for adventure.`
- Actions: `Create` and `Join`.
- Do not use a second redundant `My parties` heading.

## Guided selection

- Remove visible `Selected` text.
- Preserve selected radio state, green background, accessible checked semantics, and focus
  indication.

## Character Reference quick reference

- Rename `Remember` to `Description`.
- Remove `Show more details`.
- Remove `Details planned`.
- Only entries with hidden structured detail appear clickable.
- Entries without hidden detail are not styled or announced as clickable.
- Show all available detail immediately.
- Use `max-height: 75vh`.
- Use internal scrolling for overflow.
- Keep responsive width constrained to the viewport.
- Preserve focus trap, Escape, close-button behavior, focus return, headings, and screen-reader
  naming.

## Party presentation

- Rename visible `Roster` and `Link characters` terminology to `Members`.
- Replace text-only `Open character reference` with a Lucide Eye icon control.
- Give the Eye action a complete accessible name, such as `View {character name}`.
- Add a visible tooltip where appropriate.
- Visually distinguish GM and Player roles.
- Use a prominent GM badge with a Lucide Crown icon.
- Do not add a separate GM portrait.
- Do not implement Party editing, deletion, member removal, or character reassignment in this task.

## Out of scope

- Full CharacterSheetV2.
- SRD import.
- Derived calculations.
- Edit/delete flows.
- Party administration.
- Portrait integration.
- Migrations.
- Deployment or provider changes.
