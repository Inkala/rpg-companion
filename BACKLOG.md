# Backlog

This is a concise future-work index. It is not the final-week source of truth.

Use, in order:

1. `docs/submission-checklist.md` for delivery priority.
2. `CURRENT.md` for active work and ownership.
3. `tasks/T-*/` for approved task scope and evidence.
4. This file only when selecting future work.

Task IDs reflect actual task folders and do not map reliably to the older GitHub issue numbering.

## Active integration

- [x] T-015 follow-up: mobile profile navigation and account-menu icon improvements integrated in
  `0a724fb`; CI passed.
- [x] T-016: orchestration, documentation, submission, and GitHub synchronization reset integrated
  in `7f5e787`; CI passed.
- [x] T-018: whole-application security baseline integrated and deployed.
- [x] T-017: Party MVP integrated, deployed, and publicly smoke-tested.
- [x] T-019: account and character UX polish integrated and deployed.
- [x] T-020: Party quest-board cards and Home section contrast integrated and deployed.
- [x] T-021: Save and invite reliability integrated and deployed.
- [x] T-022: Character Reference visual QA integrated and deployed.

## P0: TFM submission package

- [ ] Create a dedicated teacher-review account and saved demo character.
- [ ] Add teacher-review credentials to README and the submission form.
- [ ] Create and publish project slides.
- [ ] Record and publish the narrated screen-capture video.
- [ ] Run final CI and public smoke validation.
- [ ] Record the final submission commit and complete the submission form.

## P1: High-value course evidence

Recommended parallel tasks after the current dirty-main integration is resolved:

- [ ] ADR pack: architecture, PostgreSQL, authentication, and Railway decisions.
- [ ] OpenAPI specification for implemented auth and character endpoints.
- [ ] Playwright critical-path E2E test with axe-core accessibility audit.
- [ ] Coverage reporting and lightweight pre-commit quality gate.
- [ ] Structured Go request logging and request IDs.
- [ ] Focused deployed accessibility/contrast audit.

## Deferred product work

- [ ] Guest draft localStorage persistence and account conversion.
- [x] Party creation, invite link, joining, and character linking.
- [x] GM roster and server-side party authorization.
- [ ] Post-MVP Party follow-up: let a GM remove a Player membership without deleting or modifying
  the linked character. The removed character becomes available to join another party.
- [x] Character creation launched from an invite uses the ordinary creation experience and
  automatically attempts to join the pending Party with the saved character.
- [ ] Post-MVP Party follow-up: existing-member linked-character replacement remains deferred.
- [ ] Profile editing, email verification, and password reset.
- [ ] Account, character, and production test-data deletion.
- [ ] Built-in portrait-bank integration.
- [ ] Gender selector and data contract.
- [ ] Character/profile/account editing and deletion.
- [ ] Party editing/deletion, description, and member removal.
- [ ] Attack reminder badges and calculation breakdowns.
- [ ] HP/resource tracking and saved-character editing.
- [ ] Character search, broader rules content, and additional classes.
- [ ] Level-up guidance.
- [ ] AI explanation or recommendation feature.

## Completed baseline

- [x] Public guest landing and Mara sample.
- [x] Mobile Character Reference and Colossus Slayer quick reference.
- [x] React/TypeScript frontend and Go backend scaffold.
- [x] PostgreSQL persistence and migrations.
- [x] Registration, sign-in, sign-out, and owner-scoped sessions.
- [x] Generated Fighter creation and save.
- [x] Manual existing-character transfer and save.
- [x] My characters list and saved Character Reference.
- [x] Public frontend, Railway backend, PostgreSQL, and smoke testing.
- [x] Compact Character Reference header/stat polish.
- [x] Read-only profile page.
- [x] Party creation, secure invite, atomic join, roster, and GM read-only Character Reference.
