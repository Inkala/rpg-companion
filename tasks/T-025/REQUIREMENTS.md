# T-025 Requirements: Character-Sheet Fidelity, SRD Data, and Derived Calculations

Status: deferred

## Goal

Design the larger character-sheet fidelity work around SRD 5.1 rules data, structured character
content, and editable derived calculations.

Full implementation is deferred until Marcela explicitly approves it after the TFM submission.

## Gender

- Gender is required.
- Use a selector, not free text.
- Exact values: `Male`, `Female`, `Other`.
- Do not include `Prefer not to say`.
- `Other` remains a closed value with no additional note field.

## Rules data

- Target only SRD 5.1 and the 2014 API path.
- Use the D&D 5e SRD API as a development-time source.
- Commit a normalized, versioned local snapshot.
- Do not make production character creation depend on the external API being online.
- Provide manual or `Other` fallbacks for content absent from SRD 5.1.
- Include CC-BY-4.0 attribution in `README.md` and `docs/rules-data.md`.
- Do not import non-SRD Player's Handbook content.

## Compatibility

- Existing CharacterSheetV1 data needs display-only compatibility.
- No edit-time V1-to-V2 migration is required.
- Production application data was reset, so no stored user characters currently require migration.
- Mara compatibility must remain tested.

## Calculated values

- Automatically populate values determined by class, race, level, abilities, equipment, proficiency,
  or other structured inputs.
- Calculated values remain editable.
- Preserve provenance as calculated, manually overridden, or imported.
- Later input changes must not silently overwrite deliberate manual overrides.

## Character content sections

- Attacks: name, attack bonus, damage/type.
- Spells: class/level-filtered SRD dropdown plus populated level, school, casting time, range,
  components, duration, and description/effect.
- Spell slots tracked separately by spell level.
- Features and traits.
- Equipment.
- Other.

## Exclusions

- Do not include character editing/deletion.
- Do not include profile editing/account deletion.
- Do not include Party editing/deletion or member removal.
- Do not include existing-member character replacement.
- Do not include portrait-bank integration.
- Do not include production migrations or deployment in the planning task.
