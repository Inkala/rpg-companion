# T-017 Requirements: Party creation, invitation, joining, roster, and GM access

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
7. The invite is an opaque, high-entropy token presented as a shareable Hunin URL.
8. The database stores only a SHA-256 token hash, not the raw invite token.
9. The link is reusable by multiple users until it expires or is replaced.
10. Generating a new link invalidates the prior active link for that party.
11. An invalid, expired, or replaced invite produces a clear error without joining the user.
12. The first implementation does not send the link. The GM copies it and shares it externally.

Recommended default requiring approval: invite links expire seven days after generation.

### Joining and character linking

13. A signed-out visitor can open an invite URL but must sign in or register before joining.
14. After authentication, the invite route remains available instead of always returning home.
15. A signed-in user sees their saved characters and chooses one before joining.
16. Joining validates that the selected character belongs to the authenticated user.
17. Joining creates one Player membership and links the selected character atomically.
18. A user cannot create a duplicate membership in the same party.
19. A character cannot be linked to more than one party at the same time.
20. Repeating a successful join request must not create duplicate membership.
21. A user with no saved character is directed to create or transfer one before joining.

### Party list and roster

22. A signed-in user sees all parties they belong to and their role in each.
23. Opening a joined party shows its name and a basic member roster.
24. The roster shows username, role, linked character name when present, and a generic avatar.
25. Players may see basic roster identity for parties they joined but cannot open other player
    character sheets.
26. The GM can open any linked player character in that party in read-only Character Reference.
27. The player can continue opening and editing only their own character through owner routes.

### Authorization and privacy

28. Protected party endpoints return 401 without a valid session.
29. A non-member cannot view a party.
30. A player cannot generate an invite.
31. A player cannot open another player's character through the GM party endpoint.
32. A GM cannot open a character linked to a party they do not manage.
33. A GM cannot edit another player's character.
34. Authorization is enforced from authenticated user, party membership, role, and linked character
    relationships in PostgreSQL-backed queries/transactions.
35. Tests explicitly cover the relevant Broken Access Control cases from
    `docs/course-rubric.md` section 4.

### Error and session states

36. Duplicate membership, foreign character, already-linked character, expired invite, invalid
    invite, missing party, and forbidden access return distinguishable safe errors.
37. Frontend pages show loading, empty, success, validation, unauthenticated, forbidden, and
    recoverable server-error states where relevant.
38. Existing registration, character creation, My characters, saved Character Reference, Mara
    sample, and profile behavior remain intact.

## Acceptance Criteria

- Two dedicated test users can complete this flow on the deployed app:
  GM creates party -> GM copies invite -> player opens invite -> player signs in -> player selects
  owned character -> player joins -> both see party -> GM sees roster -> GM opens player Character
  Reference.
- Refreshing party, invite, and GM Character Reference URLs preserves the correct view.
- PostgreSQL constraints and backend tests cover duplicate membership and character-link rules.
- Backend integration tests cover create, list, invite, join, roster, GM read access, 401, and 403
  behavior.
- Frontend tests cover routes, API helpers, create/join forms, role-aware party views, auth return,
  and GM Character Reference loading.
- Frontend lint, typecheck, tests, and build pass.
- Backend tests, vet, and build pass.
- CI passes after integration.
- Public two-user smoke testing passes before the task is complete.

## Open Questions

The recommended answers below are proposed defaults, not approved requirements yet.

1. Invite delivery:
   - Recommended: opaque shareable link copied by the GM. No email/SMS integration.
2. Invite expiration:
   - Recommended: seven days.
3. Invite reuse:
   - Recommended: reusable by multiple players until expiration or regeneration.
4. Player roster visibility:
   - Recommended: members see usernames, roles, and character names; only the GM opens other sheets.
5. Character party limit:
   - Existing documented rule: one character may be linked to only one party at a time.
6. GM character in their own party:
   - Recommended: GM membership has no linked character in this MVP. Supporting a playing GM is
     deferred.
