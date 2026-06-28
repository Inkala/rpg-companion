# Project Risks

**Purpose:** Track risks that could affect scope, architecture, delivery, legal safety, or user trust.

**Status labels:** Open · Monitoring · Mitigated · Accepted

---

## R-001 — D&D content licensing and copyright

**Status:** Open  
**Impact:** High  
**Likelihood:** Medium  

### Risk

Not all D&D 5E 2014 content is openly reusable. The app could accidentally include rules, spells, subclasses, creatures, or other material from paid books that cannot be bundled publicly.

### Consequence

The public GitHub project or deployed demo could need content removed or changed late in development.

### Mitigation

- Use D&D 5E 2014 as the supported ruleset.
- Use only confirmed SRD/open-licensed content for public demo data.
- Do not bundle content from paid rulebooks unless its reuse is clearly permitted.
- Allow players to manually add custom abilities, notes, and house rules.
- Treat custom user-entered content as private user data, not public app content.
- Keep a record of the source and license for imported rules data.

### Decision Trigger

Before importing any external rules dataset, confirm its license and permitted use.

---

## R-002 — Scope expands into “all of D&D”

**Status:** Open  
**Impact:** High  
**Likelihood:** High  

### Risk

D&D character management can expand indefinitely: all classes, subclasses, spells, feats, equipment, multiclassing, level-up paths, monsters, conditions, house rules, and multiple rulesets.

### Consequence

The project may become too large to complete or test properly before the deadline.

### Mitigation

- Build through small, complete, user-testable releases.
- Prioritise existing-character transfer, character understanding, and quick reference first.
- Support only D&D 5E 2014 for the MVP.
- Use a curated, limited set of supported game content where needed.
- Treat guided character creation, level-up, broad rules search, and AI advice as later stages.
- Keep unsupported content possible through manual notes rather than attempting full automation.

### Decision Trigger

Any new feature must identify:
1. the user problem it solves,
2. which release stage it belongs to,
3. what existing scope it may replace or delay.

---

## R-003 — External rules API becomes unavailable or incomplete

**Status:** Open  
**Impact:** Medium  
**Likelihood:** Medium  

### Risk

An external D&D/SRD API may change, become unavailable, have incomplete content, or not match the specific needs of the app.

### Consequence

Core screens could fail or require a late redesign if they depend directly on a third-party API.

### Mitigation

- Do not make an external API the source of truth for player-owned character data.
- Store character data in the app database.
- Treat external rules sources as replaceable reference providers.
- Keep an internal import/adapter layer between the app and any external API.
- Prefer importing permitted open reference data into the project database when appropriate.
- Build the first quick-reference feature so manual/custom abilities can work without an external source.

### Decision Trigger

Before selecting an API, validate:
- content coverage,
- licensing,
- reliability,
- rate limits,
- data format,
- whether the data supports 2014 rules.

---

## R-004 — AI gives incorrect or misleading rules advice

**Status:** Open  
**Impact:** High  
**Likelihood:** Medium  

### Risk

AI may invent rules, misunderstand a character’s context, or give advice that conflicts with the game rules or the GM’s interpretation.

### Consequence

Players may lose trust in the app or make incorrect character choices.

### Mitigation

- Keep game rules, calculations, action types, durations, and resource costs deterministic.
- Use AI only for explanation, comparison, suggestions, and plain-language summaries.
- Avoid presenting AI output as official rules authority.
- Show the relevant source/reference data where possible.
- Clearly state that the GM has the final interpretation.
- Do not use live web search as the default way to answer rules questions.
- Keep AI optional and behind explicit user actions.

### Decision Trigger

Before adding AI, define:
- which questions it may answer,
- which data it receives,
- what it must not decide,
- how the UI distinguishes rules data from AI guidance.

---

## R-005 — Guest mode creates difficult account migration

**Status:** Open  
**Impact:** Medium  
**Likelihood:** Medium  

### Risk

Guest users can create characters before signing in. If guest data is stored in the backend too early, account creation and party joining may require complicated identity merging.

### Consequence

Character ownership, party membership, and saved data may become difficult to manage securely.

### Mitigation

- Store early guest drafts locally in browser storage.
- Require an account for shared or persistent actions:
  - joining a party,
  - creating a party,
  - inviting players,
  - sharing a character with a GM,
  - saving across devices.
- On sign-up, convert the local draft into a normal authenticated character.
- Avoid anonymous server-side users in the first version unless there is a clear reason.

### Decision Trigger

Before implementing guest mode, define:
- where guest data lives,
- how long it persists,
- what happens when the user signs in,
- what happens if local data is unavailable or cleared.

---

## R-006 — Party permissions expose character data incorrectly

**Status:** Open  
**Impact:** High  
**Likelihood:** Medium  

### Risk

The app includes multiple users, parties, players, and GMs. Incorrect authorization could let users view or edit characters outside their party.

### Consequence

Privacy issue, broken trust, and a weak security story for the final project.

### Mitigation

- Define ownership and permissions before implementing party features.
- A player can edit only their own character.
- A GM can view full sheets only for characters in parties they manage.
- A player can access only parties they joined.
- Enforce permissions in the Go backend, not only in the frontend.
- Add authorization-focused tests for all party and character endpoints.

### Decision Trigger

Before building party invitations, document the permission matrix for:
- guest,
- player,
- GM,
- party member,
- non-member.

---

## R-007 — Course requirements introduce infrastructure or DevOps expectations late

**Status:** Monitoring  
**Impact:** Medium to High  
**Likelihood:** Medium  

### Risk

The Master’s course may expect Docker, CI/CD, cloud deployment, observability, security practices, or other infrastructure evidence that has not yet been reviewed.

### Consequence

Late requirements could force changes to deployment, repository structure, testing, or backend configuration.

### Mitigation

- Review course materials before making final infrastructure decisions.
- Keep frontend, backend, database configuration, and environment variables separated from the beginning.
- Avoid locking into a deployment approach before extracting course requirements.
- Record required evidence for each course module in the project plan.
- Prefer architecture that can be containerised later without major rewrites.

### Decision Trigger

After course-material review, decide:
- whether Docker is required,
- CI/CD expectations,
- deployment target,
- observability requirements,
- security requirements,
- documentation deliverables.

---

## R-008 — Backend learning goal creates excessive complexity

**Status:** Open  
**Impact:** Medium  
**Likelihood:** Medium  

### Risk

The project aims to use Go and learn backend architecture similar in spirit to professional work. This could lead to unnecessary layers, services, abstractions, or infrastructure before the product is working.

### Consequence

Development slows down and the project becomes harder to understand or finish.

### Mitigation

- Use the course material to justify architectural choices.
- Aim for a modular, well-tested backend before considering multiple services.
- Add complexity only when it demonstrates a course requirement or solves a real product need.
- Keep a decision record for major architectural patterns.
- Build one end-to-end vertical slice before broad infrastructure work.

### Decision Trigger

Any proposed architectural layer or service must answer:
- What requirement or problem does it solve?
- What would break or become harder without it?
- Can it wait until after the first working vertical slice?

---

## R-009 — Real party feedback arrives too late or is too limited

**Status:** Monitoring  
**Impact:** Medium  
**Likelihood:** Medium  

### Risk

The party is willing to test the app, but they may not have time to enter character data, use the app in real conditions, or give detailed feedback before the deadline.

### Consequence

Product decisions may rely too heavily on assumptions.

### Mitigation

- Test early with the smallest possible flow.
- Start with one real existing character, even if entered only by the project owner.
- Ask short, specific questions after testing.
- Focus first feedback on:
  - ease of transferring a character,
  - usefulness of mobile Character Reference,
  - clarity of ability quick-reference cards.
- Do not wait for a full party session before validating individual flows.

### Decision Trigger

Before each test, define one question the test should answer.

---

## R-010 — Mobile Character Reference becomes too dense or hard to use

**Status:** Open  
**Impact:** Medium  
**Likelihood:** High  

### Risk

A D&D character has a lot of information. Trying to show everything on a phone can create a dense, confusing interface that defeats the product purpose.

### Consequence

Players may return to PDFs, screenshots, or external tools instead of using the app.

### Mitigation

- Prioritise character-reference information:
  - HP,
  - AC,
  - attacks,
  - actions,
  - bonus actions,
  - reactions,
  - spells,
  - resource tracking,
  - quick explanations.
- Use progressive disclosure rather than a full character sheet on one screen.
- Validate with real players on phones early.
- Keep detailed editing for laptop/tablet.
- Treat the Character Reference and Sheet View as separate experiences.

### Decision Trigger

Before finalising mobile layouts, test whether a player can answer:
> “What does this character have, and what does this ability do?”  
within a few seconds.

---

## R-011 — Printable/PDF character-sheet feature becomes larger than expected

**Status:** Open  
**Impact:** Low to Medium  
**Likelihood:** Medium  

### Risk

Creating a polished downloadable PDF can involve formatting, print layout issues, fonts, browser differences, and character-sheet design work.

### Consequence

A non-core feature consumes time needed for the mobile player experience.

### Mitigation

- Treat printable output as later scope.
- Start with a print-friendly browser view.
- Use an original layout rather than copying an official character sheet.
- Defer dedicated PDF generation unless it is required by user feedback or course expectations.

### Decision Trigger

Add dedicated PDF generation only after the mobile Character Reference is usable.

---

## Review Schedule

Review this file:

- after course-material analysis,
- before choosing final architecture and infrastructure,
- before adding party invitations,
- before introducing AI,
- before deployment,
- whenever a new feature significantly changes project scope.
