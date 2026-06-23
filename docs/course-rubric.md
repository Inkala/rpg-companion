# Course Rubric: RPG Companion

**Purpose:** Extract the engineering practices the course evaluates, mapped to what this specific project needs. This is not a feature list and not a summary of lessons. It answers: *what must the project demonstrate, and when.*

**What is not in this file:** feature requirements, UI decisions, D&D rules logic. Those live in `product-decisions.md` and `design.md`. Open architectural choices (which DB, which auth library, which cloud provider) are listed as open questions at the end.

**Release stages:**
- **v1** — Core party and character access (must ship)
- **v2** — In-session character companion
- **v3** — Guided onboarding
- **v4** — Character progression
- **v5** — Advanced guidance and future expansion
- **Undecided** — Worth pursuing if time allows after v2 is solid

---

## 1. Architecture

**Course expectation:** Choose an architecture style explicitly, justify it against the alternatives, and apply it consistently. This is treated as a design decision with real consequences, not an emergent property of whatever code gets written. Styles covered in the course: modular monolith, microservices, hexagonal, Clean Architecture, Event-Driven. Clean Architecture receives the deepest treatment.

**Why it matters here:** The project has two runtimes (Go backend, React TypeScript frontend) and a domain with genuine complexity: character data contains derived values, game rules, and multiple bounded contexts (auth, party membership, character sheet, rules reference). Without deliberate layering, rules logic leaks into HTTP handlers and React components and becomes untestable. The course's Clean Architecture material is language-agnostic in principle — the pattern applies equally to Go and TypeScript even though the examples use TypeScript.

**Smallest sufficient implementation:** One justified architecture style applied consistently in both the backend and frontend. A modular monolith is a more defensible choice for a one-month project than microservices. Hexagonal or Clean Architecture layering within the monolith is expected given the course content.

**Evidence for submission:**
- An ADR documenting the chosen style and why alternatives were rejected
- Folder structure in both frontend and backend reflects the chosen style
- Domain logic is not directly coupled to HTTP handlers, database queries, or React components

**When:** v1 — architecture must be decided and documented before writing production code

**Source:** M2/L1 (architecture styles and trade-offs), M2/L2 (Clean Architecture in practice), M2/L3 (distributed architectures — and when not to distribute)

---

## 2. Domain Modeling

**Course expectation:** Identify the domain's entities, value objects, and use cases explicitly before coding. Entities have identity and lifecycle; value objects are immutable and identity-free. Use cases represent the application's meaningful operations and belong in a layer above infrastructure. The course teaches this through TypeScript examples but the concepts are language-independent.

**Why it matters here:** Character is the richest domain object in the project. It contains derived values (ability modifier = floor((score - 10) / 2), proficiency bonus from level, spell save DC, attack bonus), has state that changes through defined operations (HP adjustment, resource use, level-up), and has relationships (belongs to a party, has a class, has features and spells). Treating it as a flat JSON blob will produce calculation bugs and make testing difficult. Guest vs authenticated user is also a domain concern with real access-control implications.

**Smallest sufficient implementation:** A written domain model (does not need to be a formal UML diagram — a markdown description of the main entities, their key fields, and what use cases exist is enough). Code that reflects this model: Character as a struct or class with computed values derived from source fields, not stored redundantly.

**Evidence for submission:**
- Domain model documented (entities, value objects, relationships, key derived values)
- Use cases explicitly named and scoped (e.g. `AddCharacterToParty`, `GetCharacterPlayView`, `UpdateHP`)
- Character calculations implemented as testable functions, not inline in handlers or components

**When:** v1 — domain model before implementing character storage

**Source:** M2/L2 (entities, value objects, use cases, ports and adapters), M1/L5 (Spec Driven Development — spec before code)

---

## 3. Testing

**Course expectation:** Test-driven development as a default practice, not an optional extra. Test pyramid: unit tests for domain logic, integration tests for API and database layer, E2E tests for critical user flows. Coverage is measured, thresholds are enforced, and quality gates prevent regressions from reaching main. The course treats this as a non-negotiable discipline.

**Why it matters here:** Character calculations are pure, deterministic functions — they are fast to unit-test and easy to get wrong. Auth and party flows are the kind of integration paths that fail silently without tests. The project will be presented to evaluators and tested by real users; it must be demonstrably correct, not just working on the happy path at demo time.

**Smallest sufficient implementation:**
- Unit tests for all character rule calculations
- Integration tests for the most important API endpoints: auth, add character, join party, get play view
- At least one E2E test covering the primary user journey: sign in → join party → add character → view play view on mobile
- Coverage reported in CI (exact threshold TBD, but below 60% unit coverage should be flagged)
- Pre-commit hook that prevents committing broken tests or failing the linter

**Evidence for submission:**
- Test suite runs in CI and passes on main
- Coverage report visible in CI output
- At least one E2E test for a critical path
- Pre-commit quality gate configured and documented

**When:** Unit tests from v1, targeting domain logic first. E2E before the first real user test (v2).

**Source:** M4/L1 (testing setup, TDD with AI, integration, E2E), M4/L2 (safe refactoring with TDD), M4/L3 (metrics, coverage, quality gates with Husky), M2/L2/L10 (testing in Clean Architecture)

---

## 4. Security

**Course expectation:** Security by Design — decisions made at architecture time, not retrofitted after deployment. The course covers OWASP Top 10 in both the 2021 and 2025 editions, SSDLC, DevSecOps, secrets management, input validation, and correct auth/authz patterns. The expectation is that the most critical OWASP items are explicitly addressed and documented, not assumed away.

**Why it matters here:** The app stores user accounts, character data, and party membership. Authorization has real rules: a GM sees all party members' full sheets; players may not see each other's. These are not toy requirements. The guest-to-auth migration (local draft → saved character) is also a security boundary that R-005 flags as risky if handled carelessly.

**Most relevant OWASP items for this project:**
- **Broken Access Control:** party membership and character ownership must be enforced server-side, not only hidden in the UI
- **Injection:** character names, notes, ability descriptions, and other free-text fields must be validated and sanitized
- **Identification and Authentication Failures:** auth implementation must be correct and tested
- **Security Misconfiguration:** default configs, exposed debug routes, and CORS settings must be reviewed before deployment
- **Cryptographic Failures:** passwords hashed (never stored plain); JWTs signed correctly if used

**Tool choices pending:** Auth library, JWT vs session tokens, and password hashing approach are not mandated by the course. The course covers principles; the tool that correctly implements them is the right choice. Decision should be documented in an ADR.

**Smallest sufficient implementation:**
- All secrets (DB password, auth secret, AI API keys if used) in environment variables, never in code or committed files
- Auth middleware tested: unauthenticated request returns 401, player accessing another player's character returns 403
- Input validation on all endpoints that accept user data
- `.env.example` in the repo; `.env` excluded from git

**Evidence for submission:**
- Auth middleware has tests for both failure cases
- `.env.example` file present and complete
- No secrets in git history
- At least one security decision documented in an ADR
- At least one OWASP item explicitly cited and addressed in code or documentation

**When:** v1 — auth and secrets are not deferrable. Input validation before character data is accepted.

**Source:** M6/L1 (Security by Design, threat modeling, AI's impact on threats), M6/L2 (OWASP 2021), M6/L3 (OWASP 2025), M6/L4 (SSDLC, DevSecOps, Shift Left, Snyk), M6/L5 (secure coding: input validation, auth/authz, API security, secure architecture), M4/L5 (ENV secrets, web security, OWASP applied)

---

## 5. Infrastructure and Cloud

**Course expectation:** Applications should be containerized. Database type should be chosen based on data structure requirements, with a documented rationale. Cloud deployment should be achievable and reproducible. The course covers Docker, Kubernetes, multiple cloud providers, and infrastructure as code. Kubernetes is taught as a concept but is not expected for every project.

**Why it matters here:** The app needs to be accessible to real users (the party testing it) and presentable to evaluators without requiring them to run a local stack. The stack has multiple components — Go backend, database, React frontend — which makes Docker Compose a natural local development baseline.

**Smallest sufficient implementation:** Docker Compose for local development covering all services. One cloud deployment accessible at a real URL. Kubernetes is out of scope for a one-month project; acknowledge it in an ADR if asked.

**Tool choices pending:**
- **Database:** PostgreSQL is the most natural fit — relational, schema-enforced, handles character data well, and is used in the course's backend project (M7/L3). A non-relational or vector database would only make sense if AI with semantic search is in scope, which is undecided. Decision should be documented.
- **Cloud provider:** Must support both a Go service and a database. Render, Railway, and Fly.io all have free or low-cost tiers that cover this. Final choice should weigh cost, simplicity, and free-tier limits.

**Evidence for submission:**
- `docker-compose.yml` for local development covering all services
- Dockerfile per service
- Application deployed and accessible at a URL (not localhost)
- Database choice documented with a brief rationale

**When:** Docker from the start of development. Cloud deployment by v2, for real user testing.

**Source:** M5/L2 (cloud computing, IaC, costs, certifications), M5/L3 (relational, non-relational, and vector databases), M5/L4 (containerization — Docker, Kubernetes, cloud vendor options)

---

## 6. CI/CD and DevOps

**Course expectation:** A CI pipeline that runs on every push or pull request, covering at minimum lint, type-check, tests, and build. Pre-commit hooks handle fast local checks. Security scanning in the pipeline is part of the DevSecOps expectation. The course covers GitHub Actions as the primary example.

**Why it matters here:** This is a one-month project with fast iteration. Without CI, regressions accumulate silently and the project arrives at the submission deadline in an unknown state. With it, every push confirms the project is still shippable — which is especially important if the last few days are spent on documentation and polish.

**Smallest sufficient implementation:**
- GitHub Actions workflow running on push to main and on pull requests
- Steps: lint + type-check (frontend and backend) → unit tests → integration tests → build
- Pre-commit hooks: run linter and type-checker before each commit (Husky for frontend; a Go pre-commit script or `lefthook` for backend)
- Security scan (Snyk or GitHub Dependabot) is low-effort to add and the course specifically covers Snyk

**Tool choices pending:** CI platform is flexible, but GitHub Actions is the direct course example and the most natural fit for a GitHub-hosted project. Linting and formatting tools depend on language decisions already made.

**Evidence for submission:**
- CI configuration file in the repository
- Pipeline passes on main
- Pre-commit hooks documented in README
- At least one example of a failed test or lint error caught by CI (PR history or description)

**When:** Set up before writing substantive application code. This should be one of the first things in the repo after the initial scaffold.

**Source:** M5/L1 (DevOps culture, CI/CD concepts, GitHub Actions), M6/L4 (DevSecOps, security in the CI/CD pipeline, Snyk), M4/L3 (quality gates with Husky)

---

## 7. Accessibility

**Course expectation:** Accessibility is a design concern, not a post-implementation audit. The course covers a11y heuristics, form design, microcopy, and perceived performance — focused on practical minimums rather than exhaustive WCAG compliance. The course treats this as part of quality, not a separate specialist concern.

**Why it matters here:** The Play View is used on a phone at a table, often in dim conditions. Contrast failures and unreadable touch targets will break the product's core use case. Character creation is a form-heavy flow where missing labels and unclear errors create friction for exactly the users the app is trying to help. These are not edge cases; they are the primary scenarios. `design.md` already establishes the accessibility expectations — the course confirms and formalizes them.

**Smallest sufficient implementation:**
- Semantic HTML throughout (headings, buttons, inputs, lists — not divs for everything)
- ARIA labels on icon-only controls
- Visible keyboard focus states on all interactive elements
- Color is never the only signal conveying important information (e.g. HP status)
- Touch targets at least 44×44px
- Text contrast meets WCAG AA (4.5:1 for body text)
- Automated a11y audit integrated into E2E tests (axe-core works with Playwright)

**Evidence for submission:**
- Play View passes a Lighthouse or axe-core a11y audit with no critical violations
- Character creation form is navigable by keyboard
- No critical a11y violations in CI output

**When:** Build in from the start of v2 (Play View). Character creation a11y by v3. Do not retrofit.

**Source:** M4/L7 (a11y heuristics, forms that don't frustrate, microcopy with AI, measuring perceived performance), M7/L1 prompts 26–29 (heuristics-a11y, forms-usability, microcopy-ia, performance-percibida)

---

## 8. Observability and Logging

**Course expectation:** Error tracking and structured logging are prerequisites for knowing whether a deployed app is actually working. The course covers Sentry specifically — setup, error tracking, release health, performance monitoring, and alert playbooks. The framing is "less testing, more observing" for production: tests verify intent, observability reveals what actually happens.

**Why it matters here:** The app will be tested by real users (the party) under real conditions. Without error tracking, any failure during a session will be invisible. Character load failures, party join failures, and auth errors are exactly the kind of problems that happen in real use and are hard to reproduce from memory. Play View load time is also user-critical — a slow response mid-session breaks the flow.

**Smallest sufficient implementation:**
- Sentry (or equivalent) on the React frontend for JavaScript errors
- Structured logging on the Go backend: JSON format, minimum fields of timestamp, level, message, and request ID
- At least one alert configured: application error rate spike
- No raw `console.log` in production React code; no `fmt.Println` in production Go handlers

**Tool choices pending:** Sentry is the course's explicit example. Any equivalent error-tracking service (LogRocket, Datadog RUM, Rollbar) works. Go logging library is open — the standard library's `log/slog` (Go 1.21+) produces structured output without a dependency. Decision on tool does not change the evidence requirements.

**Evidence for submission:**
- Error tracking receiving events from the deployed application
- Backend logs are structured and machine-readable
- One alert defined with a brief response note (what to check when it fires)

**When:** Before the first real user test. Without it, that test session is debugging in the dark.

**Source:** M4/L4 (Sentry: setup, errors, release health, user performance, speed alerts and playbook), M7/L1 prompts 13–17 (observability strategy, Sentry implementation, errors, performance, alerts)

---

## 9. Documentation

**Course expectation:** Documentation lives in the repository alongside the code (docs-as-code). Key architectural and technology decisions are recorded in Architecture Decision Records — not just what was decided, but why, and what was rejected. APIs are documented with an OpenAPI spec. The course emphasizes that documentation should capture the reasoning, not just the outcome.

**Why it matters here:** This is a graduation project evaluated by someone who did not write the code. An evaluator needs to understand the decisions, not just run the app. ADRs provide a reviewable decision trail. An OpenAPI spec makes the backend contract explicit, enables frontend development to proceed against a stable interface, and is directly taught in the course's backend project (M7/L3 uses OpenAPI + Express + PostgreSQL).

**Smallest sufficient implementation:**
- OpenAPI spec for the Go backend API — can be written spec-first or generated from annotations, but must exist and match the implemented endpoints
- 4–6 ADRs covering the most significant decisions: architecture style, database choice, auth approach, deployment target, and AI decision (even if the decision is "not included in this submission")
- README covering: what the project is, how to run it locally, how to run the tests, and how to deploy

**Evidence for submission:**
- `openapi.yaml` (or equivalent) present and matching the deployed API
- ADR files in the repository (e.g. `docs/adr/`)
- README is complete enough that someone unfamiliar with the project can run it locally

**When:** OpenAPI spec before implementing API handlers. ADRs written as decisions are made, not assembled at the end.

**Source:** M4/L6 (docs-as-code, API and component docs, ADR, executive summaries), M7/L1 prompts 22–25 (docs-as-code, APIs and components, ADR, executive summary), M7/L3 (OpenAPI + Express + PostgreSQL backend project)

---

## 10. Deployment

**Course expectation:** The application must be deployed and accessible beyond the developer's machine. The course covers Docker, Kubernetes, and simple cloud targets. The expectation for a project of this scale is a working deployed environment, not enterprise-grade infrastructure.

**Why it matters here:** Two things require deployment: real user testing with the actual party (needs a shared URL), and the final submission (evaluators need to access the running app). A local-only demo is not a valid submission.

**Smallest sufficient implementation:** Docker Compose for local development. One cloud deployment for real testing and submission. No secrets in Docker images or git. Deployment process documented in the README.

**Tool choices pending:** Cloud provider must support Go and PostgreSQL together. Render and Railway are the course's named examples (M5/L5, LangChain deployment). Fly.io and DigitalOcean App Platform are alternatives. The decision should balance: free tier availability, support for both Go and PostgreSQL, and ease of environment variable management.

**Evidence for submission:**
- Application accessible at a URL that is not localhost
- Deployment process documented (even if it is a manual step-by-step)
- Environment variables managed through the cloud provider's config, not hardcoded in images

**When:** v2 — required before real user testing.

**Source:** M5/L4 (containerization, Docker, cloud vendor options), M5/L5 (LangChain with Python — deployment to Render or Railway as examples), M5/L2 (cloud computing concepts, costs and best practices)

---

## 11. AI Integration

**Course expectation:** If AI is included, it should be an optional layer on top of deterministic, structured data. The course covers OpenAI API, Vercel AI SDK (TypeScript), prompt engineering, prompt chaining, context management, LLM observability, and multi-agent patterns. The expectation is structured prompts, graceful degradation, and basic observability on LLM calls.

**Why it matters here:** `product-decisions.md` section 12 establishes the principle clearly: structured rules and character data first, AI explanation and guidance second. AI must not become the source of truth for game mechanics. The product must work without AI. If AI is included, it should demonstrably add value in one narrow, well-defined use case rather than broadly touching every flow.

**Most natural first AI use case:** Plain-language explanation of an ability or spell, given the character's context — e.g. "your Colossus Slayer feature deals 1d8 extra damage once per turn when you hit a creature already below max HP." The character data is already structured; the AI only adds the explanation layer.

**Smallest sufficient AI implementation:**
- One working AI feature (ability explanation or guided creation suggestion)
- Character data passed as structured context, not described in freeform text
- Graceful degradation: if the AI API is unavailable, the feature hides or shows a fallback; the rest of the app is unaffected
- AI output clearly labeled in the UI (user knows it is AI-generated, not official rules text)
- LLM calls logged (at minimum: prompt sent, response received, latency, any errors)

**Tool choices pending:** OpenAI API, Anthropic API, and Vercel AI SDK are all covered in the course. For a one-month project with a limited budget, the practical criteria are: free or low-cost tier available, TypeScript SDK well-supported (Vercel AI SDK unifies multiple providers), and simple to add graceful degradation.

**When:** Undecided. v1 and v2 must be solid first. If AI is not included, document the decision in an ADR — "we chose not to include AI in this submission because..." is a valid and evaluable engineering decision.

**Source:** M3/L2 (prompt engineering for developers), M3/L3 (knowledge bases, context management, AGENTS.md), M3/L4 (OpenAI API, ElevenLabs, Vercel AI SDK, n8n), M5/L6 (LLMOps, LangSmith, evaluations), M7/L5 (modern dev with AI — SDD + agent architecture capstone)

---

## Open Questions

These are unresolved choices that each need an ADR when decided. The rubric cannot answer them — the course is deliberately tool-agnostic.

| # | Question | Why it matters | When to decide |
|---|----------|----------------|----------------|
| Q1 | **Auth approach:** JWT, session cookies, or a third-party auth service (Auth0, Clerk, Supabase Auth)? | Determines auth middleware design, session management, and how guest-to-auth migration works | Before v1 auth implementation |
| Q2 | **Database:** PostgreSQL confirmed, or is there a reason to consider anything else? | Character data is relational; vector DB only relevant if AI semantic search is in scope | Before v1 data layer |
| Q3 | **Cloud provider:** Which provider supports Go + PostgreSQL with a free or low-cost tier? | Affects deployment complexity and whether real user testing is free or incurs cost | Before v2 deployment |
| Q4 | **OpenAPI strategy:** Spec-first (write YAML then implement) or code-first (generate from Go annotations)? | Spec-first aligns with the course's SDD approach; code-first is faster to start | Before writing Go handlers |
| Q5 | **Frontend state management:** How is complex character state and guest local state handled in React? | Character has many derived values and the guest→auth migration requires local state persistence | Before v1 character UI |
| Q6 | **AI in scope for submission?** | Determines whether to plan time for AI, and which parts of v3 AI-assisted guidance are feasible | Before starting v3 |
