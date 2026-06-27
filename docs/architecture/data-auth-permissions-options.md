# Data, Authentication, Guest Access, and Permissions Options

## Purpose

This is a proposal for issue #3, not a final ADR. It documents the product rules Hunin's data and authentication design must support, compares realistic options, and recommends a provisional direction that fits a modular-monolith Go backend and React frontend.

## Product rules to support

- Guests can explore the read-only sample character without an account.
- Guests can start creating or transferring their own character.
- Guest drafts are stored on the current device.
- An account is required to preserve a character across devices, recover it, join a party, share it with a GM, or create/manage a party.
- A player may belong to multiple parties.
- A GM has authority only inside parties they manage.
- Cross-party character access must be blocked.
- A character's ownership and party membership must be clear.
- The model must not assume a user can only have one character overall.
- Authorization must be enforced in the backend, never trusted to the frontend alone.

## Provisional domain/data model

Do not treat this as a SQL schema yet. These are likely domain entities and relationships.

### User

Represents an authenticated account.

Likely responsibilities:

- identity for sign-up and sign-in
- owns saved characters
- can create parties
- can have different roles in different parties

Plain-language rules:

- one user can own many characters
- one user can belong to many parties
- one user can be a GM in one party and a player in another

### Character

Represents a player-owned D&D 5E 2014 character.

Likely responsibilities:

- character identity and sheet data
- abilities, features, attacks, and spells over time
- derived values and play-view data
- ownership by one authenticated user after save/migration

Plain-language rules:

- a saved character has exactly one owner
- a user can own multiple characters
- a character may exist without a party
- a character may be linked to a party later
- in v1, a character can be linked to at most one party at a time
- character data should not depend on a party existing

### Party

Represents a campaign or play group.

Likely responsibilities:

- party identity
- GM ownership/management
- party roster through memberships
- invite creation and join flow

Plain-language rules:

- one party can have many members
- party authority is scoped to that party only
- creating a party makes the creator a GM for that party

### PartyMembership

Represents a user's membership and role in a party.

Likely responsibilities:

- connect a user to a party
- record role, such as GM or player
- optionally link the user's selected character for that party

Plain-language rules:

- membership is per party, not global
- a user may have one linked character per party
- the same user can have different roles across different parties
- the backend should enforce role and character-link constraints

### Invitation / invite mechanism

Represents a way for a player to join a party.

Likely responsibilities:

- identify target party
- validate whether the invite is usable
- support link or code flow
- handle invalid or expired invite states

Plain-language rules:

- only a party GM can create an invite for that party
- using an invite does not grant access to any other party
- joining through an invite creates or updates membership only for that party

The final mechanism, such as email, phone, link, or code, is deferred.

### Guest draft boundary

Guest drafts are not server-owned entities in the first version.

Likely responsibilities:

- live in browser storage on the current device
- hold in-progress character creation or transfer data
- convert into a normal authenticated character after sign-up/sign-in

Plain-language rules:

- guest sample exploration does not create a draft
- guest-created or guest-transferred character data may be stored locally
- local draft data is not recoverable if the device/browser data is lost
- after migration, the character becomes owned by the authenticated user

### Character-to-party relationship

The practical relationship is through party membership.

Plain-language rules:

- a user joins a party through PartyMembership
- that membership can link one of the user's characters to that party
- the character remains owned by the user
- in v1, one character cannot be linked to multiple simultaneous parties
- to use a character in a different party, the player must first unlink it from its current party
- the GM can view linked characters only for parties they manage
- cross-party access stays blocked even if the same GM manages another party
- supporting one character in multiple simultaneous parties is deferred

## Authentication and guest-access options

### Option 1: Local guest drafts plus app-managed auth

Guest mode:

- sample character is public/read-only data
- guest drafts stay in browser storage

Sign-up/sign-in:

- Hunin backend manages accounts, credentials, and sessions/tokens

Guest-draft migration:

- frontend submits local draft after successful sign-up/sign-in
- backend creates a normal Character owned by the authenticated user

Account recovery and multi-device access:

- supported only after account creation
- recovery depends on the chosen app-managed auth mechanism

Benefits:

- strong educational value for auth, sessions/tokens, authorization, and tests
- full control over the guest-to-account migration flow
- no vendor lock-in for core identity

Risks and complexity:

- requires careful password handling and credential security
- increases implementation and testing responsibility
- account recovery can become non-trivial

Security implications:

- password hashing, session/token lifecycle, CORS, CSRF or token storage strategy, and auth middleware must be implemented correctly
- good fit for explicit 401 and 403 integration tests

Fit for Hunin:

- strong fit educationally, but only if there is enough time to implement securely

### Option 2: Local guest drafts plus third-party auth provider

Guest mode:

- sample character is public/read-only data
- guest drafts stay in browser storage

Sign-up/sign-in:

- account identity is handled by a provider
- Hunin backend trusts provider-issued identity after verification

Guest-draft migration:

- after provider sign-in, frontend submits local draft
- backend creates a normal Character owned by the provider-linked user record

Account recovery and multi-device access:

- mostly delegated to the provider

Benefits:

- reduces password and recovery implementation risk
- faster path to secure sign-up/sign-in if provider setup is straightforward
- lets the backend focus on authorization and domain rules

Risks and complexity:

- external dependency in a public educational project
- provider setup and environment configuration must be documented
- local development and CI may need provider-specific test strategy

Security implications:

- still requires backend authorization
- still requires careful token/session verification
- does not remove the need for 401 and 403 tests

Fit for Hunin:

- good fit if time is tight and course requirements allow third-party auth

### Option 3: Anonymous server-side guest accounts

Guest mode:

- backend creates anonymous guest identities
- drafts are stored server-side before account creation

Sign-up/sign-in:

- anonymous account later upgrades or links to a real account

Guest-draft migration:

- migration becomes identity merge/linking rather than local draft upload

Account recovery and multi-device access:

- potentially possible before full sign-up, depending on implementation

Benefits:

- can preserve drafts server-side before account creation
- may simplify cross-device guest continuation if later desired

Risks and complexity:

- adds identity merge complexity early
- creates more security and ownership edge cases
- conflicts with the current mitigation in `docs/risks.md` to avoid anonymous server-side users unless clearly needed

Security implications:

- anonymous identities must still be protected from takeover
- draft ownership and upgrade flows become harder to reason about

Fit for Hunin:

- poor fit for the first version. It solves a problem Hunin is intentionally deferring.

## Permission model

Backend authorization must decide from authenticated identity, party membership, character ownership, and role. Frontend hiding is only a usability layer.

| Capability | Unauthenticated guest | Signed-in player | Party GM | Player who is GM elsewhere |
|---|---|---|---|---|
| Explore sample character | Yes | Yes | Yes | Yes |
| Start local guest draft | Yes, current device only | Not needed, can create saved character | Not needed, can create saved character | Not needed, can create saved character |
| Create/edit own characters | No server save as guest | Yes | Yes, for own characters | Yes, for own characters |
| View own characters | No saved server data | Yes | Yes, for own characters | Yes, for own characters |
| Create party | No | Yes | Yes | Yes |
| Join party through invite | Must sign in first | Yes | Yes, if using a party as player | Yes, scoped to joined party |
| View party roster | No | Yes, for parties joined | Yes, for parties managed | Yes, only for joined/managed parties |
| View another player's character in same party | No | No, unless later product scope changes | Yes, only in parties managed | Only where they are GM |
| Edit another player's character | No | No | No | No |
| View party outside membership/GM role | No | No | No | No |
| Modify party outside membership/GM role | No | No | No | No |

Important clarifications:

- GM access is scoped to managed parties only.
- A user being GM in Party A gives no authority in Party B.
- Players edit only their own characters.
- GM character viewing is read access, not edit access.
- One user can own multiple characters and belong to multiple parties.
- In v1, one character can be linked to at most one party at a time.
- If a player wants to use a character in a different party, they must first unlink it from the current party.
- Supporting one character in multiple simultaneous parties is deferred.

## Database requirements and options

The data store needs to support:

- relational ownership and membership rules
- authorization queries by user, party, role, and character ownership
- character data that will grow over time
- migrations as the model evolves
- integration testing
- local development
- future deployment

### Option A: Relational SQL database

Benefits:

- natural fit for users, characters, parties, memberships, and invites
- strong support for ownership and membership constraints
- good fit for authorization queries
- migration tooling is mature across ecosystems
- supports integration tests against realistic data

Risks and tradeoffs:

- character sheet details can become broad and schema-heavy if modeled too aggressively too early
- requires migration discipline from the start
- may need a pragmatic approach for evolving nested character content

Course fit:

- strong fit for domain modeling, security, testing, migrations, and deployment evidence

### Option B: Document-oriented storage

Benefits:

- flexible for evolving character sheet content
- easier to store irregular character data early
- can reduce schema churn while the character model is still changing

Risks and tradeoffs:

- weaker fit for party membership and authorization constraints
- more application code needed to enforce relationships consistently
- harder to prove cross-party access control with simple relational queries
- less aligned with the current course emphasis on relational data for this project

Course fit:

- possible, but leaves more security and testing work on application code

### Option C: Hybrid relational core plus document-like character payloads

Benefits:

- relational tables/entities for users, characters, parties, memberships, and invites
- flexible structured payload for detailed character sheet sections while the model evolves
- keeps authorization on relational relationships

Risks and tradeoffs:

- can become a dumping ground if character data is not progressively modeled
- requires clear rules for which fields are queryable and which are payload-only
- migrations still matter when payload structure changes

Course fit:

- practical fit if kept disciplined, but should not become an excuse to skip domain modeling

## Recommended provisional direction

### Conceptual data model

Use a relational core model:

- User owns Characters.
- User joins Parties through PartyMembership.
- PartyMembership stores role and, for player use, the linked character for that party.
- In v1, a Character can be linked to at most one Party at a time.
- Party has invites created by a GM.
- Guest drafts stay outside the backend until account migration.

Do not model the full future character sheet yet. Start with fields required for existing-character transfer, guest sample display, party linking, and Play View reference.

### Guest/account boundary

Use local guest drafts on the current device.

- sample character exploration is public and read-only
- guest-created or guest-transferred drafts stay local
- sign-up/sign-in is required before server persistence, party joining, GM sharing, recovery, or cross-device access
- migration converts the local draft into a normal authenticated Character

Avoid anonymous server-side guest accounts for v1.

### Authorization approach

Use backend-enforced authorization in use cases and/or middleware-adjacent checks.

- authentication answers "who is this?"
- authorization answers "can this user perform this action on this party or character?"
- every protected endpoint must reject unauthenticated requests with 401
- every forbidden cross-party or cross-owner request must return 403
- tests must cover the permission matrix, especially GM scoping and character ownership

### Database category

Prefer a relational SQL direction conceptually.

This is a category recommendation, not a vendor choice. The current domain is centered on ownership, membership, roles, and authorization queries. Those are relational concerns.

## Decisions ready to make now

- Guests can explore the sample character without server identity.
- Guest drafts are local to the current device.
- Saved characters require an authenticated User owner.
- Characters can exist without a party.
- A v1 character can be linked to at most one party at a time.
- A user can own multiple characters.
- A user can belong to multiple parties.
- Party roles are scoped per party.
- GM access is scoped to parties they manage.
- Players cannot view or edit other players' characters by default.
- GM can view, but not edit, party member character sheets.
- Authorization is enforced on the backend.
- Anonymous server-side guest accounts are out of scope for v1 unless a later requirement changes that.
- The database direction should support relational ownership and membership rules.

## Deferred decisions

- Specific database vendor.
- SQL migration tooling.
- ORM, query builder, or direct SQL approach.
- Auth provider or app-managed auth mechanism.
- Session cookie versus token strategy.
- Invite mechanism: link, code, email, phone, or another narrow v1 approach.
- Exact shape of character sheet storage.
- Exact conflict behavior if a signed-in account already has characters when a guest draft is migrated.
- Cloud provider and deployment-specific secret management.
- Docker/container setup pending course requirements.

## Open questions

- What is the minimum character data required for the first existing-character transfer slice?
- What should happen if a guest draft migration is attempted after the same browser already has a saved account session?
- Should party invites expire in v1, or is a non-expiring code acceptable for the first usable release?
- Which auth approach best balances course evidence, implementation time, and security risk?
