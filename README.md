# Hunin
*Your party companion*

## Working Concept

D&D 5E player companion app.

## Main Goal

Help players create or bring in a character, understand their options, join a party, and later level up with guidance. Character reference and quick explanations support that core experience when a player needs a reminder.

## Users

Primary user: player.

Secondary user: GM, who creates a party and can view full character sheets.

## Current Product Decisions

- Use mobile-friendly Character Reference when a player needs to review character details or open quick explanations.
- Use laptop/tablet for detailed character creation and editing.

## Scope Approach

The project will be developed through incremental, usable releases.

Each release should provide a complete but narrow end-to-end experience for users, rather than isolated technical pieces that only become useful at the end.

The goal is to validate the product with real players as early as possible, then expand it based on feedback.

Features will be prioritised from:
1. Core character and party access
2. Character reference and quick explanations
3. Guided onboarding
4. Character progression
5. Advanced assistance and future expansion

## Naming and Visual Style

The final name and visual style are still undecided.


## Technical Direction

- Frontend: React + TypeScript.
- Backend: Go.
- The backend should be designed as a learning opportunity and broadly follow the architectural concepts used in the user's professional environment, without copying any work code, internal practices, or proprietary information.
- Infrastructure, Docker, cloud deployment, CI/CD, security, observability, and service boundaries are intentionally undecided until the course materials have been reviewed.

## Local Development

The scaffold runs the frontend and backend as separate local processes. PostgreSQL runs through
Docker Compose for the persisted-character foundation and local authentication. Character lists,
parties, and backend cloud deployment are not part of this slice.

The deployed static frontend at `https://hunin.marceramirez.com` currently has no deployed backend.
The Mara Velard guest demo remains usable there, but registration and sign-in are intentionally not
shown as live public features until the backend is deployed.

### Frontend

Requires Node 24 LTS and pnpm 10.17.1.

```sh
cd frontend
pnpm install
pnpm dev
```

Useful checks:

```sh
cd frontend
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Configuration example: `frontend/.env.example`.

For local authentication UI, configure:

```sh
VITE_API_BASE_URL=http://localhost:8080
```

If `VITE_API_BASE_URL` is absent, the frontend keeps the guest demo usable and presents accounts as
unavailable instead of submitting forms to a missing backend.

### Backend

Requires Docker Desktop or another Docker-compatible runtime for local PostgreSQL. Database
migrations use the golang-migrate CLI.

Start PostgreSQL:

```sh
docker compose up -d postgres
```

Apply database migrations from the repository root:

```sh
migrate -path backend/migrations \
  -database "postgres://hunin:hunin@localhost:5432/hunin?sslmode=disable" up
```

Run the backend:

```sh
cd backend
DATABASE_URL="postgres://hunin:hunin@localhost:5432/hunin?sslmode=disable" \
ALLOWED_ORIGINS="http://localhost:5173" \
go run ./cmd/server
```

The backend health endpoint is available at:

```sh
curl http://localhost:8080/healthz
```

Expected response:

```json
{"status":"ok","service":"hunin-backend"}
```

Useful checks:

```sh
cd backend
go test ./...
go vet ./...
go build ./cmd/server
```

Persistence integration tests use `TEST_DATABASE_URL` only. They never fall back to `DATABASE_URL`.
For local integration tests, point `TEST_DATABASE_URL` at a disposable test database, not the normal
`hunin` development database. If `TEST_DATABASE_URL` is absent, integration tests skip and unit tests
still run.

Configuration example: `backend/.env.example`. The backend reads environment variables from the shell and uses safe local defaults for this scaffold.

Local authentication uses an HttpOnly `hunin_session` cookie, PostgreSQL-backed server sessions, and
an explicit CORS allowlist. Registration requires username, email, and password. Username is the
public in-app identity. Email is stored as a private, unverified contact/recovery foundation; this
milestone does not send confirmation email or implement password reset. Users may sign in with
username or email. Future production shape is expected to be:

- Frontend: `https://hunin.marceramirez.com`
- Backend: `https://api.hunin.marceramirez.com`
