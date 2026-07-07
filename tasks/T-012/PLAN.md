# T-012: Revised Help me choose Fighter questionnaire planning

## Goal

Plan the revised MVP Help me choose questionnaire for `/characters/new`.

The quiz should feel playful and simple, closer to a multi-choice personality quiz than a rules
form. It may detect broader fantasy preferences, but the MVP still recommends only one of two
supported level-1 Human Fighter styles:

- Strength melee Fighter
- Dexterity archer Fighter

Unsupported fantasies should receive honest future-path messaging instead of fake support.

## Context

The old uncommitted T-012 implementation was reverted because it used the obsolete 3-question,
2-answer questionnaire. Product direction now calls for:

- 5 questions
- 4 answers per question
- broader fantasy buckets
- no visible scoring or build mappings while answering
- honest future-path messaging for unsupported fantasies
- Fighter-only MVP output

T-011 is complete and pushed. The existing `/characters/new` page has the character creation entry
shell, mode choice, and in-memory draft foundation.

## Parallel-work assessment

- Classification: Yellow
- Recommendation: current worktree for planning, implementation only after approval
- Reason: Planning is isolated to `tasks/T-012/` and status docs, but implementation will touch
  `frontend/src/character-creation/` and shared route-level tests.
- Expected owned files or folders: `tasks/T-012/`; later `frontend/src/character-creation/`
- Shared files or dependencies: `frontend/src/App.test.tsx`, existing `/characters/new` route,
  future app-shell/header/navigation work

## Scope

In scope for this planning task:

- Define the revised 5-question, 4-answer quiz direction.
- Define fantasy buckets and supported fallback scoring.
- Define result messaging for supported and unsupported preferences.
- Define accessibility requirements and edge cases.
- Define an implementation plan.

Out of scope for this planning task:

- Application code changes.
- Backend changes.
- Tests.
- Routing changes.
- Saving.
- Manual entry.
- Dependencies.
- Figma changes.
- App-wide header/navigation implementation.

## Explicit Separate Task

Global app header/navigation is a separate decision and implementation task.

T-012 should not decide or implement:

- app header with logo/account/profile/sign-out on every page;
- creation top Back behavior;
- route-level navigation architecture;
- shared app-shell layout.

Those decisions should be approved separately before application code changes mix them into the
questionnaire implementation.

## Implementation Plan For Later

1. Update the character creation draft types to track quiz answers, fantasy bucket scores,
   recommended build, selected build, unsupported bucket signals, and override state.
2. Add a data-driven 5-question quiz with 4 natural-language answers per question.
3. Hide bucket and build mappings while the user answers.
4. Score all fantasy buckets, then map the strongest supported signal to one of the two MVP Fighter
   builds.
5. If unsupported fantasy buckets are prominent, show future-path messaging alongside the MVP
   Fighter recommendation.
6. Preserve user override between Strength melee Fighter and Dexterity archer Fighter.
7. Add accessible radio-card UI with keyboard support, visible focus, and non-color selected state.
8. Add focused tests for quiz progression, hidden mappings, supported fallback scoring, unsupported
   messaging, recommendation, and override behavior.
9. Run frontend validation.

## Validation Plan For Later Implementation

Run:

```sh
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
git diff --check
git status --short
```

