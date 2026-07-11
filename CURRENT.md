# Current Work

Active priority: T-010 Fill the sheet myself V1

State: Main is expected to be clean and pushed. Railway has been selected for the first public
backend deployment, and the public backend deployment is complete and smoke-tested.

T-002 status: authentication and owner-scoped character implementation completed, committed, and validated.

T-004 status: reusable Character Reference extraction has merged into main.

T-006 status: Home action hierarchy and form/button polish completed, committed, and validated.

T-007 status: frontend app-shell architecture refactor completed, committed, pushed, and validated.

T-010 status: manual character entry planning completed and approved. Implementation has not
started. Recommended next product feature is Fill the sheet myself V1.

T-011 status: character creation entry and draft foundation completed, pushed, and validated.

T-012 status: revised Help me choose questionnaire completed, committed, pushed, and validated.
It adds a 5-question, 4-answer quiz with broader fantasy buckets, supported Fighter fallback
scoring, honest future-path messaging, and no saving/backend behavior.

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

T-014 status: GM feedback triage for Character Reference completed, committed, pushed, and
validated as a docs-only task. It recommends Character Reference compact stat/header polish as a
future small product slice, not as the active priority.

Railway deployment status: public deployment completed and smoke-tested on 2026-07-11. Backend
health passed at `https://api.hunin.marceramirez.com/healthz`, returning
`{"status":"ok","service":"hunin-backend"}`. Frontend availability passed at
`https://hunin.marceramirez.com` with HTTP 200 through Cloudflare. Account UI and the public manual
smoke loop passed: create account, signup, logout, login, generate Fighter through Help me choose,
save Fighter, return to My characters, open saved Character Reference, refresh saved Character
Reference URL, and confirm the saved character still displays. No Hunin app bugs were found.

Production smoke-test residue: one disposable smoke-test account and character remain in production
because there is no account-deletion flow yet.

Next action: start the first approved T-010 implementation slice for Fill the sheet myself V1.

Task folder: `tasks/T-010/`

Last updated: 2026-07-11
