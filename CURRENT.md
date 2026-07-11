# Current Work

Active priority: choose the next product slice after T-010

State: Main is expected to be clean and pushed. Railway has been selected for the first public
backend deployment, and the public backend deployment is complete and smoke-tested.

T-002 status: authentication and owner-scoped character implementation completed, committed, and validated.

T-004 status: reusable Character Reference extraction has merged into main.

T-006 status: Home action hierarchy and form/button polish completed, committed, and validated.

T-007 status: frontend app-shell architecture refactor completed, committed, pushed, and validated.

T-010 status: Fill the sheet myself V1 is complete, committed, pushed, validated, and publicly
smoke-tested. The implementation shipped in `911fef1`, `b3fca28`, and `a0df4b9`. Users can choose
`Fill the sheet myself` from `/characters/new`, enter required core sheet data, include one optional
action and one optional feature or note, review, save while signed in, see the character in My
characters, open saved Character Reference, and refresh the saved URL. No blocking bugs were found.

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

Public smoke status: public smoke testing passed on 2026-07-11 at
`https://hunin.marceramirez.com`. Backend health passed at
`https://api.hunin.marceramirez.com/healthz`, returning
`{"status":"ok","service":"hunin-backend"}`. Frontend availability passed with HTTP 200 through
Cloudflare. Account signup, logout, and login passed. Both public creation paths now work: Help me
choose generated Fighter and Fill the sheet myself manual entry. Saving, My characters listing,
opening saved Character Reference, refreshing the saved Character Reference URL, and generic avatar
fallback all passed. Manual optional action displayed. Manual optional feature displayed after
expanding the existing collapsed Features section. Mara sample still opens. A quick mobile-width
check found no horizontal overflow on home/My characters or sample Character Reference.

Known non-blocking note: manual features are collapsed by default after refresh because Features is
an existing collapsed Character Reference section. This is consistent with current behavior.

Production smoke-test residue: disposable account `t010cglx3py@example.com` and characters
`Smoke Fighter t010cglx3py` and `Smoke Manual t010cglx3py` remain in production because there is no
deletion flow yet.

Next action: ask Marcela to choose the next product slice: Character Reference polish from GM
feedback, public demo data/deletion cleanup, or party creation/join planning.

Task folder: `tasks/T-010/`

Last updated: 2026-07-11
