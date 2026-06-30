# T-003 Requirements

## Problem

New or occasional D&D players face too many choices before they can make a usable character. Hunin
needs a first guided creation slice that proves the product direction without becoming a full rules
engine.

## Goals

- A player can make one valid level-1 Fighter through a guided flow.
- An authenticated player can save the created character through the existing owner-scoped character
  API.
- After saving, the player can open the created character in Character Reference.
- A guest can complete and view an in-memory draft later, but cannot save in the first slice.
- The UI design can later support guest localStorage drafts through a `DraftStore` abstraction
  without redesigning the creation flow.
- New creation code stays under `frontend/src/character-creation/`.
- Reusable character API, data types, and reference rendering move toward `frontend/src/characters/`.
- `App.tsx` remains a coordinator rather than becoming the feature implementation.

## Non-Goals

- No all-classes character builder.
- No subclasses.
- No spells.
- No feats.
- No multiclassing.
- No rolling ability scores.
- No point buy.
- No custom equipment shop.
- No guest draft claiming.
- No localStorage persistence in the first implementation slice.
- No `GET /characters` list endpoint.
- No character list or saved-character home.
- No party linking.
- No changes to Mara Velard as part of this planning task.

## Supported D&D Choice Set

Rules version:

- D&D 5E 2014.

Character level:

- Level 1 only.

Class:

- Fighter only.

Ancestry:

- Human only.

Backgrounds:

- Soldier.
- Outlander.

Guided builds:

- Strength melee Fighter.
- Dexterity archer Fighter.

Ability scores:

- Standard-array-derived presets only.
- No rolling.
- No point buy.

Subclass:

- None. Fighter has no subclass at level 1.

Spells:

- None.

## Derived Rules

The app derives:

- ability modifiers,
- proficiency bonus,
- hit point maximum and current hit points,
- armor class,
- speed,
- attack bonus and damage summaries,
- equipment summary,
- Second Wind quick-reference content,
- applicable Fighting Style quick-reference content.

The app fixes:

- Level: 1.
- Class: Fighter.
- Ancestry: Human.
- Speed: 30 ft.
- Proficiency bonus: +2.

These values include the D&D 5E 2014 Human +1 bonus to every ability score.

Fixed presets:

- Strength melee Fighter:
  - Final ability scores:
    - Strength 16
    - Dexterity 14
    - Constitution 15
    - Intelligence 11
    - Wisdom 13
    - Charisma 9
  - Proficiency bonus: +2.
  - Hit points: 12.
  - Fighting Style: Defense.
  - Equipment summary: chain mail, shield, longsword, explorer's pack or equivalent concise summary.
  - Armor Class: 19.
  - Primary attack: longsword.
  - Attack bonus: +5.
  - Damage: 1d8+3.
  - Optional versatile note: 1d10+3 two-handed.
  - Feature: Second Wind.

- Dexterity archer Fighter:
  - Final ability scores:
    - Strength 11
    - Dexterity 16
    - Constitution 15
    - Intelligence 9
    - Wisdom 13
    - Charisma 14
  - Proficiency bonus: +2.
  - Hit points: 12.
  - Fighting Style: Archery.
  - Equipment summary: leather armor, longbow, arrows, shortsword, explorer's pack or equivalent
    concise summary.
  - Armor Class: 14.
  - Primary attack: longbow.
  - Attack bonus: +7.
  - Damage: 1d8+3.
  - Backup attack: shortsword.
  - Backup attack bonus: +5.
  - Backup damage: 1d6+3.
  - Feature: Second Wind.

## Required Behavior

### Creation Flow

1. Entry
   - User selects `Create a character` from the landing page or equivalent app entry.
   - Mara Velard guest demo remains available and unchanged.

2. Basics
   - Character name is required.
   - Short concept or note is optional.

3. Guided build
   - User chooses between Strength melee Fighter and Dexterity archer Fighter.
   - Each option uses plain-language guidance and avoids assuming the player already knows D&D terms.

4. Background
   - User chooses Soldier or Outlander.
   - Each option has a short practical description.

5. Review
   - User sees the derived character summary before saving.
   - Review includes HP, AC, speed, ability scores, attacks, equipment summary, Second Wind, and
     Fighting Style.

6. Guest behavior
   - Guest can complete the guided creation flow.
   - Guest can open a temporary in-memory Character Reference preview.
   - Guest save is disabled.
   - Guest save affordance explains that an account is required to save.
   - Guest cannot save, recover, transfer, claim, or list the draft.
   - Refreshing or leaving the app loses the draft in this first slice.
   - No guest draft claiming is implemented.
   - No localStorage persistence is implemented in the first slice.

7. Authenticated behavior
   - Authenticated user can save.
   - Save uses existing authenticated `POST /characters`.
   - Backend assigns ownership from the authenticated session.
   - On successful save, the UI opens Character Reference directly from the successful create
     response.
   - The UI does not make a follow-up `GET /characters/{id}` just to display the character
     immediately after saving.
   - Read uses existing authenticated `GET /characters/{id}` when a persisted read is needed.

## Draft Data Model

The draft should be serializable and versioned:

```text
CharacterCreationDraftV1
- version
- status
- name
- conceptNote
- buildChoice
- backgroundChoice
- touchedFields
```

The draft should not store derived values as source of truth. Derived character payload should be
computed from the draft and option data.

## Saved Character Payload

The derived payload must match the existing `POST /characters` contract:

```text
- name
- className
- subclassName
- level
- ancestry
- background
- abilityScores
- hitPoints
- armorClass
- speedFt
- referencePayload
```

The client must not send `ownerSubjectId`.

`referencePayload` should include enough structured content for Character Reference:

```text
- actions
- features
- spells
- equipmentSummary
- derivedStats
```

Spells should be an empty list for this slice.

## Acceptance Criteria

The eventual user-visible implementation is acceptable when:

- A user can start the guided creation flow from the app shell.
- The flow supports only the approved Fighter-only option set.
- Character name is required and validated near the field.
- User can choose Strength melee Fighter or Dexterity archer Fighter.
- User can choose Soldier or Outlander.
- Review shows all minimum derived character data.
- Guest can complete the flow and view a temporary in-memory Character Reference preview, but cannot
  save.
- Guest save-disabled state explains that an account is required.
- Refreshing or leaving the app loses the guest draft.
- Authenticated user can save through `POST /characters`.
- Saved character opens in Character Reference directly from the successful create response.
- Mara Velard guest demo still works.
- No `GET /characters` list endpoint is required.
- App code remains organized so creation logic lives under `frontend/src/character-creation/`.
- `App.tsx` coordinates routes/views and does not own the creation implementation.

## Open Questions

- Whether created characters use a generic generated portrait placeholder or no portrait in the
  first slice.
- Whether route state or a simple in-app view state is enough before a router is introduced.
