# T-020 Tasks: Party quest-board cards and Home section contrast

Status: approved

Marcela approved this exact two-slice checklist on 2026-07-16. Implementation may start only in the
dedicated T-020 worktree after the planning checkpoint is committed and pushed.

## Slice 1: backend Party-list contract

- [ ] Add failing response/model tests for the approved Party-list DTO fields.
- [ ] Add exact-key privacy tests excluding emails, user IDs, character IDs, owner IDs, full
  CharacterSheet payloads, invite data, tokens, hashes, and unrelated roster data.
- [ ] Extend Party summary domain and response DTOs with `gm.username` and
  `linkedCharacters[].characterName` plus `linkedCharacters[].username`.
- [ ] Implement one authenticated membership-scoped repository query without frontend N+1 detail
  requests.
- [ ] Fold query rows deterministically with Parties ordered by `created_at DESC, id DESC` and
  linked characters ordered by membership `joined_at ASC, id ASC`.
- [ ] Ensure Parties with no linked Player characters serialize `linkedCharacters` as `[]`.
- [ ] Add PostgreSQL membership-scoping tests proving unrelated Parties and unrelated roster data do
  not leak.
- [ ] Preserve generic unexpected database errors.
- [ ] Run focused Party backend tests.
- [ ] Run complete backend validation: tests, vet, and build.
- [ ] Stop for review before commit or Slice 2.

## Slice 2: frontend Party/Home presentation

- [ ] Update Party API types and fixtures to match the Slice 1 DTO without `displayName`.
- [ ] Add failing PartyList tests for multiple Parties, several linked characters, and no linked
  characters.
- [ ] Replace the loaded Party card with one quest-board pamphlet anchor per Party.
- [ ] Add a stable Party href builder prop while preserving the existing SPA navigation callback.
- [ ] Intercept only ordinary unmodified primary clicks and preserve modified click/browser link
  behavior.
- [ ] Remove the separate `Open party` button and avoid nested interactive controls.
- [ ] Render the Party title as a visible heading and use it for the link name.
- [ ] Render `GM: [username]`, `LINKED CHARACTERS`, linked rows, and `No linked characters yet.`
  exactly as required.
- [ ] Apply `var(--color-bg-surface-muted)` to My characters and My parties containing sections
  while keeping cards on the lighter surface.
- [ ] Replace the authenticated empty Party state with the exact bordered light-surface card:
  `You have not joined a party yet.`, Create party button, Join party button.
- [ ] Add one/two/three-column responsive layout rules.
- [ ] Add focused tests for loading, empty, error, Retry, focus, keyboard/link semantics, wrapping,
  and no overflow hooks.
- [ ] Run browser validation at `320px`, `390px`, `720px`, and desktop.
- [ ] Run complete frontend validation and backend regression gates.
- [ ] Stop for review before commit, PR, or deployment.

## Prohibited changes

- [ ] Do not add `displayName`.
- [ ] Do not expose emails, user IDs, character IDs, owner IDs, full CharacterSheet payloads, invite
  data, tokens, hashes, or unrelated roster data.
- [ ] Do not change global page background.
- [ ] Do not change Party detail, invite, join, authorization, or Character Reference behavior.
- [ ] Do not add a migration.
- [ ] Do not change auth behavior.
- [ ] Do not change CI, deployment, providers, infrastructure, or production data.

## Proposed commit messages

```text
feat(parties): extend party list summaries
feat(ui): redesign party list cards
```
