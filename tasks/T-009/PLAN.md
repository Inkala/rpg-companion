# T-009: Define character sheet JSON model

## Status

Planning.

## Product goal

Define a rich, versioned `CharacterSheetV1` JSON model for Hunin before adding richer character
creation, manual character entry, or `GET /characters`.

The model must support:

- Mara Velard as an audited internal sample fixture later.
- Manual entry from existing paper character sheets.
- Guided character creation output.
- Character Reference sections and quick-reference details.
- Future saved-character list summaries without loading full character detail.

## Context

Hunin is a D&D 5E companion app. Project docs identify D&D 5E 2014 as the intended ruleset unless a
later decision says otherwise.

The backend architecture audit concluded that the backend should not be refactored now. The current
backend shape is still the target:

- explicit relational columns for character summary, ownership, and core stats;
- JSONB storage for richer character details and app reference content.

Use Mara Velard as the internal sample and fixture candidate. Do not use Ninea Crowny as an app
fixture. Ninea is reserved for later real-user testing.

The uploaded/generated Mara sheet is a rough draft. It may contain inconsistent, incomplete, or
mixed-rules data. Treat it as an audit source and information-architecture reference, not canonical
truth.

## Non-goals

- No code implementation.
- No frontend changes.
- No backend changes.
- No database migration.
- No backend refactor.
- No automatic PDF parsing, OCR, or import pipeline.
- No full D&D rules engine.
- No Ninea fixture.
- No attempt to make every paper-sheet field a relational database column.

## Parallel-work assessment

- Classification: Green for this docs-only task.
- Recommendation: current worktree for docs only after confirming no active task owns
  `tasks/T-009/`.
- Reason: The task creates isolated planning files and does not touch application code, migrations,
  dependencies, CI, or deployment config.
- Expected owned files or folders: `tasks/T-009/`.
- Shared files or dependencies: existing character docs, current Mara sample docs, backend
  `referencePayload` contract, future Character Reference mapper.

## Implementation follow-up assessment

Implementation follow-up tasks should not start until this docs task is reviewed and approved.

- Corrected Mara fixture: Yellow, because it touches shared sample/reference files.
- Frontend `CharacterSheetV1` types: Yellow, because it touches `frontend/src/characters/`.
- Mapper from `CharacterSheetV1` to Character Reference: Yellow, because it touches shared reference
  rendering and tests.
- Backend validation: Yellow, because it touches API contract behavior.
- `GET /characters`: Yellow, because it adds backend and frontend API surface.

## Deliverables

- `PLAN.md`: task scope and sequence.
- `REQUIREMENTS.md`: requirements, non-goals, persistence boundaries, and open questions.
- `DESIGN.md`: proposed `CharacterSheetV1` shape, Mara audit, Character Reference mapping, and
  future API impact.
- `TASKS.md`: review checklist and implementation follow-up breakdown.
- `NOTES.md`: observed facts, assumptions, and audit notes.

## Validation

Run:

```sh
git diff --check
git status --short --untracked-files=all
```

No app checks are required because this task is documentation-only.

## Recommended next action

Review and approve the `CharacterSheetV1` model direction before any backend endpoint, frontend
fixture, or Character Reference mapper work starts.
