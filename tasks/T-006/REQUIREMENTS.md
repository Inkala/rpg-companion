# T-006 Requirements

## Problem

The previous home IA made account actions and future character/party actions feel too heavy or
misplaced. The approved T-005 direction and Figma pass clarify that home should present one grouped
set of primary actions, lightweight account controls, and signed-in empty states before sample
content.

## Goals

- Present Create character, Create party, and Join party as the top-level home action group.
- Remove Add existing character from the top-level home.
- Keep Create character visually primary while making it clear that creation itself is not built in
  this slice.
- Keep Create party and Join party visible but planned/disabled.
- Explain signed-out party requirements with inline helper text.
- Move account actions into the header area.
- Show a compact text-labeled mobile menu affordance.
- Prioritize My characters and My parties when signed in.
- Keep Mara available as secondary demo content.
- Make inline form errors smaller, lighter, and less visually loud.
- Reduce full-width desktop/tablet button heaviness.

## Non-goals

- Do not implement character creation, mode choice, manual entry, Help me choose, story/image,
  review, party creation, party joining, character lists, APIs, routing, backend changes, auth
  behavior changes, migrations, dependencies, CI, deployment changes, dark mode, favicon, image
  upload/storage, Character Reference redesign, or quick-reference dialog polish.

## Acceptance Criteria

- Signed-out home shows Create character, Create party, and Join party before Mara.
- Add existing character does not appear as a top-level home action.
- Party actions are visibly planned/disabled and include inline login-required helper text.
- Account actions appear as lightweight header controls when the backend is configured.
- Mobile home includes a text-labeled Menu affordance.
- Signed-in home shows My characters and My parties before Mara.
- Explore Mara still opens Character Reference.
- Existing account validation behavior still passes.
- Frontend lint, typecheck, test, and build pass.
- `git diff --check` passes.

