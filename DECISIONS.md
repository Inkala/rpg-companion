# Decisions

Record durable choices here. Keep entries short.

## Template

```text
## YYYY-MM-DD: Decision title

Context:

Decision:

Reason:

Consequences:
```

## Entries

## 2026-06-27: Product name

Context:
The project needed a one-word name that sounded natural in both English and Spanish, felt fantasy-adjacent, and connected to the idea of a wise animal guide.

Decision:
The product name is **Hunin**.

Reason:
It is inspired by the names of Odin’s ravens, suggests memory and guidance, and is easy to pronounce in English and Spanish.

Consequences:
Future UI, documentation, repository naming, domain research, and branding should use Hunin.

## 2026-06-28: Character persistence foundation

Context:
Hunin needs the first backend foundation for future saved characters without implementing accounts,
sessions, parties, or the character-creation UI.

Decision:
Use PostgreSQL, direct SQL through pgxpool, and versioned SQL migrations with golang-migrate.
Start local PostgreSQL with a root `compose.yaml` database service only. Store explicit relational
core character fields and keep initial actions, features, and spells content in `reference_payload`
JSONB. Keep `owner_subject_id` nullable and reserved for future authenticated ownership.

Reason:
The character core is relational and benefits from schema constraints, while quick-reference content
is still too early to normalize into a full D&D rules model.

Consequences:
Normal API startup does not run migrations. Developers apply migrations explicitly. Integration
tests use `TEST_DATABASE_URL` only and must point at a disposable test database.
