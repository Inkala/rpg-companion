# Current Work

Active task: T-014 GM feedback triage for Character Reference

State: T-014 is a docs-only feedback triage task. It captures early Spanish GM feedback about the
current Character Reference and in-session experience, classifies each suggestion by scope, and
recommends keeping the first implementation slice small.

T-002 status: authentication and owner-scoped character implementation completed, committed, and validated.

T-004 status: reusable Character Reference extraction has merged into main.

T-006 status: Home action hierarchy and form/button polish completed, committed, and validated.

T-007 status: frontend app-shell architecture refactor completed, committed, pushed, and validated.

T-010 status: manual character entry planning completed and approved. Recommended next feature is
Fill the sheet myself V1.

T-011 status: character creation entry and draft foundation completed, pushed, and validated.

T-012 scope: revised Help me choose questionnaire implementation inside `frontend/src/character-creation/`.
Adds a 5-question, 4-answer quiz with broader fantasy buckets, supported Fighter fallback scoring,
honest future-path messaging, and no saving/backend behavior.

T-013 status: generated Fighter save flow completed, committed, pushed, validated, and smoke-tested
locally. Selected Help me choose Fighter builds generate `CharacterSheetV1`, review before save,
persist through authenticated `POST /characters`, appear in My characters, and open in Character
Reference.

T-013A scope: add pure frontend generated Fighter data and mappers only. No review step, save UI,
backend calls, routes, My characters card changes, or Character Reference loading changes.

T-013B scope: add generated character review after Help me choose selection, signed-in
authenticated save, signed-out save prompt, loading/error/success states, and create-character API
helper. No saved-character route or Character Reference loading.

T-013C status: added `/characters/:id`, saved character detail loading, valid `CharacterSheetV1`
rendering in Character Reference, My characters open actions, and Open Character Reference after
save success. Manual smoke testing found one copy bug in the saved reference back label; it was
fixed and pushed in `70e80e6`.

Next action: Review T-014 and decide whether the next implementation slice should be Character
Reference compact stat/header polish.

Task folder: `tasks/T-014/`

Last updated: 2026-07-09
