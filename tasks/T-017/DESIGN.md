# T-017 Design: Party MVP vertical slice

Status: approved

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

Only one non-revoked active invite per party is recommended. Creating a new invite revokes the old
one in the same transaction.

## API Contract

Proposed protected endpoints:

- `POST /parties`: create party and GM membership.
- `GET /parties`: list authenticated user's parties and roles.
- `GET /parties/{partyId}`: return role-aware party detail and roster for a member.
- `POST /parties/{partyId}/invites`: generate/regenerate an invite, GM only.
- `POST /party-invites/{token}/join`: join atomically with `{ "characterId": "..." }`.
- `GET /parties/{partyId}/characters/{characterId}`: return a linked full character to the managing
  GM only.

The raw invite token appears only in the create-invite response and shareable URL. Lookups hash the
presented token before querying PostgreSQL.

Do not broaden owner-scoped `GET /characters/{id}`. The dedicated party character endpoint preserves
the existing owner route's privacy behavior and makes GM authorization explicit.

## Frontend Routes

- `/parties/new`
- `/parties/join/:token`
- `/parties/:partyId`
- `/parties/:partyId/characters/:characterId`

The join route remains visible while signed out. Selecting sign in/register records the invite
route as the post-authentication destination. After authentication, the user returns to the invite
flow and selects an owned character.

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

- `400`: malformed identifier/body, validation error, invalid/expired invite presented to join.
- `401`: no valid session.
- `403`: authenticated but lacking party role/membership/GM permission, foreign character, or
  character already linked elsewhere when disclosure is safe and expected.
- `404`: unknown party/character where existence should not be exposed by the route.
- `409`: duplicate membership or state conflict such as an already-linked character.

Exact response mapping must be frozen in the backend contract tests before frontend integration.

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
2. Approve and commit the T-017 contract/planning docs.
3. Start T-017A and T-017B from the same clean base.
4. Merge T-017A first because its tested contract is authoritative.
5. Rebase/align T-017B to the merged contract if necessary, then merge it.
6. Implement T-017C in one integration worktree.
7. Complete T-017D validation and deployment.

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
