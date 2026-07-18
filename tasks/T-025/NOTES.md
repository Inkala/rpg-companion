# T-025 Notes: Character-Sheet Fidelity, SRD Data, and Derived Calculations

Status: deferred

## Approved planning decisions

- Gender values are exactly `Male`, `Female`, `Other`.
- `Other` remains closed with no note field.
- Target only SRD 5.1 and the 2014 API path.
- Use SRD data as a development-time source.
- Commit a normalized, versioned local snapshot.
- Do not depend on the external API at production runtime.
- Include CC-BY-4.0 attribution in `README.md` and `docs/rules-data.md`.
- Do not import non-SRD Player's Handbook content.
- Existing CharacterSheetV1 data requires display-only compatibility.
- No edit-time V1-to-V2 migration is required.
- Production application data was reset, so no stored user characters currently require migration.
- Mara compatibility remains tested.

## Deferred implementation

Marcela explicitly deferred full implementation until after the TFM submission.

Portrait-bank integration remains separate and may later become T-026.
