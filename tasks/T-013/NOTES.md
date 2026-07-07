# T-013 Notes

## Startup Notes

Certain:

- `CURRENT.md` listed T-012 as active and implementation complete, awaiting review.
- T-013 was requested as a docs-only planning task from the main checkout.
- The current backend create/list/detail endpoints are authenticated and owner-scoped.
- The backend rejects client-provided `ownerSubjectId` on create.
- The frontend character API currently has `listCharacterSummaries` but no create or get-by-id
  helper.
- Signed-in home currently displays saved character summaries.
- Character summary cards are not yet documented here as opening saved detail.
- The app router currently includes `/characters/new` and `/characters/sample`, not
  `/characters/:id`.
- Character Reference currently opens Mara sample data.

Assumption:

- T-013 implementation should start after T-012 is reviewed and closed because both touch
  `frontend/src/character-creation/`.

## Planning Answers

1. Strength melee Fighter should generate the fixed Soldier build in `REQUIREMENTS.md`: Human
   Fighter 1, STR 16, CON 15, HP 12, AC 19, longsword, javelin, Defense, Second Wind.
2. Dexterity archer Fighter should generate the fixed Outlander build in `REQUIREMENTS.md`: Human
   Fighter 1, DEX 16, CON 15, HP 12, AC 14, longbow, shortsword, Archery, Second Wind.
3. Existing `POST /characters` requires name, className, level, ancestry, background, all six
   ability scores, current/max HP, armorClass, speedFt, and a JSON-object referencePayload.
4. Generated characters should map to the complete `CharacterSheetV1` object, with rich data in
   identity, summary, abilities, combat, proficiencies, actions, features, equipment, personality,
   and audit.
5. `referencePayload` should be the complete `CharacterSheetV1`, not a separate custom view shape.
6. Use a review step before save.
7. Signed-out users may complete the quiz and see review preview, but must sign in or create an
   account to save.
8. Save errors should keep review data intact, show inline error copy, disable duplicate submits
   during in-flight saves, and allow retry.
9. Saved generated characters should appear in My characters using existing summary fields: name,
   Fighter Level 1, Human and background, HP, AC, and speed.
10. Saved generated characters should open through an authenticated saved character route that loads
    `GET /characters/{id}` and renders Character Reference from `referencePayload`.
11. Deferred: full rules generation, class choice, spells, subclasses, ability score methods,
    equipment shopping, party flow, image upload, localStorage migration, and backend migrations
    unless proven necessary.

## Backend Change Assessment

Certain:

- The existing backend contract can store all required generated Fighter summary fields and
  `CharacterSheetV1` in `referencePayload`.
- The existing backend detail endpoint returns `referencePayload`.

Assumption:

- No backend code or migration is necessary for T-013 implementation.

Potential backend follow-up only if implementation proves it is needed:

- Add stricter backend validation for `referencePayload.schemaVersion`.
- Add OpenAPI documentation for the existing character create/detail contract.

## Validation Notes

Planning docs should be validated with:

```sh
git diff --check
git status --short
```
