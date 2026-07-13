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

## Academic Delivery Context

Hunin is the final project for a Master's program in Software Development with AI. The goal is to
demonstrate applied product, architecture, AI-assisted development, testing, security, cloud, and
documentation practices through a real application.

Formal deadline: 20 July 2026.

The deployment only needs to remain usable through teacher review. Long-term commercial operation,
indefinite data retention, and post-review feature continuity are not requirements. During the final
week, `docs/submission-checklist.md` takes priority over optional roadmap breadth.

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

Current durable decisions are recorded in `DECISIONS.md`. This summary may lag detailed task docs.

Frontend: React + TypeScript (confirmed)

Backend: Go (confirmed)

Framework (Go): standard library `net/http`

Data storage: PostgreSQL (confirmed)

Auth approach: app-managed username/email/password auth with PostgreSQL-backed server sessions and
HttpOnly cookies (confirmed)

Testing (frontend): Vitest plus React Testing Library for current focused tests. E2E remains future
work.

Testing (backend): Go standard library testing package (confirmed)

Error tracking: not implemented

Logging (backend): structured request logging not implemented

Cloud provider: Railway for the deployed Go backend and PostgreSQL

CI: GitHub Actions (confirmed)

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

Prerequisites: Node 24, pnpm 11.7.0, Go 1.26, Docker, and `golang-migrate`.

Install:

```sh
cd frontend
pnpm install
```

Run locally:

```sh
docker compose up -d postgres

migrate -path backend/migrations \
  -database "postgres://hunin:hunin@localhost:5432/hunin?sslmode=disable" up

cd backend
APP_ENV=local \
DATABASE_URL="postgres://hunin:hunin@localhost:5432/hunin?sslmode=disable" \
ALLOWED_ORIGINS="http://localhost:5173" \
go run ./cmd/server

# In another shell
cd frontend
VITE_API_BASE_URL="http://localhost:8080" pnpm dev
```

Test:

```sh
cd frontend && pnpm test
cd ../backend && go test ./...
```

Build:

```sh
cd frontend && pnpm build
cd ../backend && go build ./...
```

## Design Principles

- Player experience is the central product. GM features exist to support group onboarding.
- The app must work well without AI. AI is an optional enhancement.
- Mobile-friendly character reference when needed. Laptop/tablet can support creation and editing.
- Progressive disclosure: show the most useful information first, reveal detail on demand.
- Clear over ornamental: fantasy-inspired but readable and calm.
- Structured rules and character data first. AI explanation and guidance second.
- Add complexity only when it solves a real product need or satisfies a course requirement.
