# T-025 Notes: Structured Character Creation and Derived Values

Status: approved

## Certain findings

- T-026 is deployed and provides one canonical SRD 5.1/2014 JSON source, JSON Schema, checksum,
  generated TypeScript and Go rules, parity tests, attribution, all 12 classes through level 5, and
  169 spells through spell level 3.
- T-028 is merged on `origin/main` at
  `e0ac1e450849e5c751ba71b396e8c11b4545d0b0`; the T-025 implementation gate no longer waits for
  T-028. Production smoke is not claimed here until the T-028 rollout report is confirmed.
- The canonical T-026 file has no Race or equipment collections.
- T-026 spell records already include level, school, casting time, range, component codes, duration,
  concentration, ritual, summary, class membership, and subclass membership.
- Existing CharacterSheetV1 uses `identity.ancestry`, has no Gender, lacks consistent per-value
  provenance, lacks equipped armor/shield inputs, lacks full structured spell details, and has no
  dedicated Other section.
- Existing PostgreSQL storage already has top-level character fields plus a bounded JSONB
  `reference_payload`.
- Ordinary save navigation and invite-launched automatic Party joining are already implemented.
  They require regression coverage, not replacement flows.
- Current T-026 Level up is built around CharacterSheetV1. Shipping V2 creation without V2 Level up
  compatibility would regress the deployed feature for newly created characters.

## Product requirements recorded as certain

- Class and Race dropdowns.
- Conditional class-and-level Subclass dropdown, including Hunter as the SRD Ranger subclass.
- Visible Race terminology instead of Ancestry.
- No Concept, Notes, or Current HP inputs during creation.
- Deterministic values calculated from structured inputs, with explicit manual overrides and
  calculated/manual-override/imported provenance.
- Structured Attacks, Spells and spell slots, Features and traits, Equipment, and Other sections.
- Local SRD spell selection populating full display metadata.
- No second SRD snapshot and no runtime rules API.
- V1 and Mara compatibility.
- Preserved ordinary saved-reference navigation and invite-created Party joining.

## Architectural conclusion

Use CharacterSheetV2 for new T-025 characters and retain CharacterSheetV1 as a display-compatible
legacy contract. This is a schema-version change inside existing JSONB storage, not a proposed SQL
migration.

The backend, not the browser, builds the authoritative V2 payload from bounded source inputs. This
keeps the creation endpoint from accepting arbitrary calculated values or a client-authored full
sheet as truth.

## Approved final decisions

- New CharacterSheetV2 creation is bounded to levels 1 through 5. Level selection respects the
  supported class, subclass, and spell rules. Existing V1 characters outside the range remain
  readable.
- The existing canonical source gains the complete SRD 5.1 equipment catalog: weapons, armor,
  shields, adventuring gear, tools, packs, mounts and vehicles, and other source categories.
  Stable identifiers and reusable source metadata are retained where available.
- Manual `Other` equipment supports non-SRD and campaign-specific content. It never silently affects
  calculated attacks, AC, Speed, or another derived value.
- Current HP is removed from creation and is initialized by the server to the resolved maximum HP.
- Subclass availability and requirement depend on class and level. Hunter is the SRD Ranger
  subclass. Unsupported content uses the bounded manual fallback where permitted.
- User-facing V2 APIs use `race`, while the existing database column named `ancestry` remains an
  internal compatibility detail.
- Ordinary save keeps the fixed `Character saved.` toast and opens the complete saved Character
  Reference. Invite creation continues to create once, join once, and open the Party.

## Slice 2 contract correction

- The creation request uses one `ruleChoices` collection for Race and class decisions. The backend
  validates rule ownership, availability, prerequisites, selection count, distinctness, allowed
  options, and manual-fallback policy.
- Ability-score input is either calculated base scores or imported final scores with a reason.
- Calculated mode applies validated canonical fixed and selectable Race/subrace bonuses on the
  server.
- Imported mode never reapplies Race bonuses. Imported values retain imported provenance and survive
  Race changes until the player explicitly resets them.
- Reset to calculated requires usable base scores and valid canonical Race choices.
- Manual or unsupported Races receive no invented automation.
- Ability modifiers always derive from the resolved final scores.
- Slice 2 includes fixed Race, Half-Elf distinct choices, subrace, imported-value persistence,
  reset, invalid-choice, manual-Race, and TypeScript/Go parity regressions.

## Slice 2 implementation-review correction

- Defense is an exact armor, unarmored, or manual union. Canonical armor and shield indexes must
  reference equipped canonical equipment; manual equipment is inert. The persisted sheet retains
  the selected formula or manual reason needed to verify AC.
- A calculated attack explicitly selects Strength, Dexterity, or the supported spellcasting
  ability and states whether proficiency applies. Exceptional attacks use a bounded manual value
  and reason. Names never imply an ability.
- Persisted spells carry all approved generated-rule fields, explicit state, canonical index when
  applicable, and provenance. Manual spells provide the same visible fields with imported
  provenance.
- Canonical features retain index plus resolved display data and must belong to the selected Race,
  Class, or Subclass at the current level.
- Canonical subclass is null before its decision level and required at or after it. Cross-Class
  subclasses are invalid; Ranger Hunter remains covered.
- HP gains contain exactly levels 2 through N.
- TypeScript and Go reject extra nested union fields even when empty or zero-valued.
- Complete saved-sheet validation rederives every authoritative value from retained inputs and
  verifies prepared spell references, attack provenance, and feature ownership.

## Risks

- V2 affects creation, Character Reference, Party-GM reads, summaries, and Level up. Partial rollout
  is not safe unless version handling is complete end to end.
- AC and Speed automation require machine-readable conditions that are not present in the current
  T-026 feature summaries.
- The current spell `summary` was normalized for V1. T-025 needs an explicit complete
  description/effect field so the dropdown does not silently truncate rules content.
- Manual fallback is necessary but can become an unrestricted sheet payload if validation is not
  bounded. Manual inputs therefore remain field-specific and size-limited.
- The estimated 13 to 21 focused days is substantially larger than the stale 4 to 7 day estimate.
- T-023 must merge last so evaluator documentation reflects the actual final T-025 release rather
  than planning assumptions.

## Planning outcome

T-025 is approved for implementation through the documented five sequential slices and review
stops. T-023 still integrates last after T-025 release evidence is available.
