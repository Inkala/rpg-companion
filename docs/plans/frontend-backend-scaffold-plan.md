# Frontend and Backend Scaffold Plan

## Purpose

Plan the implementation for the issue: "Scaffold frontend and backend development environments."

This ticket creates the project shape for later work. It does not build product features beyond a minimal frontend shell and backend health endpoint.

## Proposed repository tree after this ticket

```text
.
├── backend/
│   ├── .env.example
│   ├── go.mod
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   └── internal/
│       ├── config/
│       └── http/
│           └── health.go
├── frontend/
│   ├── .env.example
│   ├── index.html
│   ├── pnpm-lock.yaml
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       └── main.tsx
└── docs/
    └── plans/
        └── frontend-backend-scaffold-plan.md
```

Notes:

- Exact generated Vite support files may vary slightly.
- Do not add Dockerfiles, Compose files, database files, auth files, API clients, or feature folders in this ticket.
- Keep backend folders intentionally small. Add domain/use-case/persistence packages only when the first real domain slice exists.

## Responsibilities

### `frontend/`

The frontend is responsible for:

- hosting the React + TypeScript app
- providing a minimal visible app shell so the Vite dev server and build can be validated
- preparing environment-based configuration for later API base URL use
- using pnpm as the frontend package manager through Corepack
- including Vitest with one minimal smoke test for the React App shell
- keeping the standard ESLint setup included by the chosen Vite React + TypeScript scaffold
- supporting later UI implementation for the guest landing page, sample Character Reference, and quick-reference bottom sheet

The frontend is not responsible yet for:

- real API integration
- routing
- state management
- CSS framework setup
- authentication
- guest draft storage
- sample character implementation
- browser E2E testing
- component-library testing
- custom lint rule design

### `backend/`

The backend is responsible for:

- hosting a Go HTTP service using the standard `net/http` package initially
- exposing a minimal health endpoint
- loading and validating minimal runtime configuration
- providing a package shape that can grow into the modular-monolith backend without adding ceremony early

The backend is not responsible yet for:

- database access
- authentication or sessions
- authorization
- character, party, invite, or guest-draft endpoints
- persistence
- OpenAPI generation

## Minimal expected commands

### Frontend

Expected command shape:

```sh
corepack enable
cd frontend
pnpm install
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

Repository and CI expectations:

- `package.json` should include a `packageManager` field for the chosen pnpm version.
- `pnpm-lock.yaml` should be committed.
- CI should use Corepack and `pnpm install --frozen-lockfile` when the CI workflow is added.
- Do not commit `package-lock.json`, `npm-shrinkwrap.json`, or `yarn.lock`.

Testing:

- include Vitest in this scaffold
- add one minimal smoke test for the React App shell
- `pnpm test` must be a real, runnable command
- do not add browser E2E testing or component-library testing

Linting:

- keep the standard ESLint setup included by the chosen Vite React + TypeScript scaffold
- `pnpm lint` must be a real, runnable command
- do not spend time designing custom lint rules beyond sensible scaffold defaults

### Backend

Expected commands:

```sh
cd backend
go run ./cmd/server
go test ./...
go vet ./...
go build ./cmd/server
```

Backend tests should use Go's standard testing package for the health handler if a test is added during scaffold implementation.

## Minimal backend endpoint

### `GET /healthz`

Purpose: confirm the backend process is running and suitable for later local checks, CI smoke checks, and container health checks.

Expected response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "status": "ok",
  "service": "hunin-backend"
}
```

Constraints:

- no database check yet
- no auth check yet
- no dependency status yet
- response should be stable enough for future smoke tests

## Environment and configuration convention

### Files

Create:

- `frontend/.env.example`
- `backend/.env.example`

Do not commit real `.env` files.

### Frontend variables allowed now

The frontend may define a placeholder API base URL variable for later use:

```text
VITE_API_BASE_URL=http://localhost:8080
```

This does not require real API integration in this ticket.

### Backend variables allowed now

The backend may define:

```text
PORT=8080
APP_ENV=local
```

Backend configuration should use environment variables supplied by the shell initially. Do not add a `.env` loading library in this ticket. `backend/.env.example` is documentation for variables developers should export locally.

Only add `ALLOWED_ORIGIN` if the scaffold actually implements CORS. Prefer not to add CORS yet because there is no real frontend-to-backend integration in this ticket.

### Must not be added yet

- database URLs
- session secrets
- auth secrets
- password hashing parameters
- cloud provider settings
- observability DSNs
- third-party service credentials
- committed local `.env` files

## Minimal validation before done

The issue is done when:

- `frontend/` exists and starts a Vite React + TypeScript app locally
- frontend build succeeds
- frontend TypeScript check succeeds
- frontend lint succeeds
- frontend smoke test succeeds
- `backend/` exists as a Go module
- backend starts with `go run ./cmd/server`
- `GET /healthz` returns the expected JSON response
- `go test ./...` succeeds
- `go vet ./...` succeeds
- `go build ./cmd/server` succeeds
- `.env.example` files exist with non-secret values only
- README or CHECKS updates are planned separately if not included in this ticket

## Explicitly out of scope

- product UI beyond a minimal app shell
- CSS tooling or design system setup
- routing library
- state management
- browser E2E testing
- component-library testing
- custom ESLint rule design beyond scaffold defaults
- Go web framework
- Go router dependency
- database, migrations, repositories, or persistence
- Docker, Docker Compose, or Dockerfiles
- authentication, sessions, cookies, CSRF, CORS, or authorization
- real frontend-to-backend API integration
- OpenAPI spec
- cloud deployment
- observability
- CI workflow
- sample character data

## Risks and questions before implementation

- Backend package names: keep the initial Go package layout minimal so it does not pre-decide domain boundaries before the first domain slice.
- README and CHECKS updates: this ticket may need small documentation updates once commands are real, even though this planning task does not modify existing files.
- Environment loading: use shell-provided environment variables for now; defer any `.env` loading library until it is justified by implementation needs.
