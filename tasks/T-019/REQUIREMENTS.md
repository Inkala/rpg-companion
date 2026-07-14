# T-019 Requirements: Account and character UX polish

## Problem

Marcela's first production review found five related usability problems:

- successful registration gives no confirmation and signs the user in immediately;
- required character-entry fields are not visually identifiable;
- invalid manual review does not move the user to the first problem;
- ordinary character save requires another action before opening the saved reference;
- saved-character cards do not match the established Mara card or use the desired Home layout.

## Goals

- Make successful registration explicit and require a deliberate sign-in.
- Make required character fields obvious before submission.
- Make invalid review recovery immediate and accessible.
- Open an ordinarily saved character directly in Character Reference.
- Render Mara and saved characters through one visual card component.
- Make My characters use the full available width with its action in the section header.

## Required behavior

### Registration

- `POST /auth/register` creates an account but does not create a session, persist a session row, or
  emit a session cookie.
- Registration retains the existing safe validation, collision, throttling, Argon2, and generic
  error behavior.
- A successful response moves the frontend to Sign in while remaining signed out.
- Show a Sonner success toast with the exact text:
  `Account created. Sign in to continue.`
- The toast is keyboard and screen-reader compatible, dismissible, and contains no submitted
  identifier or password.
- Typed authentication destinations already held by App remain intact while registration switches
  to Sign in. No Party component or Party state contract is changed.

### Character required fields

- Every field required by the active character-entry validator has a visible `*` marker.
- The form explains that `*` means required.
- Required inputs use native or ARIA required semantics in addition to the visual marker.
- Optional fields are not marked required.
- If Review character finds errors, show one summary alert and focus and scroll to the first invalid
  field in document order.
- Existing per-field messages and validation rules remain unchanged.

### Ordinary post-save navigation

- Successful guided and manual character saves opened from the ordinary Create character flow
  immediately navigate to the newly saved Character Reference.
- The ordinary flow no longer requires an `Open Character Reference` button after save.
- Save failures remain on the review screen with the existing safe error and retry behavior.
- The existing Party-invite character-creation return behavior is unchanged in T-019.

### Shared character cards

- Mara and account-owned saved characters render through one shared card component.
- The visual structure follows the approved `character right.png` reference:
  portrait or generic avatar, reference eyebrow, name, identity line, `Expand`, HP/AC/Speed strip,
  featured badges, and supporting concept text.
- The saved-character summary contract exposes only the CharacterSheetV1 summary fields needed by
  the card: portrait asset ID and alt text when present, featured abilities, and landing concept.
- Unknown or absent portrait assets use the existing generic avatar and safe alt behavior.
- Mara is represented with the same summary DTO shape. Stable sample-only values may be supplied
  where the DTO requires them.
- Every card action is labeled `Expand`.
- No owner ID, email, full reference payload, Party information, or other private data is added to
  the list response.

### My characters layout

- My characters occupies the full available Home content width.
- Its title and Create character action share one full-width header row with maximum separation.
- Character cards render below that header and occupy the full available width.
- Narrow widths stack the header content without overflow and preserve 44px controls.
- Loading, empty, error, and loaded states retain clear headings and accessible status/error copy.

## Explicit Party exclusion

T-019 must not edit or change:

- `frontend/src/parties/`;
- `backend/internal/parties/`;
- Party routes, invite state, join requests, authorization, migrations, DTOs, or tests;
- the current Party-invite character-creation return behavior.

Marcela's desired future Party behavior is recorded separately: character creation launched from an
invite should use the ordinary creation experience, open the saved Character Reference, and
automatically link the new character to the pending Party.

## Non-goals

- No Party implementation.
- No email verification or password reset.
- No general notification system beyond installing and styling Sonner for the registration success.
- No character editing or deletion.
- No account or test-data deletion.
- No deployment, provider, CI, or infrastructure change.

## Acceptance criteria

- Focused registration tests prove no session cookie or session row is created.
- Frontend tests prove Sign in plus the exact toast after registration.
- Required markers and first-invalid-field focus are covered for manual entry.
- Guided and manual ordinary saves open the exact created character route.
- Mara and saved characters are rendered by the shared card and expose `Expand`.
- Summary response exact-key tests protect privacy.
- Home layout passes 320px, 390px, and 720px checks without horizontal overflow.
- Existing authentication, character, sample, profile, and Party regressions remain green.
