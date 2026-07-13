# T-017 Design: Party MVP vertical slice

Status: approved and in progress

Dependency: satisfied. T-018 is integrated and verified, and both Party branches contain the
verified orchestration checkpoint `a82bb34`.

## Approach

Use the existing React frontend, Go `net/http` backend, PostgreSQL database, and HttpOnly session
authentication. Add one relational party module and a small set of route-level frontend party
features. Keep party authorization server-side and avoid adding external delivery services.

## Data Model

### `parties`

- `id UUID PRIMARY KEY`
- `name TEXT NOT NULL`
- `created_by_user_id UUID NOT NULL REFERENCES users(id)`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`
- application and database length validation for the approved party-name limit

### `party_memberships`

- `id UUID PRIMARY KEY`
- `party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE`
- `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `role TEXT NOT NULL CHECK (role IN ('gm', 'player'))`
- `character_id UUID NULL REFERENCES characters(id) ON DELETE RESTRICT`
- `joined_at TIMESTAMPTZ NOT NULL`
- unique `(party_id, user_id)`
- partial unique `character_id` where not null, preserving the documented one-party-per-character
  rule
- partial unique `party_id` where `role = 'gm'`, enforcing one GM membership per party
- check constraint: GM membership requires `character_id IS NULL`
- check constraint: Player membership requires `character_id IS NOT NULL`

The repository transaction must verify that a linked character is owned by the membership user.
That cross-table rule cannot be expressed safely as a simple PostgreSQL CHECK constraint.

### `party_invites`

- `id UUID PRIMARY KEY`
- `party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE`
- `created_by_user_id UUID NOT NULL REFERENCES users(id)`
- `token_hash BYTEA NOT NULL UNIQUE CHECK (length(token_hash) = 32)`
- `created_at TIMESTAMPTZ NOT NULL`
- `expires_at TIMESTAMPTZ NOT NULL`
- `revoked_at TIMESTAMPTZ NULL`
- check `expires_at > created_at`
- check `revoked_at IS NULL OR revoked_at >= created_at`
- partial unique `party_id` where `revoked_at IS NULL`

Only one non-revoked invite may exist per party. Creating a new invite revokes the old one in the
same transaction. Party creation, invite regeneration, and join are transactional. Regeneration and
join lock the invite or party row so concurrent requests have a deterministic order.

## API Contract

Proposed protected endpoints:

- `POST /parties`: create party and GM membership.
- `GET /parties`: list authenticated user's parties and roles.
- `GET /parties/{partyId}`: return role-aware party detail and roster for a member.
- `POST /parties/{partyId}/invites`: generate/regenerate an invite, GM only.
- `POST /party-invites/inspect`: authenticated privacy-safe invite inspection with
  `{ "token": "..." }`.
- `POST /party-invites/join`: join atomically with
  `{ "token": "...", "characterId": "..." }`.
- `GET /parties/{partyId}/characters/{characterId}`: return a linked full character to the managing
  GM only.

Generate the invite with 32 bytes from `crypto/rand` and encode it as unpadded base64url. Return the
raw token once when the GM creates or regenerates the invite. Store only its SHA-256 hash. Never log
request bodies or raw tokens.

The frontend share URL is `/parties/join#<token>`. A URL fragment is not sent in HTTP requests. The
join page reads the fragment, immediately removes it with `history.replaceState`, and sends the token
only in the POST JSON body. Invite responses use `Cache-Control: no-store`, and the invite page uses
`Referrer-Policy: no-referrer`.

After scrubbing, the raw token exists only in typed React memory for the active invite and
authentication-return flow. Browser Back and Forward within that flow may restore the typed memory
state. A full reload of the scrubbed `/parties/join` URL cannot reconstruct the token and therefore
shows the generic unavailable state. The user must reopen the original shared link. Do not place the
token in localStorage, sessionStorage, history state, a query, a path, or another persistence
mechanism to make reload survive.

Party JSON request bodies use the shared strict decoder with a 4,096-byte limit. Join is limited to
10 syntactically valid attempts per authenticated user per minute using a SHA-256-derived user key.
The check occurs after authentication, decoding, and character UUID parsing but before invite
lookup, so throttling does not reveal invite validity.

The repository returns an internal `Created` indicator with a membership. The handler returns `201`
for a newly created membership and `200` for an identical replay without changing the public DTO.

Frozen response DTOs:

- Party summary/create: `{ "id", "name", "role" }`.
- Party list: `{ "parties": [{ "id", "name", "role" }] }`.
- Party detail: `{ "id", "name", "role", "members": [{ "username", "role", "character" }] }`,
  where character is `{ "id", "name" }` or `null`.
- Invite creation: `{ "token", "createdAt", "expiresAt" }`.
- Invite inspection: `{ "party": { "id", "name" }, "expiresAt" }`.
- Join: `{ "partyId", "membershipId", "role": "player", "characterId", "joinedAt" }`.
- Party errors: `{ "error", "code"? }`, where code is one of `validation_error`,
  `invite_unavailable`, `authentication_required`, `forbidden`, `not_found`, `already_member`,
  `character_already_linked`, `rate_limited`, or `server_error`.

All Party timestamps serialize as canonical UTC RFC3339 values. Roster responses contain no email,
owner ID, invite data, token hash, or full CharacterSheet payload.

Do not broaden owner-scoped `GET /characters/{id}`. The dedicated party character endpoint preserves
the existing owner route's privacy behavior and makes GM authorization explicit.

## Frontend Routes

- `/parties/new`
- `/parties/join`, with the token accepted only from the URL fragment or typed temporary auth-return
  state
- `/parties/:partyId`
- `/parties/:partyId/characters/:characterId`

The join route remains visible while signed out but exposes no invite validity, party name, GM,
member count, or roster. Selecting sign in/register records a typed internal party-invite
destination, not an arbitrary return URL. After authentication, the user returns to the invite flow
and selects an owned character. Temporary invite state is cleared after success, cancellation, or
expiry.

## Frontend Feature Shape

New `frontend/src/parties/` feature folder:

- API DTOs and helpers
- `CreatePartyPage`
- `JoinPartyPage`
- `PartyPage`
- `PartyList`
- role-aware roster/member cards
- `PartyCharacterReferencePage`
- focused CSS and tests

The first frontend worktree should build these as isolated components/API helpers. It must not edit
`App.tsx`, central router files, or signed-in home files until the integration phase.

## Error Semantics

- `400`: malformed body or invalid, malformed, expired, revoked, or replaced invite. All invite
  failures use one generic safe message.
- `401`: no valid session.
- `403`: a visible party member attempts a role-forbidden function, such as a player regenerating an
  invite.
- `404`: unknown or non-visible party, foreign character, unlinked character, or cross-party GM
  access.
- `409`: authenticated visible-state conflict, including a different join by an existing member or
  an owned character already linked elsewhere.
- `429`: login, registration, or party join exceeds its approved limit.

Repeating the exact successful join returns the existing membership with `200`. It does not create a
duplicate.

Exact response mapping must be frozen in the backend contract tests before frontend integration.

## Dependency On The Whole-App Security Baseline

T-018 owns bounded JSON decoding, server timeouts, authentication throttling, production
configuration, no-store behavior for current private endpoints, safe startup logging, current
character payload validation, dependency authority, and deployed security verification.

T-018 is integrated. T-017A reuses those controls and owns only Party-specific additions: Party
name validation, join throttling, invite no-store/token redaction, Party data constraints,
transactions, locking, authorization, and race tests.

## Worktree Split

### T-017A: backend party domain, persistence, and API

- Classification: Yellow.
- Owns: new migration, `backend/internal/parties/`, party-related character access additions, and
  focused backend tests.
- Shared integration points: `backend/internal/server/server.go` and server tests.
- Must be one backend worktree because migration, membership, invite, and authorization behavior are
  tightly coupled.

### T-017B: frontend party feature modules

- Classification: Green after API contract approval.
- Owns: new `frontend/src/parties/` folder only.
- Uses contract DTOs and mocked API tests.
- Must not edit central routes, `App.tsx`, Home, global CSS, dependencies, or CI.

### T-017C: frontend routing and home integration

- Classification: Red during integration.
- Starts only after T-017A and T-017B are stable.
- Owns: central app route types/parser/tests, `App.tsx`/tests, signed-in Home party area, and any
  narrowly required shell coordination.

### T-017D: integration, security, deployment, and smoke

- Classification: Red.
- Runs combined backend/frontend validation, migration validation, two-user flows, authorization
  matrix tests, deployment, and public smoke testing.

## Merge Order

1. Completed: mobile-menu and T-016 documentation work are integrated through `7f5e787`; CI passed.
2. Completed: the original T-017 contract/planning docs were committed in `3a327e2`; CI passed.
3. Completed: T-018 whole-application security hardening and verification integrated through PR
   #22 and PR #23.
4. Completed: T-017A and T-017B rebased onto `a82bb34`, fully validated, and pushed.
5. Merge T-017A first because its tested contract is authoritative.
6. Rebase/align T-017B to the merged contract if necessary, then merge it.
7. Implement T-017C in one integration worktree.
8. Complete T-017D validation and deployment.

## Risks

- Broken Access Control is the highest risk. Backend authorization tests are mandatory.
- Backend and frontend can drift if implementation begins before the API error/DTO contract is
  approved.
- Auth return-to-invite behavior touches central navigation and must remain an integration step.
- A migration cannot be safely developed in parallel with another migration task.
- One-character-per-party and one-party-per-character are different rules. This design enforces both
  the documented one membership character per party and the stricter current one-party-per-character
  rule.
- GM Character Reference access must not accidentally grant edit access.
- Invite tokens must not appear in backend paths, hosting logs, history after page initialization,
  referrers, persistent browser storage, or telemetry.
- The strict T-018 CharacterSheetV1 validator must be reused so the Party route rejects malformed or
  unsupported payloads before returning cross-user data.
- Profile pictures are not implemented, so roster visuals use the existing generic avatar.

## Validation Plan

1. Migration up/down against a disposable database.
2. Repository integration tests for constraints and transactions.
3. Handler/server tests for success, validation, 401, 403, 404, and 409 behavior.
4. Frontend route, API, component, loading/error, signed-in, and signed-out tests.
5. Full backend test/vet/build and frontend lint/typecheck/test/build.
6. Two-account local smoke test.
7. CI after merge.
8. Railway migration/deployment and public two-account smoke test.
