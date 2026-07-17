# T-025 Design: Character-Sheet Fidelity, SRD Data, and Derived Calculations

Status: deferred

## Parallel-work assessment

- Classification: Red.
- Recommendation: post-submission implementation only after explicit approval.
- Reason: this task likely changes character data shape, frontend forms, backend validation, SRD
  snapshot tooling, Character Reference rendering, and compatibility behavior.
- Expected owned files or folders: character creation, character sheet types/validation/reference
  mapping, backend character validation, new rules-data documentation/snapshot files, and tests.
- Shared files or dependencies: CharacterSheetV1 compatibility, Mara sample data, saved-character
  API contract, GM read-only Character Reference, and SRD attribution.

## SRD snapshot strategy

- Source: `https://www.dnd5eapi.co/api/2014`.
- Documentation: `https://5e-bits.github.io/docs/`.
- Official licensing reference: `https://www.dndbeyond.com/srd/`.
- Use only SRD 5.1/2014 content that is legally reusable.
- Fetch data during development, normalize it, and commit a versioned local snapshot.
- Record upstream source URL, upstream version, import date, snapshot version, and transformation
  command.
- Include CC-BY-4.0 attribution in `README.md` and `docs/rules-data.md`.
- Keep production runtime independent from live third-party availability.

## Data-contract direction

- Likely introduce a versioned CharacterSheetV2 contract.
- Keep display-only compatibility for CharacterSheetV1.
- No edit-time V1-to-V2 migration is required.
- Avoid SQL migrations unless a future approved implementation requires queryable structured fields.
- Keep Mara compatibility tested.

## Derived-value provenance

Derived values track whether they are:

- calculated;
- manually overridden;
- imported.

Later input changes may update calculated values, but must not silently destroy a deliberate manual
override.

## Estimate

Full implementation estimate: 4 to 7 focused implementation days.

This is not responsible to implement before the 20 July submission deadline.
