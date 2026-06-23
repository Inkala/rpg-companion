# T-001 Requirements: Foundation

## Goal

Produce all planning, design, and project setup that must exist before the first line of
production code is written. Completing this task means every pending decision from
`docs/project-checklist.md` (Foundation section) has been resolved and documented, the project
infrastructure is running, and the app is already deployed to a real URL.

## Outputs required

1. Wireframes, user flows, and reusable component list for the priority screens.
2. Four ADRs: architecture style, database choice, auth approach, invite mechanism.
3. Permission model documented (roles, rules, per-party assignment, data model).
4. Domain model documented (entities, derived values, use cases).
5. Git repository with `.gitignore` and `.env.example`.
6. Docker Compose covering all services (backend, database, frontend).
7. CI pipeline running lint, type-check, tests, and build on push.
8. Cloud deployment pipeline with auto-deploy on merge to main.
9. Pre-commit hooks configured.

## What this is not

- This task does not include any product features (auth screens, character forms, party flows).
- Wireframes are for planning purposes only — pixel-perfect design is not required here.
- The deployed app at the end of this task may be a hello-world or empty shell.
  What matters is that the pipeline exists and the URL is live.

## Acceptance

All nine outputs exist and are committed. The CI pipeline is green. The app is accessible at a URL.
`DECISIONS.md` has at least four entries. `docs/project-checklist.md` Foundation items are all
checked.
