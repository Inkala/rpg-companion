# Canonical SRD rules data

Hunin uses one offline canonical rules snapshot for the bounded levels 1 through 5 Level Up and
structured character-creation contracts. Frontend and backend rules tables are generated from the
same JSON file. Neither runtime calls an external rules API.

## Snapshot identity

- Canonical file: `rules-data/srd-5.1-2014-levels-1-5.json`
- JSON Schema: `rules-data/srd-5.1-2014-levels-1-5.schema.json`
- Snapshot ID: `srd-5-1-2014-levels-1-5-2026-07-19`
- Schema version: 3
- Import date: 2026-07-19
- SHA-256: `cd02323779e76ccd65d0e41d07dc3fa23a91456f738e35d4b3cb083cc316494b`
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)

The checksum is committed in `rules-data/srd-5.1-2014-levels-1-5.sha256`. Run
`node scripts/generate-level-up-rules.mjs --check` and
`node scripts/generate-character-creation-rules.mjs --check` validate the schema, semantic
references, checksum, exact memberships and record counts, stable IDs, deterministic ordering,
generated-file freshness, frontend/backend parity, and bounded progression invariants.

## Bounded contents

- 12 SRD classes: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue,
  Sorcerer, Warlock, and Wizard.
- 4 transitions per class: 1 to 2, 2 to 3, 3 to 4, and 4 to 5. Level 5 to 6 is absent.
- 60 class-level records, 94 base-class feature records, and 20 SRD subclass feature records.
- 11 class-choice rule identifiers and one SRD subclass option per class.
- 169 SRD spells through spell level 3: 24 cantrips, 49 level-1 spells, 54 level-2 spells, and 42
  level-3 spells.
- Complete detail text for all 169 spells: description, higher-level text where present (51),
  material text where present (92), components, casting time, range, duration, concentration,
  ritual, school, class membership, and supported subclass membership.
- 44 bounded subclass spell memberships, including always-prepared and expanded-list membership.
- Full-caster, Paladin/Ranger half-caster, Warlock Pact Magic, known/prepared/replacement, and
  Wizard spellbook progression through class level 5. Every spellcasting level records
  `initialSpellbookSpells`: Wizard level 1 is exactly 6 and every other Class/level is 0. Wizard
  levels 2 through 5 each add exactly 2 spellbook spells. Initial known-spell acquisition levels
  permit 0 replacements, while later canonical known-spell levels permit at most 1.
- 9 SRD races and 4 supported SRD subraces, with base walking speed, ability bonuses, languages,
  traits, and explicit parent/subrace references.
- 38 SRD race-trait records with complete descriptions, Race/subrace memberships, proficiencies,
  and nested option references.
- 8 persistent Race and Race-trait creation choices: Dragonborn ancestry, Dwarf tool proficiency,
  Half-Elf ability bonuses, language, and Skill Versatility, High Elf cantrip and extra language,
  and Human extra language.
- 16 creation-only Class and subclass choices omitted from the unchanged T-026 Level Up projection:
  one level-4 Ability Score Improvement choice for each of the 12 Classes, College of Lore bonus
  proficiencies, Circle of the Land bonus cantrip, Hunter's Prey, and Draconic Ancestor. Each
  choice retains its canonical Class, required subclass where applicable, source-feature identity,
  exact count, and bounded option set. The level-4 bounded set permits one +2 ability increase, one
  package containing two distinct +1 ability increases, or the SRD Grappler feat.
- 237 SRD equipment records in the exact development-time source membership: 116 adventuring gear,
  13 armor records, 40 mounts and vehicles, 31 tools, and 37 weapons.
- Adventuring-gear subcategories: 4 ammunition, 5 arcane foci, 4 druidic foci, 7 equipment packs,
  3 holy symbols, 7 kits, and 86 standard-gear records.
- Mount and vehicle subcategories: 9 mounts and other animals, 25 tack/harness/drawn vehicles, and
  6 waterborne vehicles.
- Tool subcategories: 17 artisan's tools, 2 gaming sets, 10 musical instruments, and 2 other tools.
- Stable equipment IDs, categories, cost, weight, descriptions, pack contents, weapon damage and
  properties, armor and shield formulas, Strength requirements, stealth disadvantage, mount or
  vehicle speed and capacity, and source URLs where available.
- 10 stable calculation-rule IDs and 19 supported class, subclass, choice, and Race-trait feature
  modifiers for armor class, walking speed, initiative, maximum HP, and skill inputs.

Each normalized Race choice has a stable `id`, `sourceOwnerType`, `sourceOwnerIndex`, exact
`selectionCount`, `optionType`, sorted `allowedOptionIndexes` or an explicit `boundedRule`, optional
`optionValue`, and an `exclusivityConstraint` where selections must be distinct. Half-Elf ability
bonuses therefore retain exactly two distinct +1 selections from Constitution, Dexterity,
Intelligence, Strength, and Wisdom instead of losing the selectable bonuses during normalization.

The always-on derived-value audit covers every canonical Race, subrace, class, class-choice option,
and SRD subclass feature through level 5. It records Barbarian and Monk Unarmored Defense, Draconic
Resilience, all three Defense fighting-style choices, Barbarian Fast Movement, Monk Unarmored
Movement, Jack of All Trades initiative, Dwarven Toughness, Skill Versatility, Menacing, Keen
Senses, Bard and Rogue Expertise, College of Lore Bonus Proficiencies, and both Beguiling Influence
skill proficiencies. Barbarian Unarmored Defense permits a canonical equipped shield; Monk
Unarmored Defense and Unarmored Movement retain their shield restriction. The Dwarf Race record
also carries the machine-readable heavy-armor speed-penalty exception.

Context-only checks from Stonecunning, Artificer's Lore, Natural Explorer, and Dragon Ancestor do
not change general sheet skill or passive values and are not represented as always-on modifiers.
Temporary spell effects, activated combat effects, temporary HP, equipment proficiencies, and
movement modes other than base walking speed are also outside this derived-value modifier set.

The snapshot excludes spell levels 4 and above, non-SRD Player's Handbook content, paid-book
content, homebrew automation, multiclass progression, magic items, and every transition above
level 5. Manual `Other` equipment is outside canonical rules data and never acquires a derived-stat
effect by matching a canonical name or ID.

## Sources

Development-time source material:

- [Official SRD page](https://www.dndbeyond.com/srd/)
- [System Reference Document 5.1 Creative Commons PDF](https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf)
- [D&D 5e API documentation](https://5e-bits.github.io/docs/)
- [Documented 2014 API root](https://www.dnd5eapi.co/api/2014)
- [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)

The API was used only during development to obtain documented 2014 SRD records. The committed
snapshot, not the API, is the production rules authority.

## Transformation process

1. Preserve the T-026 class, progression, feature, choice, spell membership, and bounded summary
   behavior unchanged except for the approved correction that Warlocks retain two Eldritch
   Invocations at class level 4 and gain their third at class level 5. The additive
   `initialSpellbookSpells` field makes the existing Wizard
   starting spellbook rule authoritative for structured creation without changing Level Up output.
   Creation-only Class choices are projected separately and excluded from the T-026 behavioral
   projection.
2. Download the documented 2014 Race, subrace, equipment, and existing bounded spell-detail
   records during development only.
3. Require the exact source memberships before normalization: 9 races, 4 supported subraces, 237
   equipment records, and the same 169 bounded spell IDs already present in T-026.
4. Normalize stable indexes, parent references, speed and ability bonuses, the 8 bounded persistent
   Race choices, equipment categories, cost, weight, descriptions, pack contents, weapon and armor
   fields, tool and vehicle fields, and complete spell detail text.
5. Add stable calculation-rule and 19 supported modifier IDs. Validate every modifier source
   against a canonical Race trait, class feature, subclass feature, or class-choice option. Only
   canonical armor and shields carry equipment-derived calculation inputs. Manual equipment
   remains inert.
6. Sort arrays deterministically, validate exact references and expected record counts, validate
   the protected T-026 behavioral projection checksum with the approved T-025 corrections, compute
   the canonical SHA-256, and generate
   TypeScript and Go representations from the same JSON.

The generator has no network behavior. Its optional `--import-source <path>` mode reads an explicit
development-time source bundle. Normal regeneration and check mode always read the committed
canonical JSON.

## Attribution

This work includes material from the System Reference Document 5.1 by Wizards of the Coast LLC,
available under the Creative Commons Attribution 4.0 International License.
