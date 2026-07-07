# T-012 Design

## Experience Direction

Help me choose should feel like a lightweight fantasy preference quiz. The user should answer in
terms of instinct, vibe, and story, not rules terminology.

The quiz should not say what each answer maps to while the user is answering. Build labels and
future-path messaging belong only on the result screen.

## Screen Flow

1. Mode choice
   - `Fill the sheet myself`
   - `Help me choose`
2. Quiz intro
   - Explain that this is a playful guide.
   - Explain that this MVP can only create two beginner Fighter styles.
   - Avoid a long disclaimer before the user starts.
3. Questions
   - 5 total.
   - 4 answer cards per question.
   - One question per screen.
   - Progress text such as `Question 2 of 5`.
   - Back and Next controls.
4. Result
   - Show the supported Fighter recommendation as a heading.
   - Show future-path messaging if relevant.
   - Show recommendation copy.
   - Let the user accept the recommended Fighter.
   - Let the user choose the other supported Fighter.

## Proposed Question Framework

Final copy should be approved before implementation. This framework defines the shape and bucket
coverage.

### Question 1: Danger Appears

Purpose: first instinct.

Example answer directions:

- Stand in front and take the pressure. `strengthMelee`
- Find a clean shot from a safer angle. `dexterityArcher`
- Reach for impossible power or a strange sign. `futureMagic`
- Get everyone breathing and back on their feet. `futureHealingSupport`

### Question 2: Best Place In A Fight

Purpose: combat position and comfort.

Example answer directions:

- In the crush, shield high and feet planted. `strengthMelee`
- At range, reading the field and picking targets. `dexterityArcher`
- Out of sight, setting up the moment no one sees coming. `futureStealthTrickery`
- In the middle of the plan, distracting, bargaining, or causing a scene.
  `futureSocialCleverChaos`

### Question 3: An Ally Is In Trouble

Purpose: support instinct.

Example answer directions:

- Rush in and make space for them. `strengthMelee`
- Drop the enemy pressuring them. `dexterityArcher`
- Patch them up or keep them standing. `futureHealingSupport`
- Trick the threat into looking the wrong way. `futureStealthTrickery`

### Question 4: A Risky Obstacle Blocks The Way

Purpose: non-combat fantasy.

Example answer directions:

- Force it open and keep moving. `strengthMelee`
- Look for a careful route around it. `dexterityArcher`
- Use a spell, omen, or impossible shortcut. `futureMagic`
- Talk, bluff, or improvise until the room changes. `futureSocialCleverChaos`

### Question 5: Victory Should Feel Like

Purpose: emotional payoff and final tiebreak signal.

Example answer directions:

- Everyone is safe because you held the line. `strengthMelee`
- The perfect shot landed at the perfect time. `dexterityArcher`
- Reality bent just enough to save the day. `futureMagic`
- The plan was ridiculous, dramatic, and somehow worked. `futureSocialCleverChaos`

## Scoring Design

Keep scoring data-driven. Each answer should define:

- answer ID
- visible answer text
- primary fantasy bucket
- supported fallback build

Bucket names and fallback build names are internal only.

Supported fallback build mapping should be explicit per answer. This is better than deriving it
implicitly because unsupported fantasies can lean toward different Fighter fallbacks depending on
the wording.

Example:

```text
answer
- id: q1-magic-power
- label: Reach for impossible power or a strange sign.
- bucket: futureMagic
- fallbackBuild: dexterityArcher
```

## Future-Path Result Design

The result screen should separate:

- what the user seems drawn to;
- what the MVP can support today;
- the recommended supported Fighter build.

Recommended structure:

1. Heading: supported Fighter build.
2. Optional future-path note for unsupported fantasy signal.
3. Recommendation copy.
4. Secondary fit note.
5. Override copy.
6. Actions.

Do not present unsupported buckets as selectable classes or working features.

## Draft Data Design

Later implementation should extend the draft with:

```text
questionnaireAnswers: Record<QuestionId, AnswerId>
fantasyBucketScores: Record<FantasyBucket, number>
unsupportedFantasyBuckets: FantasyBucket[]
recommendedBuild: CharacterBuildId | null
selectedBuild: CharacterBuildId | null
recommendationWasOverridden: boolean
```

`recommendedBuild` is the quiz result. `selectedBuild` is what the user actually chooses.

## Accessibility Design

- Use native radio inputs wrapped by labels, or correct radiogroup semantics.
- The full answer card should be selectable.
- Keep answer text regular weight.
- Use a visible selected indicator such as `Selected`, not only color or font weight.
- Keep focus rings visible.
- Keep result heading meaningful.
- Avoid dense rule copy.

## Visual Design Notes

- Use the existing character creation visual language.
- Keep cards calm and scannable.
- Do not use build labels inside answer cards.
- Do not introduce new dependencies.

## Separate App-Shell Decision

The global header and navigation decision is not part of T-012. T-012 implementation should wait for
that decision if app-shell behavior would affect the user flow.

