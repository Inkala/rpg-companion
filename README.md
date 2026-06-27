# Hunin
*Your party companion*

## Working Concept

D&D 5E player companion app.

## Main Goal

Help players join a party, transfer or create a character, understand their abilities during play, and later level up with guidance.

## Users

Primary user: player.

Secondary user: GM, who creates a party and can view full character sheets.

## Current Product Decisions

- Use mobile first for in-session character reference.
- Use laptop/tablet for detailed character creation and editing.

## Scope Approach

The project will be developed through incremental, usable releases.

Each release should provide a complete but narrow end-to-end experience for users, rather than isolated technical pieces that only become useful at the end.

The goal is to validate the product with real players as early as possible, then expand it based on feedback.

Features will be prioritised from:
1. Core playable experience
2. In-session usefulness
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

The scaffold runs the frontend and backend as separate local processes. Docker, a database, authentication, persistence, and cloud deployment are not part of this slice.

### Frontend

```sh
cd frontend
npm install
npm run dev
```

Useful checks:

```sh
cd frontend
npm run typecheck
npm run lint
npm test
npm run build
```

Configuration example: `frontend/.env.example`.

### Backend

```sh
cd backend
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

Configuration example: `backend/.env.example`. The backend reads environment variables from the shell and uses safe local defaults for this scaffold.
