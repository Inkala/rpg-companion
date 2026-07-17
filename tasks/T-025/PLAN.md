# T-025 Plan: Character-Sheet Fidelity, SRD Data, and Derived Calculations

Status: deferred

## Scope

Plan the larger post-submission character-sheet fidelity work:

1. SRD 5.1 development-time import and local snapshot.
2. Rules-data attribution.
3. Required Gender selector.
4. Race/Class/Subclass dropdowns and manual fallbacks.
5. Derived calculations with editable provenance.
6. Structured attacks, spells, features, equipment, and other entries.
7. Character Reference rendering consistency.
8. CharacterSheetV1 display compatibility.

## Timing

Implementation is deferred until Marcela explicitly approves it after the TFM submission.

## Estimate

4 to 7 focused implementation days.

Full T-025 implementation is not responsible before the 20 July submission deadline.

## Validation requirements when eventually implemented

- SRD snapshot integrity tests.
- Attribution documentation review.
- Frontend creation-flow tests.
- Backend character-sheet validation tests.
- Character Reference rendering tests for generated, manually transferred, owner-viewed, and
  GM-read-only characters.
- Mara compatibility tests.
- Full frontend and backend gates.
