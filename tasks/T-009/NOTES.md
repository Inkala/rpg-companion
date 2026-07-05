# T-009 Notes

## 2026-07-05

- Certain: `PROJECT.md` identifies Hunin as a D&D 5E 2014 companion app.
- Certain: the backend currently stores explicit core character columns plus a JSONB field for rich
  character/reference content.
- Certain: the backend architecture audit recommendation was not to refactor the backend now.
- Certain: the current Mara sample docs say Mara is static display content, not the final canonical
  character-data model.
- Certain: Mara Velard is original, setting-neutral, and already used by the guest sample flow.
- Certain: Ninea Crowny must not become an app fixture now.
- Assumption: The uploaded/generated Mara sheet is not present as a tracked repo file in this
  checkout, so this planning task treats the existing Mara docs plus the user's warning as the audit
  basis.
- Assumption: `CharacterSheetV1` can initially be stored in the existing backend JSONB field without
  a migration.

## Mara audit seed

Reliable current sample values:

- Mara Velard.
- Human Ranger 3.
- Hunter subclass.
- Outlander background.
- Neutral Good alignment.
- HP 26 / 26.
- AC 14, pending armor confirmation.
- Speed 30 ft.
- Proficiency bonus +2.
- Initiative +3.
- Passive Perception 14, pending skill confirmation.
- Ability scores: STR 10, DEX 16, CON 14, INT 10, WIS 14, CHA 8.
- Longbow +7, 1d8 + 3 piercing, 150 / 600 ft.
- Shortsword +5, 1d6 + 3 piercing.
- Archery.
- Colossus Slayer.
- Hunter's Mark, Fog Cloud, Cure Wounds.

Needs confirmation:

- Full skill list.
- Saving throw proficiencies.
- Armor and AC source.
- Equipment, inventory, tools, languages, and currency.
- Spell save DC and spell attack bonus.
- Exact Ranger 3 feature set to include in sample content.
- Whether generated sheet content contains D&D 2024 wording.

Rules-version notes:

- Treat D&D 5E 2014 as the target unless a future decision changes it.
- Do not silently mix 2014 and 2024 Ranger mechanics.
- If generated sheet content includes 2024 Ranger wording, correct it to 2014 or defer it.

## Model direction

- Use `CharacterSheetV1` as the domain model name.
- Treat `referencePayload` as backend storage detail only.
- Keep relational columns focused on ownership, list summaries, and high-value core stats.
- Keep rich sheet detail, source audit, and Character Reference content in JSON.
- Keep `GET /characters` summary-only when it is later added.
- Keep `GET /characters/{id}` as the full-detail endpoint.
