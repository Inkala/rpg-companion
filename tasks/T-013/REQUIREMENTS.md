# T-013 Requirements: Generated Fighter save flow

## Problem

The Help me choose flow can recommend or select a Strength melee Fighter or Dexterity archer
Fighter, but accepting a build does not yet create a complete saved character. Users need the
selected recommendation to become a real level-1 Human Fighter that appears in My characters and
opens in Character Reference.

## Goals

- Generate a complete enough fixed level-1 Human Fighter from the selected Help me choose build.
- Show a review step before save.
- Save through the existing authenticated `POST /characters` backend API.
- Store rich reference data in `referencePayload` as `CharacterSheetV1`.
- Show the saved character in My characters.
- Let the saved character open in Character Reference.
- Keep the implementation honest: fixed beginner builds, not full D&D rules generation.

## Non-goals

- No full D&D character creation rules.
- No full class, ancestry, background, or equipment choice system.
- No subclasses.
- No spells.
- No ability score rolling or point buy.
- No equipment shopping.
- No party or GM flow.
- No image upload.
- No localStorage guest draft claiming unless separately approved.
- No backend migrations unless the current create/detail contract proves insufficient.

## Backend Create Contract

Certain: backend `POST /characters` requires authentication and derives ownership from the session.

The request must include:

```json
{
  "name": "string",
  "className": "string",
  "subclassName": null,
  "level": 1,
  "ancestry": "Human",
  "background": "string",
  "abilityScores": {
    "strength": 16,
    "dexterity": 11,
    "constitution": 15,
    "intelligence": 9,
    "wisdom": 13,
    "charisma": 14
  },
  "hitPoints": {
    "current": 12,
    "max": 12
  },
  "armorClass": 19,
  "speedFt": 30,
  "referencePayload": {}
}
```

Rules:

- `ownerSubjectId` must not be sent.
- `referencePayload` must be a JSON object.
- `level` must be 1 through 20.
- HP, AC, and speed must be non-negative.
- `hitPoints.current` must be less than or equal to `hitPoints.max`.

## Generated Build Data

### Strength melee Fighter

Exact generated values:

- Name: user-entered. Default suggestion: `Aldren Vale` if a placeholder is needed.
- Class: `Fighter`.
- Build label: `Strength melee Fighter`.
- Subclass: none at level 1, saved as `null`.
- Level: `1`.
- Ancestry: `Human`.
- Background: `Soldier`.
- Ruleset: D&D 5E 2014.
- Ability scores: Strength 16, Dexterity 11, Constitution 15, Intelligence 9, Wisdom 13,
  Charisma 14.
- HP: 12 current, 12 maximum.
- AC: 19.
- Speed: 30 ft.
- Proficiency bonus: +2.
- Initiative: +0.
- Passive Perception: 11.
- Saving throw proficiencies: Strength, Constitution.
- Skill proficiencies: Athletics, Intimidation, Perception, Survival.
- Armor: chain mail, shield.
- Main weapon: longsword and shield.
- Backup/ranged weapon: javelin.
- Fighting Style: Defense.
- Level 1 class feature: Second Wind.

Main actions:

- Longsword: Action, +5 to hit, 1d8 + 3 slashing.
- Javelin: Action, +5 to hit, 1d6 + 3 piercing, range 30 / 120 ft.

Review highlights:

- Strong front-line defender.
- AC 19 with chain mail, shield, and Defense.
- Longsword +5 to hit.
- Second Wind for a small self-heal once per short rest.

### Dexterity archer Fighter

Exact generated values:

- Name: user-entered. Default suggestion: `Lysa Thorn` if a placeholder is needed.
- Class: `Fighter`.
- Build label: `Dexterity archer Fighter`.
- Subclass: none at level 1, saved as `null`.
- Level: `1`.
- Ancestry: `Human`.
- Background: `Outlander`.
- Ruleset: D&D 5E 2014.
- Ability scores: Strength 11, Dexterity 16, Constitution 15, Intelligence 9, Wisdom 14,
  Charisma 13.
- HP: 12 current, 12 maximum.
- AC: 14.
- Speed: 30 ft.
- Proficiency bonus: +2.
- Initiative: +3.
- Passive Perception: 14.
- Saving throw proficiencies: Strength, Constitution.
- Skill proficiencies: Acrobatics, Perception, Stealth, Survival.
- Armor: leather armor.
- Main weapon: longbow.
- Backup weapon: shortsword.
- Fighting Style: Archery.
- Level 1 class feature: Second Wind.

Main actions:

- Longbow: Action, +7 to hit, 1d8 + 3 piercing, range 150 / 600 ft.
- Shortsword: Action, +5 to hit, 1d6 + 3 piercing.

Review highlights:

- Accurate ranged Fighter.
- Longbow +7 to hit with Archery.
- AC 14 with leather armor.
- Second Wind for a small self-heal once per short rest.

## CharacterSheetV1 Mapping

Generated characters should map to `CharacterSheetV1` as follows:

- `schemaVersion`: `CharacterSheetV1`.
- `ruleset.system`: `dnd5e`.
- `ruleset.version`: `2014`.
- `ruleset.sourceStatus`: `draft`.
- `identity.name`: user-entered name.
- `identity.ancestry`: `Human`.
- `identity.background`: generated background.
- `identity.classes`: one Fighter level 1 entry with no subclass.
- `identity.concept`: short beginner build description.
- `summary.displayLine`: `Human Fighter - Level 1`.
- `summary.supportingLine`: `<Build label> - <Background>`.
- `summary.landingConcept`: one-sentence build summary.
- `summary.featuredAbilities`: main attack, fighting style, Second Wind.
- `summary.referenceSections`: Actions open by default, Features closed, no Spells section unless
  the mapper tolerates empty spell sections.
- `abilities.scores`: exact generated scores.
- `combat.hitPoints`: generated HP plus `temporary: 0`.
- `combat.armorClass.value`: generated AC.
- `combat.initiative`: generated initiative.
- `combat.speed`: one walk speed at 30 ft.
- `combat.proficiencyBonus`: 2.
- `combat.passivePerception.value`: generated passive Perception.
- `combat.concentration`: `null`.
- `proficiencies`: generated saves, skills, weapons, armor, tools, and languages.
- `actions`: generated main and backup attacks.
- `features`: Fighting Style and Second Wind with `includeInReference: true`.
- `spellcasting`: `null`.
- `equipment`: generated armor, weapons, pack/gear notes, tools, languages, and empty currency.
- `personality`: empty arrays or a small beginner note.
- `audit`: fixed-build source note and deferred full-rules warning.

## Reference Payload

`referencePayload` should be the complete `CharacterSheetV1` object.

It should not be a second, custom reference-only shape. Character Reference should receive saved
characters by validating or narrowing `referencePayload` to `CharacterSheetV1`, then using
`characterSheetToReference`.

If `referencePayload` is missing or not `CharacterSheetV1`, the saved detail view should show a
clear fallback error instead of crashing.

## Review Step

Use a review step before save.

The review step should show:

- editable or confirmable name;
- selected build label;
- Human Fighter, level 1;
- background;
- HP;
- AC;
- speed;
- main attack;
- Fighting Style;
- Second Wind;
- short note that this is a fixed beginner build, not full rules generation.

The primary action should be `Save character` for signed-in users.

## Signed-out Behavior

Recommendation: allow signed-out users to complete the quiz and see the review preview, but require
sign-in before saving.

Signed-out review behavior:

- Do not call `POST /characters`.
- Show a sign-in or create-account call to action near the save area.
- Explain that an account is required to save across devices and show the character in My
  characters.
- Preserve the current in-memory draft while the user remains in the flow.
- Defer localStorage draft persistence and post-login migration unless separately approved.

Security note: this follows `docs/course-rubric.md` section 4 by keeping ownership server-side and
not inventing unauthenticated server saves.

## Save Errors

Save errors should:

- keep the review data intact;
- show a concise inline error near the save button;
- allow retry;
- treat 401 as session expired or sign-in required;
- show backend validation messages when available;
- show a generic friendly message for network or server failures.

No duplicate character should be created by repeated clicks while a save is in progress. Disable the
save button during the in-flight request.

## My Characters Appearance

After successful save, the character should appear in My characters using the existing summary
fields:

- name;
- `Fighter - Level 1` class line, with no subclass;
- `Human - Soldier` or `Human - Outlander`;
- HP 12/12;
- AC 19 for Strength melee Fighter or AC 14 for Dexterity archer Fighter;
- Speed 30 ft.

The saved character should be visible after navigation back home or after a list refresh.

## Character Reference Opening

Saved character cards should be actionable.

Opening a generated Fighter should:

- route to a saved character detail path such as `/characters/:id`;
- call authenticated `GET /characters/{id}`;
- reject or show an error for unauthenticated access;
- read `referencePayload` as `CharacterSheetV1`;
- render Character Reference through `characterSheetToReference`;
- preserve Mara sample behavior at `/characters/sample`.

## Acceptance Criteria For Future Implementation

- User can complete Help me choose and choose either supported Fighter build.
- User sees a review step before save.
- Signed-in user can save the generated character.
- Signed-out user can preview but is prompted to sign in before saving.
- Save error does not lose the generated character.
- Saved generated character appears in My characters.
- Saved generated character opens in Character Reference.
- No backend migration is required unless the existing contract blocks this flow.
- No full D&D rules generator is implied by UI copy or code structure.
