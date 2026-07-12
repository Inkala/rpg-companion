# T-017 Requirements: Party creation, invitation, joining, roster, and GM access

Status: pending security amendment approval

Dependency: T-018 whole-application security baseline must be integrated and verified before T-017
implementation resumes.

## Problem

Hunin supports authenticated owner-scoped characters, but the collaborative product loop does not
exist. A user cannot create a party, invite another user, join with a saved character, see party
membership, or let the GM open a member's Character Reference.

The original v1 success condition is a real party joining one campaign, transferring characters,
and allowing the GM to view them. AI assistance is explicitly later and optional.

## Goals

- Let any signed-in user create a named party and become its GM.
- Let the GM generate a secure shareable invite link without adding email or SMS services.
- Let another signed-in user use the invite and join with one character they own.
- Let users see their parties and role in each party.
- Let party members see a basic roster for parties they joined.
- Let the GM open the full read-only Character Reference for linked member characters.
- Enforce ownership, membership, role, and cross-party authorization in the backend.
- Deliver one complete two-user flow that can be tested publicly.

## Non-Goals

- Email, SMS, push, or in-app invitation delivery.
- Phone numbers or contact lists.
- Multiple active characters for one user in one party.
- One character linked to multiple simultaneous parties.
- A GM linking a player character to the party on the player's behalf.
- Editing another user's character.
- Party deletion, ownership transfer, leaving, kicking, banning, or role changes.
- Multiple GMs.
- Invite analytics, invite history, or granular invite permissions.
- Campaign notes, chat, scheduling, initiative, combat mode, or resource tracking.
- Profile-picture upload or display-name editing.
- Guest party access.
- OpenAI or other AI integration.

## Required Behavior

### Party creation

1. A signed-out user cannot create a party.
2. A signed-in user can create a party with a required name.
3. Party names are trimmed and validated before persistence.
4. Creating a party creates exactly one GM membership for the creator in the same transaction.
5. The creator sees the party in My parties with role `GM`.

### Invitation

6. Only the party GM can generate or regenerate an invite.
7. The invite is 32 cryptographically random bytes encoded as unpadded base64url and presented as a
   shareable Hunin URL.
8. The database stores only a SHA-256 token hash, not the raw invite token.
9. The link is reusable by multiple users until it expires or is replaced.
10. Generating a new link invalidates the prior active link for that party.
11. An invalid, expired, or replaced invite produces a clear error without joining the user.
12. The first implementation does not send the link. The GM copies it and shares it externally.
13. Invite links expire seven days after generation.
14. The frontend share URL carries the token in a URL fragment, `/parties/join#<token>`, so the
    browser does not send it to frontend hosting or backend access logs as part of the URL.
15. The invite page reads the fragment, immediately removes it with `history.replaceState`, and
    sends the token only in the JSON body of the join request.
16. Invite responses use `Cache-Control: no-store`; the invite page uses
    `Referrer-Policy: no-referrer`; request bodies and raw tokens are never logged.
17. Temporary invite state is typed, accepts only a known internal destination, and is cleared after
    success, cancellation, or expiry. Arbitrary `returnUrl` values are not accepted.

### Joining and character linking

18. A signed-out visitor can open an invite URL but sees only a generic sign-in-required state. The
    page does not reveal invite validity, party name, GM, member count, or roster.
19. After authentication, the typed invite destination remains available instead of always returning
    home.
20. A signed-in user sees their saved characters and chooses one before joining.
21. Joining validates that the selected character belongs to the authenticated user.
22. Joining creates one Player membership and links the selected character atomically.
23. A user cannot create a duplicate membership in the same party.
24. A character cannot be linked to more than one party at the same time.
25. Repeating the exact successful join returns the existing membership with `200` and does not
    create a duplicate. A different join request by an existing member returns `409`.
26. A user with no saved character is directed to create or transfer one before joining.

### Party list and roster

27. A signed-in user sees all parties they belong to and their role in each.
28. Opening a joined party shows its name and a basic member roster.
29. The roster shows username, role, linked character name when present, and a generic avatar.
30. The roster excludes email, internal owner IDs, invite data, token hashes, and full character
    payloads.
31. Players may see basic roster identity for parties they joined but cannot open other player
    character sheets.
32. The GM can open any linked player character in that party in read-only Character Reference.
33. The player can continue opening and editing only their own character through owner routes.

### Authorization and privacy

34. Protected party endpoints return `401` without a valid session.
35. A non-member cannot view a party and receives the same `404` as an unknown party.
36. A player cannot generate an invite and receives `403` only when party visibility is already
    established.
37. A player cannot open another player's character through the GM party endpoint.
38. A GM cannot open a character linked to a party they do not manage.
39. A GM cannot edit another player's character, and the dedicated party-character route exposes no
    edit method.
40. Authorization is enforced from authenticated user, party membership, role, and linked character
    relationships in PostgreSQL-backed queries/transactions.
41. Tests explicitly cover the relevant Broken Access Control cases from
    `docs/course-rubric.md` section 4.
42. The existing owner-scoped character endpoint remains unchanged and continues returning `404`
    for other users.
43. The party Character Reference endpoint fails closed rather than returning malformed or
    unsupported `referencePayload` data to another user.

### Error and session states

44. Invalid, malformed, expired, revoked, and replaced invites all return `400` with one generic safe
    message and never create membership.
45. A foreign character, unknown/non-visible party, unlinked character, or cross-party GM access
    returns `404` without revealing existence.
46. An owned character already linked elsewhere or another authenticated visible-state conflict
    returns `409`.
47. Party join uses the approved T-018 request baseline and adds a modest endpoint-specific throttle
    returning `429` without revealing invite validity.
48. Frontend pages show loading, empty, success, validation, unauthenticated, forbidden, and
    recoverable server-error states where relevant.
49. Existing registration, character creation, My characters, saved Character Reference, Mara
    sample, and profile behavior remain intact.

## Acceptance Criteria

- Two dedicated test users can complete this flow on the deployed app:
  GM creates party -> GM copies invite -> player opens invite -> player signs in -> player selects
  owned character -> player joins -> both see party -> GM sees roster -> GM opens player Character
  Reference.
- Refreshing party, invite, and GM Character Reference URLs preserves the correct view.
- PostgreSQL constraints and backend tests cover duplicate membership and character-link rules.
- PostgreSQL constraints enforce one GM membership per party, GM memberships without a character,
  player memberships with a character, one active invite per party, and valid invite timestamps.
- Backend integration tests cover create, list, invite, join, roster, GM read access, 401, and 403
  behavior.
- Backend integration and race tests cover all merge-blocking cases listed in `TASKS.md`.
- No database row, response other than the one-time invite creation response, or log contains a raw
  invite token.
- Frontend tests cover routes, API helpers, create/join forms, role-aware party views, auth return,
  and GM Character Reference loading.
- Frontend lint, typecheck, tests, and build pass.
- Backend tests, vet, and build pass.
- CI passes after integration.
- Public two-user smoke testing passes before the task is complete.

## Approval State

Marcela approved the original seven product defaults on 2026-07-12. The security review preserved
that product scope but requires the amended token transport, privacy, constraints, concurrency,
Party-specific abuse controls, and test behavior above. Those amendments remain pending approval,
and T-018 must be complete before implementation.
