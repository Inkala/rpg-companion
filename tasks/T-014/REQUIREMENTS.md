# T-014 Requirements: GM feedback triage

## Problem

The current Character Reference supports the first MVP loop, but early GM feedback shows that the
in-session view can feel too spread out and too feature-card heavy. The feedback also includes
larger ideas that could easily become a combat assistant. Hunin needs to capture the useful product
signal without expanding the MVP into turn automation, resource management, or a rules engine.

## Goals

- Preserve the completed MVP loop.
- Improve Character Reference as a quick in-session aid.
- Keep detailed rules information available without crowding the main view.
- Separate small polish from future tactical assistance.
- Avoid inventing requirements beyond the tester feedback.

## Non-goals

- No implementation in this task.
- No tactical assistant in MVP.
- No full spell slot, feature use, rest, or resource tracker in MVP.
- No combat/exploration mode in MVP.
- No general advantage/disadvantage rules engine in MVP.
- No D&D rules validation expansion in MVP.
- No backend, database, deployment, dependency, or CI change.

## Triage Matrix

| Suggestion | Classification | Problem identified | Proposed product response | Implementation risk | Dependencies | Affect current MVP? | Recommended priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hide already-applied modifiers such as Archery as separate feature cards when they are already included in Longbow | Near-term Character Reference polish | The user sees the same concept twice: once inside the attack math and again as a standalone feature. This costs attention in-session. | Fold passive, already-applied modifiers into the relevant action display. Keep the source explainable through details, notes, or a future calculation breakdown. | Medium. Requires knowing which features are passive math contributors versus independent reminders. | Generated Fighter data, Character Reference mapping, future manual-entry source metadata if extended beyond generated data. | Yes, if limited to generated Fighter/reference display polish. | P1 |
| Show conditional bonuses such as Colossus Slayer as a badge/reminder directly on the attack | Near-term Character Reference polish | Conditional combat features are most useful at the moment of choosing an attack, not as separate cards elsewhere. | Add compact reminder badges on attack/action rows, for example `+1d8 if target is wounded`. Do not auto-apply or validate the condition. | Low to medium. Display-only for fixed generated data is simple; generic support needs a small data convention. | CharacterSheetV1 action reminders or feature tags. | Yes, as display-only action reminders. | P1 |
| Remove the features line/cards that duplicate action information | Tiny fix | The features section can become clutter when it repeats information already represented by attacks. | In the first slice, suppress or de-emphasize feature cards that only explain already-applied action math. Keep true standalone features visible. | Medium. Bad filtering could hide useful features. Start with generated Fighter-only rules. | Feature metadata that marks a feature as passive/applied, conditional reminder, or standalone. | Yes, but only for known generated Fighter data. | P2 |
| Tap `+7 to hit` to open a calculation breakdown modal | Mid-term interaction improvement | Main view needs to stay clean, but curious users and GMs need to audit where a number came from. | Add on-demand calculation detail for attacks with known parts, such as Dex, proficiency, and Archery. Use the same pattern later for AC, initiative, spell DC, or skills. | Medium. Needs stored calculation parts and accessible modal behavior. Manual entry may not have source parts. | Calculation metadata in reference payload or derived generated build data; modal component pattern. | Not required for MVP, but a good near follow-up after compacting. | P2 |
| Add an `It's my turn` button with contextual suggestions by class | Future combat assistant feature | Players want turn-time help choosing actions, especially when they know their class poorly. | Defer. Treat as a future combat assistant concept. A tiny precursor could be static action priority text inside Character Reference, but no button or tactical engine now. | High. Requires context, resources, conditions, class logic, and careful GM trust. | Action model, class/rules data, resource tracker, encounter state, possibly party/ally state. | No. | P4 |
| Suggest Hunter's Mark if attacking or Cure Wounds if an ally is hurt | Future combat assistant feature | Useful recommendations depend on combat context and resource availability. | Defer tactical recommendations. Capture as future design input for class-aware suggestions after resources and spells exist. | High. Requires spell data, spell slots, ally HP context, action economy, and recommendation rules. | Spell/resource tracker, party state, class spell data, combat context. | No. | P4 |
| Connect suggestions to spell slot availability and avoid suggestions when resources are low | Future combat assistant feature | Recommendations without resource awareness can be misleading. | Defer until a resource tracker exists. Do not add suggestion logic that pretends to know availability. | High. Requires accurate current resource state and rest recovery. | Resource tracker, spell slots, rest system, spellcasting model. | No. | P4 |
| Add resource tracker for spell slots, Second Wind, etc. | Future combat assistant feature | Some abilities are only useful if current uses remain. | Defer full tracker. Possible tiny precursor: display static resource notes in Character Reference without decrement controls. | High. Cross-cuts class features, spells, rests, persistence, and current combat state. | Character state mutation model, persistence, rest system, feature/spell metadata. | No. Static notes only may remain in MVP. | P4 |
| Add short-rest and long-rest buttons | Future combat assistant feature | Resource recovery needs a fast reset action. | Defer. Rest buttons should only exist after tracked resources and recovery rules are designed. | High. Needs correct recovery semantics and persistence. | Resource tracker, rest rules, HP/resource mutation flows. | No. | P4 |
| Add advantage/disadvantage toggle on attacks | Mid-term interaction improvement | Players want fast roll-state adjustment without opening a modal. | Defer from MVP. Consider later as a local dice helper control, not a rules engine that decides advantage. | Medium to high. UI can be small, but calculation and probability semantics need clarity. | Dice/roll UX decision, attack row interaction model, possibly no backend. | No. | P3 |
| Add HP quick +/- controls instead of only showing HP | Mid-term interaction improvement | HP changes often during sessions, so read-only HP limits usefulness. | Candidate future slice after saved Character Reference is stable. First version can be local or persisted, but must be explicit. | Medium. Needs state mutation, validation, persistence decision, and undo/error behavior if saved. | Character update endpoint or local session state policy. | Not required for current MVP. Good post-MVP interaction task. | P3 |
| Add combat mode versus exploration mode toggle that reorders content | Future combat assistant feature | The most relevant information changes by context. | Defer. First improve default ordering and density before adding modes. | Medium to high. Requires information architecture, state persistence, and content ordering rules. | Mature reference sections, user testing, perhaps settings/state. | No. | P4 |
| Compact HP / AC / Speed and Initiative / Passive Perception / Proficiency blocks | Near-term Character Reference polish | Large stat cards give too much space to numbers that do not have equal session frequency. | Make header/stats denser. Prioritize HP and AC, keep Speed visible, move Initiative, Passive Perception, and Proficiency into a compact secondary row or details area. | Low to medium. Mainly layout risk across mobile sizes. | Current Character Reference component and design accessibility requirements. | Yes. This is the best immediate slice. | P0 |
| Remove or relocate `No concentration` from the character block | Tiny fix | A negative spellcasting status does not belong in the identity/header area, especially for characters where it is not actionable. | Hide `No concentration` from the character block. Later show concentration only when relevant in spells or active effects. | Low. Needs a clear condition so useful concentration state is not lost later. | Character Reference display logic. | Yes. | P0 |

## Current MVP Impact

Should affect the current MVP:

- Compact stat/header polish.
- Remove or relocate `No concentration`.
- Attack reminder badges for known conditional features.
- Suppress known duplicate passive feature cards where the action already includes the value.

Should not affect the current MVP:

- `It's my turn` button.
- Tactical spell/action recommendations.
- Full resource tracker.
- Rest buttons.
- Combat/exploration mode.
- Advantage/disadvantage toggle.
- HP quick adjustment controls, unless separately approved as a focused post-MVP task.

## Acceptance Criteria For This Docs Task

- All tester suggestions are classified into the five requested buckets.
- Every suggestion records problem, product response, implementation risk, dependencies, MVP impact,
  and priority.
- The recommended first implementation slice is small.
- Tactical assistant, full resource tracker, combat/exploration mode, and rest system are explicitly
  deferred.
- Validation commands are run and reported.
