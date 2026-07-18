# T-026 Design: Bounded Level-Up MVP

Status: approved

## Feasibility verdict

Feasible only as a tightly scoped levels 1-5 implementation on the completed T-024 baseline.
Supporting all 12 SRD classes through level 5 is possible with CharacterSheetV1, but it is
meaningfully larger than the previous Fighter-first plan.

CharacterSheetV1 can carry the result because it already contains class entries, level, abilities,
combat stats, proficiencies, actions, features, spellcasting, equipment, personality, and audit
metadata. The backend stores matching top-level columns plus the JSON payload and exposes
`updatedAt`.

The hard boundary is level 5. Characters above level 5 remain readable, but Level up is not offered.
Higher-level progression is deferred.

## Product rationale

Hunin's level-up MVP focuses on levels 1 through 5, where new and occasional players encounter their
class identity, subclass, first Ability Score Improvement, and major early progression choices.
Higher-level progression is deferred to a future release.

## Supported classes and transitions

Supported classes: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer,
Warlock, Wizard.

Supported transitions:

- level 1 to 2;
- level 2 to 3;
- level 3 to 4;
- level 4 to 5.

Unsupported:

- level 5 to 6 and above;
- level 20 handling beyond showing that level-up is unavailable;
- multiclassing;
- non-SRD classes/subclasses/features/spells;
- homebrew automation;
- paid-book content.

## CharacterSheetV1 field audit

| Field | Level-up classification | T-026 behavior |
|---|---|---|
| `schemaVersion` | retained unchanged | Must remain `CharacterSheetV1`. No V2 migration. |
| `ruleset.system` | retained unchanged | Must remain `dnd5e`. |
| `ruleset.version` | retained unchanged | Must remain compatible with 2014/SRD path. |
| `ruleset.sourceStatus` | suggestion requiring confirmation | Retain unless generated level-up content makes `needs-audit` more accurate. |
| `identity.name` | retained unchanged | No rename/editing. |
| `identity.ancestry` | retained unchanged | No race editing. |
| `identity.background` | retained unchanged | No background editing. |
| `identity.alignment` | retained unchanged | No alignment editing. |
| `identity.concept` | retained unchanged | No concept editing. |
| `identity.classes` | safely automatic | Exactly one class entry; increment level by 1. Reject multiclass and levels outside 1-4. |
| `identity.classes[].subclass` | player decision when required | Retain existing SRD subclass. Require SRD subclass selection when needed. Preserve non-SRD existing subclass as retained/manual. |
| `summary.displayLine` | safely automatic | Regenerate to match new level and retained identity. |
| `summary.supportingLine` | suggestion requiring confirmation | Retain or update for subclass addition. |
| `summary.landingConcept` | retained unchanged | No rewrite. |
| `summary.portraitAssetId` | retained unchanged | No portrait integration. |
| `summary.portraitAlt` | retained unchanged | No portrait integration. |
| `summary.featuredAbilities` | suggestion requiring confirmation | Add newly unlocked feature names after review. Preserve existing entries. |
| `summary.referenceSections` | suggestion requiring confirmation | Add `features` or `spells` section if new content requires it. |
| `abilities.scores.*` | player decision at level 4 | ASI allocation updates selected scores after review. Manual feat note leaves scores unchanged unless player edits. |
| `combat.hitPoints.max` | suggestion requiring confirmation | Suggest fixed-average class hit die plus Constitution modifier, or accept manual rolled HP. |
| `combat.hitPoints.current` | player confirmation | Default suggestion: increase current HP by the same amount as max HP, capped at new max. Player confirms or edits. |
| `combat.hitPoints.temporary` | retained unchanged | Temporary HP remains unchanged. |
| `combat.armorClass` | retained unchanged | Do not recalculate without structured equipment. Confirm retained value. |
| `combat.initiative` | safely automatic unless retained/manual | Recalculate from Dexterity modifier when no manual exception is present. |
| `combat.speed[]` | retained unchanged | No race/feature speed automation in T-026. |
| `combat.proficiencyBonus` | safely automatic | Calculate from resulting total level. For levels 1-4 it is +2; level 5 is +3. |
| `combat.passivePerception` | suggestion requiring confirmation | Recalculate if Perception skill entry is reliable; otherwise retain. |
| `combat.concentration` | retained unchanged | No resource tracking changes. |
| `proficiencies.savingThrows` | retained unchanged | No class creation/editing. |
| `proficiencies.skills[].modifier` | suggestion requiring confirmation | Recalculate affected modifiers only when structured skill data exists. |
| `proficiencies.weapons/armor/tools/languages` | retained unchanged | No proficiency editing beyond specific class choices. |
| `actions[]` | suggestion requiring confirmation | Retain existing attacks. Update only structured attack values affected by proficiency/ASI and show review. |
| `features[]` | suggestion requiring confirmation | Append SRD class/subclass features unlocked at the new level. Preserve non-SRD existing features. |
| `spellcasting` | class-dependent | Create/update only for supported SRD spellcasting classes and levels. Preserve unsupported existing spellcasting as retained/manual. |
| `spellcasting.ability` | class-dependent | Use SRD class spellcasting ability or retain existing manual value. |
| `spellcasting.spellSaveDC` | suggestion requiring confirmation | Recalculate when spellcasting ability exists. |
| `spellcasting.spellAttackBonus` | suggestion requiring confirmation | Recalculate when spellcasting ability exists. |
| `spellcasting.slots[]` | suggestion requiring confirmation | Update from local class progression. Preserve used slots when valid under new max. |
| `spellcasting.spells[]` | player decision | Learned/prepared/replaced spell choices require user decision or manual entry. |
| `equipment.*` | retained unchanged | No equipment editing. |
| `personality.*` | retained unchanged | No story/personality editing. |
| `audit.*` | bounded provenance | Use only the existing audit and audited-value fields defined below. No root or audit schema extension. |

## Exact CharacterSheetV1 provenance mapping

T-026 may write only these existing fields:

| Provenance category | Exact CharacterSheetV1 fields | Rule |
|---|---|---|
| Generated deterministic changes | `audit.source`; canonical SRD feature/spell `source.status: "confirmed"` and `source.note` | Preserve the prior `audit.source` and append one bounded transition statement containing the level transition and canonical snapshot ID. Block rather than truncate if the 1000-character limit would be exceeded. |
| Player-confirmed suggestions | Audited value/list `needsConfirmation: false` and `note`; feature/spell `source.status: "confirmed"` and `source.note`; a bounded confirmation summary in `audit.source` for plain numeric fields | Do not place completed confirmations in `audit.needsConfirmation`. |
| Manual overrides | Audited value/list `needsConfirmation: true` and `note`; feature/spell `source.status: "needs-confirmation"` and `source.note`; `audit.needsConfirmation` for plain fields without audited wrappers | Set `ruleset.sourceStatus` to `needs-audit` when a new manual override is accepted. |
| Retained non-SRD content | Existing field unchanged; feature/spell `source.status` and `source.note`; `audit.rulesVersionWarnings` | Preserve the content. Add one deduplicated warning only when the retained content affects the transition. |
| Deferred decisions | `audit.deferredCorrections`; feature/spell `source.status: "deferred"` only where that item is already represented | A required decision cannot be deferred if it is necessary for a valid level-up. Block instead. |

No `provenance`, `levelUp`, or other new root/audit field is permitted. Existing arrays retain their
64-entry and 1000-character-per-entry bounds. The endpoint must deduplicate generated audit entries
and reject an update that would exceed existing validation limits.

## Automatic versus player-decision matrix

| Area | Automatic/suggested when deterministic | Player decision or confirmation |
|---|---|---|
| Total level/class level | Increment by exactly 1 for supported single-class level 1-4 character | Confirm review |
| Proficiency bonus | +2 through level 4, +3 at level 5 | Override only as exceptional manual value |
| Ability modifiers | Calculate from scores | Recalculate after ASI, retain manual exceptions |
| Initiative | Dexterity modifier unless retained/manual | Confirm retained/manual value |
| Passive Perception | 10 plus Perception modifier when reliable | Confirm retained/manual value when skill data is incomplete |
| HP | Suggest fixed-average class hit die plus Constitution modifier | Choose fixed-average or manual rolled HP |
| Current HP | Suggest increase by HP gain, capped at new max | Confirm or edit |
| Spell slots/levels | Use local SRD class progression | Confirm and decide spells |
| Spell save DC | 8 + proficiency + spellcasting ability modifier | Confirm/manual override |
| Spell attack bonus | proficiency + spellcasting ability modifier | Confirm/manual override |
| Class/subclass features | Suggest local SRD features unlocked at new level | Confirm, choose class-specific options, or manual fallback |
| Subclass | Detect SRD subclass decision level | Player selects SRD subclass or retains existing manual subclass |
| Ability Score Improvement | Detect level 4 | Allocate ability increases or enter manual feat note |
| Spells | Suggest SRD class/level options | Select learned/prepared/replaced spells or manual entry |
| AC, Speed, equipment, attacks | Retain unless structured deterministic change is safe | Confirm retained/manual value |

## Exact spell progression boundary

The canonical data contains all SRD 5.1 cantrips and spells at spell levels 0 through 3, their
class-list membership, and the metadata required by `CharacterSheetSpell`. It contains no higher
level or non-SRD spell. The import records the exact spell count by level; planning does not invent a
count before the deterministic import runs.

Standard full-caster slots by target class level:

| Target level | 1st | 2nd | 3rd |
|---|---:|---:|---:|
| 2 | 3 | 0 | 0 |
| 3 | 4 | 2 | 0 |
| 4 | 4 | 3 | 0 |
| 5 | 4 | 3 | 2 |

Paladin and Ranger slots by target class level:

| Target level | 1st | 2nd | 3rd |
|---|---:|---:|---:|
| 2 | 2 | 0 | 0 |
| 3 | 3 | 0 | 0 |
| 4 | 3 | 0 | 0 |
| 5 | 4 | 2 | 0 |

Warlock Pact Magic:

| Target level | Pact slots | Pact slot level |
|---|---:|---:|
| 2 | 2 | 1 |
| 3 | 2 | 2 |
| 4 | 2 | 2 |
| 5 | 2 | 3 |

Used standard slots remain used at the same spell level, capped at the new maximum. A newly unlocked
spell level starts with zero used slots. Warlock retains the used Pact-slot count while the slot
level advances, capped at the new maximum.

| Class | Automatic progression | Player selection at level-up | Retained/replacement/manual behavior |
|---|---|---|---|
| Bard | Cantrips known at target levels 2-5: 2, 2, 3, 3. Spells known: 5, 6, 7, 8. Full-caster slots. | Select enough SRD spells to reach the target known count. | May replace at most one existing Bard spell with one eligible SRD spell. Existing non-SRD spells count as known and remain; they cannot be newly selected. |
| Cleric | Cantrips known: 3, 3, 4, 4. Prepared count is Wisdom modifier + Cleric level, minimum 1. Full-caster slots. | Select the complete prepared set and any newly gained SRD cantrip. | Life Domain spells are always prepared and do not count. Existing non-SRD spells retain their current state and count when prepared; no new non-SRD spell is added. |
| Druid | Cantrips known: 2, 2, 3, 3. Prepared count is Wisdom modifier + Druid level, minimum 1. Full-caster slots. | Select the complete prepared set and any newly gained SRD cantrip. | Land Circle spells are always prepared and do not count. Existing non-SRD spells retain their current state and count when prepared. |
| Paladin | Prepared count is Charisma modifier + half Paladin level rounded down, minimum 1. Half-caster slots begin at level 2. | Select the complete prepared set from eligible SRD spells. | Devotion Oath spells are always prepared and do not count. Existing non-SRD spells retain their current state and count when prepared. |
| Ranger | Spells known at target levels 2-5: 2, 3, 3, 4. Half-caster slots begin at level 2. | Select SRD additions needed for the target count. | May replace at most one existing Ranger spell with an SRD spell. Existing non-SRD spells count as known and remain. |
| Sorcerer | Cantrips known: 4, 4, 5, 5. Spells known: 3, 4, 5, 6. Full-caster slots. | Select SRD additions needed for the target counts. | May replace at most one existing Sorcerer spell with an SRD spell. Existing non-SRD spells count as known and remain. |
| Warlock | Cantrips known: 2, 2, 3, 3. Spells known: 3, 4, 5, 6. Pact Magic progression uses the table above. | Select additions needed for target counts. | May replace at most one existing Warlock spell. Fiend expanded spells add choices, not automatic known spells. |
| Wizard | Cantrips known: 3, 3, 4, 4. Prepared count is Intelligence modifier + Wizard level, minimum 1. Full-caster slots. | Add exactly two eligible Wizard spells to the spellbook and select the complete prepared set. | Existing spellbook spells remain. `known` means in the spellbook but not prepared; `prepared` means in the spellbook and prepared. No spellbook spell is removed by level-up. |

Barbarian, Fighter, Monk, and Rogue receive no new spell choices from their base SRD class. Existing
spell content on those characters is retained unchanged and is not automated. T-026 never adds a
new non-SRD spell for any class.

## Existing-character prerequisite matrix

Before building the target-level draft, the flow audits earlier mandatory choices:

| Class | Earlier prerequisites that may be missing | Safe resolution |
|---|---|---|
| Barbarian | Primal Path for current level 3+ | Collect SRD Berserker or a bounded retained/manual subclass name before continuing. |
| Bard | Bard College and Expertise for current level 3+ | Collect Lore or retained/manual college. Collect Expertise only from represented proficient skills; otherwise record a reviewed manual feature or block. |
| Cleric | Divine Domain from level 1 | Collect Life Domain or a bounded retained/manual domain before any transition. |
| Druid | Druid Circle for current level 2+ | Collect Circle of the Land or a bounded retained/manual circle. |
| Fighter | Fighting Style from level 1; Martial Archetype for current level 3+ | Collect a canonical SRD style and Champion, or reviewed manual equivalents representable in `features[]`/subclass. |
| Monk | Monastic Tradition for current level 3+ | Collect Open Hand or a bounded retained/manual tradition. |
| Paladin | Fighting Style for current level 2+; Sacred Oath for current level 3+ | Collect canonical SRD choices or reviewed manual equivalents. |
| Ranger | Favored Enemy and Natural Explorer from level 1; Fighting Style from level 2; Ranger Archetype from level 3 | Collect canonical SRD choices where representable. Otherwise require bounded manual feature/subclass entries or block. |
| Rogue | Expertise from level 1; Roguish Archetype for current level 3+ | Collect Expertise from represented proficient skills and Thief/manual archetype. Block if Expertise cannot be represented safely. |
| Sorcerer | Sorcerous Origin from level 1; Metamagic for current level 3+ | Collect Draconic origin and canonical Metamagic choices, or reviewed manual equivalents. |
| Warlock | Otherworldly Patron from level 1; invocations from level 2; Pact Boon from level 3 | Collect Fiend, canonical invocation choices, and canonical Pact Boon as required, or reviewed manual equivalents. |
| Wizard | Arcane Tradition for current level 2+ | Collect Evocation or a bounded retained/manual tradition. |

Spellcasters also reconcile current cantrip, known-spell, prepared-spell, and Wizard spellbook
prerequisites. Missing earlier selections are collected before new-level selections. An over-limit,
contradictory, or unrepresentable state blocks persistence with a clear explanation. No default
choice is silently selected.

## Class transition matrix

Legend:

- Auto: deterministic update to level/proficiency and always applicable SRD features.
- Confirm: suggestion requiring player review.
- Decision: player must choose.
- Retain: existing values carried forward.
- Fallback/unsupported: safe manual or blocked behavior.

### Barbarian

| Transition | Auto | Confirm | Decision | Retain | Fallback/unsupported |
|---|---|---|---|---|---|
| 1 to 2 | Level 2, proficiency +2, Reckless Attack, Danger Sense | HP, current HP, initiative/passive perception if affected | Fixed or rolled HP | AC, Speed, attacks, equipment, Rage usage notes | Non-SRD features retained/manual |
| 2 to 3 | Level 3, proficiency +2 | HP, Primal Path feature summary | SRD Primal Path, Berserker as SRD option | Existing non-SRD path if present | Non-SRD path details manual |
| 3 to 4 | Level 4, proficiency +2 | HP, affected modifiers | ASI allocation or manual feat note | Class features, equipment | Feat catalog unsupported |
| 4 to 5 | Level 5, proficiency +3, Extra Attack, Fast Movement | HP, attack bonuses, skill modifiers | Fixed or rolled HP | AC, equipment | Manual attack exceptions retained |

### Bard

| Transition | Auto | Confirm | Decision | Retain | Fallback/unsupported |
|---|---|---|---|---|---|
| 1 to 2 | Level 2, proficiency +2, Jack of All Trades, Song of Rest | HP, spell slots, spell DC/attack | Spells known/replaced | AC, Speed, attacks, equipment | Existing non-SRD spells retained; new selections SRD-only |
| 2 to 3 | Level 3, proficiency +2, Expertise, Bard College features | HP, 2nd-level spell slots | SRD College, Lore as SRD option; Expertise choices; spells | Existing non-SRD College retained | Non-SRD College details manual |
| 3 to 4 | Level 4, proficiency +2 | HP, spell slots | ASI or manual feat note; spell choices | Equipment, attacks | Feat catalog unsupported |
| 4 to 5 | Level 5, proficiency +3, Bardic Inspiration die improvement, Font of Inspiration | HP, 3rd-level spell slots, spell DC/attack | Spell choices | AC, Speed, equipment | Existing non-SRD spells retained; new selections SRD-only |

### Cleric

| Transition | Auto | Confirm | Decision | Retain | Fallback/unsupported |
|---|---|---|---|---|---|
| 1 to 2 | Level 2, proficiency +2, Channel Divinity, Turn Undead, domain Channel Divinity if SRD | HP, spell slots, spell DC/attack | Prepared spells | Existing domain | Non-SRD domain feature manual |
| 2 to 3 | Level 3, proficiency +2 | HP, 2nd-level spell slots, spell DC/attack | Prepared spells | AC, equipment | Existing non-SRD spells retained; new selections SRD-only |
| 3 to 4 | Level 4, proficiency +2 | HP, spell slots | ASI or manual feat note; prepared spells | Domain, equipment | Feat catalog unsupported |
| 4 to 5 | Level 5, proficiency +3, Destroy Undead improvement | HP, 3rd-level spell slots, spell DC/attack | Prepared spells | AC, Speed | Manual spell/domain exceptions retained |

### Druid

| Transition | Auto | Confirm | Decision | Retain | Fallback/unsupported |
|---|---|---|---|---|---|
| 1 to 2 | Level 2, proficiency +2, Wild Shape, Druid Circle features | HP, spell slots, spell DC/attack | SRD Circle, Land as SRD option; prepared spells | Equipment, attacks | Non-SRD Circle manual |
| 2 to 3 | Level 3, proficiency +2 | HP, 2nd-level spell slots | Prepared spells | Wild Shape notes | Existing non-SRD spells retained; new selections SRD-only |
| 3 to 4 | Level 4, proficiency +2, Wild Shape improvement if represented | HP, spell slots | ASI or manual feat note; prepared spells | Equipment | Feat catalog unsupported |
| 4 to 5 | Level 5, proficiency +3 | HP, 3rd-level spell slots, spell DC/attack | Prepared spells | AC, Speed | Manual Wild Shape exceptions retained |

### Fighter

| Transition | Auto | Confirm | Decision | Retain | Fallback/unsupported |
|---|---|---|---|---|---|
| 1 to 2 | Level 2, proficiency +2, Action Surge | HP, current HP | Fixed or rolled HP | Fighting Style, AC, Speed, attacks | Manual feature notes retained |
| 2 to 3 | Level 3, proficiency +2, Martial Archetype features | HP | SRD archetype, Champion as SRD option | Existing non-SRD archetype if present | Non-SRD archetype details manual |
| 3 to 4 | Level 4, proficiency +2 | HP, affected modifiers | ASI or manual feat note | Attacks/equipment | Feat catalog unsupported |
| 4 to 5 | Level 5, proficiency +3, Extra Attack | HP, attack bonuses, skill modifiers | Fixed or rolled HP | AC, Speed, equipment | Manual attack exceptions retained |

### Monk

| Transition | Auto | Confirm | Decision | Retain | Fallback/unsupported |
|---|---|---|---|---|---|
| 1 to 2 | Level 2, proficiency +2, Ki, Unarmored Movement | HP, current HP | Fixed or rolled HP | AC, Speed unless explicitly reviewed | Ki details from SRD only |
| 2 to 3 | Level 3, proficiency +2, Deflect Missiles, tradition features | HP | SRD tradition, Open Hand as SRD option | Existing non-SRD tradition if present | Non-SRD tradition manual |
| 3 to 4 | Level 4, proficiency +2, Slow Fall | HP, affected modifiers | ASI or manual feat note | Equipment, attacks | Feat catalog unsupported |
| 4 to 5 | Level 5, proficiency +3, Extra Attack, Stunning Strike | HP, attack bonuses, skill modifiers | Fixed or rolled HP | AC, Speed exceptions | Manual attack exceptions retained |

### Paladin

| Transition | Auto | Confirm | Decision | Retain | Fallback/unsupported |
|---|---|---|---|---|---|
| 1 to 2 | Level 2, proficiency +2, Divine Smite, Spellcasting | HP, spell slots, spell DC/attack | Fighting Style, prepared spells | AC, equipment, attacks | Existing non-SRD spells retained; new selections SRD-only |
| 2 to 3 | Level 3, proficiency +2, Divine Health, oath features | HP, spell slots | SRD oath, Devotion as SRD option; prepared spells | Existing non-SRD oath if present | Non-SRD oath manual |
| 3 to 4 | Level 4, proficiency +2 | HP, spell slots | ASI or manual feat note; prepared spells | Equipment | Feat catalog unsupported |
| 4 to 5 | Level 5, proficiency +3, Extra Attack | HP, 2nd-level spell slots, spell DC/attack, attack bonuses | Prepared spells | AC, Speed | Manual spell/attack exceptions retained |

### Ranger

| Transition | Auto | Confirm | Decision | Retain | Fallback/unsupported |
|---|---|---|---|---|---|
| 1 to 2 | Level 2, proficiency +2, Spellcasting | HP, spell slots, spell DC/attack | Fighting Style, spells known | Favored Enemy/Natural Explorer notes | Existing non-SRD spells retained; new selections SRD-only |
| 2 to 3 | Level 3, proficiency +2, archetype features, Primeval Awareness | HP, spell slots | SRD archetype, Hunter as SRD option; spells known | Existing non-SRD archetype if present | Non-SRD archetype manual |
| 3 to 4 | Level 4, proficiency +2 | HP, spell slots | ASI or manual feat note | Equipment, attacks | Feat catalog unsupported |
| 4 to 5 | Level 5, proficiency +3, Extra Attack | HP, 2nd-level spell slots, attack bonuses | Spells known/replaced | AC, Speed | Manual spell/attack exceptions retained |

### Rogue

| Transition | Auto | Confirm | Decision | Retain | Fallback/unsupported |
|---|---|---|---|---|---|
| 1 to 2 | Level 2, proficiency +2, Cunning Action | HP, current HP | Fixed or rolled HP | Expertise, Sneak Attack notes, equipment | Manual rogue notes retained |
| 2 to 3 | Level 3, proficiency +2, Sneak Attack progression, archetype features | HP | SRD archetype, Thief as SRD option | Existing non-SRD archetype if present | Non-SRD archetype manual |
| 3 to 4 | Level 4, proficiency +2 | HP, affected modifiers | ASI or manual feat note | Equipment, attacks | Feat catalog unsupported |
| 4 to 5 | Level 5, proficiency +3, Uncanny Dodge, Sneak Attack progression | HP, attack bonuses, skill modifiers | Fixed or rolled HP | AC, Speed | Manual attack exceptions retained |

### Sorcerer

| Transition | Auto | Confirm | Decision | Retain | Fallback/unsupported |
|---|---|---|---|---|---|
| 1 to 2 | Level 2, proficiency +2, Font of Magic | HP, spell slots, spell DC/attack | Spells known/replaced | Existing SRD origin | Non-SRD origin/spells manual |
| 2 to 3 | Level 3, proficiency +2, Metamagic | HP, 2nd-level spell slots | Metamagic choices; spells known/replaced | Origin features | Unsupported Metamagic manual |
| 3 to 4 | Level 4, proficiency +2 | HP, spell slots | ASI or manual feat note; spells known/replaced | Equipment | Feat catalog unsupported |
| 4 to 5 | Level 5, proficiency +3 | HP, 3rd-level spell slots, spell DC/attack | Spells known/replaced | AC, Speed | Existing non-SRD spells retained; new selections SRD-only |

### Warlock

| Transition | Auto | Confirm | Decision | Retain | Fallback/unsupported |
|---|---|---|---|---|---|
| 1 to 2 | Level 2, proficiency +2, Eldritch Invocations | HP, Pact Magic slots, spell DC/attack | Invocation choices; spells known/replaced | Patron | Non-SRD invocations/manual |
| 2 to 3 | Level 3, proficiency +2, Pact Boon | HP, Pact Magic slots | Pact Boon; spells known/replaced | Patron features | Non-SRD pact/manual |
| 3 to 4 | Level 4, proficiency +2 | HP, slots | ASI or manual feat note; spells known/replaced | Equipment | Feat catalog unsupported |
| 4 to 5 | Level 5, proficiency +3, invocation count/progression | HP, 3rd-level Pact Magic slots, spell DC/attack | Invocation/spell choices | AC, Speed | Manual invocation exceptions retained |

### Wizard

| Transition | Auto | Confirm | Decision | Retain | Fallback/unsupported |
|---|---|---|---|---|---|
| 1 to 2 | Level 2, proficiency +2, Arcane Tradition features | HP, spell slots, spell DC/attack | SRD tradition, Evocation as SRD option; prepared/spellbook choices | Existing spells | Non-SRD tradition/spells manual |
| 2 to 3 | Level 3, proficiency +2 | HP, 2nd-level spell slots | Spellbook additions and prepared spells | Tradition | Existing non-SRD spells retained; new selections SRD-only |
| 3 to 4 | Level 4, proficiency +2 | HP, spell slots | ASI or manual feat note; spellbook/prepared choices | Equipment | Feat catalog unsupported |
| 4 to 5 | Level 5, proficiency +3 | HP, 3rd-level spell slots, spell DC/attack | Spellbook additions and prepared spells | AC, Speed | Existing non-SRD spells retained; new selections SRD-only |

## Backend update and concurrency contract

- Add `PATCH /characters/{id}/level-up`.
- The request is a bounded command containing `expectedUpdatedAt` and player decisions. It does not
  contain an authoritative class, source level, target level, or complete replacement character.
- Repository/service processing runs in one transaction:
  1. select the character by path ID and authenticated owner ID with a row lock;
  2. return the generic `404` if no owner-scoped row exists;
  3. only then compare persisted `updated_at` with `expectedUpdatedAt` and return `409` on mismatch;
  4. parse and validate the persisted CharacterSheetV1 and its agreement with top-level columns;
  5. derive current class and level from persisted state and derive target level as exactly +1;
  6. resolve canonical rules from the committed snapshot;
  7. validate prerequisite, HP, ASI, spell, class-choice, and explicit override inputs;
  8. construct the resulting sheet server-side by changing only the approved fields;
  9. verify every deterministic result, validate the full resulting CharacterSheetV1, and verify
     that fields outside the approved change set are preserved;
  10. update top-level columns, `reference_payload`, and `updated_at`, then commit and return the
      updated owner response.
- `decisionSummary` is bounded audit text only. It neither authorizes nor determines any change.
- Explicit override fields may differ from a canonical suggestion only when the DTO permits that
  override, the value passes field bounds, and V1 audit metadata records it. Deterministic values
  without an explicit override must exactly match canonical rules.
- Unknown, foreign, and stale-foreign requests must not leak existence or ownership.
- A validation or persistence failure rolls back the entire transaction.
- Preserve party membership rows because they reference `characters.id`, which remains unchanged.
- No SQL migration is expected. Existing `updated_at` and existing CharacterSheetV1 audit fields are
  sufficient for the approved contract.

### Approved change set

The server may change only:

- top-level `class_name`, `subclass_name`, `level`, `hit_points_current`, `hit_points_max`, and
  `updated_at` when their corresponding persisted sheet fields change;
- `identity.classes[0].level` and an approved missing/target-level subclass;
- `summary.displayLine`, `summary.supportingLine`, `summary.featuredAbilities`, and
  `summary.referenceSections` only as consequences of approved level-up content;
- ability scores only through the target-level ASI command;
- max/current HP through the HP commands;
- proficiency bonus and approved typed overrides for initiative, Passive Perception, spell save DC,
  and spell attack bonus;
- affected structured skill/action modifiers only when the canonical calculation is possible and
  the specific change is shown in review;
- canonical or reviewed-manual level-up features and spells;
- spell slots and preparation/known status;
- the exact existing provenance fields defined above.

Name, ancestry, background, alignment, concept, portraits, temporary HP, AC, Speed, concentration,
equipment, currency, personality, unrelated proficiencies, unrelated actions/features/spells,
creation timestamps, character ID, owner ID, and Party links are immutable through this endpoint.

### Request DTO

```ts
type LevelUpRequestDTO = {
  expectedUpdatedAt: string;
  hp: { mode: 'fixed-average' } | { mode: 'rolled'; roll: number };
  currentHp:
    | { mode: 'increase-by-gain' | 'retain' }
    | { mode: 'manual'; value: number };
  prerequisiteChoices: ClassChoiceInput[];
  subclass?:
    | { source: 'srd'; index: string }
    | { source: 'manual'; name: string };
  abilityScoreImprovement?:
    | { mode: 'ability-scores'; increases: Partial<Record<AbilityName, 1 | 2>> }
    | { mode: 'feat-note'; note: string };
  spells?: {
    additions: SpellChoiceInput[];
    replacements: Array<{ removeSpellId: string; add: SpellChoiceInput }>;
    preparedSpellIds: string[];
    wizardSpellbookAdditions: SpellChoiceInput[];
  };
  classChoices: ClassChoiceInput[];
  overrides?: {
    proficiencyBonus?: number;
    initiative?: number;
    passivePerception?: number;
    spellSaveDC?: number;
    spellAttackBonus?: number;
  };
  decisionSummary: string[];
};

type ClassChoiceInput = {
  ruleId: string;
  optionIds: string[];
  manualNote?: string;
};

type SpellChoiceInput =
  { source: 'srd'; index: string };
```

All objects use exact-key validation and bounded arrays/strings. `fromLevel`, `toLevel`,
`className`, `character`, `referencePayload`, `ownerSubjectId`, timestamps other than
`expectedUpdatedAt`, Party IDs, invite tokens, arbitrary return URLs, and unknown fields are
rejected. The server derives the transition and builds the resulting sheet.

Request bounds:

- `decisionSummary`: at most 16 entries, each 1 to 200 trimmed characters;
- `prerequisiteChoices` and `classChoices`: at most 16 entries each;
- `optionIds`: at most 8 canonical IDs per choice;
- `manualNote` and manual subclass name: existing CharacterSheetV1 maximums, never more than 1000
  characters;
- spell additions and replacements: at most 16 each;
- prepared spell IDs: at most 32 unique IDs;
- Wizard spellbook additions: exactly two when the transition requires them, otherwise zero;
- all IDs and indexes: existing identifier maximums and exact canonical membership checks.

### Response DTO

Success returns `200 OK` with the existing owner-scoped `characterResponse` shape for the updated
character. The response includes the new `updatedAt`.

### Public error contract

| HTTP | Error body | When |
|---|---|---|
| 401 | `{"error":"authentication required"}` | No valid session. |
| 400 | `{"error":"character id must be a valid UUID"}` | Malformed path ID. |
| 400 | `{"error":"level-up request validation failed"}` | Malformed JSON, missing required fields, invalid `expectedUpdatedAt`, owner-supplied forbidden fields. |
| 404 | `{"error":"character not found"}` | Unknown, foreign, or inaccessible owner character. |
| 409 | `{"error":"character changed; reload before leveling up"}` | Owned character exists but `updated_at` does not match `expectedUpdatedAt`. |
| 422 | `{"error":"character cannot be leveled up by Hunin yet"}` | Multiclass, current level outside 1-4, unsupported class, illegal level jump, unsupported rules data, invalid resulting sheet. |
| 500 | `{"error":"could not level up character"}` | Generic persistence/server failure. |

### CORS and unsafe-request contract

- `backend/internal/server/cors.go` adds `PATCH` to `Access-Control-Allow-Methods` for approved
  origins.
- An OPTIONS request with approved `Origin` and `Access-Control-Request-Method: PATCH` returns 204,
  reflects only that approved origin, allows credentials, and advertises PATCH.
- The same preflight from an unapproved origin returns 403 without an allow-origin header.
- A credentialed PATCH with no Origin remains forbidden.
- A PATCH from an unsafe origin remains forbidden before the route handler runs.
- Existing GET, POST, DELETE, OPTIONS, credential, `Vary: Origin`, no-wildcard, and security-header
  tests remain green.

## Frontend level-up state machine

1. Owner opens saved Character Reference.
2. `Level up` is visible only for owner route, not Mara and not GM read-only route.
3. Start loads current character, captures `updatedAt`, and validates eligibility:
   saved, owner, single-class SRD class, current level 1-4, valid CharacterSheetV1.
4. Audit earlier required class and spell choices. Collect every safely representable missing
   prerequisite before building the target-level draft. Otherwise enter a clear blocked state.
5. Build a draft change plan for exactly one level from the canonical snapshot.
6. Present guided steps:
   - HP choice;
   - missing prerequisite choices;
   - subclass choice when needed;
   - ASI/manual feat note at level 4;
   - spell learned/prepared/replaced choices when needed;
   - class-specific choices;
   - retained values confirmation for AC, Speed, attacks, equipment, current HP, and exceptions;
   - review.
7. Every suggested value shows previous value, suggested value, reason, and editable override.
8. Submit uses a synchronous lock before async work.
9. Failure keeps the draft and is retryable without partial persistence.
10. Stale/conflict response asks the user to reload before applying changes.
11. Success shows fixed safe confirmation `Character leveled up.` and renders updated Character
    Reference.

### State list

- `idle`: owner Character Reference loaded.
- `eligibility-blocked`: unsupported class, multiclass, current level outside 1-4, invalid
  CharacterSheetV1, canonical rules mismatch, or an unrepresentable prerequisite.
- `decision-prerequisites`: collect missing earlier class/subclass/spell choices before the new
  level's choices.
- `drafting`: compute suggested changes from current sheet and the generated canonical rules view.
- `decision-hp`: choose fixed-average or manual rolled HP.
- `decision-subclass`: only when the target level requires a subclass and none exists.
- `decision-asi`: only when target level is 4.
- `decision-spells`: only when the supported class table requires spell decisions.
- `decision-class-specific`: fighting style, expertise, invocations, metamagic, pact boon, or
  similar class-specific SRD choices.
- `decision-confirm-retained`: AC, Speed, attacks, equipment, current HP, exceptional/manual values.
- `review`: show every changed and retained critical value with previous, suggested, reason, and
  editable override.
- `submitting`: synchronous submit lock engaged before async work.
- `success`: updated character returned and rendered.
- `error-retryable`: request failed without persistence; retry keeps same draft.
- `conflict`: stale `updatedAt`; ask user to reload before continuing.

## SRD data requirements and attribution

- Use only SRD 5.1 and the 2014 API path as development-time source material.
- Authoritative/legal references:
  - D&D Beyond SRD page: `https://www.dndbeyond.com/srd/`
  - SRD v5.1 Creative Commons download linked from D&D Beyond.
  - D&D 5e SRD API 2014 docs: `https://5e-bits.github.io/docs/`
  - API base path: `https://www.dnd5eapi.co/api/2014`
  - CC-BY-4.0 license summary: `https://creativecommons.org/licenses/by/4.0/`
- Commit one canonical file at `rules-data/srd-5.1-2014-levels-1-5.json` and its JSON schema at
  `rules-data/srd-5.1-2014-levels-1-5.schema.json`.
- Commit the canonical file's SHA-256 at
  `rules-data/srd-5.1-2014-levels-1-5.sha256`.
- Add `scripts/generate-level-up-rules.mjs` with deterministic `generate` and `--check` modes. It:
  1. validates exact keys, types, bounds, indexes, references, and uniqueness against the schema;
  2. computes and verifies the committed SHA-256;
  3. emits `frontend/src/rules/generated/levelUpRules.ts` and
     `backend/internal/rules/generated_level_up_rules.go` from the same parsed object;
  4. embeds the same snapshot ID and checksum in both outputs;
  5. fails `--check` when schema validation, checksum, or generated output differs.
- Generated files are never edited by hand. Frontend and backend parity tests assert the same
  snapshot ID, checksum, transition keys, spell counts by level, class-list memberships, slot
  tables, and choice IDs.
- The canonical source contains:
  - all 12 class indexes and display names;
  - hit die and fixed-average HP increment;
  - proficiency bonus for levels 1-5;
  - class-level features for levels 1-5;
  - SRD subclass decision levels and SRD subclass options;
  - level-4 ASI;
  - spellcasting ability;
  - spell slots, Pact Magic, prepared formulas, cantrips known, spells known, replacement limits,
    Wizard spellbook additions, and available spell levels through character level 5;
  - class-specific counts and choices through level 5;
  - every SRD cantrip and spell through spell level 3, class-list memberships, subclass expanded or
    always-prepared membership, and metadata needed for spell decisions and CharacterSheetV1.
- The canonical metadata and `docs/rules-data.md` record source URLs, import date, transformation
  process, snapshot ID, checksum, and the required CC-BY-4.0 attribution.
- Do not depend on the external API at production runtime.
- Do not import non-SRD Player's Handbook content.
- Do not download or commit a rules snapshot during planning.

## Smallest responsible release boundary

- Level up one saved owner character by one level.
- Current level must be 1, 2, 3, or 4.
- Target level must be 2, 3, 4, or 5.
- Single-class only.
- All 12 SRD classes supported only through level 5.
- The canonical local rules source includes only SRD 5.1/2014 class progression through level 5 and
  SRD spells through spell level 3.
- Reviewed manual fallback for representable non-SRD class/subclass choices outside the canonical
  source. Existing non-SRD spells are retained, but new spell selections are SRD-only.
- Submit bounded decisions. The backend derives and persists the fully validated resulting
  CharacterSheetV1 plus matching top-level columns.
- No full CharacterSheetV2, broad editor, multiclassing, migrations, paid-book content, or live
  runtime rules API unless proven absolutely necessary and explicitly approved.
