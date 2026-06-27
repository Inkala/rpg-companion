# RPG Companion

## Product Name

**Hunin**

Tagline: *Your party companion.*

The name is inspired by Odin’s ravens and is intended to suggest memory, guidance, and a helpful fantasy companion.

## Purpose

A D&D 5E 2014 player companion app that helps busy, occasional, or new-to-D&D players create or
bring in a character, understand their options, join a party, and manage progression over time.

Core value: help players build, understand, and grow characters without decoding dense rules or
character sheets. Character reference and quick explanations support that core experience when a
player needs a reminder.

Full product context: `docs/product-decisions.md`

## Users

Primary: the player. Uses the app to create or bring in a character, understand abilities and
options, manage progression, and occasionally check character details or quick explanations on a
phone.

Secondary: the GM. Creates a party, invites players, and can view all party member character sheets.

Guest: a visitor who can explore the app and start a character before creating an account. Draft
saved in localStorage. An account is required to save, join a party, or share data.

## Scope Boundaries

In scope (v1 minimum):

- User authentication (register, log in, log out)
- User profile: display name and profile picture
- Guest character creation with localStorage draft and migration on sign-up
- Characters that exist independently of a party
- Party creation (user becomes GM)
- Player invite via link or code (mechanism TBD: email or phone)
- Player joins party and links one character to it
- GM party roster and full character sheet access
- Mobile-responsive character view

In scope (v2, if time allows after v1):

- Abilities, spells, and features with quick-reference cards
- Action type tags and resource tracking
- Mobile character reference view
- Error tracking and structured logging
- Accessibility audit

In scope (v3+, if time allows):

- Guided character creation
- Level-up flow
- AI ability explanation (one use case, optional)

Out of scope for this submission:

- Multiple RPG systems
- Kubernetes
- Combat and initiative tracking
- Full LLMOps pipeline
- RAG over private rulebooks
- Custom homebrew rules management system

See `docs/project-checklist.md` for the full staged checklist.

## Technology Choices

These are pending decisions. Each will become an ADR in `DECISIONS.md` when resolved.

Frontend: React + TypeScript (confirmed)

Backend: Go (confirmed)

Framework (Go): TBD

Data storage: TBD — PostgreSQL is the leading candidate (relational, structured character data)

Auth approach: TBD — JWT, session cookies, or third-party service (Auth0, Clerk, Supabase Auth)

Testing (frontend): TBD — Vitest or Jest for unit, Playwright for E2E

Testing (backend): Go standard library testing package (likely)

Error tracking: TBD — Sentry or equivalent

Logging (backend): TBD — structured JSON, likely `log/slog` or zerolog

Cloud provider: TBD — must support Go + PostgreSQL; Render, Railway, or Fly.io are candidates

CI: GitHub Actions (likely)

## Architecture Notes

Architecture style is a pending decision (ADR). Leading candidates: modular monolith with Clean
Architecture layering in the Go backend, and a component-based structure in the React frontend.

The app has two runtimes:

- Go backend: REST API, auth middleware, business logic, database access
- React TypeScript frontend: mobile-first UI, guest draft in localStorage

Character is the core domain entity. It has derived values (ability modifiers, proficiency bonus,
spell save DC), relationships (party membership, class, features, spells), and state that changes
through named operations (HP update, resource use, level-up).

Roles are per-party, not global. A user can be a GM in one party and a player in another.
One character per party per user.

Permission model:

- Guest: no server-side identity; draft in localStorage only
- Player: read/write own character; read own party membership
- GM: read all character sheets in parties they manage; cannot access outside parties

Full permission matrix: `docs/project-checklist.md` Foundation section.

## Setup Commands

TBD — will be filled in after technology choices are made and the repo is scaffolded.

Install:

```sh
# TBD
```

Run locally:

```sh
docker compose up
```

Test:

```sh
# TBD
```

Build:

```sh
# TBD
```

## Design Principles

- Player experience is the central product. GM features exist to support group onboarding.
- The app must work well without AI. AI is an optional enhancement.
- Mobile-friendly character reference when needed. Laptop/tablet can support creation and editing.
- Progressive disclosure: show the most useful information first, reveal detail on demand.
- Clear over ornamental: fantasy-inspired but readable and calm.
- Structured rules and character data first. AI explanation and guidance second.
- Add complexity only when it solves a real product need or satisfies a course requirement.
