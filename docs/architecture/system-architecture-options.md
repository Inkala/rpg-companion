# System Architecture Options for Hunin

## Purpose

This is a proposal for issue #2, not a final ADR. It captures the concrete needs Hunin has now, the architecture choices that should be made immediately versus later, and a few realistic directions that fit the current scope.

## What Hunin needs today

- React + TypeScript frontend.
- Go backend.
- Guest-first flow: a visitor can explore the app before sign-up.
- Future authentication, parties, permissions, characters, and mobile Character Reference.
- A public educational project that should be easy to explain and review.
- Likely course expectations around testing, security, CI/CD, containers, deployment, observability, and documentation.

The core domain is not huge yet, but it is already structured:

- party membership is role-based and per-party
- characters have derived values and state changes
- guest drafts may live locally before sign-up
- mobile Character Reference needs fast read access, not a full editor

## Decisions needed now versus later

### Decide now

- Backend architecture style.
- Frontend folder and feature structure.
- How frontend and backend boundaries are drawn.
- How domain logic is kept separate from HTTP and UI code.
- How the app is organized so tests can be written early and remain stable.

### Decide later, once the product shape is clearer

- Database choice.
- Authentication provider or mechanism.
- Cloud provider.
- Docker/container strategy, until course requirements are confirmed.
- Observability vendor.
- OpenAPI generation style, if the team wants code-first versus spec-first.
- Whether any future AI feature is in scope.

## Option 1: Modular monolith with Clean Architecture-style layering

### Frontend structure

- Route-level feature areas for guest flow, party flow, character view, and Character Reference.
- Shared UI primitives and domain-specific components reused across screens.
- Keep state local to the feature where practical, with shared app state only where needed.

### Backend structure

- One Go service.
- Feature-oriented packages, with use cases separated from transport and persistence.
- Domain entities and rules in inner packages.
- Adapters for HTTP and data access at the edges.

### Data / API boundary

- REST API with explicit request and response DTOs.
- Domain objects stay inside the backend.
- UI does not depend on database shapes.

### Local-development shape

- Frontend and backend run as separate local processes.
- A database can be added later without changing the architecture shape.
- Works with or without Docker while the stack is still being confirmed.

### Testing and future deployment

- Good fit for unit tests on domain logic and use cases.
- Good fit for integration tests around API and persistence.
- Easy to deploy as one backend service plus one frontend app later.

### Benefits

- Best match for the course material.
- Keeps the codebase understandable without being over-designed.
- Supports the project’s incremental release plan.
- Makes permission logic and character calculations easier to test.

### Risks / tradeoffs

- Requires discipline to keep layers clean.
- Can become too abstract if every feature gets its own mini-framework.
- Slower to scaffold than a flat controller-first app.

### Course fit

- Strong support for architecture, domain modeling, testing, security, documentation, and later deployment.
- Does not assume containers are mandatory yet.

## Option 2: Feature-modular monolith with pragmatic service layers

### Frontend structure

- Feature folders by user journey: guest, character, party, character reference.
- Shared components kept small and explicit.
- Less emphasis on pure domain layers, more on screen and flow ownership.

### Backend structure

- One Go service.
- Packages organized by feature, with service functions and repository interfaces.
- Some domain logic may live closer to feature packages than in a strict inner domain layer.

### Data / API boundary

- REST API with request and response models per feature.
- Boundary is clear, but the internal separation is looser than in Option 1.

### Local-development shape

- Straightforward local setup.
- Faster to get working screens and endpoints.
- Still compatible with separate frontend and backend processes.

### Testing and future deployment

- Good for endpoint-level tests and feature tests.
- Unit testing is still possible, but domain logic may be less isolated.
- Deployment remains simple because the app is still a monolith.

### Benefits

- Faster to start.
- Easier to understand early on.
- Lower risk of over-engineering.

### Risks / tradeoffs

- Easier for business rules to drift into handlers or UI code.
- Harder to keep character calculations and permission rules sharply separated.
- Can become inconsistent if package boundaries are not enforced.

### Course fit

- Supports v1 delivery and basic testing.
- Satisfies the need for a deliberate structure, but may be weaker on clean domain isolation.

## Option 3: Thin HTTP backend with a richer frontend orchestration layer

### Frontend structure

- Strong feature and state management in React.
- Frontend coordinates some view-model shaping for guest flow and Character Reference.
- Shared components and hooks carry more of the orchestration load.

### Backend structure

- Go backend stays thin: authentication, validation, persistence, and core data retrieval.
- Less backend use-case orchestration.
- More logic shifts into frontend view composition.

### Data / API boundary

- API returns more view-shaped payloads.
- Frontend does more transformation before rendering.
- Boundary is simpler for the backend, but less ideal for domain-heavy rules.

### Local-development shape

- Simple to develop locally.
- Fast UI iteration.
- Backend can stay small for early releases.

### Testing and future deployment

- Frontend tests become more important.
- Backend tests cover transport and storage, but less of the domain behavior.
- Deployment is simple, but some business rules become harder to protect consistently.

### Benefits

- Good for quick UI development.
- Lower backend complexity at the start.
- Useful if the first release is almost entirely display-oriented.

### Risks / tradeoffs

- Weakest fit for character rules, permissions, and progression.
- Increases the chance of duplicated logic between frontend and backend.
- Harder to keep the Go backend educational in a meaningful way.

### Course fit

- Works for simple delivery, but leaves more uncertainty around domain modeling and secure authorization.

## Provisional recommendation

Use Option 1: a modular monolith with Clean Architecture-style layering in the Go backend, paired with a feature-oriented React frontend.

This is the best balance for Hunin because it:

- keeps the backend educational without becoming a science project
- fits the structured character and permissions domain
- supports early testing of rules and access control
- scales from the guest flow to party access and Character Reference without forcing a rewrite
- does not require microservices, which would be premature here

Keep the frontend practical rather than overly abstract:

- route or screen-level feature folders
- shared component primitives only where they are clearly reused
- enough structure to support mobile Character Reference and guest exploration, but not a full design system too early

## Provisional architecture decisions

### System shape

Hunin will use a modular monolith:

- React + TypeScript frontend
- one Go backend service
- REST API between them
- no microservices for the current project scope

### Backend boundaries

The Go backend will use lightweight Clean Architecture-style boundaries:

- domain and use-case logic must not depend on HTTP handlers or persistence details
- adapters stay at the edges
- do not create interfaces, repositories, DTO layers, or abstractions unless they represent a real boundary or improve testing
- prefer simple direct code over ceremony

### API and frontend view models

The backend returns stable, domain-oriented API DTOs.

- The frontend may create screen-specific view models for presentation needs such as grouping abilities into Actions, Bonus Actions, Reactions, Features, and Spells.
- Domain rules, calculations, and authorization remain on the backend.

### Local development

Before containerization is decided, local development will use separate frontend and backend processes.

- Docker is not required to begin development.
- The final container approach remains pending course requirements.

### v1 testing boundaries

v1 testing will include:

- unit tests for domain rules and use cases
- integration tests for API, authorization, and persistence boundaries
- end-to-end tests are deferred until a complete primary user journey exists

## Deferred decisions

- database choice
- auth provider or mechanism
- cloud provider
- Docker/container setup
- observability vendor
- OpenAPI generation style
- exact package boundaries once the first domain slice is modeled

## Questions to revisit during implementation

- What is the first domain slice that should define the initial package boundaries?
- Which backend boundaries need interfaces immediately for testing, and which can stay as direct calls?
- What API DTOs are needed for the guest sample character and first Character Reference without leaking persistence shapes?
