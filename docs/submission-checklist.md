# TFM Submission Checklist

Status: active source of truth for the final submission week

Deadline: 20 July 2026

Authoritative source:
`/Users/marce/Documents/Desarrollo con IA/contenido/9. TFM/Documento del TFM.pdf`

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
- [ ] Dedicated teacher-review username and password.
- [ ] Public slides URL or committed slide artifact.
- [ ] Public narrated video URL.

### Source code

- [x] Public GitHub repository: `https://github.com/Inkala/rpg-companion`.
- [ ] Final submission commit is pushed and CI is green.

### Working deployment

- [x] Frontend: `https://hunin.marceramirez.com`.
- [x] Backend health: `https://api.hunin.marceramirez.com/healthz`.
- [ ] Final smoke test passes with the dedicated teacher-review account.
- [ ] Test account can sign in and open at least one saved character.

The project is educational. It only needs to remain available through teacher review. Do not spend
the final week on long-term operations, deletion cleanup, broad scalability, or production hardening
unless they directly protect the review experience.

### Slides

- [ ] Create the project presentation.
- [ ] Include the problem, users, product demo, architecture, AI-assisted workflow, testing,
  security, deployment, lessons learned, and known limitations.
- [ ] Publish the slides or commit the artifact.
- [ ] Add the public URL to README and the submission form.

### Narrated screen-capture video

- [ ] Record Marcela explaining the project while capturing the screen.
- [ ] Demonstrate the deployed application.
- [ ] Show source structure, tests/CI, and selected engineering decisions.
- [ ] Publish the video.
- [ ] Add the public URL to README and the submission form.

### Submission form

- [ ] Full name.
- [ ] Master enrollment email.
- [ ] GitHub repository URL.
- [ ] Deployment URL.
- [ ] Slides URL.
- [ ] Video URL.
- [ ] Test username and password.
- [ ] Submit before 20 July 2026.

## P1: Final release integrity

- [x] Review, commit, and push the validated T-015 mobile profile navigation follow-up (`0a724fb`).
- [ ] Complete and verify T-018 whole-application security baseline before resuming feature work.
- [ ] Re-run frontend lint, typecheck, tests, and build on final main.
- [ ] Re-run backend tests, vet, and build on final main.
- [ ] Confirm GitHub Actions passes on final main.
- [ ] Run final public smoke tests at desktop and mobile widths.
- [ ] Confirm no secrets or private credentials are committed.
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

## Feature freeze unless P0 is secure

The following product work is deferred until the formal submission package is safe:

- party creation, invitations, joining, roster, and GM permissions;
- guest localStorage persistence and account conversion;
- profile editing, password reset, verification, and deletion flows;
- attack calculation breakdowns, HP controls, and broader resource tracking;
- rules search, AI guidance, level-up, and additional D&D content;
- production-data cleanup that does not affect teacher review.

## Evidence sources

- `README.md`: evaluator-facing project documentation.
- `CURRENT.md`: current integration state and single next action.
- `tasks/T-*/`: scoped requirements, plans, implementation checklists, and validation notes.
- `DECISIONS.md`: durable decisions.
- `WORKLOG.md`: chronological work evidence.
- `.github/workflows/ci.yml`: automated quality gates.
- `docs/project-checklist.md`: broader course-topic evidence backlog.
