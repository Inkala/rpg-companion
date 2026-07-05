# T-010 Notes

## 2026-07-05

- Certain: T-005 says `Fill the sheet myself` belongs inside `Create character`, not as a separate
  top-level home action.
- Certain: T-009 defines `CharacterSheetV1` as the rich app/domain sheet model.
- Certain: T-003 guided creation is intentionally narrow and should not absorb full manual entry.
- Certain: current backend character create requires explicit core fields and a JSON object
  `referencePayload`.
- Certain: the backend rejects unknown top-level create-request fields.
- Certain: current backend persistence can store rich manual-entry detail inside JSON without a
  migration.
- Certain: `GET /characters` summary work has existed separately from this planning task.
- Certain: Ninea must not become an app fixture.
- Assumption: Manual entry should prioritize existing party testers who already have characters.
- Assumption: First manual entry can use text inputs for class, species, background, and subclass
  until Hunin has an approved rules-data source.
- Assumption: Manual entry should treat player-entered values as source facts and mark uncertainty
  in audit metadata instead of blocking save.

## Planning Summary

Manual entry V1 should be a transfer flow:

- required core fields for save;
- optional richer sections for reference;
- no automatic file import;
- no full rules engine;
- no migration;
- no Ninea fixture.

Manual entry differs from Help me choose because it trusts the player's sheet. Guided creation
derives a constrained character from approved option data.
