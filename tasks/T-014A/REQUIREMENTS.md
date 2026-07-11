# T-014A Requirements: Compact Character Reference header and stats

## Problem

The Character Reference summary gives primary and secondary statistics more vertical space and
equal visual weight than their in-session importance warrants. It also displays synthetic
`No concentration` copy when the character has no active concentration, turning the absence of a
state into prominent header content.

## Goals

- Make the summary faster to scan during play.
- Preserve HP and AC prominence.
- Keep Speed and all secondary statistics findable with less visual weight.
- Show concentration only when meaningful active concentration text exists.
- Preserve current character sources and fallback behavior.
- Make the change without modifying rules logic or persisted data.

## Functional requirements

1. A character with no active concentration must not display `No concentration`.
2. A meaningful active concentration value must remain eligible for display.
3. Character name, identity, and supporting identity must continue to render when provided.
4. HP, AC, and Speed must remain visible in the Primary stats group.
5. HP and AC must remain visually prominent.
6. Speed may have lower visual weight than HP and AC but must remain clearly labeled and readable.
7. Initiative, Passive Perception, and Proficiency must remain visible in a more compact Secondary
   stats group when present.
8. Stat markup must preserve semantic `<dl>`, `<dt>`, and `<dd>` elements.
9. The Mara sample must continue to render and retain its existing behavior.
10. Generated and manual-style saved characters must continue to map and render.
11. A character without a custom portrait must continue to use the generic avatar fallback.

## Non-functional requirements

- Keep layout usable at narrow mobile widths without horizontal overflow.
- Do not rely on color alone to communicate primary versus secondary importance.
- Keep labels visible and accessible through text.
- Scope CSS so unrelated character screens are not changed accidentally.
- Add no dependencies.

## Non-goals

- Attack badges or feature deduplication.
- Calculation explanations or modals.
- Mutable HP or resource state.
- Rest actions.
- Advantage or disadvantage controls.
- Context modes or tactical assistance.
- Backend, API, routing, persistence, or data model work.

## Acceptance criteria

- Focused tests prove absent concentration does not become `No concentration`.
- Identity and both stat groups remain available through accessible text.
- Existing Mara and generic-avatar behavior remains covered.
- Generated and manual character paths require no contract changes.
- Focused tests, full frontend tests, frontend build, and manual narrow-width validation pass before
  implementation completion.
