# Testing Guidance

Use the smallest useful check first. Broaden validation when the change touches shared code,
configuration, persistence, deployment, or important user-facing flows.

Suggested order:

1. Targeted test for the changed behavior.
2. Related test file or package.
3. Type check or lint check if the project has one.
4. Build check for user-facing or integration-sensitive changes.
5. Manual smoke test for important flows.

Record what was run in `WORKLOG.md` and, when relevant, in the active task's `NOTES.md`.
