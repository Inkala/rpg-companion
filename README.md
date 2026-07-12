# Hunin

*Your party companion*

Hunin is a Dungeons & Dragons 5E 2014 player companion. It helps occasional and newer players create
or transfer a character, understand the result, save it to their account, and open a clear mobile
Character Reference without decoding a dense paper sheet.

This repository is Marcela Ramirez's final project for a Master's program in Software Development
with AI. It demonstrates spec-driven development, AI-assisted engineering, test-first delivery,
frontend and backend development, security-conscious authentication, PostgreSQL persistence, CI,
cloud deployment, and docs-as-code.

## Live project

- Application: [https://hunin.marceramirez.com](https://hunin.marceramirez.com)
- Backend health: [https://api.hunin.marceramirez.com/healthz](https://api.hunin.marceramirez.com/healthz)
- Public source: [https://github.com/Inkala/rpg-companion](https://github.com/Inkala/rpg-companion)
- Project slides: pending before submission
- Narrated screen-capture video: pending before submission

## Teacher-review account

A dedicated username and password will be added here before the 20 July 2026 submission.

Do not use the disposable smoke-test account as the final review account.

## Principal functionality

Available in the deployed project:

- public guest landing page;
- Mara Vale sample character exploration;
- mobile-friendly Character Reference;
- Colossus Slayer quick-reference sheet;
- username/email and password registration;
- sign-in, sign-out, and server-side session restoration;
- read-only profile page;
- `Help me choose` five-question character questionnaire;
- generated Fighter review and authenticated save;
- `Fill the sheet myself` manual character transfer and authenticated save;
- owner-scoped My characters list;
- saved Character Reference routes that survive refresh;
- generic avatar fallback;
- responsive application shell and account navigation.

Intentionally deferred:

- parties, invitations, roster, and GM authorization;
- guest draft persistence in localStorage and conversion after sign-in;
- profile editing, email verification, password reset, and deletion;
- character editing and deletion;
- broad D&D rules coverage, level-up, combat/resource tracking, and AI advice.

## Technology stack

### Frontend

- React 19
- TypeScript 5.8
- Vite 6
- React Testing Library
- Vitest
- ESLint
- Lucide icons and Radix Tooltip

### Backend

- Go 1.26
- standard library `net/http`
- PostgreSQL 17
- pgx
- versioned SQL migrations with golang-migrate
- Argon2id password hashing
- opaque PostgreSQL-backed server sessions in HttpOnly cookies

### Delivery

- GitHub Actions for frontend and backend quality gates
- Railway for the Go backend and PostgreSQL
- public frontend at `hunin.marceramirez.com`
- public backend at `api.hunin.marceramirez.com`

## Project structure

```text
rpg-companion/
  backend/
    cmd/server/              Go application entrypoint
    internal/auth/           registration, sessions, validation, middleware
    internal/characters/     owner-scoped character API and persistence
    internal/config/         environment configuration
    internal/health/         health endpoint
    internal/server/         routes and CORS
    migrations/              versioned PostgreSQL schema
  frontend/
    src/accounts/            authentication and account UI
    src/app/                 router and shared application shell
    src/character-creation/  guided and manual creation flows
    src/characters/          Character Reference and character API
    src/features/home/       signed-in and guest home content
    src/pages/               route-level pages
  docs/                      product, design, course, deployment, and workflow docs
  tasks/                     task requirements, plans, checklists, and validation notes
  .github/workflows/         continuous integration
  compose.yaml               local PostgreSQL service
```

The Go backend is a pragmatic feature-oriented modular monolith. HTTP and persistence remain in
feature packages with focused validation and tests. The React frontend uses feature folders,
central route coordination, and screen-specific view models.

## Prerequisites

- Node.js 24 LTS
- pnpm 11.7.0
- Go 1.26 or the version declared in `backend/go.mod`
- Docker Desktop or another Docker-compatible runtime
- golang-migrate CLI

The repository includes `.node-version` and pins `pnpm@11.7.0` in `frontend/package.json`.

## Local installation and execution

### 1. Install frontend dependencies

```sh
cd frontend
pnpm install
```

### 2. Start PostgreSQL

From the repository root:

```sh
docker compose up -d postgres
```

### 3. Apply migrations

```sh
migrate -path backend/migrations \
  -database "postgres://hunin:hunin@localhost:5432/hunin?sslmode=disable" up
```

### 4. Start the backend

The backend reads configuration from shell environment variables. `backend/.env.example` lists the
supported names.

```sh
cd backend
PORT=8080 \
APP_ENV=local \
DATABASE_URL="postgres://hunin:hunin@localhost:5432/hunin?sslmode=disable" \
ALLOWED_ORIGINS="http://localhost:5173" \
go run ./cmd/server
```

Verify it from another shell:

```sh
curl http://localhost:8080/healthz
```

Expected response:

```json
{"status":"ok","service":"hunin-backend"}
```

### 5. Start the frontend

Create `frontend/.env.local` from `frontend/.env.example`, or pass the value directly:

```sh
cd frontend
VITE_API_BASE_URL="http://localhost:8080" pnpm dev
```

Open `http://localhost:5173`.

If `VITE_API_BASE_URL` is absent, the public guest sample remains usable and account forms are shown
as unavailable instead of calling a missing backend.

## Tests and quality checks

### Frontend

```sh
cd frontend
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Backend

```sh
cd backend
go test ./...
go vet ./...
go build ./...
```

Backend persistence integration tests use `TEST_DATABASE_URL` only. The suite resets the `public`
schema for that database. Never point it at the normal development or production database.

Example with a disposable local test database:

```sh
cd backend
TEST_DATABASE_URL="postgres://hunin:hunin@localhost:5432/hunin_test?sslmode=disable" \
go test -p 1 ./...
```

If `TEST_DATABASE_URL` is absent, integration tests skip and unit tests still run.

GitHub Actions runs frontend lint, typecheck, tests, and build, plus backend tests, vet, and build on
pushes to `main` and pull requests targeting `main`.

## Security boundaries

- Passwords are hashed with Argon2id.
- Raw session tokens are not stored in PostgreSQL. Only SHA-256 token hashes are persisted.
- Authentication uses an HttpOnly cookie and a configured CORS allowlist.
- Protected character endpoints derive ownership from the authenticated session.
- Owner-scoped character reads return not found for another user's identifier.
- Guest sample data is public and separate from saved user characters.
- Secrets belong in environment variables and are excluded from Git.

This is an educational, limited-scope deployment. Password reset, email verification, login-abuse
protection, account deletion, and party-level authorization are not implemented.

## Documentation and development process

- Final submission readiness: `docs/submission-checklist.md`
- Current integration state: `CURRENT.md`
- Product overview: `PROJECT.md`
- Product direction: `docs/product-decisions.md`
- Course-evidence backlog: `docs/project-checklist.md`
- Orchestration workflow: `docs/orchestration.md`
- Durable decisions: `DECISIONS.md`
- Validation commands: `CHECKS.md`
- Task history: `tasks/`

Work follows lightweight spec-driven development. Each implementation task defines requirements,
scope, file ownership, a test-first plan, validation evidence, and merge considerations before code
changes begin.

## Known submission work

Before the final TFM submission:

- create the dedicated teacher-review account and add its credentials above;
- publish and link the project slides;
- record, publish, and link the narrated screen-capture video;
- run the final public smoke test;
- confirm final CI is green.
