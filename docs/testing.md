# Testing Guidance

Implementation tasks should use TDD or a test-first workflow where practical. Every feature slice
should include focused tests unless the active task explicitly documents why tests are not useful or
not possible.

Use the smallest useful check first. Broaden validation when the change touches shared code,
configuration, persistence, deployment, or important user-facing flows.

Suggested order:

1. Targeted test for the changed behavior.
2. Related test file or package.
3. Type check or lint check if the project has one.
4. Build check for user-facing or integration-sensitive changes.
5. Manual smoke test for important flows.

Coverage expectations:

- Cover success, error, signed-in, signed-out, and edge states when relevant.
- Frontend changes require lint, typecheck, test, and build.
- Backend changes require test, vet, and build.
- Implementation without tests requires explicit justification in the active task notes.
- Codex prompts should report the intended test plan before editing and validation results after
  editing.

Record what was run in `WORKLOG.md` and, when relevant, in the active task's `NOTES.md`.
