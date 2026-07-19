# TFM Submission Checklist

Status: active source of truth for the final submission week

Deadline: 20 July 2026

Authoritative source: the school-provided TFM brief retained by Marcela. The private local source
location is intentionally not published as an evaluator instruction.

This checklist tracks what must be delivered for teacher review. The broader engineering evidence
backlog remains in `docs/project-checklist.md`, but optional feature breadth must not displace the
formal deliverables below.

## P0: Formal submission requirements

### Complete README

- [x] General project description.
- [x] Technology stack.
- [x] Installation and execution instructions.
- [x] Project structure.
- [x] Principal functionality.
- [x] Public repository and deployment URLs.
- [ ] Dedicated teacher-review username: `[TEACHER_USERNAME]`.
- [ ] Dedicated teacher-review password or access instructions:
  `[TEACHER_PASSWORD_OR_ACCESS_INSTRUCTIONS]`.
- [ ] Public slides URL or committed slide artifact: `[SLIDES_URL]`.
- [ ] Public narrated video URL: `[VIDEO_URL]`.

### Source code

- [x] Public GitHub repository: `https://github.com/Inkala/rpg-companion`.
- [ ] Final submission commit is pushed and CI is green. Current production SHA:
  `e0ac1e450849e5c751ba71b396e8c11b4545d0b0`; successful T-028 CI:
  `https://github.com/Inkala/rpg-companion/actions/runs/29688775007`. T-025 is active, and the later
  T-023 submission commit is not yet created.

### Working deployment

- [x] Frontend: `https://hunin.marceramirez.com`.
- [x] Backend health: `https://api.hunin.marceramirez.com/healthz`.
- [x] T-026 Railway and Cloudflare deployments are successful at exact SHA
  `232335f26b8a16b5addcc68bf5de29bd22451b3f`.
- [x] Public Level Up smoke passed on `2026-07-18` at desktop and 390px.
- [x] T-028 Railway deployment `3ee59bfd-ab50-45f5-94b5-94cbbc08af3f` and Cloudflare deployment
  `fefc2f41-56b4-4392-a8d1-62744b714720` succeeded at exact SHA
  `e0ac1e450849e5c751ba71b396e8c11b4545d0b0`.
- [x] T-028 frontend and backend health returned HTTP 200, and migration `000004` remained clean.
- [x] T-028 public short-code and complete-link invitation smoke passed.
- [ ] Final smoke test passes with the dedicated teacher-review account.
- [ ] Test account can sign in and open at least one saved character.

The project is educational. It only needs to remain available through teacher review. Do not spend
the final week on long-term operations, deletion cleanup, broad scalability, or production hardening
unless they directly protect the review experience.

### Slides

- [ ] Create the project presentation.
- [ ] Include the problem, users, product demo, architecture, AI-assisted workflow, testing,
  security, deployment, lessons learned, and known limitations.
- [ ] Publish the slides or commit the artifact: `[SLIDES_URL]`.
- [ ] Add `[SLIDES_URL]` to README and the submission form.

### Narrated screen-capture video

- [ ] Record Marcela explaining the project while capturing the screen.
- [ ] Demonstrate the deployed application.
- [ ] Show source structure, tests/CI, and selected engineering decisions.
- [ ] Publish the video: `[VIDEO_URL]`.
- [ ] Add `[VIDEO_URL]` to README and the submission form.

### Submission form

- [ ] Full name.
- [ ] Master enrollment email.
- [ ] GitHub repository URL.
- [ ] Deployment URL.
- [ ] Slides URL.
- [ ] Video URL.
- [ ] Test username and password.
- [ ] Submit before 20 July 2026 and record the date: `[FINAL_SUBMISSION_DATE]`.

## P1: Final release integrity

- [x] Review, commit, and push the validated T-015 mobile profile navigation follow-up (`0a724fb`).
- [x] Complete and verify T-018 whole-application security baseline before resuming feature work.
- [x] Complete, merge, deploy, and publicly validate T-024 at
  `b942700a31af7efa22b0349018d692084b32965b`.
- [x] Complete and merge T-026 source implementation at
  `232335f26b8a16b5addcc68bf5de29bd22451b3f`.
- [x] Re-run frontend lint, typecheck, tests, and build for the T-026 release checkpoint.
- [x] Record T-026 frontend evidence: 32 test files and 649 tests passed; audit found no known
  vulnerabilities; lint, typecheck, and production build passed.
- [x] Re-run backend tests, vet, and build for the T-026 release checkpoint.
- [x] Record T-026 backend evidence: all 9 packages passed with PostgreSQL-backed tests;
  govulncheck, vet, and build passed.
- [x] Confirm GitHub Actions passed for the T-026 release checkpoint:
  `https://github.com/Inkala/rpg-companion/actions/runs/29647619803`.
- [x] Confirm Railway deployment `0d40c230-9b63-42ff-b162-9f7bf38c4783` and Cloudflare Pages
  deployment `18ff8791-beb0-4bfc-9de6-898ed49d4c69` succeeded at the exact SHA.
- [x] Run public Level Up smoke at desktop and 390px on `2026-07-18`.
- [x] Record the focus-ring automation limitation without treating it as a confirmed defect.
- [x] Complete, merge, deploy, and publicly validate T-028 at
  `e0ac1e450849e5c751ba71b396e8c11b4545d0b0`.
- [x] Confirm T-028 CI passed Frontend, Backend, and Secret history:
  `https://github.com/Inkala/rpg-companion/actions/runs/29688775007`.
- [x] Confirm T-028 automatic production deployments remain enabled and no unexpected deployment
  occurred.
- [ ] Complete and integrate active T-025 before final T-023 reconciliation.
- [ ] Rebase T-023 onto post-T-025 `main`, reconcile final evidence, and merge T-023 last.
- [x] Confirm no secrets or private credentials are committed.
- [ ] Tag or record the final submission commit.

## P2: High-value course evidence

Do these only in isolated, reviewable tasks after P0 is safely scheduled.

- [ ] Convert provisional architecture, database, auth, and deployment decisions into concise ADRs.
- [ ] Add an OpenAPI document for the implemented auth and character endpoints.
- [ ] Add one Playwright critical-path E2E test with an axe-core accessibility check.
- [ ] Add honest coverage reporting and a lightweight pre-commit quality gate.
- [ ] Add structured backend request logging with request IDs.
- [ ] Complete an accessibility and contrast audit of the deployed core path.

These are strong demonstrations of course learning. They are not listed as separate required
resources in the authoritative TFM document.

## No further feature breadth unless P0 is secure

Outside the explicitly active T-025 scope, the following product work remains deferred until the
formal submission package is safe:

- guest localStorage persistence and account conversion;
- profile editing, password reset, verification, and deletion flows;
- HP controls and combat or resource tracking beyond the active T-025 character-sheet scope;
- runtime rules search, AI guidance, homebrew, and non-SRD content beyond the active T-025 scope;
- Party deletion, member removal, GM character linking, and existing-member character replacement;
- production-data cleanup that does not affect teacher review.

T-026 Level Up and T-028 invitation-code release evidence are confirmed. T-025 is active and must
integrate before T-023 rebases. The dedicated teacher-account check, feature-freeze decision,
slides, video, submission form, and final submission commit also remain incomplete.

## Evidence sources

- `README.md`: evaluator-facing project documentation.
- `CURRENT.md`: current integration state and single next action.
- `tasks/T-*/`: scoped requirements, plans, implementation checklists, and validation notes.
- `DECISIONS.md`: durable decisions.
- `WORKLOG.md`: chronological work evidence.
- `.github/workflows/ci.yml`: automated quality gates.
- `docs/project-checklist.md`: broader course-topic evidence backlog.
