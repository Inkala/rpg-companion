# Hunin

*Your party companion*

Hunin is a Dungeons & Dragons 5E 2014 player companion for new, occasional, and busy players. It
helps a player explore a sample character, create or transfer a character, save it, understand its
most useful information, and join a Party without having to decode a dense paper sheet.

This repository is Marcela Ramirez's final project for a Master's program in Software Development
with AI. It demonstrates product discovery, spec-driven and AI-assisted engineering, frontend and
backend development, relational persistence, automated testing, security controls, accessibility,
continuous integration, cloud deployment, and documentation as code.

## Live project and release evidence

- Public application: [https://hunin.marceramirez.com](https://hunin.marceramirez.com)
- API health: [https://api.hunin.marceramirez.com/healthz](https://api.hunin.marceramirez.com/healthz)
- Public repository: [https://github.com/Inkala/rpg-companion](https://github.com/Inkala/rpg-companion)
- Current production SHA: `e0ac1e450849e5c751ba71b396e8c11b4545d0b0`
- Current production CI:
  [GitHub Actions run 29688775007](https://github.com/Inkala/rpg-companion/actions/runs/29688775007),
  successful
- Current production deployment: Railway and Cloudflare successful at the exact T-028 SHA
- Confirmed Level Up release SHA: `232335f26b8a16b5addcc68bf5de29bd22451b3f`
- Confirmed public Level Up smoke date: `2026-07-18`
- Final submission date: `[FINAL_SUBMISSION_DATE]`

T-026 Level Up and T-028 human-friendly Party invitation codes are merged, deployed, and publicly
smoke-tested. T-025 is active, so the feature set is not yet claimed frozen. Teacher access, slides,
video, and submission evidence remain intentionally placeholder-backed, and the final-submission
commit is not yet created.

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
- Return to an interrupted Party invitation after authentication whether it started from a short
  code or complete link, without retaining the submitted credential in browser history.

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
- Generate one active invitation pair and copy either its human-friendly short code or complete
  time-bounded opaque link while the one-time result remains visible.
- Enter a short invitation code or open a complete invitation link, authenticate if needed, and
  continue through owned-character selection or character creation before joining.
- Regenerate a lost invitation pair, atomically invalidating the previous code and link.
- Recover from malformed, expired, revoked, replaced, or unknown codes through one privacy-safe
  unavailable state without disclosing whether a Party or code existed.
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

### Level Up

The merged source implements an owner-only guided Level Up flow for eligible saved single-class
characters across all 12 SRD 5.1/2014 classes. It advances exactly one level at a time and supports
only current levels 1 through 4, producing levels 2 through 5.

The flow audits eligibility and earlier prerequisites, presents automatic changes and player
choices for review, and persists only after complete confirmation. Depending on class and level,
the review may include HP, current HP, subclass, Ability Score Improvement or a manual feat note,
spells, and class-specific SRD choices. The backend reconstructs and validates the result from the
stored character, canonical rules, and bounded decisions. It uses optimistic concurrency and
preserves the character ID and Party membership link.

Existing non-SRD content is retained rather than silently replaced. Unsupported classes,
multiclass characters, invalid sheets, unrepresentable prerequisites, and characters already at
level 5 or above cannot use the automated flow. Source integration is confirmed at
`232335f26b8a16b5addcc68bf5de29bd22451b3f`; CI, deployment, and public smoke passed at that exact
SHA.

## Confirmed T-026 release evidence

- GitHub Actions run
  [29647619803](https://github.com/Inkala/rpg-companion/actions/runs/29647619803) succeeded.
  Frontend job `88088389787`, Backend job `88088389776`, and Secret history job `88088389784` all
  succeeded.
- Railway deployment `0d40c230-9b63-42ff-b162-9f7bf38c4783` is Active and successful at the exact
  merge SHA.
- Cloudflare Pages deployment `18ff8791-beb0-4bfc-9de6-898ed49d4c69` succeeded at the exact merge
  SHA. Automatic deployments remain enabled.
- The public frontend returned HTTP 200. Backend health returned HTTP 200 with
  `{"status":"ok","service":"hunin-backend"}`.
- On 2026-07-18, fictional Fighter `Rook Ember QA` advanced from level 1 to 5 through all four
  supported transitions. Champion was selected at level 3 and Strength received a +2 Ability Score
  Improvement at level 4. Every save showed `Character leveled up.`
- At level 5, Level Up was unavailable with the bounded-support message. Refresh retained level 5,
  proficiency +3, Passive Perception 14, and Extra Attack.
- Party membership survived every transition. The GM read-only Character Reference showed the
  updated level-5 character and no Level Up action.
- Desktop and 390px checks found no horizontal overflow. The mobile dialog used internal scrolling,
  controls measured at least 44px, the browser console reported zero errors, and opening the dialog
  moved focus to its heading.
- Evidence limitation: browser automation could not conclusively verify the visible focus ring
  during Tab navigation. This is an evidence limitation, not a confirmed accessibility defect.

Production smoke left two fictional accounts, signed out; level-5 character `Rook Ember QA`; Party
`Silver Lantern QA`; one Player membership; and one generated invite. No credentials or invite
token are recorded in this repository.

## Confirmed T-028 release evidence

- T-028 merged and deployed at `e0ac1e450849e5c751ba71b396e8c11b4545d0b0`.
- GitHub Actions run
  [29688775007](https://github.com/Inkala/rpg-companion/actions/runs/29688775007) passed Frontend,
  Backend, and Secret history.
- Railway deployment `3ee59bfd-ab50-45f5-94b5-94cbbc08af3f` and Cloudflare deployment
  `fefc2f41-56b4-4392-a8d1-62744b714720` succeeded for that production SHA. Railway and Cloudflare
  automatic production deployments remain enabled, and no unexpected deployment occurred.
- The public frontend returned HTTP 200, and the backend health endpoint returned HTTP 200.
  Migration `000004` was already applied successfully and remained clean.
- Public smoke passed for short-code entry, complete invitation links, authentication continuation,
  character-creation continuation, regeneration invalidation, unavailable recovery, privacy, and
  authorization.
- Accessibility and responsive checks for the invitation flow passed.

The public smoke left disclosed fictional QA residue. No credentials or invitation value are
recorded in this repository.

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

T-026 release-checkpoint validation evidence:

- Frontend: 32 test files and 649 tests passed. Audit found no known vulnerabilities. Lint,
  typecheck, and production build passed.
- Backend: `go test -p 1 ./...` passed all 9 packages, including PostgreSQL-backed tests. The
  packages were `cmd/server`, `auth`, `characters`, `config`, `health`, `httpjson`, `parties`,
  `rules`, and `server`. Govulncheck found no vulnerabilities. `go vet ./...` and `go build ./...`
  passed.

## Security and privacy

- Passwords are hashed with Argon2id.
- Authentication uses random opaque server sessions. PostgreSQL stores a SHA-256 hash of each token,
  not the raw token.
- Production session cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`.
- The API uses exact allowed-origin checks, request size limits, strict JSON decoding, server
  timeouts, private-response `no-store` headers, and security response headers.
- Character ownership and Party roles are enforced by the backend. Inaccessible resources use
  generic responses to reduce cross-user disclosure.
- Invitation links and short codes are bearer credentials. Link tokens are scrubbed from the
  browser fragment and hashed at rest. Short codes are stored only as domain-separated HMAC-SHA-256
  digests under a dedicated provider-managed key. Submitted credentials remain out of browser
  history, storage, logs, errors, and ordinary Party responses.
- Short-code inspection and joining require authentication and use bounded attempt throttling.
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
type, and touch-friendly targets. Character, Party, and integrated Level Up paths have recorded
browser checks at 320px, 390px, 720px, and desktop widths. Public smoke passed at desktop and 390px
without horizontal overflow. Browser automation did not conclusively verify the visible focus ring
during Tab navigation; this remains an evidence limitation rather than a confirmed defect.

The deployed T-028 invitation flow also passed its keyboard, focus, accessible-feedback,
touch-target, and responsive checks.

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

The integrated Level Up implementation uses a committed, schema-validated SRD 5.1/2014 snapshot as
the production rules authority. It covers all 12 SRD classes through class level 5 and SRD spells
through spell level 3. TypeScript and Go representations are generated deterministically from the
same checked source. Sources, transformation, checksum, scope, and CC-BY-4.0 attribution are
documented in [Rules-data provenance and attribution](docs/rules-data.md).

## Known limitations

- Level Up is bounded to eligible saved, owner-controlled, single-class SRD characters and only the
  transitions 1 to 2, 2 to 3, 3 to 4, and 4 to 5.
- Levels above 5, multiclassing, unsupported classes, non-SRD automation, a complete feats catalog,
  homebrew automation, and paid-book content are not supported.
- Only the approved guided Fighter builds and manually supplied character content are supported in
  the existing creation experience.
- There is no general character edit or delete flow.
- Profile editing, email verification, password reset, MFA, and account deletion are not available.
- Party administration does not include Party deletion, member removal, GM character linking, or
  existing-member character replacement.
- A Party has one active invitation pair. Its short code and complete link are displayed only once;
  losing either requires regeneration, which invalidates the previous pair. Short-code inspection
  is not anonymous.
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

The slides and video remain pending Marcela's explicit feature-freeze confirmation and publication.
They must not be presented as complete until their URLs replace the placeholders.

## Further documentation

- [Project and academic context](PROJECT.md)
- [Current integration state](CURRENT.md)
- [Product decisions](docs/product-decisions.md)
- [Design direction](docs/design.md)
- [Deployment notes](docs/deployment.md)
- [Security and course evidence backlog](docs/project-checklist.md)
- [Task history](tasks/)
