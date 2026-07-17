# T-020 Tasks: Party quest-board cards and Home section contrast

Status: complete

Marcela approved this exact two-slice checklist on 2026-07-16. T-020 merged and deployed as
`e7053fb72f8b52e73e08dfdd8668b9a429abb803`; controlled production rollout passed.

## Slice 1: backend Party-list contract

- [x] Add failing response/model tests for the approved Party-list DTO fields.
- [x] Add exact-key privacy tests excluding emails, user IDs, character IDs, owner IDs, full
  CharacterSheet payloads, invite data, tokens, hashes, and unrelated roster data.
- [x] Extend Party summary domain and response DTOs with `gm.username` and
  `linkedCharacters[].characterName` plus `linkedCharacters[].username`.
- [x] Implement one authenticated membership-scoped repository query without frontend N+1 detail
  requests.
- [x] Fold query rows deterministically with Parties ordered by `created_at DESC, id DESC` and
  linked characters ordered by membership `joined_at ASC, id ASC`.
- [x] Ensure Parties with no linked Player characters serialize `linkedCharacters` as `[]`.
- [x] Add PostgreSQL membership-scoping tests proving unrelated Parties and unrelated roster data do
  not leak.
- [x] Preserve generic unexpected database errors.
- [x] Run focused Party backend tests.
- [x] Run complete backend validation: tests, vet, and build.
- [x] Stop for review before commit or Slice 2.

## Slice 2: frontend Party/Home presentation

- [x] Update Party API types and fixtures to match the Slice 1 DTO without `displayName`.
- [x] Add failing PartyList tests for multiple Parties, several linked characters, and no linked
  characters.
- [x] Replace the loaded Party card with one quest-board pamphlet anchor per Party.
- [x] Add a stable Party href builder prop while preserving the existing SPA navigation callback.
- [x] Intercept only ordinary unmodified primary clicks and preserve modified click/browser link
  behavior.
- [x] Remove the separate `Open party` button and avoid nested interactive controls.
- [x] Render the Party title as a visible heading and use it for the link name.
- [x] Render `GM: [username]`, `LINKED CHARACTERS`, linked rows, and `No linked characters yet.`
  exactly as required.
- [x] Apply `var(--color-bg-surface-muted)` to My characters and My parties containing sections
  while keeping cards on the lighter surface.
- [x] Replace the authenticated empty Party state with the exact bordered light-surface card:
  `You have not joined a party yet.`, Create party button, Join party button.
- [x] Add one/two/three-column responsive layout rules.
- [x] Add focused tests for loading, empty, error, Retry, focus, keyboard/link semantics, wrapping,
  and no overflow hooks.
- [x] Run browser validation at `320px`, `390px`, `720px`, and desktop.
- [x] Run complete frontend validation and backend regression gates.
- [x] Stop for review before commit, PR, or deployment.

## Prohibited changes

- [x] Do not add `displayName`.
- [x] Do not expose emails, user IDs, character IDs, owner IDs, full CharacterSheet payloads, invite
  data, tokens, hashes, or unrelated roster data.
- [x] Do not change global page background.
- [x] Do not change Party detail, invite, join, authorization, or Character Reference behavior.
- [x] Do not add a migration.
- [x] Do not change auth behavior.
- [x] Do not change CI, deployment, providers, infrastructure, or production data.

## Proposed commit messages

```text
feat(parties): extend party list summaries
feat(ui): redesign party list cards
```
