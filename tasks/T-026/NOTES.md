# T-026 Notes: Bounded Level-Up MVP

Status: approved

## Investigation findings

- CharacterSheetV1 already stores identity, class entries, abilities, combat, actions, features,
  spellcasting, equipment, and audit metadata.
- The backend stores matching top-level columns plus `reference_payload`, `created_at`, and
  `updated_at`.
- No owner-scoped character update endpoint exists yet.
- Existing repository reads can load owner characters and GM read-only party characters.
- Existing validation requires top-level fields and CharacterSheetV1 payload to agree.
- `updatedAt` is already exposed to the frontend and can support optimistic concurrency.
- Current CharacterSheetV1 does not have a rich provenance model for calculated/imported/manual
  values. T-026 must use only its existing audit, audited-value, feature-source, and spell-source
  fields. No root or audit extension is approved.
- Current stored data can deterministically support ability modifiers, proficiency bonus by level,
  initiative from Dexterity when not manually retained, and simple spell DC/attack formulas when
  spellcasting ability exists.
- HP, AC, Speed, attacks, equipment, class choices, spells, and exceptional rules require player
  confirmation, canonical SRD choices, or a representable manual class-choice fallback. New spell
  selections remain SRD-only.
- Frontend CharacterSheetV1 validation and backend CharacterSheetV1 validation both reject unknown
  root fields. Do not add root-level `provenance` or `levelUp` fields without explicit validator
  changes and tests.
- Existing audited values provide limited places to record uncertainty:
  - `AuditedNumber.needsConfirmation/note`;
  - `AuditedTextList.needsConfirmation/note`;
  - `CharacterFeatureSource.status/note`;
  - `CharacterSheetAudit.needsConfirmation`;
  - `CharacterSheetAudit.rulesVersionWarnings`;
  - `CharacterSheetAudit.deferredCorrections`.
- Exact use is fixed: `audit.source` records deterministic and player-confirmed transition
  provenance; field-level `needsConfirmation`/`note` and `audit.needsConfirmation` record manual
  overrides still needing audit; `audit.rulesVersionWarnings` records retained non-SRD content that
  affects progression; `audit.deferredCorrections` records genuinely deferred non-required work.
- Manual character creation accepts arbitrary class names. T-026 must support only SRD class names
  in its canonical rules source and fail safely otherwise.
- Party membership rows reference the stable `characters.id`, so a level-up update that preserves
  the ID should preserve Party links without changing Party tables.

## Revised boundary

Marcela revised the MVP from Fighter-first to all 12 SRD 5.1/2014 classes through level 5.

Supported:

- Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard.
- Current levels 1, 2, 3, and 4.
- Target levels 2, 3, 4, and 5.
- One level at a time.
- Single-class only.
- SRD content only, with manual fallback for existing non-SRD content.

Unsupported:

- Current level 5 or higher.
- Level 5 to 6 and above.
- Multiclassing.
- Non-SRD automation.
- Feats catalog.
- Paid-book content.
- Live runtime rules API.

## CharacterSheetV1 level-up audit summary

- Safely automatic:
  - class level and top-level level for supported single-class characters;
  - proficiency bonus from resulting level;
  - ability modifiers as derived display/calculation values;
  - summary display line after accepted changes.
- Automatic suggestion requiring confirmation:
  - fixed-average HP increase;
  - current HP increase after max HP changes;
  - initiative when Dexterity-derived;
  - Passive Perception when Perception skill data is reliable;
  - spell save DC and spell attack bonus when spellcasting ability exists;
  - spell slots and available spell levels for supported classes;
  - newly unlocked SRD class/subclass features;
  - skill/action attack values affected by ASI or proficiency when structured data exists.
- Player decisions:
  - fixed-average HP versus manually rolled HP;
  - subclass at class-specific subclass level;
  - ASI allocation or manual feat note at level 4;
  - known/prepared/replaced spell choices;
  - class-specific choices;
  - confirmation of AC, Speed, equipment, attacks, current HP, and exceptional/manual values.
- Retained unchanged:
  - name, ancestry/race, background, alignment, concept, portrait fields;
  - temporary HP;
  - AC, Speed, equipment, personality, most attacks/features unless changed through review;
  - Party membership link.
- Unsupported/manual fallback:
  - multiclassing;
  - current level 5+;
  - non-SRD classes/features/spells/subclasses;
  - complete feats catalog;
  - broad equipment/armor/attack recalculation;
  - paid-book and homebrew automation.

## SRD/legal research notes

- Official SRD page: `https://www.dndbeyond.com/srd/`.
- The D&D Beyond SRD page links SRD 5.1 Creative Commons downloads and states the full SRD 5.1
  contents are released under CC-BY-4.0 as an available licensing path.
- CC-BY-4.0 reference: `https://creativecommons.org/licenses/by/4.0/`.
- D&D 5e SRD API 2014 docs: `https://5e-bits.github.io/docs/`.
- API base path for 2014 data: `https://www.dnd5eapi.co/api/2014`.
- Relevant API resources:
  - class by index: class hit die, class levels URL, spellcasting ability, subclasses;
  - class level by class and level: level, proficiency bonus, features, spellcasting slots, class
    specific data;
  - all class levels with optional subclass filter;
  - class features by class and level;
  - subclass and subclass-level resources;
  - spellcasting info by class;
  - class spell lists and spell resources.
- Planning did not download or commit a rules snapshot.

## Canonical rules-data decision

- One canonical JSON source governs both runtimes:
  `rules-data/srd-5.1-2014-levels-1-5.json`.
- A committed JSON schema and SHA-256 validate shape and content identity.
- `scripts/generate-level-up-rules.mjs` deterministically produces/checks generated TypeScript and
  Go representations with the same snapshot ID and checksum.
- Generated outputs are not hand-edited. Schema, checksum, and parity tests fail on drift.
- Canonical metadata and `docs/rules-data.md` record source URLs, import date, transformation
  process, snapshot ID, checksum, and CC-BY-4.0 attribution.
- The canonical spell boundary is every SRD 5.1 cantrip and spell through spell level 3, including
  class-list membership and CharacterSheetV1 metadata. No live API, non-SRD spell, or spell above
  level 3 is included.

## Existing-character prerequisite decision

- Eligibility audits earlier choices required by the persisted class and level, including domains,
  origins, patrons, traditions, circles, Fighting Styles, Expertise, invocations, Metamagic, Pact
  Boons, and spell progression.
- Safely representable missing choices are collected before the new-level choice and appear in
  review.
- Unrepresentable or contradictory prerequisites block Level up with a clear explanation.
- Existing non-SRD choices are preserved. No earlier choice is silently invented or overwritten.

## Backend authority decision

- The backend loads and locks the persisted character by path ID plus authenticated owner ID before
  checking `expectedUpdatedAt`.
- Persisted class, level, payload, owner, and timestamp determine eligibility and the exactly +1
  transition.
- The request contains bounded decisions, not an authoritative complete sheet.
- The backend constructs the result, validates canonical deterministic values and explicit typed
  overrides, validates the full CharacterSheetV1, preserves unapproved fields, and commits once.
- `decisionSummary` is bounded audit text only.
- Unknown and foreign characters remain indistinguishable, and Party GMs remain read-only.
- PATCH CORS must be advertised for approved origins only while all current cookie/origin defenses
  remain intact.

## Approval and schedule decision

Marcela approves T-026 and explicitly accepts that implementation may miss the 20 July deadline.
T-024 is integrated. T-026 may proceed in a dedicated worktree under the approved ownership
boundary. The all-12 classes through level 5 boundary remains large and schedule risk remains
critical.

No-go for:

- higher-level progression;
- multiclassing;
- CharacterSheetV2;
- full spell/class editor;
- complete feat catalog;
- homebrew or paid-book automation;
- live runtime rules API.

Minimum implementation and release time: 6 focused days from the integrated T-024 baseline if the
canonical import has no upstream gaps and no V1 schema expansion is required.

Likely implementation and release time: 8 to 10 focused days including canonical class/spell data,
deterministic generation and parity, CORS, server-authoritative validation, PostgreSQL tests,
frontend tests, browser QA, CI, deployment, and public smoke.

Schedule risk: critical. Marcela explicitly accepts that T-026 may miss the deadline. T-023 drafts
in parallel with placeholders and performs final evidence reconciliation after T-026 deployment and
public smoke.

## Approved decisions

- All 12 SRD 5.1/2014 classes, single-class only, transitions 1 to 2 through 4 to 5, and level 5
  hard cap.
- CharacterSheetV1, existing-field provenance only, and blocked unrepresentable prerequisites.
- Exact success toast: `Character leveled up.`
- `PATCH /characters/{id}/level-up` with `expectedUpdatedAt` optimistic concurrency.
- Server-authoritative bounded decision DTO.
- One canonical JSON source with deterministic TypeScript/Go generation and parity checks.
- SRD cantrips and spells through spell level 3.
- No live rules API, multiclassing, higher levels, homebrew automation, or paid-book content.
- Revised estimate and explicit acceptance that implementation may miss the 20 July deadline.

## Deferred from T-026

- Full T-025 CharacterSheetV2.
- Portrait-bank integration.
- Multiclassing.
- Character deletion.
- Broad CRUD.
- Party administration.
- Profile/account management.
- Complete feats catalog.
- Homebrew automation.
- Paid-book content.
- Non-SRD Player's Handbook content.

## Implementation gate

T-024 is complete, merged, deployed, and publicly validated at
`b942700a31af7efa22b0349018d692084b32965b`; that integration gate is satisfied.

T-026 is approved. Implementation starts only in its dedicated worktree and must respect the strict
T-023/T-026 ownership contract. T-026 integrates, deploys, and completes public smoke before T-023
rebases and merges final submission evidence.
