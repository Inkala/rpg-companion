# T-003 Notes

## Discoveries

- T-002 authentication and owner-scoped character persistence is completed, committed, and validated.
- Current branch is aligned with `origin/main`.
- Existing backend endpoints are sufficient for first authenticated save and read:
  - `POST /characters`
  - `GET /characters/{id}`
- First-slice authenticated save renders Character Reference directly from the successful
  `POST /characters` response.
- `GET /characters/{id}` remains the later read boundary for persisted loading when needed.
- The current backend stores explicit character fields plus `referencePayload` JSONB.
- The frontend currently keeps Mara Velard, account UI, Character Reference, and quick-reference sheet
  rendering in `App.tsx`.
- No `frontend/src/character-creation/` folder exists yet.
- No `frontend/src/characters/` folder or character API client exists yet.
- Fixed Fighter presets include the D&D 5E 2014 Human +1 bonus to every ability score.
- Strength melee Fighter: Strength 16, Dexterity 14, Constitution 15, Intelligence 11, Wisdom 13,
  Charisma 9, HP 12, AC 19, Defense, longsword +5 for 1d8+3, optional versatile 1d10+3 two-handed,
  Second Wind.
- Dexterity archer Fighter: Strength 11, Dexterity 16, Constitution 15, Intelligence 9, Wisdom 13,
  Charisma 14, HP 12, AC 14, Archery, longbow +7 for 1d8+3, shortsword +5 for 1d6+3, Second Wind.

## Open Questions

- Whether the first created-character reference uses a generic placeholder portrait or no portrait.

## Links

- `docs/sdd.md`
- `docs/WORKTREE_POLICY.md`
- `docs/product-decisions.md`
- `docs/design.md`
- `docs/risks.md`
- `tasks/T-002/NOTES.md`
