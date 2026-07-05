# T-009 Design: CharacterSheetV1

## Naming

Use `CharacterSheetV1` for the rich app/domain model.

Do not call this model `referencePayload` in product docs. The backend may store the model inside a
JSONB column currently named `reference_payload`, but that name is a storage detail.

## Proposed JSON structure

```json
{
  "schemaVersion": "CharacterSheetV1",
  "ruleset": {
    "system": "dnd5e",
    "version": "2014",
    "sourceStatus": "audited-sample"
  },
  "identity": {
    "name": "Mara Velard",
    "ancestry": "Human",
    "background": "Outlander",
    "alignment": "Neutral Good",
    "classes": [
      {
        "name": "Ranger",
        "level": 3,
        "subclass": "Hunter"
      }
    ],
    "concept": "A calm wilderness scout and practical guide."
  },
  "summary": {
    "displayLine": "Human Ranger - Level 3",
    "supportingLine": "Hunter - Outlander",
    "listBadges": ["Ranger 3", "No party"],
    "portraitAssetId": "mara-vale-portrait"
  },
  "abilities": {
    "scores": {
      "strength": 10,
      "dexterity": 16,
      "constitution": 14,
      "intelligence": 10,
      "wisdom": 14,
      "charisma": 8
    }
  },
  "combat": {
    "hitPoints": {
      "current": 26,
      "max": 26,
      "temporary": 0
    },
    "armorClass": 14,
    "initiative": 3,
    "speed": [
      {
        "type": "walk",
        "feet": 30
      }
    ],
    "proficiencyBonus": 2,
    "passivePerception": 14,
    "concentration": null
  },
  "proficiencies": {
    "savingThrows": [],
    "skills": [
      {
        "name": "Perception",
        "proficient": true,
        "modifier": 4,
        "needsConfirmation": true
      }
    ],
    "weapons": [],
    "armor": [],
    "tools": [],
    "languages": []
  },
  "actions": [
    {
      "id": "longbow",
      "name": "Longbow",
      "kind": "attack",
      "actionType": "Action",
      "attackBonus": 7,
      "damage": [
        {
          "dice": "1d8",
          "bonus": 3,
          "type": "piercing"
        }
      ],
      "range": {
        "normal": 150,
        "long": 600
      },
      "summary": "Reliable ranged attack."
    },
    {
      "id": "shortsword",
      "name": "Shortsword",
      "kind": "attack",
      "actionType": "Action",
      "attackBonus": 5,
      "damage": [
        {
          "dice": "1d6",
          "bonus": 3,
          "type": "piercing"
        }
      ],
      "summary": "A close-range backup weapon."
    }
  ],
  "features": [
    {
      "id": "archery",
      "name": "Archery",
      "category": "Fighting Style",
      "source": {
        "rulesVersion": "2014",
        "status": "confirm"
      },
      "tags": ["Passive"],
      "summary": "+2 to ranged weapon attack rolls.",
      "reference": {
        "include": true,
        "note": "This bonus is already included in Mara's longbow attack bonus."
      }
    },
    {
      "id": "colossus-slayer",
      "name": "Colossus Slayer",
      "category": "Hunter feature",
      "source": {
        "rulesVersion": "2014",
        "status": "confirm"
      },
      "tags": ["Once per turn"],
      "summary": "Add 1d8 after hitting an already wounded enemy.",
      "reference": {
        "include": true,
        "reminder": "The enemy must be below its hit point maximum before the hit.",
        "details": "The bonus applies once per turn, not once per attack."
      }
    }
  ],
  "spellcasting": {
    "ability": "wisdom",
    "spellSaveDC": null,
    "spellAttackBonus": null,
    "slots": [
      {
        "level": 1,
        "max": 3,
        "used": 0
      }
    ],
    "spells": [
      {
        "id": "hunters-mark",
        "name": "Hunter's Mark",
        "level": 1,
        "castingTime": "Bonus Action",
        "duration": "Up to 1 hour",
        "concentration": true,
        "preparedOrKnown": "known"
      },
      {
        "id": "fog-cloud",
        "name": "Fog Cloud",
        "level": 1,
        "castingTime": "Action",
        "duration": "Up to 1 hour",
        "concentration": true,
        "preparedOrKnown": "known"
      },
      {
        "id": "cure-wounds",
        "name": "Cure Wounds",
        "level": 1,
        "castingTime": "Action",
        "duration": "Instantaneous",
        "concentration": false,
        "preparedOrKnown": "known"
      }
    ]
  },
  "equipment": {
    "armor": [
      {
        "name": "Leather armor",
        "needsConfirmation": true
      }
    ],
    "weapons": ["Longbow", "Shortsword"],
    "packsAndGear": [],
    "currency": null
  },
  "personality": {
    "traits": [],
    "ideals": [],
    "bonds": [],
    "flaws": [],
    "notes": []
  },
  "audit": {
    "source": "Current Mara fixture plus generated sheet warning",
    "questions": [
      "Confirm Mara's full skill list and saving throw proficiencies.",
      "Confirm the armor source for AC 14.",
      "Confirm spell save DC and spell attack bonus.",
      "Confirm equipment, inventory, languages, and tools.",
      "Confirm that no D&D 2024 Ranger wording is included."
    ]
  }
}
```

## Model guidance

`CharacterSheetV1` should be structured around app use cases, not around a paper sheet layout.

- Keep source character facts close to the area that uses them.
- Keep derived display summaries available when they are useful.
- Mark uncertain values with audit metadata instead of silently treating them as facts.
- Do not encode every D&D rule. Store enough structured data for Hunin to display, summarize, and
  explain the character.
- Prefer arrays of typed entries for extensible areas such as actions, features, spells, and
  equipment.

## Backend persistence decision

The backend should keep explicit relational columns for:

- `id`
- owner identity
- `name`
- class, subclass, and level
- ancestry
- background
- ability scores
- hit points
- armor class
- speed
- timestamps

These columns support ownership, list views, future search/filtering, and common summary cards.

The backend should keep rich details inside `CharacterSheetV1` JSON:

- actions and attacks
- skills and saving throws
- equipment and inventory
- spells and spellcasting metadata
- features and traits
- personality, story, and notes
- audit/source notes
- Character Reference ordering and quick-reference details

No migration is part of T-009. Future implementation can continue storing `CharacterSheetV1` in the
existing JSONB field until a concrete reason appears to add or change columns.

## Mara audit

### Reliable values

These values are already present in the current Mara sample and look plausible for the intended
sample:

- Name: Mara Velard.
- Ancestry: Human.
- Class: Ranger.
- Subclass: Hunter.
- Level: 3.
- Background: Outlander.
- Alignment: Neutral Good.
- Concept: calm wilderness scout and practical guide.
- Hit points: 26 / 26.
- Temporary hit points: none.
- Armor Class: 14, pending armor confirmation.
- Speed: 30 ft.
- Proficiency bonus: +2.
- Initiative: +3.
- Passive Perception: 14, pending skill confirmation.
- Ability scores: STR 10, DEX 16, CON 14, INT 10, WIS 14, CHA 8.
- Longbow: +7 to hit, 1d8 + 3 piercing, range 150 / 600 ft.
- Shortsword: +5 to hit, 1d6 + 3 piercing.
- Archery as a fighting style.
- Colossus Slayer as a Hunter feature.
- Hunter's Mark, Fog Cloud, and Cure Wounds as sample spells.

### Suspicious or incomplete values

- AC 14 is plausible for leather armor plus DEX +3, but the armor source must be confirmed.
- Passive Perception 14 implies Perception proficiency with WIS +2, but the full skill list is not
  modeled yet.
- Saving throw proficiencies are missing.
- Spell save DC and spell attack bonus are missing.
- Equipment, inventory, tools, languages, currency, and personality fields are incomplete.
- Ranger 3 should have additional 2014 Ranger features. The sample may intentionally hide some, but
  that decision should be explicit.

### D&D 2014 vs 2024 mismatches to watch

The current repo sample mostly reads like a D&D 5E 2014 Ranger sample. The uploaded/generated sheet
must still be audited for 2024 wording or mechanics.

Flag and correct or defer:

- 2024 Ranger class-feature wording.
- Hunter's Mark represented as a 2024 Ranger class feature instead of a spell.
- Weapon Mastery or other 2024-only mechanics.
- 2024 terminology that changes mechanics rather than just labels.
- Any mixed 2014 and 2024 progression assumptions.

Do not silently mix 2014 and 2024 rules.

### Values needing manual confirmation

- Final skills and skill modifiers.
- Saving throw proficiencies.
- Armor and AC source.
- Equipment, inventory, tools, languages, and currency.
- Spell save DC and spell attack bonus.
- Exact spell list and slot count.
- Which 2014 Ranger features appear in Hunin's sample reference.
- Whether Mara remains Ranger 3 Hunter long term.

### Corrections needed before Mara becomes a fixture

- Add explicit `ruleset.version: "2014"`.
- Add audit/source notes for any generated-sheet values.
- Confirm or remove suspicious sheet content.
- Fill or intentionally omit skills, saves, equipment, spellcasting numbers, and Ranger features.
- Keep Mara original and setting-neutral.
- Keep Ninea Crowny out of app fixtures.

## Character Reference mapping

`CharacterSheetV1` should map into the existing `CharacterReferenceViewModel` through a pure mapper.

Mapping:

- `identity.name` -> character heading.
- `summary.displayLine` -> identity line.
- `summary.supportingLine` -> supporting identity.
- `summary.portraitAssetId` -> known local portrait asset when available.
- `combat.hitPoints`, `combat.armorClass`, `combat.speed`, `combat.concentration` -> stat strip.
- `combat.initiative`, `combat.passivePerception`, `combat.proficiencyBonus` -> secondary stats.
- `actions` with `actionType: "Action"` -> Actions section.
- `features` with `reference.include: true` -> Features section.
- `spellcasting.spells` -> Spells section.

Visible sections for current Mara:

- Actions, expanded by default.
- Features, collapsed by default.
- Spells, collapsed by default.

Future sections:

- Bonus Actions.
- Reactions.
- Skills and Saves.
- Equipment.
- Resources.
- Personality and Story.
- Notes.

Empty future sections should not render in the normal Character Reference view.

## Future `GET /characters` impact

Future `GET /characters` should return character summaries only.

Recommended summary response fields:

- id
- name
- ancestry
- class name
- subclass name
- level
- background
- hit point summary
- armor class
- speed
- party association when party data exists
- portrait/list badge summary if approved
- created and updated timestamps

Do not return full `CharacterSheetV1` or the full stored JSON payload in list responses.

`GET /characters/{id}` remains the full-detail endpoint and should include `CharacterSheetV1`.

## Task breakdown

1. Define docs model.
   - Scope: this task.
   - Output: approved `CharacterSheetV1` requirements and design.
   - Parallel-work classification: Green.

2. Create corrected Mara fixture.
   - Scope: replace or supplement current static Mara data with an audited `CharacterSheetV1`
     fixture.
   - Expected files: `frontend/src/characters/` sample data and focused tests.
   - Parallel-work classification: Yellow.

3. Add frontend types.
   - Scope: define `CharacterSheetV1` TypeScript types.
   - Expected files: `frontend/src/characters/`.
   - Parallel-work classification: Yellow.

4. Map rich JSON to Character Reference.
   - Scope: pure mapper from `CharacterSheetV1` to `CharacterReferenceViewModel`.
   - Expected files: character reference mapper and tests.
   - Parallel-work classification: Yellow.

5. Later backend validation if needed.
   - Scope: optionally validate `schemaVersion` and minimum required JSON shape.
   - Expected files: backend character validation and tests.
   - Parallel-work classification: Yellow.

6. Later `GET /characters`.
   - Scope: owner-scoped summary endpoint that excludes full detail JSON.
   - Expected files: backend character handler/repository tests and frontend API client.
   - Parallel-work classification: Yellow.

## Open questions

- What are Mara's final skills, saves, equipment, spells, tools, languages, and currency?
- Does Mara remain Ranger 3 Hunter?
- Which 2014 Ranger features are included in the app sample?
- How much rules validation does Hunin own versus treating user-entered sheet data as user-managed
  facts?
- Should audit metadata ship in production fixtures, or only live in source fixtures and docs?
- Should Character Reference section ordering live in `CharacterSheetV1`, in the mapper, or in a
  separate presentation config?
