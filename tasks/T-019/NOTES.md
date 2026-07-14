# T-019 Notes

## 2026-07-14 planning

- Certain: Marcela supplied `character right.png` as the target card and `character wrong.png` as
  the current saved-character card.
- Certain: account registration currently creates a server session and the frontend treats the
  response as authentication success.
- Certain: manual validation already produces field-specific errors and a summary alert, but no
  required markers or first-invalid focus behavior exist.
- Certain: guided and manual saves currently show another action before navigating.
- Certain: the current owner-scoped summary DTO lacks portrait, featured abilities, and landing
  concept even though CharacterSheetV1 stores and validates them.
- Certain: Sonner `2.0.7` declares React 18/19 support, TypeScript types, MIT licensing, and no
  runtime dependencies.
- Certain: Marcela explicitly prohibited Party implementation in T-019.
- Assumption: the requested shared visual requires a narrow summary DTO extension so saved cards can
  display truthful CharacterSheetV1 preview content rather than invented abilities.

## Deferred Party requirement

Creating a character from an invite should eventually use the ordinary creation flow, automatically
link the saved character to the pending Party, and open its expanded Character Reference. This
requires separate Party orchestration and is not authorized by T-019.

## 2026-07-14 approval

- Certain: Marcela approved the exact three-slice T-019 checklist.
- Certain: implementation belongs in a new dedicated session and worktree after the planning
  checkpoint is committed.
- Certain: only Slice 1 is authorized to start. It must stop for review before commit or Slice 2.

## Evidence reviewed

- Existing auth Register handler and AuthForm behavior.
- Existing manual validation and save-success interactions.
- Existing Mara sample and saved-character Home cards.
- Character summary repository and DTO privacy boundary.
- `docs/design.md` accessibility and mobile requirements.
- `docs/course-rubric.md` section 4 authentication requirements.
- Sonner official package and repository metadata.

## 2026-07-14 final task-evidence checkpoint

### Implementation commits

- Slice 1: `cf79f919f3ef56b77f6e1779606c3bc7aa94e77d`
  (`fix(accounts): require sign in after registration`).
- Slice 2: `c53de604388ff89d2750bc4b757155db7b6d0143`
  (`fix(characters): polish required fields and save navigation`).
- Slice 3: `b6ce49b457aa1225a505aa3be6ded8ef2a693f98`
  (`feat(characters): share character summary cards`).

### Slice 1 evidence

- Certain: successful registration creates the user without creating a session row.
- Certain: successful registration emits no session cookie.
- Certain: `GET /auth/session` remains `401` immediately after registration.
- Certain: explicit Sign in still creates the normal session.
- Certain: registration validation, collision privacy, throttling, hashing, and safe errors remain
  unchanged.
- Certain: the frontend stays signed out after registration, switches to Sign in, and shows the exact
  toast message `Account created. Sign in to continue.`
- Certain: the toast is dismissible, accessible, styled with Hunin tokens, and does not render the
  submitted username, email, or password.
- Certain: typed authentication destinations remain intact.
- Certain: arbitrary return URLs were not introduced.

### Slice 2 evidence

- Certain: required fields are visibly and accessibly marked without changing validation rules.
- Certain: optional fields remain excluded from required-marker behavior.
- Certain: Review character focuses and scrolls to the first invalid field in form document order
  after React renders the updated error state.
- Certain: the regression with valid Name/Class but invalid Level and Ancestry focuses Level first.
- Certain: ordinary guided and manual save success navigate immediately to Character Reference.
- Certain: the extra ordinary `Open Character Reference` action was removed.
- Certain: save failure/retry behavior remains intact.
- Certain: custom Party-invite return behavior remains intact.

### Slice 3 evidence

- Certain: the owner-scoped backend `CharacterSummary` DTO was extended only with
  `portraitAssetId`, `portraitAlt`, `featuredAbilities`, and `landingConcept`.
- Certain: the owner-scoped summary query extracts only those four presentation fields from
  `reference_payload.summary`.
- Certain: exact-key privacy tests assert that the summary response does not expose the full
  `referencePayload`, owner ID, owner subject ID, email, or Party data.
- Certain: `TestListSummariesForOwnerExtractsPresentationFields` executed and passed against a
  disposable PostgreSQL 17 database with explicit `TEST_DATABASE_URL`; it did not skip.
- Certain: the disposable PostgreSQL 17 database used tmpfs storage and loopback-only exposure at
  `127.0.0.1:55432`, and the container was removed afterward.
- Certain: the shared `CharacterSummaryCard` is tested and used by Mara and saved characters.
- Certain: Mara keeps her portrait and audited preview values.
- Certain: saved characters use the generic avatar when the portrait is missing or unknown.
- Certain: every character card action is labeled `Expand`.
- Certain: My characters renders a full-width header row with the Create character action and
  full-width saved-character cards below.
- Certain: the My characters header remains a semantic section `<header>` without creating a second
  page-level `banner` landmark.

### Responsive and accessibility evidence

- Certain: CDP-based browser checks used real viewport metrics and verified `window.innerWidth` at
  exactly `320`, `390`, and `720`.
- Certain: both guest Mara sample and signed-in saved-character states were checked at all three
  widths.
- Certain: the browser checks confirmed no horizontal overflow:
  `documentScrollWidth === innerWidth`, `bodyScrollWidth === innerWidth`, and no visible overflowing
  elements.
- Certain: the browser checks confirmed the My characters section, saved-character card width,
  title/Create character layout, portrait, identity, `Expand`, HP/AC/Speed, badges, and concept
  remain usable.
- Certain: relevant card and home controls remain at least 44px tall.
- Certain: long saved-character name, long badge, and long concept copy wrap safely.
- Certain: component tests verify the shared card action is keyboard focusable.

### Validation evidence

- Backend with explicit disposable PostgreSQL `TEST_DATABASE_URL`:
  - `go test -p 1 ./...`
  - `go vet ./...`
  - `go build ./...`
- Frontend:
  - `pnpm --dir frontend install --frozen-lockfile`
  - `pnpm --dir frontend audit --audit-level high`
  - `pnpm --dir frontend typecheck`
  - `pnpm --dir frontend lint`
  - `pnpm --dir frontend test` (441 tests)
  - `pnpm --dir frontend build`
- Repository:
  - `git diff --check`
  - trailing-whitespace check for the two new untracked Slice 3 files before commit.

### Party boundary

- Certain: no files under `frontend/src/parties/` changed.
- Certain: no files under `backend/internal/parties/` changed.
- Certain: Party migrations, routes, DTOs, invite state, join logic, authorization, and tests were
  not edited by T-019.
- Certain: no Party behavior changed.
- Certain: automatic Party linking after character creation remains deferred to a future task.
