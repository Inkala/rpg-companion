# Hunin

*Your party companion*

Hunin is a Dungeons & Dragons 5E 2014 player companion for new, occasional, and busy players. It
helps a player explore a sample character, create or transfer a character, save it, understand its
most useful information, and join a Party without having to decode a dense paper sheet.

This repository is Marcela Ramirez's final project for a Master's program in Software Development
with AI. It demonstrates product discovery, spec-driven and AI-assisted engineering, frontend and
backend development, relational persistence, automated testing, security controls, accessibility,
continuous integration, cloud deployment, and documentation as code.

## Live project and final evidence

- Public application: [https://hunin.marceramirez.com](https://hunin.marceramirez.com)
- API health: [https://api.hunin.marceramirez.com/healthz](https://api.hunin.marceramirez.com/healthz)
- Public repository: [https://github.com/Inkala/rpg-companion](https://github.com/Inkala/rpg-companion)
- Final T-026 SHA: `[T026_FINAL_SHA]`
- Final CI run: `[T026_CI_RUN_URL]`
- Final deployment status: `[T026_DEPLOYMENT_STATUS]`
- Final public smoke date: `[T026_PUBLIC_SMOKE_DATE]`
- Final submission date: `[FINAL_SUBMISSION_DATE]`

These placeholders are intentional in the T-023 drafting branch. T-026 must merge, deploy, and pass
public smoke first. This branch must then rebase onto final `main` and replace every placeholder
before submission.

## Teacher review access

- Username: `[TEACHER_USERNAME]`
- Password or access instructions: `[TEACHER_PASSWORD_OR_ACCESS_INSTRUCTIONS]`

Use only a dedicated teacher-review account. Do not reuse a personal account or expose unrelated
credentials. The final account should contain at least one saved character and enough Party data to
review the implemented flow.

## Implemented functionality

### Guest experience

- Explore the public landing page without an account.
- Open the Mara Vale sample and its mobile-friendly Character Reference.
- Open the Colossus Slayer quick-reference detail.
- Start either the five-question `Help me choose` flow or `Fill the sheet myself` manual transfer
  flow before signing in.
- Review a generated Fighter or manually entered character. An account is required for server-side
  saving.

Guest draft persistence and automatic conversion from local storage are not implemented.

### Authentication and account access

- Register with username, email, and password.
- Sign in, restore a server-backed session, and sign out with confirmation.
- Open a read-only profile page.
- Return to an interrupted Party invite after authentication without retaining the raw invite token
  in visible browser history.

Registration intentionally returns the user to sign-in instead of creating an authenticated
session automatically.

### Characters

- Generate one of the supported Fighter builds from the guided flow.
- Transfer a character through the manual CharacterSheetV1 form.
- Review and save a valid character to an authenticated account.
- List saved characters on Home and reopen them by stable route after refresh.
- Use a generic avatar when a character has no portrait.
- Preserve a linked character when joining a Party through an invite.

General character editing, deletion, arbitrary derived-stat calculation, and full rules coverage
remain outside the submitted baseline.

### Party

- Create a Party as its GM.
- Generate and copy a time-bounded opaque invite link.
- Inspect an invite only after authentication and join with one owned character.
- View Party cards, member summaries, and the Members list.
- Let the GM open a Party member's read-only Character Reference.
- Protect Party and character data with membership and role authorization enforced by the backend.

The MVP does not include Party deletion, member removal, GM character linking, or replacement of an
existing member's linked character.

### Character Reference

- Present identity, HP, AC, Speed, Initiative, Passive Perception, and Proficiency in a compact,
  scannable view.
- Group actions, bonus actions, reactions, features, spells, and other reference sections.
- Expand and collapse detail while retaining semantic labels.
- Open focused quick-reference content for supported entries.
- Support public sample, owner, and authorized GM read-only routes.
- Adapt to phone, tablet, and desktop widths.

### Level-up: pending T-026

Level-up is not claimed complete in this documentation draft. T-026 is implementing a bounded,
owner-only, one-level-at-a-time flow for eligible saved single-class SRD characters, covering only
the approved transitions from levels 1 through 5. Its final functionality, validation, deployment,
and public smoke evidence must be reconciled after T-026 integrates.

## Architecture and deployment

Hunin is a small modular monolith with two application runtimes and one relational database:

| Layer | Technology | Responsibility | Deployment |
|---|---|---|---|
| Web client | React 19, TypeScript, Vite | Responsive UI, route coordination, forms, local view state | Cloudflare Pages |
| API | Go 1.26, standard library `net/http` | Authentication, validation, authorization, Party and character operations | Railway |
| Data | PostgreSQL | Accounts, hashed sessions, characters, Parties, memberships, and invites | Railway PostgreSQL 18.4 |

The frontend is organized into feature folders. The Go API uses feature-oriented packages with
focused HTTP, validation, and persistence code. Browser requests cross the public HTTPS API
boundary, and the backend is authoritative for authentication, ownership, and Party permissions.
Versioned SQL migrations evolve the PostgreSQL schema. Merges to `main` trigger GitHub Actions and
the configured provider deployments. Local Docker Compose and CI validation use PostgreSQL 17. The
current Railway production database uses PostgreSQL 18.4.

## Technology stack

- Frontend: React 19, TypeScript 5.8, Vite 6, React Testing Library, Vitest, ESLint, Radix Tooltip,
  Lucide icons, and Sonner.
- Backend: Go 1.26, `net/http`, pgx, PostgreSQL 17 for local and CI validation, PostgreSQL 18.4 on
  the current Railway production deployment, golang-migrate, and Argon2id.
- Delivery: GitHub Actions, Cloudflare Pages, Railway, Docker Compose for local PostgreSQL, pnpm,
  and Go tooling.

## Project structure

```text
rpg-companion/
  backend/
    cmd/server/              Go API entrypoint
    internal/auth/           registration, sessions, validation, middleware
    internal/characters/     character API, validation, and persistence
    internal/parties/        Party, membership, invite, and authorization logic
    internal/config/         fail-closed environment configuration
    migrations/              versioned PostgreSQL schema
  frontend/
    src/accounts/            authentication and account UI
    src/character-creation/  guided and manual character flows
    src/characters/          Character Reference and character API
    src/parties/             Party creation, invite, join, Members, and presentation
    src/features/home/       signed-in and guest Home content
  docs/                      evaluator, product, design, deployment, and workflow records
  tasks/                     scoped requirements, plans, checklists, and validation notes
  .github/workflows/         continuous integration
  compose.yaml               local PostgreSQL service
```

## Local setup

### Prerequisites

- Node.js 24
- pnpm 11.7.0
- Go 1.26.5 or the version declared in `backend/go.mod`
- Docker Desktop or another Docker-compatible runtime
- golang-migrate CLI

### Install and run

Install frontend dependencies:

```sh
cd frontend
pnpm install
```

From the repository root, start PostgreSQL and apply migrations:

```sh
docker compose up -d postgres

export HUNIN_LOCAL_DATABASE_URL="postgres://hunin:hunin@localhost:5432/hunin?sslmode=disable"
migrate -path backend/migrations \
  -database "$HUNIN_LOCAL_DATABASE_URL" up
```

Start the backend:

```sh
cd backend
PORT=8080 \
APP_ENV=local \
DATABASE_URL="$HUNIN_LOCAL_DATABASE_URL" \
ALLOWED_ORIGINS="http://localhost:5173" \
go run ./cmd/server
```

In another shell, start the frontend:

```sh
cd frontend
VITE_API_BASE_URL="http://localhost:8080" pnpm dev
```

Open `http://localhost:5173` and verify the API at `http://localhost:8080/healthz`. The example
`hunin`/`hunin` credential is intentionally public local Docker Compose development configuration,
not a production secret. Never reuse it in a deployed environment. Production database URLs remain
private provider-managed configuration and must never be committed.

## Validation commands

Frontend:

```sh
cd frontend
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Backend:

```sh
cd backend
go test ./...
go vet ./...
go build ./...
```

To run the PostgreSQL-backed integration suite against a disposable local database, start from the
repository root:

```sh
docker compose exec -T postgres createdb -U hunin hunin_test

cd backend
TEST_DATABASE_URL="postgres://hunin:hunin@localhost:5432/hunin_test?sslmode=disable" \
  go test -p 1 ./...
```

The integration suite resets the test database's `public` schema. Never point `TEST_DATABASE_URL`
at the normal `hunin` development database or any production database. The disposable `hunin_test`
database may be dropped afterward. GitHub Actions additionally runs dependency checks and a
redacted full-history secret scan.

Final evidence after T-026:

- Frontend test count: `[FINAL_FRONTEND_TEST_COUNT]`
- Backend test evidence: `[FINAL_BACKEND_TEST_EVIDENCE]`

## Security and privacy

- Passwords are hashed with Argon2id.
- Authentication uses random opaque server sessions. PostgreSQL stores a SHA-256 hash of each token,
  not the raw token.
- Production session cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`.
- The API uses exact allowed-origin checks, request size limits, strict JSON decoding, server
  timeouts, private-response `no-store` headers, and security response headers.
- Character ownership and Party roles are enforced by the backend. Inaccessible resources use
  generic responses to reduce cross-user disclosure.
- Invite tokens are handled as private data, scrubbed from the browser fragment, hashed at rest,
  and omitted from ordinary Party responses.
- Registration and sign-in have bounded Argon2 concurrency and process-local throttling.
- Secrets and production database URLs belong only in environment or provider configuration.

Hunin stores account identifiers, authentication data, character sheets, and Party membership
needed for the review experience. It does not use a runtime AI service, advertising tracker, or
payment system. This is a limited educational deployment intended to remain available through
teacher review. Account deletion, password reset, MFA, distributed rate limiting, long-term
monitoring, and formal data-retention automation are not implemented.

## Accessibility and responsive design

Accessibility is treated as an implementation requirement. The interface uses meaningful headings
and labels, visible focus treatment, keyboard-operable controls, accessible names for icon actions,
error messages associated with forms, semantics that do not rely on color alone, readable mobile
type, and touch-friendly targets. Character and Party paths have been checked at 320px, 390px,
720px, and desktop widths during completed feature work. The final T-026 flow still requires its own
responsive and accessibility evidence before this statement can cover level-up.

The product uses progressive disclosure and short summaries to reduce cognitive load. The design is
mobile-first for in-session reference and expands for creation and management on larger screens.

## AI-assisted engineering disclosure

Codex was used as an engineering collaborator for requirements analysis, design exploration,
implementation, tests, debugging, security review, documentation, and validation orchestration.
Marcela set product direction, approved scope and tradeoffs, supplied project-specific context,
reviewed outputs, performed provider and public-browser actions, and retained final responsibility
for the submitted work. AI assistance is part of the development process, not a runtime Hunin
feature. No user character or account data is sent to an AI model by the application.

## Generated portrait disclosure

A separate 12-class portrait bank was generated with OpenAI image-generation capabilities through
the Codex desktop application. The assets are AI-generated and human-directed. They are not
integrated into the submitted application at this drafting checkpoint. Provenance, attribution,
human contribution, non-uniqueness, and review limitations are documented in
[Portrait asset provenance and attribution](docs/portrait-assets.md).

## SRD and rules-data attribution

T-026 owns the canonical SRD rules-data record. Its final source, license, transformation, and
generated-file evidence must be reconciled after T-026 integrates. See
[Rules-data provenance and attribution](docs/rules-data.md). This link intentionally targets the
T-026-owned document that is not present on the T-023 drafting base.

## Known limitations

- Level-up remains pending T-026 and is not part of the current completion claim.
- Only the approved guided Fighter builds and manually supplied character content are supported in
  the existing creation experience.
- There is no general character edit or delete flow.
- Profile editing, email verification, password reset, MFA, and account deletion are not available.
- Party administration does not include Party deletion, member removal, GM character linking, or
  existing-member character replacement.
- The portrait bank is documented but not integrated.
- Runtime rules search, AI explanations, broad combat/resource tracking, homebrew automation,
  multiclass progression, and paid-book content are outside scope.
- The single-instance rate limiter and manual migration/deployment evidence are proportionate to an
  educational review deployment, not a commercial service.
- The deployment only needs to remain operational through teacher review.

## Submission resources

- Slides: `[SLIDES_URL]`
- Narrated screen-capture video: `[VIDEO_URL]`
- Final submission checklist: [docs/submission-checklist.md](docs/submission-checklist.md)

The slides and video remain pending feature freeze and final T-026 reconciliation. They must not be
presented as complete until their URLs replace the placeholders.

## Further documentation

- [Project and academic context](PROJECT.md)
- [Current integration state](CURRENT.md)
- [Product decisions](docs/product-decisions.md)
- [Design direction](docs/design.md)
- [Deployment notes](docs/deployment.md)
- [Security and course evidence backlog](docs/project-checklist.md)
- [Task history](tasks/)
