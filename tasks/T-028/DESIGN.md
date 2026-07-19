# T-028 Design: Party invitation code flow

Status: approved

## Parallel-work assessment

- Classification: Red for implementation, Green for isolated planning
- Recommendation: use the dedicated `codex/t028-party-invite-code` worktree and implement
  sequentially when implementation is separately assigned
- Reason: the change crosses bearer credentials, authentication continuation, rate limiting,
  PostgreSQL uniqueness, invitation regeneration, routing, and shared Party API contracts
- Expected owned files or folders: `tasks/T-028/`, the Party invitation migration and backend,
  server/config wiring, Party Join and invitation UI, and focused tests
- Shared files or dependencies: Party invitation schema/API, application configuration, App-level
  authentication continuation, routing, rate limiting, and migration ordering

No other worker should edit Party invitation, Join, App authentication-continuation, configuration,
or migration files during implementation.

## Existing architecture

- Invitation rows currently store one SHA-256 hash of a 32-byte random opaque token.
- The raw token is returned once, travels in a URL fragment, is scrubbed immediately, and remains in
  typed React memory through authentication.
- Inspection and join use authenticated JSON POST endpoints. Join is already user-rate-limited;
  token inspection is not.
- Regeneration locks the Party, revokes its current row, and inserts a new invitation in one
  transaction. The row owns expiry and revocation for the credential.
- Bare `/parties/join` currently falls into the unavailable state. Home already links to that route.

## Credential design

### Alphabet and entropy

Use `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`: 32 unambiguous symbols. Eight independently sampled
characters provide exactly 40 bits of entropy (`32^8 = 1,099,511,627,776` possible values).

Forty bits is acceptable only with all planned controls: authentication before lookup, a seven-day
expiry, one active pair per Party, generic responses, strict attempt throttling, a keyed database
digest, and cryptographically secure generation. If anonymous inspection or multi-replica serving is
introduced, revisit both code length and the shared limiter before release.

### Generation and normalization

- Read random bytes from the platform cryptographic source and map unbiased five-bit values to the
  32-symbol alphabet.
- Canonical value: eight uppercase symbols without punctuation.
- Display value: insert a hyphen after character four.
- Normalization: remove ASCII whitespace, accept either eight symbols or exactly four symbols plus a
  hyphen plus four symbols, uppercase ASCII, then validate the complete alphabet.
- Repeat normalization on the server even when the frontend has already normalized.

### Database digest

Store:

`HMAC-SHA-256(INVITE_CODE_HASH_KEY, "party-invite-code:v1:" || normalizedCode)`

`INVITE_CODE_HASH_KEY` is a dedicated, stable, cryptographically random 32-byte secret supplied as
canonical unpadded base64url. It must not reuse the session secret, database credentials,
token-hashing material, or another application secret. Startup fails safely when the key is absent
or invalid outside test-only dependency injection. Domain separation prevents the same key use from
colliding with another credential purpose.

Never log, return, commit, or expose the key to the frontend. Changing or removing it makes all
active short codes unusable while leaving strong links functional. T-028 does not add key rotation.
If an intentional operational key change occurs, the documented recovery procedure is to regenerate
active invitations so each receives a code hashed with the new stable key.

A plain SHA-256 digest is rejected for this low-entropy credential because a database-only attacker
could enumerate the complete code space offline.

## Migration

Add `000004_add_party_invite_codes`:

- Add nullable `party_invites.code_hash BYTEA`.
- Add a check that it is null or exactly 32 bytes.
- Add a global unique partial index on `code_hash WHERE code_hash IS NOT NULL`.
- The down migration drops the index, constraint, and column.

Nullable is deliberate: existing invitation rows cannot be backfilled without raw credentials.
Their strong links remain valid until existing expiry or revocation. All newly generated rows require
a non-null code hash in repository logic.

Global historical uniqueness means an expired or revoked code cannot later refer to a different
Party. At 10,000 generated codes, the approximate birthday-collision probability is 0.00455%; the
database remains the authority and collision retry is mandatory.

## Regeneration and collision handling

Keep the existing Party row lock and transaction:

1. Generate and validate a fresh strong token and fresh short code in memory.
2. Revoke the current invitation inside the locked transaction.
3. Derive both hashes and insert with `ON CONFLICT DO NOTHING`.
4. Inspect affected rows. On a code-hash or token-hash collision, generate a completely new pair and
   retry the insert, up to eight total pair-generation attempts.

Revocation and replacement commit together. If retries are exhausted or the database fails, roll
back the transaction so the previous invitation remains active. Concurrent regenerations serialize
on the Party lock; the last committed regeneration owns the sole active pair.

## Exact API contract

### Preserve token endpoints

- `POST /party-invites/inspect` with `{ "token": "..." }`
- `POST /party-invites/join` with `{ "token": "...", "characterId": "..." }`

Their request and response contracts stay unchanged.

### Extend invitation creation

`POST /parties/{partyId}/invites` returns HTTP 201:

```json
{
  "token": "opaque-43-character-token",
  "code": "ABCD-EFGH",
  "createdAt": "2026-07-18T12:00:00Z",
  "expiresAt": "2026-07-25T12:00:00Z"
}
```

Only this one-time GM response contains the raw credential pair. It remains private and `no-store`.
The frontend derives the complete fragment link from the returned token and stores that link plus the
formatted code only in private in-memory response state. The backend does not need the frontend
origin and does not return a link field.

### Add code endpoints

`POST /party-invites/code/inspect`

```json
{ "code": "abcd-efgh" }
```

Success is HTTP 200 and reuses the exact current inspection response:

```json
{
  "party": { "id": "party-uuid", "name": "Ash & Ivy Pact" },
  "expiresAt": "2026-07-25T12:00:00Z"
}
```

`POST /party-invites/code/join`

```json
{ "code": "ABCDEFGH", "characterId": "character-uuid" }
```

Success reuses the token-join response and status behavior: HTTP 201 when membership is created and
HTTP 200 for the existing idempotent replay case.

Separate endpoints keep token validation and risk controls unambiguous. They also avoid broadening
or weakening the existing token request contract.

For a syntactically valid JSON request, missing, malformed, expired, revoked, replaced, or unknown
codes return the same HTTP 400 body:

```json
{ "error": "invite unavailable", "code": "invite_unavailable" }
```

Authentication remains HTTP 401. Throttling is HTTP 429 with the existing safe error shape and a
bounded `Retry-After`. Character ownership and membership conflicts keep current public semantics.
Structural transport failures such as unsupported media type, oversized body, or invalid JSON retain
their existing generic HTTP contract.

## Throttling

Use one shared code-attempt limiter for both code inspection and code join. Immediately after
authentication and before request-body decoding, normalization, hashing, or repository lookup,
evaluate all rules:

- 5 attempts per authenticated user per minute.
- 20 attempts per authenticated user per hour.
- 100 attempts globally per minute.

Successful and failed attempts both count and successes do not reset limits. User keys contain only
a SHA-256 digest of the authenticated user ID; the global key is constant. No key contains the code.
Return the longest rejecting window as a clamped `Retry-After` value from 1 through 3600 seconds.

This matches the current single-instance deployment assumption. Before scaling beyond one server
instance, replace the process-local limiter with a shared datastore-backed limiter.

## Frontend state and privacy

Represent a pending invite as a private discriminated union:

```text
{ kind: "token", value: string } | { kind: "code", value: string }
```

- Bare Join owns a controlled code input.
- On valid Continue, clear the rendered input immediately and transfer the normalized code only to
  the existing private-memory authentication continuation.
- Signed-out users do not call code inspection. They see Sign in/Create account while the normalized
  code remains only in the existing typed private in-memory authentication destination.
- After successful authentication, inspect the pending code exactly once and continue the current
  character selection, creation, join, and navigation flow.
- Signed-in users inspect immediately.
- A direct-link token still auto-starts without rendering the code form.
- `Try another code` clears pending state, returns to bare Join, and focuses the input.
- The signed-in escape action returns to Home/My parties; the signed-out escape action returns Home.
- Cancellation, invitation replacement, failed authentication, an unavailable response, and a
  completed join clear the pending credential.
- Never interpolate a credential into user-visible status, errors, logs, toasts, or navigation.
- Never place a code in URL state, history state, browser storage, cookies, analytics, errors, or
  toasts.

The player input necessarily renders what the player is typing before submission. The privacy rule
applies after Continue. The GM one-time credential panel necessarily renders the newly generated code
and link until it is dismissed, regenerated, refreshed, or navigated away from. Neither credential
is recoverable because only hashes persist.

## GM one-time interface

- After successful generation, show `Copy code` and `Copy invitation link` only while the private
  response state holds both values.
- Give each copy action accessible success feedback with fixed text that does not repeat the copied
  credential.
- When response memory is gone, show neither credential nor copy action. Explain that invitation
  credentials are shown only once and that regeneration is the recovery path.
- Regeneration clears the prior response state immediately, revokes the old pair transactionally,
  and displays the replacement pair only after the new request succeeds.

## Accessibility and responsive behavior

- Focus the code input when bare Join becomes active.
- Associate inline format guidance and errors using the existing accessible form pattern.
- After an unavailable response, focus the unavailable heading or alert; after retry, return focus to
  the input; after inspection, preserve the existing character-selector focus behavior.
- Copy actions have complete accessible names and safe live status that never repeats credentials.
- Preserve visible focus, keyboard-only operation, 44px targets, and no horizontal overflow at all
  required viewports.

## Configuration and deployment boundary

Implementation will add `INVITE_CODE_HASH_KEY` to typed backend configuration and the example
environment file. Creating the real provider secret and deploying it require separate explicit
authorization. The feature must not be merged for deployment until the target environment has a
stable key, because missing configuration must fail closed.

T-028 requires a controlled rollout in this order:

1. Validate migration up/down against disposable PostgreSQL.
2. Record a production backup checkpoint.
3. Provision `INVITE_CODE_HASH_KEY` in Railway without exposing its value.
4. Apply and verify the additive migration.
5. Deploy the backend.
6. Verify health and both old-link and new-code contracts.
7. Deploy the frontend.
8. Run public GM/player link-and-code smoke tests.

Incident rollback is additive and non-destructive:

- A frontend rollback leaves the additive schema harmless.
- A backend rollback leaves the code columns unused.
- Do not run the down migration during incident rollback.
- Preserve the stable key unless the explicit intent is to invalidate every active short code.

## Final integration order

T-028 product work merges before T-023. After T-028 production smoke passes, T-023 must rebase onto
final `main` and document the shipped invitation-code flow, final SHA, CI, deployment, smoke evidence,
and remaining limitations. T-028 implementation workers do not edit T-023 or shared coordination
records unless that integration is explicitly assigned.
