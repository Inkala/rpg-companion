# T-003: Guided character creation MVP requirements and design

Status: approved

## Parallel-work assessment
- Classification: Green
- Can start in a separate worktree now: Yes
- Required base branch or commit: Current `main`, aligned with `origin/main` after T-002 is committed and validated.
- Files/folders this task owns: `tasks/T-003/`
- Shared files it must not modify: Application code, migrations, APIs, tests, dependencies, CI, deployment configuration, `tasks/T-002/`
- Dependencies or tasks that must merge first: T-002 authentication and owner-scoped characters must remain complete, committed, and validated.
- Planned integration point: None. This task produces planning documents only.
- Intended merge order: Merge before any T-003 implementation task starts.

## Goal

Define the requirements, design, and dependency-ordered implementation plan for the next Hunin
milestone: guided character creation MVP.

The eventual user-visible milestone should let a player make one valid level-1 Fighter through a
guided flow, save it when authenticated, and open it in Character Reference.

## Context

T-002 authentication and owner-scoped character persistence is completed, committed, and validated.
The current branch is aligned with `origin/main`.

Hunin is a D&D 5E 2014 companion for occasional or busy players. The creation milestone should be
intentionally narrow and achievable for the Master's project. Mara Velard remains the existing guest
demo and must not be changed by this planning task.

Existing authenticated endpoints are the intended persistence boundary:

- `POST /characters`
- `GET /characters/{id}`

After authenticated `POST /characters` succeeds, the first slice should render Character Reference
directly from the successful create response. `GET /characters/{id}` remains the later read boundary
for persisted loading when needed.

No `GET /characters` list endpoint is planned for this milestone.

## Non-Goals

- Do not implement all character creation.
- Do not support every class, ancestry, background, spell, subclass, feat, equipment choice, rolling,
  point buy, or multiclassing.
- Do not implement guest draft claiming.
- Do not implement localStorage persistence in the first slice.
- Do not add character list or character home functionality.
- Do not change Mara Velard in this planning task.
- Do not modify application code, migrations, APIs, tests, dependencies, CI, deployment
  configuration, or Git state in this planning task.

## Likely Files Or Artifacts

Planning artifacts:

- `tasks/T-003/PLAN.md`
- `tasks/T-003/REQUIREMENTS.md`
- `tasks/T-003/DESIGN.md`
- `tasks/T-003/TASKS.md`
- `tasks/T-003/NOTES.md`

Future implementation artifacts, not part of this planning task:

- `frontend/src/character-creation/`
- `frontend/src/characters/`
- Small updates to `frontend/src/App.tsx` as a coordinator only
- Small updates to `frontend/src/App.css` or extracted feature CSS if the implementation chooses it

## Risks

- Scope can expand into "all D&D character creation" unless the Fighter-only boundary is protected.
- Character Reference extraction can grow into a broad refactor if not kept as a separate task.
- App-level navigation can make `App.tsx` too large unless feature code remains in feature folders.
- Guest draft behavior can become identity migration work if localStorage or claiming is added too
  early.
- The current API can save and read a created character, but without `GET /characters` there is no
  saved-character home after refresh.

## Validation

This planning task is complete and approved. Documentation review and `git diff --check` passed.

Future implementation validation should include focused frontend tests for:

- draft derivation,
- guided flow states,
- guest save-disabled behavior,
- authenticated save payload,
- transition to Character Reference,
- regression coverage for Mara guest demo.

## Next Action

Extract reusable Character Reference foundation. Implementation has not started.
