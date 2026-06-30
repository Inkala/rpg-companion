# T-003 Design

## Approach

Build the milestone as a narrow frontend vertical slice with the existing backend contract.

The creation flow should be implemented as a feature folder under:

```text
frontend/src/character-creation/
```

Reusable character data, API, and reference rendering should move toward:

```text
frontend/src/characters/
```

`App.tsx` should coordinate high-level views only:

- landing,
- account,
- create character,
- character reference.

It should not contain creation option data, draft derivation, form validation, or reference rendering
internals.

## Screen States

### Entry

- `Create a character` becomes available as the entry to the guided flow.
- `Add an existing character` remains outside this milestone unless separately approved.
- `Explore Mara` continues to open the current guest demo.

### Basics

Inputs:

- Character name, required.
- Short concept or note, optional.

States:

- Empty initial state.
- Field validation after blur or submit.
- Continue disabled or blocked until required name is valid.

### Build Choice

Options:

- Strength melee Fighter.
- Dexterity archer Fighter.

Each option should show:

- plain-language play style,
- expected combat role,
- key derived strengths,
- short note that this is a level-1 Fighter.

### Background Choice

Options:

- Soldier.
- Outlander.

Each option should show:

- short narrative description,
- practical identity cue,
- no long rules text.

### Review

Review shows:

- name,
- concept note if present,
- Human Fighter level 1,
- background,
- ability scores and modifiers,
- HP,
- AC,
- speed,
- proficiency bonus,
- attacks,
- equipment summary,
- Second Wind,
- Fighting Style.

The review uses the fixed D&D 5E 2014 Human Fighter presets from `REQUIREMENTS.md`. Those values
already include the Human +1 bonus to every ability score.

Guest state:

- Save disabled.
- Account-required explanation.
- User can open a temporary in-memory Character Reference preview.
- User cannot save, recover, transfer, claim, or list the draft.
- Refreshing or leaving the app loses the draft in this first slice.

Authenticated state:

- Save enabled.
- Saving state.
- Save error state.
- Success opens Character Reference directly from the successful `POST /characters` response.

## DraftStore Abstraction

Design a `DraftStore` interface before persistence is added:

```text
DraftStore
- load(): CharacterCreationDraftV1 | null
- save(draft: CharacterCreationDraftV1): void
- clear(): void
```

First slice should use an in-memory implementation.

Later localStorage support can implement the same interface without changing creation screen
components.

Guest draft claiming is not part of this milestone.

## Derived Character Payload

Keep derivation pure and testable:

```text
draft + option data -> CreateCharacterPayload
```

The function should derive:

- class name,
- ancestry,
- level,
- background,
- ability scores,
- HP,
- AC,
- speed,
- reference payload.

It should not read React state, browser storage, auth state, or the network.

## Reference Payload Shape

The current backend only requires `referencePayload` to be a JSON object. The frontend should define
a typed shape for the first reusable Character Reference implementation.

Recommended shape:

```text
CharacterReferencePayloadV1
- version
- summary
- actions
- features
- spells
- equipmentSummary
```

Actions and features should have stable IDs, names, short hints, metadata badges, and optional
quick-reference details.

Spells are an empty list for this slice.

## API Contract Usage

Use existing authenticated endpoints:

- `POST /characters` for save.
- Render Character Reference directly from the successful `POST /characters` create response after
  saving.
- Do not make a follow-up `GET /characters/{id}` just to display the character immediately after
  saving.
- Keep `GET /characters/{id}` as the later read boundary for persisted loading when needed.

Known limitations:

- No list endpoint exists.
- A saved character can be opened immediately after create, but there is no persisted character home
  after refresh in this milestone.
- Backend does not validate D&D-specific rules inside `referencePayload`; frontend derivation tests
  must cover the supported presets.

## Files Or Artifacts

Future implementation should create or move toward:

```text
frontend/src/character-creation/
  CharacterCreationFlow.tsx
  CharacterCreationReview.tsx
  creationOptions.ts
  deriveCharacter.ts
  draftReducer.ts
  draftStore.ts
  draftTypes.ts
  validation.ts

frontend/src/characters/
  api.ts
  types.ts
  referencePayload.ts
  CharacterReference.tsx
```

Future tests should stay near the relevant feature where practical.

## Tradeoffs

- Fighter-only is narrow, but it allows an end-to-end guided experience without a rules engine.
- Human-only avoids ancestry branching and lets the milestone focus on the flow.
- Standard-array-derived presets reduce user freedom but keep the experience beginner-friendly and
  testable.
- No localStorage in the first slice means guests lose draft state on refresh, but the `DraftStore`
  boundary keeps the UI ready for later persistence.
- No character list keeps backend scope small, but saved characters are not discoverable after
  refresh until a later task.
- Rendering directly from the create response avoids an unnecessary immediate read request, but the
  app still needs `GET /characters/{id}` later for persisted loading.

## Risks

- The UI may imply broader support than exists. Copy must say the first guided build supports level-1
  Fighters only.
- Reference extraction can become too large. It should be its own implementation task.
- Derived rules can drift from the selected D&D 5E 2014 assumptions. Keep derivation fixtures small
  and explicit.
- Guest save messaging can accidentally imply claim or migration support. It must only say account
  required to save.

## Validation Plan

Planning validation:

- Documentation review.
- `git diff --check`.

Future implementation validation:

- Frontend unit tests for draft validation and derivation.
- Frontend component tests for flow states.
- Mocked API tests for authenticated save.
- Regression tests for Mara demo entry and Character Reference behavior.
- Manual browser smoke test for guest and authenticated paths.
