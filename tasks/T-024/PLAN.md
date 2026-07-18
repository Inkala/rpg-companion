# T-024 Plan: Quick QA Consistency Fixes

Status: approved

## Scope

Implement the approved compact QA consistency pass:

1. Global navigation/menu and sign-out confirmation.
2. Account confirm-password and toast polish.
3. Empty signed-in Home copy and action labels.
4. Guided selection selected-state cleanup.
5. Character Reference quick-reference detail contract.
6. Party terminology, GM badge, and character-reference Eye action.

## Execution notes

- T-024 is the next approved implementation task.
- Use one dedicated implementation worktree.
- Preserve existing auth, party, character, and reference behavior unless explicitly listed in
  requirements.
- Do not broaden into T-025 data-model or SRD work.

## Validation commands

Focused frontend tests should cover the touched areas. Complete validation:

```sh
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
cd backend
go test -p 1 ./...
go vet ./...
go build ./...
git diff --check
```

Browser checks:

```text
Check affected signed-out and signed-in paths at 320px, 390px, 720px, and desktop.
```

## Stop point

Stop for review after implementation. Do not start T-025 automatically.
