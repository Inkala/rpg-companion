# T-010 Requirements: Manual character entry

## Problem

Many first Hunin testers already have D&D characters. They need a fast way to transfer a paper,
PDF, or external character sheet into Hunin without being forced through guided character creation.

The first manual entry version should save enough structured data to:

- identify the character in My characters;
- open a useful Character Reference;
- later share the full sheet with a GM;
- avoid database migrations by using the current character persistence contract.

## Goals

- Add a future `Fill the sheet myself` path inside `Create character`.
- Support existing character transfer, not full rules-authoring.
- Use `CharacterSheetV1` as the rich sheet shape.
- Save through the current authenticated `POST /characters` contract when implementation happens.
- Keep rich detail in `referencePayload` so no migration is needed for the first version.
- Make manual entry tolerant of incomplete real sheets.
- Keep guided Help me choose separate, narrower, and more curated.

## Non-goals

- No code implementation in this task.
- No automatic PDF parsing, OCR, file upload, or import pipeline.
- No Ninea app fixture.
- No full D&D rules engine.
- No automatic validation of every class, spell, equipment, or feature rule.
- No image upload or storage.
- No full inventory shop.
- No level-up flow.
- No full multiclass editor in the first version.
- No party linking in the first manual entry slice.
- No backend migrations unless a later task proves they are needed.

## First Manual-entry Support

Manual entry V1 should support:

- Any class name as text.
- Optional subclass name as text.
- Level 1 through 20.
- Any ancestry/species name as text.
- Any background name as text.
- Optional alignment.
- Optional concept note.
- Six ability scores.
- Hit points: current and maximum.
- Armor Class.
- Speed.
- Proficiency bonus, stored inside `CharacterSheetV1`.
- Optional initiative and passive Perception.
- Optional saving throws.
- Optional skills.
- Optional attacks and actions as repeatable rows.
- Optional features and traits as repeatable rows.
- Optional spellcasting summary and spells.
- Optional equipment summary, weapons, armor, tools, languages, and currency.
- Optional personality, story, and notes.
- Review screen before save.
- Authenticated save later through `POST /characters`.

## Required Fields

Required because the current backend requires them:

- Character name.
- Class name.
- Level.
- Ancestry/species.
- Background.
- Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma scores.
- HP current and HP maximum.
- Armor Class.
- Speed in feet.
- `referencePayload` JSON object.

Recommended product-required for manual entry V1:

- Ruleset version, defaulting to D&D 5E 2014 unless marked unknown or mixed.
- Proficiency bonus.
- At least one reference-worthy section or note before showing a meaningful Character Reference.

## Optional Fields

Optional in V1:

- Subclass.
- Alignment.
- Character concept.
- Portrait placeholder.
- Initiative.
- Passive Perception.
- Saving throw proficiencies and modifiers.
- Skills and modifiers.
- Attacks, actions, bonus actions, reactions, and passive abilities.
- Features, traits, resources, and usage notes.
- Spellcasting ability, spell save DC, spell attack bonus, slots, and spell list.
- Equipment, currency, tools, languages, and treasure.
- Personality traits, ideals, bonds, flaws, backstory, allies, and freeform notes.
- Audit/source notes.

## Validation Requirements

Manual entry should validate form shape, not D&D correctness.

- Required text fields must not be blank.
- Level must be between 1 and 20.
- Ability scores should be numeric and within a conservative accepted range. Recommended: 1 through
  30 for manual entry V1.
- HP, AC, speed, and proficiency bonus must be non-negative numbers.
- HP current must not exceed HP maximum.
- Repeatable rows may be blank while editing but should be omitted from the saved payload if empty.
- Inline errors should follow T-005 form and accessibility guidance.

## Persistence Requirements

Save without migration by mapping:

- backend top-level required fields to the current `POST /characters` request;
- rich sheet data to `referencePayload` as `CharacterSheetV1`.

Do not add new top-level request fields to the backend for V1 manual entry.

## Acceptance Criteria For Future Implementation

The eventual user-visible implementation is acceptable when:

- User can open `Create character` and choose `Fill the sheet myself`.
- User can complete required fields and review the character before saving.
- Optional sections can be skipped.
- Authenticated user can save through the current character API.
- The saved response can open Character Reference.
- Guest save remains disabled or preview-only unless guest persistence is separately approved.
- Manual entry does not imply that Hunin validates all D&D rules.
- Mara sample still works.
- Ninea is not committed as an app fixture.
