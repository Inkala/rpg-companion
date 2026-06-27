# Project Checklist

**How to use this:** Each stage is self-contained and presentable. Completing v1 = minimum submittable product. Everything beyond v1 is "if time allows" — move items to "not in this submission" at presentation time if needed. The deployment pipeline is set up in Foundation so the app is live from the first meaningful commit.

**Item format:**
Each item includes: why it matters, what counts as done, which course area it covers, and which stage it belongs to.

---

## Foundation
Engineering and design decisions that everything else depends on. Not a stage — a prerequisite. Work through these roughly in order, since each informs the next.

---

- [ ] **Design: wireframes, user flows, and reusable component list**
  Why: Architecture and data model decisions should be informed by what you're actually building. Knowing the screens and flows upfront prevents rework later.
  Evidence: Wireframes (Figma or equivalent) for at minimum: guest landing, mobile Play View, party roster, ability quick-reference card. A user flow covering the primary paths (guest → register → join party → view character). A list of reusable UI components the screens require.
  Course: M1/L2 (requirements), M4/L7 (usability heuristics), M7/L1 prompt 27 (forms-usability)
  Stage: Foundation

---

- [ ] **Architecture style decided (ADR)**
  Why: The structure of both the Go backend and the React frontend should be a deliberate choice, not whatever emerges from the first files created. The decision shapes how testable and maintainable the code is.
  Evidence: ADR file documenting the chosen style (e.g. modular monolith with Clean Architecture layering), what was considered and rejected, and what constraints it imposes on folder structure and dependencies.
  Course: M2/L1 (architecture styles), M2/L2 (Clean Architecture), M2/L3 (distributed — and why not to distribute prematurely)
  Stage: Foundation

---

- [ ] **Database choice decided (ADR)**
  Why: Character data is relational and schema-enforced. Choosing the wrong type or deferring the decision leads to migration work later.
  Evidence: ADR documenting the chosen database, the data types it needs to support (character sheet, party membership, user identity), and why alternatives were not chosen.
  Course: M5/L3 (relational, non-relational, vector databases)
  Stage: Foundation

---

- [ ] **Auth approach decided (ADR)**
  Why: Auth shapes the session model, the permission middleware, and the guest-to-account migration flow. Changing it mid-project is expensive.
  Evidence: ADR documenting the chosen approach (JWT, session cookies, or third-party service), how guest draft migration works on sign-up, and any tradeoffs accepted.
  Course: M6/L5 (auth, authorization, credential management), M6/L1 (Security by Design)
  Stage: Foundation

---

- [ ] **Permission model documented**
  Why: Roles permeate every feature that involves parties, characters, and users. Defining the model once — before building any of it — prevents inconsistent enforcement across endpoints.
  Evidence: A written permission matrix covering: guest, player, GM. Rules documented: roles are per-party (not global); one character per party per user; a user can be GM in one party and player in another; players edit only their own character; GMs access only characters in parties they manage.
  Course: M6/L5 (secure architecture), R-006 in risks.md
  Stage: Foundation

---

- [ ] **Domain model documented**
  Why: Character is the richest entity in the project — it has derived values (ability modifiers, proficiency bonus, spell save DC), relationships (party membership, class, spells), and state that changes through named operations. Treating it as a flat JSON blob from the start causes correctness bugs and untestable code.
  Evidence: Written description (markdown is enough) of: core entities (User, Character, Party, PartyMembership), key derived values and how they're calculated, and the primary use cases (AddCharacterToParty, GetCharacterPlayView, UpdateHP, etc.).
  Course: M2/L2 (entities, value objects, use cases), M1/L5 (Spec Driven Development)
  Stage: Foundation

---

- [ ] **Git repository initialized**
  Why: Secrets excluded from version control from the first commit, not patched in later.
  Evidence: `.gitignore` excludes `.env` and build artifacts. `.env.example` committed with all required variable names and no values. No secrets appear in git history.
  Course: M6/L5 (secrets management), M4/L5 (ENV variables)
  Stage: Foundation

---

- [ ] **Docker Compose set up for local development**
  Why: The stack has multiple services. Docker Compose makes local setup reproducible across machines and ensures the app can be containerized for deployment from day one.
  Evidence: `docker-compose.yml` covering backend, database, and frontend. Any team member (or evaluator) can run `docker compose up` and reach a working local environment without manual steps beyond copying `.env.example`.
  Course: M5/L4 (containerization, Docker)
  Stage: Foundation

---

- [ ] **Cloud deployment pipeline configured (auto-deploy on merge)**
  Why: The app should be visible to real people from the first meaningful feature, not only at submission. Auto-deploy on merge to main means feedback can happen continuously.
  Evidence: App accessible at a real URL (not localhost). Merging to main triggers a deployment automatically. Environment variables managed via the cloud provider's config — not in Docker images or committed files. ADR or README note documenting the chosen provider and why.
  Course: M5/L4 (containerization), M5/L2 (cloud, costs, best practices)
  Stage: Foundation

---

- [ ] **CI pipeline configured**
  Why: Without CI, regressions accumulate silently. With it, every push confirms the project is still in a working state — especially important in the last days before submission.
  Evidence: GitHub Actions (or equivalent) workflow running on push to main and on pull requests. Steps: lint + type-check (frontend and backend) → unit tests → integration tests → build → deploy (if main). Pipeline passes on main branch.
  Course: M5/L1 (DevOps, CI/CD, GitHub Actions), M6/L4 (DevSecOps, security in CI)
  Stage: Foundation

---

- [ ] **Pre-commit hooks configured**
  Why: Catches formatting and lint errors before they reach CI, keeping the feedback loop fast.
  Evidence: Committing code with a lint error or failing test is blocked locally. Hook configuration documented in README.
  Course: M4/L3 (quality gates with Husky)
  Stage: Foundation

---

## v1: Core Party and Character Access

Goal: a real party can join the app, add their characters, and the GM can see them. This is the minimum submittable product.

---

### Auth and user identity

- [ ] **Register, log in, and log out**
  Why: Every persistent feature in the app requires an identity. Auth failure cases (wrong password, expired token) must be tested — not just the happy path.
  Evidence: Register, log in, log out working end-to-end. Tests covering: unauthenticated request returns 401; invalid credentials return the correct error; token or session invalidated on logout.
  Course: M6/L5 (auth and credential management), M6/L2 (OWASP: Identification and Authentication Failures)
  Stage: v1

---

- [ ] **User profile: display name and profile picture**
  Why: The GM needs to identify players on the party roster. Profile picture and display name are the minimum identity signal.
  Evidence: User can set a display name and upload a profile picture during or after registration. Both appear on the party roster card.
  Course: M4/L5 (auth), design.md
  Stage: v1

---

- [ ] **Settings page: update display name and profile picture**
  Why: Users need to be able to correct their profile without deleting and recreating their account.
  Evidence: Settings screen accessible from the user's profile. Changes persist and reflect immediately.
  Course: M4/L7 (usability — forms that don't frustrate)
  Stage: v1

---

### Guest flow

- [ ] **Guest can start creating a character**
  Why: New users should be able to try the app before committing to an account. Blocking creation behind a login screen raises the barrier to entry unnecessarily.
  Evidence: A user with no account can open the character creation flow. Save button is disabled. A popover explains that an account is required to save. The draft is held in localStorage.
  Course: M6/L5 (secure handling of unauthenticated state), R-005 in risks.md
  Stage: v1

---

- [ ] **Guest draft migrated to account on register or login**
  Why: A guest who built a character should not lose it when they sign up. Losing progress at that moment is a significant friction point.
  Evidence: After registering or logging in, the character draft from localStorage is converted to an account-owned character. No data is lost. If the user already has a character in the account, they are asked which to keep or whether to merge.
  Course: R-005 in risks.md, M6/L5 (identity and data ownership)
  Stage: v1

---

### Characters

- [ ] **Add a character not linked to a party**
  Why: Users should be able to build and manage characters independently of party membership. Not every character belongs to an active campaign.
  Evidence: User can create or transfer a character without selecting a party. Character appears in their character list with "No party" indicated. Can be linked to a party later.
  Course: M2/L2 (use cases, domain model)
  Stage: v1

---

- [ ] **Character list with party association**
  Why: A user with multiple characters across multiple parties needs a clear overview of what they have and where.
  Evidence: Home screen shows all the user's characters. Each entry shows the character name and the party it belongs to, or "No party" if standalone. Tapping a character opens it.
  Course: M4/L7 (usability, progressive disclosure), design.md
  Stage: v1

---

### Party

- [ ] **Decide invite mechanism: email or phone number (ADR)**
  Why: Email and phone number have meaningfully different implementation costs and dependencies. Email is simpler (transactional email service, no per-message cost for low volume). Phone requires an SMS provider (Twilio or equivalent), adds cost and verification complexity. The decision affects v1 scope.
  Evidence: ADR documenting the chosen approach and what service or library will handle it.
  Course: M5/L1 (DevOps, service dependencies), R-007 in risks.md
  Stage: v1

---

- [ ] **GM creates a party**
  Why: Party creation is the entry point for the collaborative features. The user who creates the party becomes its GM.
  Evidence: Logged-in user can create a party. They are assigned the GM role for that party. Party appears in their party list with the GM role indicated.
  Course: M2/L2 (use cases), permission model (Foundation)
  Stage: v1

---

- [ ] **Invite sent and player joins via link or code**
  Why: A party is only useful once other people are in it. The invite flow is the first real multi-user interaction.
  Evidence: GM can generate an invite link or code. A player who receives it can join the party. On joining, they are prompted to link one of their characters to the party. Joining with an expired or invalid code shows a clear error.
  Course: M6/L5 (API security), M4/L7 (error messages that make sense)
  Stage: v1

---

- [ ] **One character per party enforced**
  Why: The data model and UI both assume one character per party per user. Allowing more without designing for it creates ambiguity in the party roster and permission checks.
  Evidence: If a player tries to link a second character to the same party, the app blocks it with a clear message. Enforced in the backend, not only the UI.
  Course: M2/L2 (domain model integrity), M6/L5 (server-side validation)
  Stage: v1

---

- [ ] **User sees all their parties with their role**
  Why: A user can be a player in one party and a GM in another. They need a clear view of each party and what role they hold in it.
  Evidence: Party list shows party name and the user's role in each (Player / GM). Tapping a party opens the relevant view for that role.
  Course: Permission model (Foundation), M4/L7 (usability)
  Stage: v1

---

- [ ] **GM: party roster with member cards**
  Why: The GM needs to see who is in the party and which character each player is using.
  Evidence: GM party view shows one card per player. Desktop layout: character name as large title, profile picture and player display name smaller at the bottom. Mobile layout: profile picture on the left, character name large on the right, player display name smaller below it. Tapping a card opens the full character sheet.
  Course: M4/L7 (usability heuristics), design.md, M1/L2 (requirements)
  Stage: v1

---

- [ ] **GM: access full character sheet for any party member**
  Why: The GM needs visibility into all characters to run the game effectively. This is a stated product requirement and an authorization test case.
  Evidence: GM can open and read any character sheet belonging to a player in their party. A GM cannot access characters outside their parties. Tested with a 403 response for the cross-party case.
  Course: M6/L2 (Broken Access Control), permission model (Foundation)
  Stage: v1

---

### Permissions (server-side)

- [ ] **Auth middleware: 401 for unauthenticated requests**
  Why: Every protected endpoint must reject unauthenticated requests at the middleware layer, not per-handler.
  Evidence: A request to any protected endpoint without a valid token or session returns 401. Covered by at least one test per endpoint group.
  Course: M6/L5 (auth middleware), M6/L2 (OWASP: Identification and Authentication Failures)
  Stage: v1

---

- [ ] **Authorization tests for all 403 cases from the permission matrix**
  Why: Access control bugs are silent — they don't crash the app, they just leak or block data. Tests are the only way to know the rules are enforced consistently.
  Evidence: Test cases covering: player accessing another player's character (403), player accessing a party they didn't join (403), GM accessing a character outside their parties (403). Tests run in CI.
  Course: M6/L2 (Broken Access Control), M6/L5 (authorization), R-006 in risks.md
  Stage: v1

---

### Documentation

- [ ] **OpenAPI spec for all v1 endpoints**
  Why: The spec makes the backend contract explicit, lets frontend development proceed against a stable interface, and is a direct submission requirement per the course's backend project.
  Evidence: `openapi.yaml` (or equivalent) committed to the repo. Covers all v1 endpoints. Matches the implemented API. Written before or alongside the handlers, not generated after the fact from guesswork.
  Course: M4/L6 (docs-as-code, API documentation), M7/L3 (OpenAPI + Express + PostgreSQL project)
  Stage: v1

---

- [ ] **README: local setup, run tests, and deploy**
  Why: An evaluator must be able to run the project without asking questions. A real-world collaborator must be able to get started without onboarding.
  Evidence: README covers: prerequisites, how to copy `.env.example` and fill it in, how to start the app locally with Docker Compose, how to run the test suite, and where the deployed app lives.
  Course: M4/L6 (docs-as-code), M9 (TFM submission)
  Stage: v1

---

## v2: Character Reference and Quick Explanations

Goal: the app helps players understand and reference their character more clearly than a static PDF.

---

### Character content

- [ ] **Abilities, features, and spells stored and displayed**
  Why: These are the content a player needs to understand what their character can do. Without them, the app is only a character header.
  Evidence: Player can add abilities, class features, and spells to their character. All appear on the character view, organized by type.
  Course: M2/L2 (use cases, domain model), product-decisions.md
  Stage: v2

---

- [ ] **Quick-reference card on tap**
  Why: The core product promise is answering "how does this work again?" within seconds. The card is the mechanism.
  Evidence: Tapping any ability, spell, or feature opens a reference card showing: plain-language effect, action type, resource cost, duration, usage limit, and any important reminders. Card is readable on a small phone screen without scrolling for the most common content.
  Course: M4/L7 (usability, progressive disclosure), design.md
  Stage: v2

---

- [ ] **Action type tags**
  Why: Action economy is one of the most commonly forgotten parts of D&D. Tagging each ability removes the need to look it up.
  Evidence: Every ability, spell, and feature is tagged with at least one of: Action / Bonus Action / Reaction / Passive / Concentration / Short Rest / Long Rest. Tags visible without opening the full card.
  Course: product-decisions.md, M4/L7 (information hierarchy)
  Stage: v2

---

- [ ] **Resource tracking: HP, temp HP, spell slots, limited-use abilities**
  Why: Resources are part of understanding and maintaining a usable character over time. Without them, the app cannot explain the character's current state clearly.
  Evidence: Player can adjust HP (up and down), set temp HP, mark spell slots as used and recover them, and toggle limited-use abilities. State persists across page refreshes.
  Course: product-decisions.md, M2/L2 (use cases with state)
  Stage: v2

---

### Play View

- [ ] **Mobile-optimized Play View**
  Why: Players may check character information on a phone when they need a quick reminder. The layout must be usable one-handed in dim light without zooming or horizontal scrolling.
  Evidence: Play View loads the most important character information (HP, AC, attacks, actions, spells, resources) without requiring any scroll on a standard phone screen for the top-level summary. Detail is revealed on tap. Tested on a real phone, not only browser devtools.
  Course: design.md, M4/L7 (perceived performance, mobile usability)
  Stage: v2

---

- [ ] **Character search within own character**
  Why: A player may have dozens of abilities and spells. Search lets them find what they need faster than scrolling.
  Evidence: Search input filters abilities, spells, and features by name in real time. Works offline (client-side filtering, not a server request per keystroke).
  Course: product-decisions.md, M4/L7 (usability)
  Stage: v2

---

### Accessibility

- [ ] **Semantic HTML throughout Play View and character creation**
  Why: Screen readers and keyboard navigation depend on correct HTML structure. Divs styled as buttons are invisible to assistive technology.
  Evidence: Headings are in logical order. Buttons are `<button>` elements. Forms use `<label>` for every input. Lists use `<ul>` or `<ol>`. No critical semantic violations in axe-core audit.
  Course: M4/L7 (a11y heuristics), M7/L1 prompt 26 (heuristics-a11y)
  Stage: v2

---

- [ ] **ARIA labels on icon-only controls**
  Why: Icon buttons without labels are invisible to screen readers and have no accessible name for keyboard users.
  Evidence: Every interactive element that has no visible text label has an `aria-label`. Verified with a screen reader or axe-core.
  Course: M4/L7, M7/L1 prompt 26
  Stage: v2

---

- [ ] **Visible keyboard focus states on all interactive elements**
  Why: Keyboard users and players who cannot use a touchscreen need to know where focus is at all times.
  Evidence: Tab through the Play View and character creation — focus is clearly visible on every focusable element. No `outline: none` without a custom focus style replacement.
  Course: M4/L7, design.md (accessibility requirements)
  Stage: v2

---

- [ ] **Color is not the only signal for important information**
  Why: Red HP does not communicate "danger" to a colorblind user. Any status that uses color must also use a label, icon, or shape.
  Evidence: HP status, concentration indicator, and resource exhaustion all communicate their state through text or icon in addition to color.
  Course: M4/L7, design.md
  Stage: v2

---

- [ ] **Touch targets at least 44×44px**
  Why: The Play View is used on a phone, often one-handed. Targets smaller than 44px cause mis-taps and frustration.
  Evidence: All interactive elements on the Play View meet the minimum touch target size. Verified with browser devtools or a manual size check on device.
  Course: M4/L7 (mobile usability), design.md
  Stage: v2

---

- [ ] **Text contrast meets WCAG AA**
  Why: The app is used in dim conditions (around a table at night). Insufficient contrast makes text unreadable exactly when the player needs it most.
  Evidence: All body text meets 4.5:1 contrast ratio. Large text meets 3:1. Checked with a contrast tool (browser devtools, Figma, or a dedicated checker). No critical contrast violations in axe-core.
  Course: M4/L7, design.md
  Stage: v2

---

- [ ] **Automated a11y audit in CI**
  Why: Manual a11y checks miss regressions. Automating the audit means a broken ARIA label or missing heading doesn't silently ship.
  Evidence: axe-core integrated into Playwright E2E tests. CI fails if any critical a11y violation is introduced. Report visible in CI output.
  Course: M4/L3 (quality gates), M4/L7, M7/L1 prompts 26–29
  Stage: v2

---

### Observability

- [ ] **Error tracking on the React frontend**
  Why: Errors during a real session are silent without tracking. A character failing to load at the table is invisible unless it's captured.
  Evidence: Sentry (or equivalent) configured in the frontend and receiving events from the deployed app. Source maps uploaded so stack traces are readable.
  Course: M4/L4 (Sentry: setup, errors, release health), M7/L1 prompt 13–14
  Stage: v2

---

- [ ] **Structured logging on the Go backend**
  Why: `fmt.Println` logs are unqueryable. Structured logs (JSON with consistent fields) make backend errors findable when something goes wrong in production.
  Evidence: All backend log output is in JSON format with at minimum: timestamp, level, message, and request ID. No raw `fmt.Println` in production code paths.
  Course: M4/L4 (observability), M7/L1 prompt 13
  Stage: v2

---

- [ ] **One alert configured with a response note**
  Why: An alert without a documented response is noise. One well-defined alert (error rate spike) with a note on what to check is more useful than five ignored ones.
  Evidence: At least one alert configured in the error tracking or logging tool. Alert has a name, a threshold, and a brief note on what to investigate when it fires.
  Course: M4/L4 (speed alerts and playbook), M7/L1 prompt 17
  Stage: v2

---

- [ ] **E2E test: log in → join party → link character → view Play View**
  Why: This is a critical integration journey across auth, party membership, character linking, and mobile reference. If it breaks, the app cannot support the first real party workflow.
  Evidence: Playwright test covering the full path end-to-end, running in CI against a real (test) environment. Includes the a11y audit check on the Play View.
  Course: M4/L1 (E2E testing), M4/L3 (quality gates)
  Stage: v2

---

## v3: Guided Onboarding

Goal: a new player can create a character without reading a rulebook first.

---

- [ ] **Step-by-step character creation flow**
  Why: Presenting all character choices at once overwhelms new players. A guided step-by-step flow reduces cognitive load.
  Evidence: Character creation is broken into steps (class, species, background, ability scores, etc.). User can complete one step and return to finish later. Partial progress is saved.
  Course: M1/L2 (requirements, progressive disclosure), design.md, product-decisions.md
  Stage: v3

---

- [ ] **Each step supports: Help me choose / I know what I want / Decide later**
  Why: Forcing guidance on experienced players is as bad as offering none to new ones. The mode choice puts the user in control.
  Evidence: Every step with a meaningful choice offers all three modes. "Decide later" leaves the field blank and allows progression. "Help me choose" activates guidance without locking the user in.
  Course: M1/L2 (requirements), product-decisions.md (section 7)
  Stage: v3

---

- [ ] **Narrative play-style questions leading to a class shortlist**
  Why: New players don't know what "Ranger" or "Rogue" means. Scenario-based questions map to preferences they can actually express.
  Evidence: A short set of narrative questions (3–5) produces a shortlist of 3–4 recommended classes with plain-language explanations. User can override or ignore the shortlist.
  Course: product-decisions.md (section 7), M4/L7 (usability, microcopy)
  Stage: v3

---

- [ ] **Character creation form accessibility**
  Why: Character creation is the most form-heavy flow in the app. A11y failures here affect the users the onboarding feature is specifically designed to help.
  Evidence: Every input has a visible label. Error messages are specific and appear near the field they describe. Form is fully navigable by keyboard. Tested with axe-core.
  Course: M4/L7 (forms that don't frustrate), M7/L1 prompt 27
  Stage: v3

---

## v4: Character Progression

Goal: a player can level up and understand what changed.

---

- [ ] **Level-up flow: automatic updates vs. decisions clearly separated**
  Why: Players often don't know what a level-up changes. Mixing automatic updates with required choices creates confusion about what they need to do.
  Evidence: Pressing "Level up" shows two clear sections: "These updated automatically" (HP, slots, proficiency, automatic features) and "You need to choose" (spell selection, ASI vs feat, subclass choice if applicable). Player must confirm each decision before they are applied.
  Course: product-decisions.md (section 11), M4/L7 (progressive disclosure)
  Stage: v4

---

- [ ] **Level history**
  Why: Players want to see how their character has grown. GMs may need to verify level progression.
  Evidence: Character view shows a history of levels gained with the date and any decisions made at each level-up.
  Course: M2/L2 (character entity lifecycle)
  Stage: v4

---

- [ ] **Rest tracking (short rest and long rest resource reset)**
  Why: Many abilities reset on a short or long rest. Tracking rest without manual calculation is a direct improvement over a static character sheet.
  Evidence: Player can mark a short rest or long rest. Resources tagged as "Short Rest" or "Long Rest" reset automatically. HP and spell slots update according to rest type.
  Course: product-decisions.md, M2/L2 (domain operations)
  Stage: v4

---

- [ ] **Expanded GM party overview**
  Why: As the party grows and characters level up, the GM benefits from a higher-level view across all members.
  Evidence: GM party view shows current level, HP status, and active conditions for each party member without needing to open each character sheet individually.
  Course: product-decisions.md, M4/L7 (information hierarchy)
  Stage: v4

---

## If time allows

No fixed order. Evaluate after v1 and v2 are solid. Move items to "not in this submission" for the presentation if the deadline is close.

- [ ] **AI: explain ability in plain language** — one scoped use case; character data as structured context; graceful degradation if API unavailable; AI output clearly labeled
- [ ] **Rules search across supported SRD dataset** — search spells, conditions, actions, and basic rules within the app
- [ ] **Printable character sheet view** — original layout, browser print-friendly; not a copy of the official sheet
- [ ] **Conditions tracking** — apply and track active conditions (poisoned, prone, etc.) with reminders
- [ ] **Shared campaign notes** — GM and players can add notes visible to the party
- [ ] **PDF export** — character sheet exported as PDF from the print view
