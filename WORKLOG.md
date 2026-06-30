# Work Log

Append one short entry at the end of each work session.

## Entry Template

```text
## YYYY-MM-DD

Task:
What changed:
Validation:
Decisions:
Next action:
```

## Entries

## 2026-06-28

Task: T-001 CI pipeline
What changed: Added the first GitHub Actions CI workflow and documented the automatic checks.
Validation: Local frontend and backend checks passed. First GitHub Actions run pending.
Decisions: CI uses GitHub Actions with separate frontend and backend jobs.
Next action: Review the CI workflow output after it runs on GitHub.

## 2026-06-28

Task: Character persistence foundation
What changed: Implemented PostgreSQL schema, pgx-backed character persistence, minimal character HTTP endpoints, database-only Compose, CI PostgreSQL service, and documentation updates.
Validation: Local backend unit checks and frontend checks passed. PostgreSQL integration tests skipped locally because Docker and `TEST_DATABASE_URL` are unavailable here.
Decisions: PostgreSQL with pgxpool, golang-migrate SQL files, nullable future owner boundary, and `TEST_DATABASE_URL`-only integration tests.
Next action: Review changed files, migration SQL, API behavior, and validation output before any commit.

## 2026-06-28

Task: T-002 authentication and owner-scoped characters
What changed: Added local username/email/password auth with Argon2id, PostgreSQL sessions, HttpOnly cookies, CORS/Origin checks, protected owner-scoped character endpoints, and a minimal account UI that hides forms when no backend URL is configured.
Validation: Pending after final cleanup. Full backend PostgreSQL integration tests, backend checks, frontend checks, and diff checks still need to be rerun before commit.
Decisions: Username is the public in-app identity. Email is required but unverified, no confirmation email is sent, and password reset remains deferred. Public static auth remains unavailable until backend deployment. Guest draft conversion will use authenticated `POST /characters` later, not a separate claim endpoint.
Next action: Run validation before any commit.

## 2026-06-30

Task: T-002 authentication and owner-scoped characters
What changed: Completed the username/email/password auth milestone with inline registration validation and owner-scoped character access.
Validation: Local PostgreSQL-backed backend tests, backend vet/build, frontend lint/typecheck/test/build, diff checks, and manual browser smoke testing passed.
Decisions: No confirmation email, password reset, OAuth, phone number, account settings, parties, or character-creation UI were added.
Next action: Review final changed files and approve the T-002 commit.

## 2026-06-30

Task: T-003 guided character creation MVP requirements and design
What changed: Created and approved planning documents for the Fighter-only guided creation MVP and made T-003 the active task.
Validation: `git diff --check` passed.
Decisions: First creation slice is D&D 5E 2014, level 1, Fighter-only, Human-only, Soldier or Outlander, with Strength melee and Dexterity archer guided builds.
Next action: Extract reusable Character Reference foundation. Implementation has not started.
