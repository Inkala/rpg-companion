# T-028 Human-friendly Party invitation codes

Status: approved

## Goal

Let a GM share either the existing strong clickable invitation link or a short human-friendly code,
while preserving the current private authentication continuation, character selection or creation,
and Party join flow.

This task is driven by the approved product decision that Home -> Join accepts a short invitation
code instead of requiring a complete invitation URL.

## User-visible requirements

### Player entry

- Bare `/parties/join` renders the heading `Join a party`.
- It explains `Enter the invitation code shared by your GM.`
- It provides a real, visibly labelled invitation-code input.
- Its actions are `Continue` (primary) and `Cancel` (secondary).
- It does not show an unavailable-invitation state until a submitted code or direct invitation has
  actually been processed.
- The input accepts the code case-insensitively, with or without its display hyphen, and tolerates
  surrounding or embedded ASCII whitespace.
- After a locally valid code is submitted, signed-out users authenticate and return to the pending
  invitation. Signed-in users continue directly.
- Entering a code while signed out does not call the authenticated inspection endpoint. The
  normalized code remains only in the existing typed private in-memory authentication destination.
- After successful authentication, the application inspects the pending code once and continues the
  existing flow.
- Cancellation, replacement, failed authentication, an unavailable invitation, and a completed join
  clear the pending credential from memory.
- The existing invite inspection, owned-character selection or creation, automatic join, and Party
  navigation remain unchanged in outcome.

### GM sharing

- Creating an invitation returns one active credential pair for the Party: the existing strong
  opaque token and one human-friendly code.
- The Party page offers distinct `Copy code` and `Copy invitation link` actions.
- Both copy actions provide accessible success feedback using fixed text that does not repeat either
  credential.
- A code is displayed as `XXXX-XXXX`.
- The GM receives the short code and complete link only from the successful invitation-generation
  result. The frontend derives the complete fragment link from that result and may display and copy
  both credentials only while its private in-memory response state exists.
- Neither credential is recoverable after refresh or navigation because PostgreSQL stores only
  hashes. The copy actions are not displayed when the credentials are no longer in memory.
- The UI explains the one-time behavior without repeating credentials that have left memory. If the
  GM loses either value, the existing regenerate action revokes the prior pair and creates a new one.
- Regenerating the invitation atomically revokes both prior credentials and creates one new pair.
- Both credentials share the existing invitation expiry.
- Existing complete invitation links keep opening automatically without code entry.

### Unavailable states

- Malformed, expired, revoked, replaced, and unknown codes return the same privacy-safe unavailable
  response and UI.
- The UI does not disclose whether a Party or code ever existed.
- The unavailable state offers `Try another code`.
- It offers `Go to My parties` when signed in and `Go home` when signed out.
- `Try another code` clears the failed credential and returns focus to an empty code input.

## Code contract

- A code contains exactly eight characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- `I`, `O`, `0`, and `1` are excluded.
- Canonical storage and lookup input is the eight uppercase characters without the hyphen.
- Human display is four characters, a hyphen, then four characters.
- Frontend normalization is a usability feature. The backend independently normalizes and validates
  every submitted code.
- Codes are generated using a cryptographically secure random source.
- Numeric-only short codes are out of scope.

## Security and privacy requirements

- Treat a code as a bearer credential with the same response, cache, logging, and display privacy as
  the existing invite token.
- Store only an HMAC-SHA-256 digest of the normalized code, keyed with a dedicated server secret and
  domain-separated for Party invitation codes. A plain digest is not sufficient for a 40-bit code
  because it permits practical offline enumeration after database disclosure.
- `INVITE_CODE_HASH_KEY` is a dedicated, stable, cryptographically random 32-byte secret. It must
  not reuse the session secret, database credentials, token-hashing material, or another application
  secret.
- Validate the dedicated key at application startup. Never log, return, commit, or expose it to the
  frontend.
- Changing or removing the key makes active short codes unusable. T-028 does not introduce key
  rotation. After an intentional key change, regeneration of active invitations is the recovery
  procedure for short-code access.
- Rate-limit code inspection and code join attempts immediately after authentication and before
  request-body decoding, normalization, hashing, or database lookup so every malformed and unknown
  attempt consumes limits.
- Never put a submitted code in localStorage, sessionStorage, cookies, query parameters, URL paths,
  fragments, history state, analytics, logs, errors, or toasts.
- After player submission, remove the value from the rendered input and hold the pending credential
  only in private application memory for the minimum necessary flow.
- A pending code never enters URL state, history state, browser storage, cookies, rendered output,
  logs, analytics, errors, or toasts.
- Keep direct-link tokens in URL fragments and the existing private-memory continuation.
- Preserve generic public database and invitation errors.
- Enforce code-hash uniqueness in PostgreSQL and retry cryptographically generated collisions.
- Preserve the current single active invitation model.

## Accessibility and responsive requirements

- Use a labelled text input with `autocomplete="off"`, character capitalization hints, autocorrect
  and spellcheck disabled, and an input length bound that still permits accepted whitespace.
- Announce client validation, unavailable states, copy confirmation, and rate limiting accessibly.
- Move focus to the relevant input, error heading or next interactive group after state changes.
- Preserve keyboard operation and existing dialog/page focus behavior.
- Keep controls at least 44px and prevent horizontal overflow at 320px, 390px, 720px, and desktop.

## Compatibility requirements

- Do not weaken or shorten the existing 256-bit opaque invitation token.
- Do not move direct-link tokens out of URL fragments.
- Legacy unexpired invitations created before this migration remain valid through their strong links.
  They do not gain a recoverable short code because raw credentials cannot be backfilled.
- New or regenerated invitations always create both credentials on the same invitation row.

## Deployment requirements

- T-028 requires a controlled production rollout because it adds migration 000004 and the required
  `INVITE_CODE_HASH_KEY` backend secret.
- The rollout order is: validate migration up/down against disposable PostgreSQL; record a production
  backup checkpoint; provision the key in Railway without exposing it; apply and verify the additive
  migration; deploy the backend; verify health plus old-link and new-code contracts; deploy the
  frontend; then run public GM/player link-and-code smoke tests.
- Incident rollback does not run the down migration. A frontend rollback leaves the additive schema
  harmless, and a backend rollback leaves the code columns unused.
- Preserve the stable key during rollback unless intentionally invalidating active short codes.

## Integration order

- T-028 product work merges before T-023.
- After T-028 production smoke passes, T-023 rebases onto final `main` and documents the shipped
  invitation-code flow, final SHA, CI, deployment, smoke evidence, and remaining limitations.

## Exclusions

- No anonymous invitation inspection.
- No multiple active invitations per Party.
- No user-selected or recoverable codes.
- No changes to Party membership authorization or character ownership rules.
- No changes to T-023 submission documents, provider settings, deployment, or production during
  this planning correction.
- Approval of this task does not authorize implementation, secret provisioning, production access,
  deployment, or T-023 integration work.

## Acceptance criteria

- The exact player and GM flows above pass focused frontend tests and browser validation.
- PostgreSQL tests prove atomic regeneration, expiry, privacy, uniqueness, collision retry, and
  concurrent behavior.
- All invalid code classes are publicly indistinguishable.
- Tests prove submitted codes do not escape private memory or appear in DOM, navigation, storage,
  logs, errors, or toasts.
- Tests prove one-time GM display, fixed copy feedback, signed-out deferred inspection, and credential
  clearing at every terminal or replacement transition.
- Rollout evidence follows the approved migration, secret, backend, frontend, smoke, and rollback
  sequence before T-023 integration.
- The complete backend and frontend validation suites pass.
