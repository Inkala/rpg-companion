# T-012 Requirements

## Problem

New and occasional D&D players often start with a fantasy, vibe, or instinct rather than rules
terms. The Help me choose flow should let them answer playful preference questions without exposing
scoring or build mappings. The MVP can only produce two Fighter builds, so it must be honest when a
player's answers point toward a fantasy the app does not support yet.

## Goals

- A user can take a 5-question, 4-answer Help me choose quiz.
- The quiz detects broader fantasy buckets.
- The quiz does not reveal scoring, buckets, or build mappings while answering.
- The MVP recommendation still resolves to one of:
  - Strength melee Fighter
  - Dexterity archer Fighter
- Unsupported fantasy signals are acknowledged with honest future-path messaging.
- The user can accept the recommended Fighter build or choose the other supported Fighter build.
- Draft state distinguishes the questionnaire recommendation from the user's selected build.
- The flow remains accessible by keyboard and screen reader.

## Non-Goals

- No all-class builder.
- No supported magic character output.
- No supported healer/support character output.
- No rogue-style stealth or deception character output.
- No social chaos character output.
- No spells.
- No subclasses.
- No saving to backend.
- No guest localStorage.
- No manual sheet fields.
- No full review step.
- No backend changes.
- No routing changes.
- No app-shell/header/navigation changes.
- No new dependencies.
- No Figma changes.

## Supported MVP Builds

Strength melee Fighter:

- A level-1 Human Fighter who stands up front, protects allies, and handles danger face to face.
- Uses chain mail, a shield, and a longsword.
- Strong defense and a simple, sturdy combat plan.

Dexterity archer Fighter:

- A level-1 Human Fighter who fights from range, moves for better angles, and solves problems with
  accurate shots.
- Uses a longbow, lighter armor, and positioning.
- Strong ranged attack.

## Fantasy Buckets

The quiz may score these buckets:

- `strengthMelee`
- `dexterityArcher`
- `futureMagic`
- `futureHealingSupport`
- `futureStealthTrickery`
- `futureSocialCleverChaos`

Supported buckets:

- `strengthMelee`
- `dexterityArcher`

Unsupported future buckets:

- `futureMagic`
- `futureHealingSupport`
- `futureStealthTrickery`
- `futureSocialCleverChaos`

## Quiz Direction

Use 5 questions. Each question has 4 answers. Answers should be natural-language fantasy choices,
not rules terms and not visible build labels.

The exact final copy should be approved before implementation, but the question set should cover:

1. First instinct when danger appears.
2. Preferred place in a fight.
3. How the hero helps an ally.
4. How the hero handles a risky obstacle.
5. What victory should feel like.

Each answer should map internally to one primary fantasy bucket. Some answers may optionally carry a
secondary supported fallback bucket if needed for deterministic MVP scoring.

## Supported Fallback Scoring

The quiz should calculate two layers:

1. Fantasy bucket scores across all six buckets.
2. Supported MVP build score between `strengthMelee` and `dexterityArcher`.

Recommended scoring rules:

- Each answer adds 1 point to its primary fantasy bucket.
- Each answer also contributes to an MVP fallback build:
  - `strengthMelee` maps to Strength melee Fighter.
  - `dexterityArcher` maps to Dexterity archer Fighter.
  - `futureMagic`, `futureHealingSupport`, `futureStealthTrickery`, and
    `futureSocialCleverChaos` must still map to one of the two supported Fighter builds as the
    nearest available MVP fallback.
- Highest supported fallback score wins.
- If supported fallback scores tie, use a deterministic tiebreaker:
  1. Prefer the supported bucket with the higher direct score.
  2. If still tied, prefer the fallback from the final answered question.
  3. If still tied, default to Strength melee Fighter.

The UI must not expose these scoring rules during the quiz.

## Future-Path Messaging

If an unsupported future bucket is one of the user's strongest fantasy signals, the recommendation
screen should acknowledge it honestly.

Required tone:

- Encouraging.
- Clear that the fantasy is not supported by this first MVP.
- Clear that the app is recommending the closest available Fighter style for now.
- No implication that spells, healing, stealth, deception systems, or all classes are implemented.

Example messaging:

Magic:

> Your answers have a spark of magic in them. This first version does not build spellcasters yet, so
> the recommendation below is the closest beginner Fighter style available right now.

Healing/support:

> Your answers lean toward protecting or supporting allies. This first version does not build
> healers yet, so the recommendation below keeps you useful in the supported Fighter paths.

Stealth/trickery:

> Your answers enjoy sneaky or tricky solutions. This first version does not build rogue-style
> characters yet, so the recommendation below picks the closest supported Fighter style.

Social clever chaos:

> Your answers like clever, dramatic, or social chaos. This first version does not build social
> specialists yet, so the recommendation below chooses the closest supported Fighter style.

## Recommendation Copy

Strength melee Fighter:

> Your closest supported match is a Strength melee Fighter: a level-1 Human Fighter who stands up
> front, protects allies, and handles danger face to face. This build uses chain mail, a shield, and
> a longsword, with strong defense and a simple, sturdy combat plan.

Secondary note:

> Good fit if you want your character to feel brave, durable, and direct.

Dexterity archer Fighter:

> Your closest supported match is a Dexterity archer Fighter: a level-1 Human Fighter who fights
> from range, moves for a better angle, and solves problems with accurate shots. This build uses a
> longbow, lighter armor, and positioning, with a strong ranged attack.

Secondary note:

> Good fit if you want your character to feel alert, flexible, and precise.

Override copy:

> Prefer the other supported Fighter style? No problem. This recommendation is guidance, not a lock.

## Required Behavior For Later Implementation

- Clicking `Help me choose` starts the revised quiz.
- One question is shown at a time.
- Each question has 4 answer choices.
- User can go Back and Next.
- Next is disabled or blocked until an answer is selected.
- Progress text shows `Question 1 of 5`, etc.
- Answer cards do not visibly expose bucket names, scoring, or Fighter build labels.
- After the fifth question, show the recommendation screen.
- Recommendation screen shows:
  - strongest supported Fighter recommendation;
  - future-path messaging if unsupported buckets are prominent;
  - accept recommended Fighter action;
  - choose other supported Fighter action.
- Draft state stores:
  - questionnaireAnswers
  - fantasyBucketScores
  - unsupportedFantasyBuckets
  - recommendedBuild
  - selectedBuild
  - recommendationWasOverridden
- No backend call.
- No saving.
- No review step.
- No manual-entry implementation.

## Accessibility Requirements

- Use native radio inputs or correct radiogroup semantics.
- Answer cards must be keyboard selectable.
- Visible focus states are required.
- Selected state must not rely only on color or bold text.
- Answer text should use regular body typography.
- Recommendation result must use heading text.
- Buttons must have explicit labels:
  - `Use Strength melee Fighter`
  - `Use Dexterity archer Fighter`
  - `Choose Dexterity archer Fighter`
  - `Choose Strength melee Fighter`

## Edge Cases

- A user changes an earlier answer: recompute bucket scores, future-path signals, and recommendation.
- A user overrides the recommendation: preserve `recommendedBuild` and store the user's
  `selectedBuild`.
- Answers later align with the override: clear `recommendationWasOverridden`.
- Unsupported buckets dominate: still recommend a supported Fighter build and show future-path
  messaging.
- Multiple unsupported buckets are strong: show at most the strongest one or two messages to avoid
  overwhelming the result screen.
- Supported fallback tie: use deterministic tiebreaking.
- Refreshing the page still loses in-memory draft state until a future persistence task exists.

