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

## 2026-07-11 Public Smoke Test

- Certain: T-010 Fill the sheet myself V1 is implemented, committed, pushed, validated, and publicly
  smoke-tested.
- Certain: implementation commits are `911fef1`, `b3fca28`, and `a0df4b9`.
- Certain: public app smoke test passed at `https://hunin.marceramirez.com`.
- Certain: backend health passed at `https://api.hunin.marceramirez.com/healthz`.
- Certain: account signup, logout, and login passed with a disposable production account.
- Certain: both creation paths now work publicly: Help me choose and Fill the sheet myself.
- Certain: generated Fighter save, manual character save, My characters listing, saved Character
  Reference opening, and saved Character Reference URL refresh all passed.
- Certain: generic avatar fallback displays for saved characters without a custom portrait.
- Certain: optional manual action displays in Character Reference.
- Certain: optional manual feature displays after expanding the existing collapsed Features section.
- Certain: Mara sample still opens.
- Certain: quick mobile-width checks found no horizontal overflow on home/My characters or sample
  Character Reference.
- Certain: no blocking bugs were found.

Known non-blocking note: manual features are collapsed by default after refresh because Features is
an existing collapsed Character Reference section. This is consistent with current behavior.

Disposable production data remains because there is no deletion flow yet:

- account: `t010cglx3py@example.com`;
- characters: `Smoke Fighter t010cglx3py`, `Smoke Manual t010cglx3py`.
