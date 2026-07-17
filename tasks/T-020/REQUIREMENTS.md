# T-020 Requirements: Party quest-board cards and Home section contrast

Status: complete

## Problem

The current signed-in Party list is functional, but its Party cards do not communicate party
membership clearly enough and still use a separate `Open party` button. Marcela approved a new
visual direction where each Party appears as a light quest-board pamphlet while preserving Hunin's
current light global page background.

The backend Party list response also lacks the GM and linked-character summary data required for
the approved cards. The frontend must not fetch Party details for every listed Party.

## Goals

- Redesign loaded Party cards as light quest-board pamphlets using the approved visual reference:
  `/Users/marce/Desktop/Screenshot 2026-07-14 at 19.24.46.png`.
- Preserve Hunin's current global page background and visual identity.
- Extend the authenticated Party-list contract with only the summary data required by the cards.
- Keep Party-list loading, empty, error, Retry, detail, invite, join, and Character Reference
  behavior intact.
- Improve signed-in Home section contrast by using muted surfaces for the My characters and My
  parties containing sections while keeping cards on the lighter surface.
- Use real link semantics for opening a Party.
- Preserve accessibility, keyboard navigation, responsive behavior, and privacy boundaries.

## Non-goals

- No global dark-background or theme redesign.
- No profile display-name implementation.
- No `displayName` field in the Party-list DTO.
- No Party editing, deleting, leaving, kicking, or member removal.
- No invite-flow changes.
- No automatic Party linking after character creation.
- No database migration.
- No production, provider, CI, or infrastructure changes.

## Backend Party-list contract

Keep the existing Party summary fields:

- `id`
- `name`
- `role`

Add only:

- `gm.username`
- `linkedCharacters[].characterName`
- `linkedCharacters[].username`

Do not add `displayName`.

Rules:

- Include only characters linked through Player memberships.
- The GM membership remains characterless.
- Use one authenticated membership-scoped PostgreSQL query or similarly bounded repository
  operation.
- Avoid frontend N+1 Party-detail requests.
- Order Parties by `created_at DESC, id DESC`.
- Order linked characters by membership `joined_at ASC, id ASC`.
- Serialize an empty linked-character collection as `[]`.
- Preserve generic database errors.

Expected response shape:

```json
{
  "parties": [
    {
      "id": "party-id",
      "name": "Ash & Ivy Pact",
      "role": "gm",
      "gm": {
        "username": "nerea-sol"
      },
      "linkedCharacters": [
        {
          "characterName": "Nim",
          "username": "nim-player"
        }
      ]
    }
  ]
}
```

## Privacy requirements

The Party list response must not expose:

- emails;
- user IDs;
- character IDs;
- character owner IDs;
- full `CharacterSheet` payloads;
- invite data;
- raw invite tokens;
- invite token hashes;
- unrelated roster data.

Add exact-key response tests and PostgreSQL membership-scoping tests.

## Loaded Party card behavior

- Use a quest-board pamphlet appearance: light surface, warm border, restrained shadow, divider,
  and prominent Party title.
- Keep the current light global page background.
- Show prominent `GM:` followed by username.
- Show a small `LINKED CHARACTERS` heading.
- Render linked rows as `[Character name]: [username]`.
- Show `No linked characters yet.` when a loaded Party has no linked Player characters.
- Do not show Role.
- Remove the separate `Open party` button.
- Make the entire card one real anchor.

## Navigation semantics

- `PartyList` receives a stable Party href builder and retains the existing SPA navigation callback.
- Anchor `href` comes from the existing route serializer.
- Intercept only ordinary unmodified primary clicks for SPA navigation.
- Preserve modified clicks, non-primary clicks, and default browser link behavior.
- Do not nest interactive elements inside the anchor.
- Use the visible Party title with `aria-labelledby` as the link name.
- Preserve visible keyboard focus.

## Responsive layout

- Mobile: one full-width column.
- Tablet around `720px`: two columns.
- Desktop around `1080px`: three columns, adjusting only if the existing content width makes cards
  cramped.
- Validate at `320px`, `390px`, `720px`, and desktop.
- Long Party names, character names, and usernames must wrap safely.
- No horizontal overflow.

## Home section contrast

- My characters uses `var(--color-bg-surface-muted)`.
- My parties uses `var(--color-bg-surface-muted)`.
- Character cards, loaded Party cards, and the empty Party card retain the lighter card surface.
- Do not change the global page background.

## Empty Party state

When the authenticated Party list is empty, render one bordered light-surface card containing only:

- `You have not joined a party yet.`
- Create party button
- Join party button

Do not add a title, icon, role, or explanatory paragraph.

The empty card must:

- fill the available Party-section width;
- have a warm visible border;
- preserve existing callbacks;
- keep buttons at least `44px` high;
- wrap safely at `320px` and `390px`.

This state is distinct from a loaded Party with no linked characters.

## Registration production finding

Current production registration works correctly from a fresh signed-out browser:

- no `Set-Cookie` is returned;
- the user remains signed out;
- the browser shows `/login`;
- the exact success toast appears: `Account created. Sign in to continue.`

No auth code change is currently justified. Reopen the registration defect only if it can be
reproduced with the original browser/session conditions.

## Acceptance criteria

- Backend list response exposes exactly the approved fields and remains membership-scoped.
- Frontend renders quest-board Party anchors without a separate `Open party` button.
- Empty, loading, error, Retry, loaded, and no-linked-character states are covered by tests.
- Signed-in My characters and My parties section backgrounds use the muted surface.
- Responsive validation passes at `320px`, `390px`, `720px`, and desktop.
- Full backend and frontend validation passes in the authorized implementation slices.
