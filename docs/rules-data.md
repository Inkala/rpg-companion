# Level-up rules data

Hunin uses one offline canonical rules snapshot for the bounded levels 1 through 5 level-up
contract. Frontend and backend rules tables are generated from the same JSON file. Neither runtime
calls an external rules API.

## Snapshot identity

- Canonical file: `rules-data/srd-5.1-2014-levels-1-5.json`
- JSON Schema: `rules-data/srd-5.1-2014-levels-1-5.schema.json`
- Snapshot ID: `srd-5-1-2014-levels-1-5-2026-07-18`
- Import date: 2026-07-18
- SHA-256: `bba41a17ab755905aa8027c06c29da9de1b5c560e0a37af00007301fc41a6c43`
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)

The checksum is committed in `rules-data/srd-5.1-2014-levels-1-5.sha256`. Run
`node scripts/generate-level-up-rules.mjs --check` to validate the schema, semantic references,
checksum, generated-file freshness, and the bounded progression invariants.

## Bounded contents

- 12 SRD classes: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue,
  Sorcerer, Warlock, and Wizard.
- 4 transitions per class: 1 to 2, 2 to 3, 3 to 4, and 4 to 5. Level 5 to 6 is absent.
- 60 class-level records, 94 base-class feature records, and 20 SRD subclass feature records.
- 11 class-choice rule identifiers and one SRD subclass option per class.
- 169 SRD spells through spell level 3: 24 cantrips, 49 level-1 spells, 54 level-2 spells, and 42
  level-3 spells.
- 44 bounded subclass spell memberships, including always-prepared and expanded-list membership.
- Full-caster, Paladin/Ranger half-caster, Warlock Pact Magic, known/prepared/replacement, and
  Wizard spellbook progression through class level 5.

The snapshot excludes spell levels 4 and above, non-SRD Player's Handbook content, paid-book
content, homebrew automation, multiclass progression, and every transition above level 5.

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

1. Download the documented 2014 records for all 12 classes, their class levels and SRD subclasses,
   and every spell whose level is 0 through 3.
2. Restrict class and subclass progression to class levels 1 through 5.
3. Resolve class feature, subclass feature, spell-list, subclass spell, and class-choice references.
4. Normalize indexes, ordering, spellcasting abilities, fixed-average HP, proficiency, slot tables,
   known/prepared formulas, replacement limits, Wizard additions, Pact Magic, and half-caster
   progression into the canonical schema.
5. Normalize whitespace and bound feature/spell summaries to the existing CharacterSheetV1 limits.
6. Sort arrays deterministically, validate exact references and expected record counts, compute the
   SHA-256, and generate TypeScript and Go representations.

The generator has no network behavior. Regeneration always reads the committed canonical JSON.

## Attribution

This work includes material from the System Reference Document 5.1 by Wizards of the Coast LLC,
available under the Creative Commons Attribution 4.0 International License.
