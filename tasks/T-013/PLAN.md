# T-013: Generated Fighter save flow planning

Status: complete

T-013A, T-013B, and T-013C are complete, committed, pushed, validated, and smoke-tested locally.
The first MVP character loop now works locally: Help me choose, review generated Fighter, save, My
characters, and saved Character Reference opening. The saved reference back-label bug found during
manual smoke testing was fixed in `70e80e6 fix(characters): label saved reference back action`.

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: planning in the current worktree, implementation in the current worktree only
  after T-012 is reviewed and closed. Use a separate worktree only if T-012 remains uncommitted and
  this implementation must start before it is merged.
- Reason: This planning task is docs-only, but implementation will touch the active
  `frontend/src/character-creation/` area, shared character API helpers, route parsing, home My
  characters behavior, and Character Reference loading.
- Expected owned files or folders: `tasks/T-013/`; later `frontend/src/character-creation/`,
  `frontend/src/characters/`, possibly `frontend/src/auth/`, possibly `frontend/src/pages/`,
  possibly `frontend/src/app/`.
- Shared files or dependencies: current T-012 quiz state, `CharacterSheetV1`,
  `POST /characters`, `GET /characters/{id}`, signed-in home character list, global app shell,
  auth session state.

## Goal

Plan the next implementation slice:

Help me choose recommendation/selection should produce a level-1 Human Fighter character, show a
review step, save it through the existing authenticated character API, show it in My characters, and
allow opening it in Character Reference.

## Context

Certain:

- T-011 added the `/characters/new` entry foundation.
- T-012 added a revised 5-question Help me choose questionnaire that recommends one of two Fighter
  builds.
- The backend already supports authenticated owner-scoped create, list, and detail endpoints for
  characters.
- The frontend character API currently lists character summaries only.
- Character Reference currently renders the Mara sample route, not saved character detail.
- `CharacterSheetV1` and `characterSheetToReference` provide the intended rich reference mapping.

Assumption:

- This task should make the guided Fighter output useful before full D&D character creation rules
  exist. Fixed beginner builds are acceptable and preferred for MVP.

## Scope

In scope for future implementation:

- Fixed data definitions for Strength melee Fighter and Dexterity archer Fighter.
- Mapping selected build plus user-provided name into the current backend create payload.
- Mapping the same generated data into `referencePayload` as `CharacterSheetV1`.
- Review step before save.
- Signed-out preview with sign-in required to save.
- Save loading, success, and error states.
- My characters refresh or navigation that shows the saved character summary.
- Saved character detail route or equivalent path that loads `GET /characters/{id}` and renders
  Character Reference.
- Focused frontend tests for mapping, review, signed-out behavior, save errors, list appearance,
  and saved reference opening.

Out of scope:

- Full class support.
- Spells.
- Subclasses.
- Ability score rolling.
- Point buy.
- Equipment shopping.
- Party or GM flow.
- Image upload.
- Backend migrations unless implementation proves the existing contract is insufficient.
- Backend authorization redesign.
- Dependencies, CI, deployment config, branches, worktrees, staging, commits, or pushes as part of
  this planning task.

## Product Direction

Use a review step before save.

The review should show:

- name;
- class/build;
- ancestry;
- background;
- HP;
- AC;
- main attack;
- a few key features.

The first generated builds are fixed beginner builds, not a full D&D rules generator.

## Backend Contract Summary

Future implementation should use the existing authenticated `POST /characters` contract.

Required request fields:

- `name`
- `className`
- `level`
- `ancestry`
- `background`
- `abilityScores.strength`
- `abilityScores.dexterity`
- `abilityScores.constitution`
- `abilityScores.intelligence`
- `abilityScores.wisdom`
- `abilityScores.charisma`
- `hitPoints.current`
- `hitPoints.max`
- `armorClass`
- `speedFt`
- `referencePayload`

Optional request field:

- `subclassName`

Do not send:

- `ownerSubjectId`

The backend assigns ownership from the authenticated session and rejects client-supplied
`ownerSubjectId`.

## Recommended Implementation Split

1. Generated build data and mappers.
   Add typed fixed Fighter build definitions, create-payload mapping, and `CharacterSheetV1` mapping
   with unit tests.
2. Review and authenticated save.
   Add name entry or confirm-name behavior, review UI, sign-in-required save state, create API
   helper, loading state, and save error UI.
3. Saved character listing and reference opening.
   Add get-by-id frontend API helper, route parsing for saved characters, Character Reference
   hydration from `referencePayload`, and home list interaction.

Recommendation: keep these as one implementation task only if T-012 is already closed and the same
developer owns the route/API changes. Otherwise split at the boundaries above.

## Validation Plan For Future Implementation

Run:

```sh
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
git diff --check
git status --short
```

Backend checks are not expected unless backend code changes become necessary.

## Planning Validation

For this docs-only task:

```sh
git diff --check
git status --short
```

## Commit Message

```text
docs(characters): plan generated fighter save flow
```
