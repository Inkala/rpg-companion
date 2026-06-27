# Local Development and Containerization Strategy

## Purpose

This document records the agreed strategy for issue #4. It is not an implementation guide yet. It explains how Hunin should start local development, when containerization becomes required, and what evidence the project must eventually provide for the course.

## Current local-development approach

Hunin starts with separate local frontend and backend processes:

- React + TypeScript frontend runs as its own local development process.
- Go backend runs as its own local development process.
- Docker is not required for the first static guest/sample-character slice.
- Environment-based configuration must be supported from the start.
- Secrets must never be committed to Git.

This keeps the first implementation slice small while preserving the final architecture shape: React frontend, Go backend, REST API, and later a relational database.

## Containerization decision

Docker Compose is required as course evidence before real user testing and final submission.

Introduce Docker Compose when the backend and relational database are both meaningful local services. At that point, the local stack has enough moving parts for Compose to provide real value instead of ceremony.

The initial Compose setup should run:

- frontend
- backend
- database

Kubernetes and microservices are out of scope for the current project. Hunin remains a modular monolith with one Go backend service.

## Milestones

### Now: documentation and repository hygiene

Trigger: before application code begins.

Expected work:

- document the local-development and containerization strategy
- keep `.env` excluded from Git
- prepare for `.env.example` with variable names and no secret values
- keep README, CHECKS, and project documentation aligned as commands become real

Docker status: not required yet.

### After frontend/backend scaffold: local commands and basic CI

Trigger: the React frontend and Go backend exist as runnable services.

Expected work:

- document local run, test, and build commands
- configure basic CI for lint, type-check, tests, and build where available
- keep environment configuration explicit for both services
- avoid hardcoded URLs, ports, credentials, or secrets

Docker status: still optional unless the backend already depends on a local database.

### When persistence begins: Docker Compose and database service

Trigger: Hunin adds real backend persistence for authenticated users, characters, parties, memberships, invites, or sessions.

Expected work:

- add Docker Compose for frontend, backend, and database
- add service-level Dockerfiles where needed
- document how to start the full local stack
- ensure the app can run from copied example environment variables plus local-only secret values
- support repeatable database setup and migrations

Docker status: required from this point forward.

### After one working vertical slice: cloud deployment

Trigger: one complete user-testable journey works locally, such as guest/sample exploration through Play View, or the first authenticated party/character slice.

Expected work:

- choose and document a deployment target
- deploy the app to a real URL
- manage production configuration through the deployment environment
- keep deployment simple and reproducible

Docker status: deployment approach may use containers, but the exact topology is deferred.

### Before real user testing: production-readiness checks

Trigger: the app will be used by real players outside local development.

Expected work:

- observability and error tracking
- alerting for application errors or critical failures
- at least one E2E critical-flow test
- final deployment security review
- production cookie, CSRF, CORS, and secret-management review
- confirmation that Docker Compose still starts the full local stack

Docker status: required as local reproducibility evidence.

## Repository and configuration conventions

Hunin should use these conventions as the stack becomes real:

- `.env.example` is committed with required variable names and safe placeholder guidance.
- `.env` and any real secret files are excluded from Git.
- Each runtime validates required environment variables at startup or test setup.
- README documents run, test, and build commands once they exist.
- CHECKS lists the smallest useful local checks and the full validation path.
- Local, test, and production configuration stay separate where behavior or credentials differ.
- Secrets are supplied through local `.env` files or deployment-provider configuration, never source code.

Do not add implementation commands before the relevant tools and services exist.

## Decisions made now

- React frontend and Go backend start as separate local processes.
- Docker is not required for the first static guest/sample-character slice.
- Docker Compose is required before real user testing and final submission.
- Docker Compose should be introduced when the backend and relational database are both meaningful local services.
- The first Compose stack should include frontend, backend, and database.
- Kubernetes is out of scope.
- Microservices are out of scope.
- Environment-based configuration and secret hygiene are required from the beginning.

## Deferred decisions

- Docker Desktop or alternate container runtime choice.
- Database vendor.
- Database image and local database configuration.
- Exact Dockerfile and Compose file details.
- Cloud provider.
- Deployment topology.
- Observability vendor.
- Production secret-management mechanism.
- Production cookie, CORS, and CSRF configuration.
- Whether deployment uses the same containers as local development.

## Definition of done for issue #4

Completed now:

- this strategy document exists and is consistent with the course rubric, project checklist, architecture proposal, and data/auth proposal
- the document states when Docker is not needed yet
- the document states when Docker Compose becomes required
- the document records repository and configuration expectations without choosing vendors or writing implementation commands

Scheduled later:

- `.env.example`
- actual frontend/backend local commands
- CI workflow
- Dockerfiles
- `docker-compose.yml`
- database service
- cloud deployment
- observability and alerting
- E2E critical-flow test
- final deployment security review

Issue #4 should be considered complete as a strategy/proposal once this document is reviewed and approved. The implementation work remains separate and should be tracked by later setup, CI, persistence, deployment, and observability issues.
