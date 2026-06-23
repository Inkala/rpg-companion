# Course Material Index

Source folder: `content/`
Total files: ~428 across 9 modules and ~50 lesson folders.

## File type legend

| Suffix | Meaning |
|--------|---------|
| `apuntes.pdf` | Lecture notes / summary |
| `slides.pdf` | Presentation slides |
| `content.pdf` / `content.md` | Reference content (used in Module 4 instead of slides) |
| `prompts.md` | AI prompts for the exercise |
| `.md` (numbered) | Guided prompt files (used in Module 7 projects) |

---

## Module 1: Software Engineering

### Lesson 1: Software Development Life Cycle
**Source files:** `apuntes` + `slides` per lecture (3 lectures)

| # | Lecture | Files |
|---|---------|-------|
| 1 | Introduction | apuntes, slides |
| 2 | Life cycle models | apuntes, slides |
| 3 | Conclusions | apuntes, slides |

**Topics:** SDLC phases, development models (waterfall, agile, iterative)
**Tags:** project-management

---

### Lesson 2: Requirements Analysis
**Source files:** `apuntes` + `slides` per lecture (6 lectures)

| # | Lecture | Files |
|---|---------|-------|
| 1 | Requirements typologies | apuntes, slides |
| 2 | Methods for gathering requirements | apuntes, slides |
| 3 | Documentation and specification | apuntes, slides |
| 4 | Introduction to UML | apuntes, slides |
| 5 | Requirements validation and verification | apuntes, slides |
| 6 | Conclusions | apuntes, slides |

**Topics:** functional/non-functional requirements, elicitation methods, UML, specification docs
**Tags:** project-management, documentation

> **Naming anomaly:** Lecture 2 apuntes is named `requerimientos` while slides is named `requisitos` (spelling inconsistency, same lecture). Lecture 3 has capitalization mismatch between apuntes and slides filename.

---

### Lesson 3: Programming Paradigms
**Source files:** `apuntes` + `slides` per lecture (7 lectures)

| # | Lecture | Files |
|---|---------|-------|
| 1 | Introduction | apuntes, slides |
| 2 | Structured / Imperative paradigm | apuntes, slides |
| 3 | Object-oriented paradigm | apuntes, slides |
| 4 | Functional paradigm | apuntes, slides |
| 5 | Multiparadigm | apuntes, slides |
| 6 | Other paradigms | apuntes, slides |
| 7 | Conclusions | apuntes, slides |

**Topics:** OOP, FP, imperative style, multiparadigm trade-offs
**Tags:** architecture

---

### Lesson 4: Best Practices and Design Principles
**Source files:** `apuntes` + `slides` per lecture (13 lectures)

| # | Lecture | Files |
|---|---------|-------|
| 1 | Why best practices matter | apuntes, slides |
| 2 | SOLID overview | apuntes, slides |
| 3 | Single Responsibility Principle | apuntes, slides |
| 4 | Open/Closed Principle | apuntes, slides |
| 5 | Liskov Substitution Principle | apuntes, slides |
| 6 | Interface Segregation Principle | apuntes, slides |
| 7 | Dependency Inversion Principle | apuntes, slides |
| 8 | DRY, KISS, YAGNI | apuntes, slides |
| 9 | Problems with OOP | apuntes, slides |
| 10 | Introduction to design patterns | apuntes, slides |
| 11 | Alternatives to classic patterns in multiparadigm languages | apuntes, slides |
| 12 | Anti-patterns | apuntes, slides |
| 13 | Conclusions and next steps | apuntes, slides |

**Topics:** SOLID principles, DRY/KISS/YAGNI, GoF patterns, anti-patterns
**Tags:** architecture

---

### Lesson 5: Spec Driven Development
**Source files:** mixed — apuntes + slides for most, one `.md` solution file

| # | Lecture | Files |
|---|---------|-------|
| 1 | Introduction to Spec Driven Development | apuntes, slides |
| 2 | Practical SDD example | apuntes only |
| 3 | Practice: requirements gathering — QuickReserve app | apuntes, slides |
| 4 | Solution and requirements for QuickReserve | apuntes, `.md` |

**Topics:** spec-first development, requirements capture practice, worked example
**Tags:** project-management, documentation

---

## Module 2: Software Architecture

### Lesson 1: Introduction to Software Architecture
**Source files:** `apuntes` + `slides` per lecture (13 lectures); lecture 12 has `prompts.md` instead of apuntes

| # | Lecture | Files |
|---|---------|-------|
| 1 | Module and subject introduction | apuntes, slides |
| 2 | What is software architecture | apuntes, slides |
| 3 | Key architectural decisions, Part 1 | apuntes, slides |
| 3 | Key architectural decisions, Part 2 | apuntes, slides |
| 5 | Architecture styles: introduction | apuntes, slides |
| 6 | Styles: modular monolith | apuntes, slides |
| 7 | Styles: microservices | apuntes, slides |
| 8 | Styles: hexagonal architecture | apuntes, slides |
| 9 | Styles: Clean Architecture | apuntes, slides |
| 10 | Styles: Event-Driven Architecture | apuntes, slides |
| 11 | Using AI to compare styles | apuntes, slides |
| 12 | Practice: proposing an architecture for a project | prompts.md, slides |
| 13 | Conclusions | apuntes, slides |

**Topics:** architecture styles (monolith, microservices, hexagonal, clean, EDA), trade-off analysis, AI-assisted design
**Tags:** architecture, AI

> **Numbering anomaly:** Two lectures numbered 3 (Parts 1 and 2); lecture 4 is missing.

---

### Lesson 2: Applying Clean Architecture with TypeScript
**Source files:** `apuntes` + `slides` per lecture (11 lectures); lectures 1, 8, 9, 11 apuntes only

| # | Lecture | Files |
|---|---------|-------|
| 1 | Introduction | apuntes only |
| 2 | Key principles | apuntes, slides |
| 3 | Folder structure in a Clean project | apuntes, slides |
| 4 | Domain: entities and value objects | apuntes, slides |
| 5 | Use cases: application logic | apuntes, slides |
| 6 | Ports and adapters: interfaces and implementation | apuntes, slides |
| 7 | Composition and dependency inversion | apuntes, slides |
| 8 | Implementing Clean Architecture step by step, Part 1 | apuntes only |
| 9 | Implementing Clean Architecture step by step, Part 2 | apuntes only |
| 10 | Testing in Clean Architecture | apuntes, slides |
| 11 | Conclusions | apuntes, slides |

**Topics:** Clean Architecture in practice with TypeScript, domain modeling, ports/adapters, DI, testing strategy
**Tags:** architecture, testing

---

### Lesson 3: Distributed Architectures and Service Communication
**Source files:** `apuntes` + `slides` per lecture (13 lectures); lecture 12 also has `prompts.md`

| # | Lecture | Files |
|---|---------|-------|
| 1 | Subject introduction | apuntes, slides |
| 2 | What is a distributed architecture | apuntes, slides |
| 3 | Myths and truths about microservices | apuntes, slides |
| 4 | Modular monoliths | apuntes, slides |
| 5 | Synchronous module/service communication | apuntes, slides |
| 6 | Asynchronous and event-based communication | apuntes, slides |
| 7 | Introduction to Event-Driven Architecture | apuntes, slides |
| 8 | Designing event flows | apuntes, slides |
| 9 | Implementing events in Node.js with TypeScript | apuntes, slides |
| 10 | Introduction to the Outbox pattern | apuntes, slides |
| 11 | Practice: from modular monolith to distributed system | apuntes, slides |
| 12 | Using AI to design distributed architectures | apuntes, slides, prompts.md |
| 13 | Conclusions and next steps | apuntes, slides |

**Topics:** distributed systems, sync/async communication, EDA, Outbox pattern, Node.js TypeScript implementation
**Tags:** architecture, AI

---

## Module 3: AI-Driven Development Flow

### Lesson 1: AI as Part of the Stack
**Source files:** `apuntes` only (7 lectures, no slides)

| # | Lecture |
|---|---------|
| 1 | Evolution of the development stack |
| 2 | Types of AI in development |
| 3 | Real use cases and hybrid workflows |
| 4 | Execution environments |
| 5 | Plan mode vs. build mode in coding agents |
| 6 | Advantages and risks of integrating AI at each development phase |
| 7 | Conclusions |

**Topics:** AI tooling landscape, agent modes, hybrid workflows, risk analysis
**Tags:** AI

---

### Lesson 2: Prompt Engineering for Developers
**Source files:** `apuntes` + `slides` for lecture 1; `apuntes` only for lectures 2–6

| # | Lecture | Files |
|---|---------|-------|
| 1 | Prompt engineering principles applied to code | apuntes, slides |
| 2 | Effective prompt structures for debugging, generation, and optimization | apuntes only |
| 3 | Prompt chaining | apuntes only |
| 4 | AI roles and personas for development goals | apuntes only |
| 5 | Practical workshop: prompts with Codex — to-do list app | apuntes only |
| 6 | Conclusions | apuntes only |

**Topics:** prompt structure, chaining, personas, practical coding prompts
**Tags:** AI

---

### Lesson 3: Rules, Knowledge Bases, and Documentation
**Source files:** `apuntes` + `slides` for lecture 1; `apuntes` only for lectures 2–10

| # | Lecture | Files |
|---|---------|-------|
| 1 | What is a knowledge base for AI and why it matters | apuntes, slides |
| 2 | The context folder | apuntes only |
| 3 | Defining agent behavior with AGENTS.md | apuntes only |
| 4 | Skills: giving capabilities to AI | apuntes only |
| 5 | Subagents and delegation | apuntes only |
| 6 | What is MCP (Model Context Protocol) | apuntes only |
| 7 | Creating an MCP with n8n | apuntes only |
| 8 | Practical workshop: Mini Pokedex | apuntes only |
| 9 | Practical workshop: Finance manager | apuntes only |
| 10 | Conclusions | apuntes only |

**Topics:** knowledge bases, context management, AGENTS.md, skills/subagents, MCP, n8n
**Tags:** AI, documentation

---

### Lesson 4: Integrating AI APIs and Popular Platforms
**Source files:** `apuntes` + `slides` for lecture 1; `apuntes` only for lectures 2–15

| # | Lecture | Files |
|---|---------|-------|
| 1 | Introduction to the most-used AI APIs and platforms | apuntes, slides |
| 2 | OpenAI: introduction to the API | apuntes only |
| 3 | OpenAI: text generation | apuntes only |
| 4 | OpenAI: image generation and vision | apuntes only |
| 5 | OpenAI: audio generation | apuntes only |
| 6 | ElevenLabs: introduction to the API | apuntes only |
| 7 | ElevenLabs: text to audio | apuntes only |
| 8 | ElevenLabs: generating dialogues | apuntes only |
| 9 | ElevenLabs: generating sound effects | apuntes only |
| 10 | ElevenLabs: generating music | apuntes only |
| 11 | ElevenLabs: voice agents | apuntes only |
| 12 | Using Vercel AI SDK to unify multiple providers | apuntes only |
| 13 | Using the n8n API | apuntes only |
| 14 | Practical workshop: automated podcast app from source | apuntes only |
| 15 | Conclusions and next steps | PDF (no suffix label) |

**Topics:** OpenAI API, ElevenLabs, Vercel AI SDK, n8n, multi-provider patterns
**Tags:** AI

---

## Module 4: Quality

> **Note:** This module uses `content.pdf` / `content.md` instead of `slides.pdf`. Each lecture has `apuntes` + `content`.

### Lesson 1: Testing
| # | Lecture | Files |
|---|---------|-------|
| 1 | Introduction | apuntes only |
| 2 | Setup: test map (front vs. back) | apuntes, content |
| 3 | TDD with AI | apuntes, content |
| 4 | Frontend integration | apuntes, content |
| 5 | AI-assisted E2E | apuntes, content |

**Topics:** test setup, TDD, integration tests, E2E with AI
**Tags:** testing, AI

---

### Lesson 2: Code Smells, Refactoring, and Technical Debt
| # | Lecture | Files |
|---|---------|-------|
| 1 | Detecting smells in UI | apuntes, content |
| 2 | Safe refactoring with TDD | apuntes, content |
| 3 | Advanced refactoring patterns | apuntes, content |
| 4 | Technical debt in practice | apuntes, content |

**Topics:** smell detection, safe refactoring, tech debt management
**Tags:** testing

---

### Lesson 3: Metrics, Coverage, and Complexity
| # | Lecture | Files |
|---|---------|-------|
| 1 | Minimum metrics that matter | apuntes, content |
| 2 | Honest coverage | apuntes, content |
| 3 | Visibility with Playwright | apuntes, content |
| 4 | Quality gate with Husky | apuntes, content |

**Topics:** code metrics, meaningful coverage, Playwright, pre-commit quality gates
**Tags:** testing, CI/CD

---

### Lesson 4: Observability with Sentry
| # | Lecture | Files |
|---|---------|-------|
| 1 | Less testing vs. more observing | apuntes, content |
| 2 | Sentry implementation | apuntes, content |
| 3 | Errors and release health | apuntes, content |
| 4 | User performance | apuntes, content |
| 5 | Speed alerts and playbook | apuntes, content |

**Topics:** Sentry setup, error tracking, release health, performance monitoring, alerting
**Tags:** infrastructure

---

### Lesson 5: Security + ENV + OWASP Top 10
| # | Lecture | Files |
|---|---------|-------|
| 1 | Environment variables and secrets | apuntes, content |
| 2 | Essential web security | apuntes, content |
| 3 | AuthN/AuthZ with tokens from scratch | apuntes, content |
| 4 | OWASP Top 10 applied | apuntes, content |
| 5 | Conclusions and next steps | apuntes only |

**Topics:** secrets management, auth, OWASP Top 10 (applied/practical focus)
**Tags:** security

> **Overlap:** Lesson 5 covers OWASP Top 10 at a practical/applied level. Module 6 covers it in full depth across two dedicated lessons (2021 and 2025 editions). These are complementary, not redundant, but check both before building auth/security features.

---

### Lesson 6: Documentation with AI
| # | Lecture | Files |
|---|---------|-------|
| 1 | Docs as code (minimal) | apuntes, content |
| 2 | APIs and components | apuntes, content |
| 3 | ADR: documenting the why | apuntes, content |
| 4 | Executive summaries with AI | apuntes, content |

**Topics:** docs-as-code, API/component docs, Architecture Decision Records, AI-generated summaries
**Tags:** documentation, AI

---

### Lesson 7: Usability
| # | Lecture | Files |
|---|---------|-------|
| 1 | Quick accessibility heuristics (a11y) | apuntes, content |
| 2 | Forms that don't frustrate | apuntes, content |
| 3 | Microcopy with AI | apuntes, content |
| 4 | Measuring perceived performance | apuntes, content |

**Topics:** a11y heuristics, form UX, microcopy, perceived performance
**Tags:** accessibility

---

## Module 5: Infrastructure and Cloud

### Lesson 1: DevOps and CI/CD
**Source files:** lecture 1 has `apuntes` + `slides` + `content.md`; lectures 2–6 have `apuntes` only (no slides)

| # | Lecture | Files |
|---|---------|-------|
| 1 | Introduction | apuntes, slides, content.md |
| 2 | What is DevOps | apuntes only |
| 3 | What is CI/CD | apuntes only |
| 4 | CI/CD platforms | apuntes only |
| 5 | Hello World with GitHub Actions | apuntes only |
| 6 | Conclusions | apuntes only |

**Topics:** DevOps culture, CI/CD concepts, GitHub Actions
**Tags:** CI/CD

---

### Lesson 2: Cloud Computing
**Source files:** lecture 1 has `apuntes` + `slides`; lectures 2–7 have `apuntes` only

| # | Lecture | Files |
|---|---------|-------|
| 1 | What is cloud computing | apuntes, slides |
| 2 | Major cloud providers | apuntes only |
| 3 | AI in the cloud | apuntes only |
| 4 | Infrastructure as code | apuntes only |
| 5 | Costs and best practices | apuntes only |
| 6 | Certifications | apuntes only |
| 7 | Conclusions | apuntes only |

**Topics:** cloud concepts, IaC, cloud AI services, cost management
**Tags:** infrastructure, AI

---

### Lesson 3: Databases
**Source files:** lecture 1 has `slides` only; lectures 2–4 have `apuntes` only

| # | Lecture | Files |
|---|---------|-------|
| 1 | Relational databases | slides only |
| 2 | Non-relational databases | apuntes only |
| 3 | Vector databases | apuntes only |
| 4 | Conclusions | apuntes only |

**Topics:** SQL, NoSQL, vector DBs (for RAG/AI use cases)
**Tags:** infrastructure, AI

---

### Lesson 4: Containerization
**Source files:** lecture 1 has `apuntes` + `slides`; lectures 2–8 have `apuntes` only

| # | Lecture | Files |
|---|---------|-------|
| 1 | What is a container | apuntes, slides |
| 2 | Orchestrating containerized apps: Kubernetes | apuntes only |
| 3 | Cloud vendor options | apuntes only |
| 4 | Practice: deploying apps on Kubernetes | apuntes only |
| 5 | Docker Hub | apuntes only |
| 6 | Kubernetes locally | apuntes only |
| 7 | Practice: deploying apps on Kubernetes (extended) | apuntes only |
| 8 | Conclusions | apuntes only |

**Topics:** Docker, Kubernetes, cloud deployment, local dev with containers
**Tags:** infrastructure, deployment

> **Anomaly:** Lecture 1 apuntes is named `apunteses.pdf` (typo, likely `apuntes.pdf`). Lectures 4 and 7 appear to be duplicate practice titles — may cover different stages of the same exercise.

---

### Lesson 5: LangChain with Python
**Source files:** lecture 1 has `apuntes` + `slides`; lectures 2–7 have `apuntes` only

| # | Lecture | Files |
|---|---------|-------|
| 1 | What is RAG | apuntes, slides |
| 2 | Building an indexer | apuntes only |
| 3 | Building a retriever | apuntes only |
| 4 | Building an agent | apuntes only |
| 5 | Frontend with Gradio | apuntes only |
| 6 | Deploying to the cloud (Render or Railway) | apuntes only |
| 7 | Conclusions | apuntes only |

**Topics:** RAG pipeline, LangChain, indexing, retrieval, agent construction, Gradio UI, cloud deployment
**Tags:** AI, deployment

---

### Lesson 6: LLMOps
**Source files:** lecture 1 has `apuntes` + `slides`; lectures 2–5 have `apuntes` only

| # | Lecture | Files |
|---|---------|-------|
| 1 | Observability in the LLM world | apuntes, slides |
| 2 | Introduction to LangSmith | apuntes only |
| 3 | What are evaluations | apuntes only |
| 4 | Evaluations with LangSmith | apuntes only |
| 5 | Conclusions and next steps | apuntes only |

**Topics:** LLM observability, LangSmith, evals
**Tags:** AI, infrastructure

> **Anomaly:** Lecture 1 slides file is named `Observabilidad en el mundo de los LLSs - slies.pdf` (two typos: "LLSs" and "slies"). Same lecture as the apuntes.

---

### Lesson 7: Multi-Agent Systems
**Source files:** lecture 1 has `apuntes` + `slides`; lectures 2–4 have `apuntes` only

| # | Lecture | Files |
|---|---------|-------|
| 1 | What is Google ADK | apuntes, slides |
| 2 | Multi-agent architecture | apuntes only |
| 3 | Hands-on | apuntes only |
| 4 | Conclusions | apuntes only |

**Topics:** multi-agent systems, Google Agent Development Kit
**Tags:** AI

---

## Module 6: Security

### Lesson 1: Introduction to Secure Development
| # | Lecture | Files |
|---|---------|-------|
| 1 | Security by Design and Security by Default principles | apuntes, slides |
| 2 | Impact of AI on the threat landscape | apuntes, slides |
| 3 | Current threat models | apuntes, slides |
| 4 | Conclusions | apuntes, slides |

**Topics:** secure design principles, AI-driven threats, threat modeling
**Tags:** security, AI

---

### Lesson 2: OWASP Top 10 — 2021 Edition
| # | Lecture | Files |
|---|---------|-------|
| 1 | Broken Access Control | apuntes, slides |
| 2 | Cryptographic Failures | apuntes, slides |
| 3 | Injection | apuntes, slides |
| 4 | Insecure Design | apuntes, slides |
| 5 | Security Misconfiguration | apuntes, slides |
| 6 | Vulnerable and Outdated Components | apuntes, slides |
| 7 | Identification and Authentication Failures | apuntes, slides |
| 8 | Software and Data Integrity Failures | apuntes, slides |
| 9 | Logging and Monitoring Failures | apuntes, slides |
| 10 | Conclusions | apuntes, slides |

**Topics:** full OWASP Top 10 2021 walkthrough, one lecture per vulnerability
**Tags:** security

> **Anomaly:** Lecture 7 filename reads `Identificatio` (missing final `n`) — same content as "Identification and Authentication Failures".

---

### Lesson 3: OWASP Top 10 — 2025 Edition
| # | Lecture | Files |
|---|---------|-------|
| 1 | Broken Access Control | apuntes, slides |
| 2 | Security Misconfiguration | apuntes, slides |
| 3 | Software Supply Chain Failures | apuntes, slides |
| 4 | Cryptographic Failures | apuntes, slides |
| 5 | Injection | apuntes, slides |
| 6 | Insecure Design | apuntes, slides |
| 7 | Authentication Failures | apuntes, slides |
| 8 | Software and Data Integrity Failures | apuntes, slides |
| 9 | Security Logging and Alerting Failures | apuntes, slides |
| 10 | Mishandling of Exceptional Conditions | apuntes, slides |

**Topics:** updated OWASP Top 10 2025 — new entries include Supply Chain and Exceptional Conditions
**Tags:** security

---

### Lesson 4: Secure Development Methodologies
| # | Lecture | Files |
|---|---------|-------|
| 1 | Secure Software Development Lifecycle (SSDLC) | apuntes, slides |
| 2 | DevSecOps and security in the CI/CD pipeline | apuntes, slides |
| 3 | Shift Left Security | apuntes, slides |
| 4 | Assistance tools: Snyk | apuntes, slides |
| 5 | Conclusions | apuntes, slides |

**Topics:** SSDLC, DevSecOps, shift-left, Snyk
**Tags:** security, CI/CD

---

### Lesson 5: Secure Coding Practices
| # | Lecture | Files |
|---|---------|-------|
| 1 | Input validation and sanitization | apuntes, slides |
| 2 | Authentication, authorization, and credential management | apuntes, slides |
| 3 | Security in API usage | apuntes, slides |
| 4 | Architecture of a secure project | apuntes, slides |
| 5 | Architecture of a secure infrastructure | apuntes, slides |
| 6 | Conclusions | apuntes, slides |

**Topics:** validation, auth/authz, API security, secure architecture patterns
**Tags:** security, architecture

---

### Lesson 6: Using AI in Secure Development
| # | Lecture | Files |
|---|---------|-------|
| 1 | Building a secure application with AI, Part 1 | apuntes, slides |
| 2 | Building a secure application with AI, Part 2 | apuntes only |
| 3 | Building a secure application with AI, Part 3 | apuntes only |
| 4 | Conclusions and next steps | apuntes, slides |

**Topics:** AI-assisted secure coding, practical multi-part walkthrough
**Tags:** security, AI

---

## Module 7: AI-Powered Development (Projects)

### Lesson 1: Front-End Project — E-commerce Web App with React and Vite
**Source files:** `Apuntes.pdf`, `README.md`, `CLAUDE.md`, 30 numbered prompt files (`00–29`), 12 video guide files (`video-01` to `video-12`)

**Numbered prompt files by topic:**

| Files | Topic area | Tags |
|-------|-----------|------|
| `00-context-prompt.md`, `00-overview.md`, `00-validation-questions.md` | Project setup and context | project-management |
| `01-testing-setup.md` to `05-e2e-testing.md` | Testing (TDD, integration, E2E) | testing |
| `06-safe-refactoring.md` to `08-tech-debt.md` | Refactoring and tech debt | testing |
| `09-essential-metrics.md` to `12-quality-gates-husky.md` | Metrics, coverage, quality gates | testing, CI/CD |
| `13-observability-strategy.md` to `17-sentry-alertas.md` | Sentry observability | infrastructure |
| `18-env-secrets.md` to `21-owasp-top10.md` | Security and secrets | security |
| `22-docs-as-code.md` to `25-executive-summary.md` | Documentation | documentation |
| `26-heuristics-a11y.md` to `29-performance-percibida.md` | Accessibility and UX | accessibility |

**Video guide files:**

| File | Topic |
|------|-------|
| `video-01-setup.md` | Project setup |
| `video-02-catalog.md` | Product catalog |
| `video-03-business-logic.md` | Business logic |
| `video-04-cart-components.md` | Cart components |
| `video-05-cart-context.md` | Cart context/state |
| `video-06-discounts.md` | Discount logic |
| `video-07-e2e.md` | E2E testing |
| `video-08-refactoring.md` | Refactoring |
| `video-09-auth-security.md` | Auth and security |
| `video-10-a11y-ux.md` | Accessibility and UX |
| `video-11-sentry.md` | Sentry integration |
| `video-12-quality-gates.md` | Quality gates |

**Tags:** testing, security, documentation, accessibility, infrastructure, CI/CD, AI
**This is the most complete reference project in the course — prompt files map 1:1 to Module 4 and 6 topics.**

---

### Lesson 2: Mobile Project — App from Prototype to API Consumption
**Source files:** `Apuntes.pdf` only

**Topics:** mobile app development with AI, prototyping to API integration
**Tags:** AI

---

### Lesson 3: Back-End Project — API with OpenAPI, Express, and PostgreSQL
**Source files:** `api-design.md` only

**Topics:** API design, OpenAPI spec, Express, PostgreSQL
**Tags:** architecture, documentation

---

### Lesson 4: AI Project — Interactive CLI with Real-Time Web Search
**Source files:** `Proyecto IA - slides.pdf` only

**Topics:** AI CLI tool, real-time web search integration
**Tags:** AI

---

### Lesson 5: Practice — Modern Development with AI
**Source files:** `apuntes` + `slides` for lecture 1; `apuntes` only for lectures 2–11

| # | Lecture | Files |
|---|---------|-------|
| 1 | Generative AI | apuntes, slides |
| 2 | Context window | apuntes only |
| 3 | Chat vs. agent | apuntes only |
| 4 | Evolution of context | apuntes only |
| 5 | Engram memory | apuntes only |
| 6 | Skills and registry | apuntes only |
| 7 | SDD: fundamentals | apuntes only |
| 8 | SDD: implementation | apuntes only |
| 9 | Skill of the final reckoning | apuntes only |
| 10 | The ecosystem | apuntes only |
| 11 | Modern development with AI: conclusions | apuntes only |

**Topics:** generative AI fundamentals, context management, agent architecture, SDD applied with AI
**Tags:** AI, project-management

---

## Module 8: Masterclasses

**Source files:** slides only (no apuntes)

| Title | Files | Tags |
|-------|-------|------|
| How to evaluate LLMs | slides only | AI |
| Domain-Driven Design | slides only | architecture |

---

## Module 9: TFM (Final Project)

**Source files:** `Documento del TFM.pdf`

**Topics:** Final project document — requirements, scope, and deliverable definition
**Tags:** project-management

---

## Flagged Anomalies

| Location | Issue |
|----------|-------|
| M1 / Lesson 2 / Lecture 2 | Apuntes named `requerimientos`, slides named `requisitos` — same lecture, spelling inconsistency |
| M1 / Lesson 2 / Lecture 3 | Capitalization mismatch: `especificacion` (apuntes) vs `Especificacion` (slides) |
| M2 / Lesson 1 | Two files numbered 3 (Parts 1 and 2); lecture 4 is missing |
| M5 / Lesson 4 / Lecture 1 | Apuntes file named `apunteses.pdf` (extra `es`, typo) |
| M5 / Lesson 6 / Lecture 1 | Slides named `LLSs - slies.pdf` — double typo in lesson name and suffix |
| M6 / Lesson 2 / Lecture 7 | Filename reads `Identificatio and Authentication Failures` (missing final `n`) |
| M4 / Lesson 5 + M6 / Lessons 2–3 | OWASP Top 10 coverage across two modules — different depth (applied vs. deep-dive), complementary not redundant |

---

## Priority Modules for the Final Project

| Module | Why |
|--------|-----|
| **M1 / Lesson 5: Spec Driven Development** | Directly governs how requirements and specs are written before coding |
| **M2: Software Architecture** | Foundation for all structural decisions — architecture styles, Clean Architecture, distributed systems |
| **M4: Quality** | One-stop coverage of testing, observability, security basics, docs, and a11y |
| **M5: Infrastructure and Cloud** | Deployment, containerization, databases, CI/CD pipeline |
| **M6: Security** | Most thorough security coverage in the course — OWASP both editions, DevSecOps, secure coding |
| **M7 / Lesson 1: React/Vite project** | The reference implementation — 30+ prompt files and 12 video guides covering everything from testing to a11y, mapped directly to Modules 4 and 6 |
| **M7 / Lesson 5: Modern Dev with AI** | Consolidates SDD + agent architecture — the conceptual capstone before the final project |
