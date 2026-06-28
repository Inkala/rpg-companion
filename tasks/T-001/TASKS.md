# T-001 Tasks: Foundation

Status: approved

Work through these in order. Each item must be checked before moving to the next.
Record decisions in `DECISIONS.md` as they are made.

---

## Design and planning

- [ ] Wireframes for priority screens: guest landing, mobile Character Reference, ability quick-reference
      card, party roster (GM view). Does not need to be pixel-perfect — flow and layout are enough.
- [ ] User flow diagram covering: guest arrival, guest draft creation, sign-up/login, join party,
      link character, view Character Reference.
- [ ] Reusable component list derived from the wireframes.

## Architecture decisions (ADRs)

- [ ] Architecture style ADR: choose and document the layering approach for the Go backend
      and the React frontend. Record in `DECISIONS.md` and `docs/adr/`.
- [ ] Database ADR: confirm PostgreSQL or document why an alternative was chosen.
      Record in `DECISIONS.md` and `docs/adr/`.
- [ ] Auth approach ADR: choose JWT, session cookies, or a third-party service.
      Record in `DECISIONS.md` and `docs/adr/`.
- [ ] Invite mechanism ADR: decide email or phone number. Email is recommended as the simpler
      starting point. Record in `DECISIONS.md` and `docs/adr/`.

## Domain and permission model

- [ ] Permission model written: roles (guest, player, GM), per-party assignment, one character per
      party per user, what each role can read and write, data model for party_memberships.
      Save to `docs/permission-model.md`.
- [ ] Domain model written: core entities (User, Character, Party, PartyMembership), key derived
      values (ability modifier, proficiency bonus, spell save DC), primary use cases.
      Save to `docs/domain-model.md`.

## Project setup

- [ ] Git repository initialized with `.gitignore` (excludes `.env`, build artifacts, secrets)
      and `.env.example` committed with all required variable names and no values.
- [ ] Docker Compose created covering all services: Go backend, PostgreSQL, React frontend.
      `docker compose up` reaches a working local environment.
- [x] CI pipeline configured: GitHub Actions workflow running on push to main and on PRs.
      Steps: lint + type-check (both services) then tests then build.
- [ ] Cloud deployment pipeline configured: app accessible at a real URL, auto-deploys on merge
      to main, environment variables managed via the cloud provider's config.
      Document the chosen provider in `DECISIONS.md`.
- [ ] Pre-commit hooks configured and documented in README.

## Wrap-up

- [ ] README written: what the project is, how to run locally, how to run tests, deployed URL.
- [ ] All Foundation items in `docs/project-checklist.md` checked.
- [ ] `DECISIONS.md` has entries for all four ADRs plus the cloud provider choice.
