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

### Help Me Choose

Help me choose is a narrow preference questionnaire that recommends between the two approved
level-1 Human Fighter presets only. It must not offer or imply magic, healing, rogue-style stealth,
all classes, all spells, or full D&D character creation.

Intro copy:

> Let’s pick between two beginner-friendly level-1 Human Fighter styles. This first version only
> recommends a sturdy melee Fighter or a precise archer Fighter. You can switch after the
> recommendation.

Keep this scope copy visible but quiet near the questionnaire:

> This first guide chooses between two level-1 Fighter styles.

Use exactly 3 required questions for the MVP:

1. Danger breaks out right in front of the party. What feels most like your hero?
   - Step forward, shield up, and hold the line.
     - Maps to Strength melee Fighter.
   - Move to a clear angle and drop the biggest threat from range.
     - Maps to Dexterity archer Fighter.
2. In a fight, where do you picture them doing their best work?
   - Up close, trading blows where things are loud and messy.
     - Maps to Strength melee Fighter.
   - A few steps back, watching the field and choosing the right shot.
     - Maps to Dexterity archer Fighter.
3. An ally is in trouble. What is your instinct?
   - Rush in and make space for them to breathe.
     - Maps to Strength melee Fighter.
   - Stay mobile and pick off the enemy pressuring them.
     - Maps to Dexterity archer Fighter.

Scoring model:

- Each answer gives 1 point to one build.
- Highest score wins.
- With 3 required binary questions, there is no tie.
- Store `questionnaireAnswers`, `recommendedBuild`, `selectedBuild`, and
  `recommendationWasOverridden`.
- Derive the character from `selectedBuild`, not necessarily `recommendedBuild`.

Result copy for Strength melee Fighter:

> Your answers point to a Strength melee Fighter: a level-1 Human Fighter who stands up front,
> protects allies, and handles danger face to face. This build uses chain mail, a shield, and a
> longsword, with strong defense and a simple, sturdy combat plan.

Secondary note:

> Good fit if you want your character to feel brave, durable, and direct.

Result copy for Dexterity archer Fighter:

> Your answers point to a Dexterity archer Fighter: a level-1 Human Fighter who fights from range,
> moves for a better angle, and solves problems with accurate shots. This build uses a longbow,
> lighter armor, and positioning, with a strong ranged attack.

Secondary note:

> Good fit if you want your character to feel alert, flexible, and precise.

Override copy:

> Prefer the other style? No problem. The recommendation is guidance, not a lock.

Use explicit action labels:

- Use Strength melee Fighter
- Choose Dexterity archer Fighter
- Use Dexterity archer Fighter
- Choose Strength melee Fighter

Questionnaire UX:

- One question per screen on mobile.
- Desktop can show a stepper or progress indicator, but the current question remains primary.
- Use native radio inputs or correct `radiogroup` semantics.
- Cards must be keyboard selectable.
- Show visible focus states.
- Do not rely on color alone to communicate selection or recommendation.
- Announce the result with heading text.
- Changing an earlier answer recomputes the recommendation.
- If the user overrides the recommendation, preserve `recommendedBuild` but derive the character
  from `selectedBuild`.
- If answers later align with the override, clear `recommendationWasOverridden`.

Future-only questionnaire expansions:

- magic questions,
- healing questions,
- stealth questions,
- social questions,
- tactical complexity questions.

Only add these once supported rules, classes, spells, features, and implementation paths exist.

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
