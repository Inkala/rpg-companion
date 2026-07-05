# T-009 Requirements: CharacterSheetV1 model

## Problem

Hunin currently has a compact Character Reference sample and a backend that stores explicit core
character fields plus a JSON object. That is enough for the current sample and Fighter-only creation
slice, but not enough as a deliberate domain model for:

- transferring an existing character from a paper sheet;
- generating character detail from guided creation;
- supporting richer Character Reference sections;
- showing saved-character summaries without loading full character detail.

Before adding `GET /characters` or richer character-entry flows, Hunin needs a written
`CharacterSheetV1` JSON model.

## Goals

- Define `CharacterSheetV1` as the rich app-level character model name.
- Keep backend storage details separate from the product/domain name.
- Support D&D 5E 2014 unless a later project decision changes the ruleset.
- Use Mara Velard as the internal sample and later audited fixture candidate.
- Treat the uploaded/generated Mara sheet as a draft to audit, not a source of canonical truth.
- Support manual character entry from paper sheets.
- Support guided character creation output.
- Support Character Reference section generation.
- Support a future `GET /characters` summary endpoint.
- Preserve the existing backend direction: relational columns for core/listing fields, JSON for rich
  sheet detail.

## Non-goals

- No code implementation.
- No automatic PDF parsing, OCR, or upload/import pipeline.
- No full D&D rules engine.
- No Ninea Crowny app fixture.
- No database migration.
- No backend refactor.
- No frontend refactor.
- No changes to current Mara UI behavior.
- No requirement that every field from a paper sheet appears as a top-level JSON field.
- No final decision that backend must deeply validate all rules-specific data.

## Required model areas

`CharacterSheetV1` must include these top-level areas:

- `schemaVersion`
- `ruleset`
- `identity`
- `summary`
- `abilities`
- `combat`
- `proficiencies`
- `actions`
- `features`
- `spellcasting`
- `equipment`
- `personality`
- `audit`

## Backend persistence decision

Keep explicit relational columns for listing, search, ownership, and high-value summary data:

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

Keep rich details inside `CharacterSheetV1` JSON:

- actions and attacks
- skills and saving throws
- equipment and inventory
- spells and spellcasting metadata
- features and traits
- personality, story, and notes
- audit/source notes
- Character Reference ordering and quick-reference details

## Mara requirements

Mara Velard is the internal sample/audit candidate.

The task must record:

- reliable Mara values;
- suspicious or incomplete Mara values;
- possible D&D 2014 vs 2024 mismatches;
- values needing manual confirmation;
- corrections needed before Mara becomes a fixture.

Do not use Ninea Crowny as a fixture. Ninea may remain an information-architecture or later
real-user testing reference only.

## Character Reference requirements

The model must describe how `CharacterSheetV1` can map to `CharacterReferenceViewModel`.

The current Mara Character Reference should be generated from:

- identity and summary;
- combat stats;
- actions;
- features;
- spells.

Future Character Reference sections may use:

- skills and saves;
- equipment;
- resources;
- personality/story;
- notes.

## Future `GET /characters` requirements

The future list endpoint should return summaries only. It should not return full `CharacterSheetV1`
detail or the full backend JSON payload.

`GET /characters/{id}` remains the full-detail endpoint.

## Open questions

- What are Mara's final skills, saving throws, equipment, and spells?
- Does Mara remain Ranger 3 Hunter for the internal sample fixture?
- Which D&D 5E 2014 Ranger features should be included in the sample?
- How much rules validation should Hunin own in backend validation?
- Should `CharacterSheetV1` store derived values, source values, or both for fields like passive
  perception and spell save DC?
- Which Character Reference ordering metadata belongs in `CharacterSheetV1`, and which belongs in a
  frontend presentation mapper?
