# T-020 Design: Party quest-board cards and Home section contrast

Status: approved

## Overview

T-020 has two sequential implementation slices:

1. Backend Party-list contract.
2. Frontend Party/Home presentation.

The implementation should keep the current deployed Party behavior intact while improving the
signed-in Home Party list and providing the card data without frontend N+1 detail calls.

## Backend model

Extend the Party summary domain model with presentation-only list data:

```go
type PartySummary struct {
    ID               uuid.UUID
    Name             string
    Role             string
    CreatedAt        time.Time
    UpdatedAt        time.Time
    GM               PartySummaryPerson
    LinkedCharacters []PartySummaryLinkedCharacter
}

type PartySummaryPerson struct {
    Username string
}

type PartySummaryLinkedCharacter struct {
    CharacterName string
    Username      string
}
```

No `displayName` is included until a profile contract exists.

## Backend response DTO

The response mapping should keep `role` even though the redesigned card does not display it. Other
routes and future behavior may still depend on the current-user role.

Exact JSON shape:

```json
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
```

## Repository query design

Use one membership-scoped PostgreSQL query and fold rows in Go.

Query shape:

- requester membership scopes visible Parties;
- Party row provides `id`, `name`, `created_at`, `updated_at`;
- requester membership provides current-user `role`;
- GM membership join uses `role = 'gm'`;
- GM user join provides `gm.username`;
- Player membership left join uses `role = 'player'` and `character_id IS NOT NULL`;
- linked character join provides `character.name`;
- linked Player user join provides `username`.

Ordering:

- Parties: `p.created_at DESC, p.id DESC`.
- Linked characters: `player_membership.joined_at ASC, player_membership.id ASC`.

Go folding should:

- allocate one `PartySummary` per Party;
- append linked characters only when a linked Player membership row exists;
- keep `LinkedCharacters` as an initialized empty slice for Parties with no linked characters;
- reject malformed rows that cannot parse UUIDs;
- preserve unexpected database errors.

## Frontend DTO

Extend `PartySummaryDTO` with:

```ts
gm: {
  username: string;
};
linkedCharacters: Array<{
  characterName: string;
  username: string;
}>;
```

No `displayName`.

## Anchor navigation design

Opening a Party is navigation, so the Party card must be an anchor.

`PartyList` prop changes:

```ts
type PartyListProps = {
  getPartyHref: (partyId: string) => string;
  onOpenParty: (partyId: string) => void;
  // existing props remain
};
```

Card behavior:

- `href={getPartyHref(party.id)}`;
- visible Party title remains a heading;
- anchor uses `aria-labelledby` referencing the Party title;
- ordinary unmodified primary click calls `event.preventDefault()` and `onOpenParty(party.id)`;
- modified clicks, non-primary clicks, and already-handled events fall through to native browser
  link behavior;
- no nested buttons or links.

The existing app route serializer should provide the href. If it is not exported for this route,
export or route through a small stable helper rather than duplicating paths.

## Loaded card presentation

The approved visual direction is a light quest-board pamphlet:

- prominent Party title;
- divider below title;
- strong `GM:` label and username;
- small uppercase `LINKED CHARACTERS` label;
- linked rows with strong character names and muted usernames;
- `No linked characters yet.` for empty linked-character collection;
- warm border and restrained shadow;
- lighter card surface than the muted My parties section;
- safe wrapping with `overflow-wrap: anywhere` and `min-width: 0`.

Role is not displayed on the card.

## Empty Party card

Authenticated empty Party state should render one light-surface card with only:

- `You have not joined a party yet.`
- Create party button
- Join party button

The card fills the My parties section width, has a warm visible border, and keeps existing button
callbacks.

## Home section contrast

Use `var(--color-bg-surface-muted)` on both signed-in containing sections:

- My characters;
- My parties.

Cards inside those sections keep the lighter surface. The global page background is unchanged.

## Responsive rules

- Base: one full-width column.
- `min-width: 720px`: two equal columns.
- `min-width: 1080px`: three equal columns if current content width supports it.
- Validate at `320px`, `390px`, `720px`, and desktop.

## Accessibility

- Whole Party card is one link with a meaningful accessible name.
- Party title remains visible and semantic.
- Focus-visible style is clear and not hidden by shadows or borders.
- Empty-state buttons remain at least `44px` high.
- Long text wraps without horizontal overflow.
- Loading uses `role="status"` and error uses the existing alert semantics.

## Validation plan

Backend:

- focused Party response tests;
- focused Party repository PostgreSQL tests;
- server-flow tests as needed;
- complete backend tests, vet, and build in Slice 1.

Frontend:

- Party API tests;
- PartyList tests for loaded, empty, loading, error, Retry, link semantics, modified clicks, and
  no nested interactive controls;
- Home tests for muted section hooks and signed-in ordering;
- browser checks at `320px`, `390px`, `720px`, and desktop in Slice 2;
- complete frontend gates and backend regression gates in Slice 2.

## Risks

- The desktop three-column breakpoint may need a slight adjustment if the current Home content
  width makes cards cramped.
- Browser validation needs either controlled local fixtures or seeded saved Party data to cover
  several linked-character rows.
- Future profile display names remain a separate product and database contract.
