# T-010 Design: Fill the sheet myself

## Design Verdict

Build manual entry as a transfer flow, not a builder.

The first version should accept the player's existing sheet as user-managed facts. Hunin should help
organize those facts into `CharacterSheetV1` and Character Reference. It should not try to prove
that every value is legal D&D.

## Flow

### 1. Creation Mode

Entry point:

- `Create character`.

Mode choices:

- `Fill the sheet myself`.
- `Help me choose`.

`Fill the sheet myself` copy should frame the path as transfer:

```text
Use this when you already have a character sheet and want to bring it into Hunin.
```

### 2. Basics

Fields:

- Name, required.
- Level, required.
- Class, required.
- Subclass, optional.
- Ancestry/species, required.
- Background, required.
- Alignment, optional.
- Concept, optional.

The class, subclass, ancestry, and background fields can start as text inputs. Curated dropdowns can
come later after Hunin has a rules-data source.

### 3. Ability Scores

Fields:

- Strength.
- Dexterity.
- Constitution.
- Intelligence.
- Wisdom.
- Charisma.

Show derived modifiers in the UI when practical, but save the entered scores as source values.

### 4. Combat Stats

Fields:

- HP current.
- HP maximum.
- Armor Class.
- Speed.
- Proficiency bonus.
- Initiative, optional.
- Passive Perception, optional.

Store HP, AC, and speed both in backend top-level fields and in `CharacterSheetV1.combat` where
needed for reference mapping.

### 5. Skills And Saves

Start simple:

- Saving throw names with optional proficiency and modifier.
- Skill names with optional proficiency and modifier.

Do not require the first version to auto-calculate every modifier.

### 6. Actions And Attacks

Repeatable rows:

- Name.
- Action type.
- Attack bonus, optional.
- Damage, optional.
- Range, optional.
- Summary, optional.
- Quick reminder, optional.

This section should support weapons, spells used as actions, and custom abilities without forcing a
rules taxonomy too early.

### 7. Features, Traits, And Resources

Repeatable rows:

- Name.
- Category, optional.
- Tags, optional.
- Summary.
- Uses or resource note, optional.
- Rest recovery note, optional.
- Quick reminder, optional.

### 8. Spells

Show only if the user enables spellcasting.

Spellcasting fields:

- Spellcasting ability.
- Spell save DC.
- Spell attack bonus.
- Slot summary.

Spell rows:

- Name.
- Level.
- Casting time.
- Duration.
- Concentration.
- Prepared or known.
- Summary.

The first version may store spell slots as a simple list and defer tracking current usage.

### 9. Equipment And Story

Fields:

- Armor.
- Weapons.
- Gear summary.
- Tools.
- Languages.
- Currency.
- Personality traits.
- Ideals.
- Bonds.
- Flaws.
- Backstory.
- Notes.

This step should remain optional and skippable.

### 10. Review And Save

Review should show:

- identity summary;
- HP, AC, speed, proficiency bonus;
- ability scores;
- attacks/actions count;
- features count;
- spells count when present;
- Character Reference preview entry.

Authenticated save uses `POST /characters`. Guest behavior should remain preview-only or disabled
until a separate guest draft persistence task is approved.

## CharacterSheetV1 Sections Needed First

Manual entry V1 should populate:

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

The Character Reference mapper should initially render only useful non-empty sections. Recommended
first visible order:

1. Overview.
2. Combat.
3. Actions / Attacks.
4. Features & Traits.
5. Skills & Saves.
6. Spells, when present.
7. Equipment.
8. Personality / Story.
9. Notes.

## Migration-free Save Mapping

Current backend top-level fields:

- `name`
- `className`
- `subclassName`
- `level`
- `ancestry`
- `background`
- `abilityScores`
- `hitPoints`
- `armorClass`
- `speedFt`
- `referencePayload`

Manual entry should map rich data into `referencePayload`:

- ruleset;
- alignment;
- concept;
- proficiency bonus;
- initiative;
- passive Perception;
- skills and saves;
- actions and attacks;
- features and traits;
- spellcasting;
- equipment;
- personality, story, and notes;
- source/audit metadata.

## Difference From Help Me Choose

Manual entry:

- accepts freeform user-entered sheet data;
- supports any class/species/background as text;
- validates only required fields, numeric ranges, and payload shape;
- does not promise rules correctness;
- is useful for existing characters and current party testers.

Help me choose:

- stays curated and beginner-friendly;
- derives values from approved option data;
- should remain narrow for the T-003 MVP;
- explains choices before the user commits;
- should not expose every manual sheet field at once.

## Deferred

Defer:

- PDF upload, OCR, or file import.
- Ninea as a committed fixture.
- Full rules validation.
- Rich multiclass editor.
- Full spell slot/resource tracking.
- Equipment shop and inventory weight.
- Portrait/image upload and storage.
- Guest draft claiming.
- Party linking.
- Level-up.
- Backend schema changes.
