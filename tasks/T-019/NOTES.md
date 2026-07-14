# T-019 Notes

## 2026-07-14 planning

- Certain: Marcela supplied `character right.png` as the target card and `character wrong.png` as
  the current saved-character card.
- Certain: account registration currently creates a server session and the frontend treats the
  response as authentication success.
- Certain: manual validation already produces field-specific errors and a summary alert, but no
  required markers or first-invalid focus behavior exist.
- Certain: guided and manual saves currently show another action before navigating.
- Certain: the current owner-scoped summary DTO lacks portrait, featured abilities, and landing
  concept even though CharacterSheetV1 stores and validates them.
- Certain: Sonner `2.0.7` declares React 18/19 support, TypeScript types, MIT licensing, and no
  runtime dependencies.
- Certain: Marcela explicitly prohibited Party implementation in T-019.
- Assumption: the requested shared visual requires a narrow summary DTO extension so saved cards can
  display truthful CharacterSheetV1 preview content rather than invented abilities.

## Deferred Party requirement

Creating a character from an invite should eventually use the ordinary creation flow, automatically
link the saved character to the pending Party, and open its expanded Character Reference. This
requires separate Party orchestration and is not authorized by T-019.

## 2026-07-14 approval

- Certain: Marcela approved the exact three-slice T-019 checklist.
- Certain: implementation belongs in a new dedicated session and worktree after the planning
  checkpoint is committed.
- Certain: only Slice 1 is authorized to start. It must stop for review before commit or Slice 2.

## Evidence reviewed

- Existing auth Register handler and AuthForm behavior.
- Existing manual validation and save-success interactions.
- Existing Mara sample and saved-character Home cards.
- Character summary repository and DTO privacy boundary.
- `docs/design.md` accessibility and mobile requirements.
- `docs/course-rubric.md` section 4 authentication requirements.
- Sonner official package and repository metadata.
