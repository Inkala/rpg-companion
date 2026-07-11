# T-014: GM feedback triage for Character Reference

Status: complete

T-014 is complete as a docs-only feedback triage task. It does not authorize implementation by
itself. Any Character Reference compact stat/header polish, attack reminder badge, or calculation
breakdown work needs a separate approved implementation task.

This is a documentation-only feedback triage task. Do not modify application code, tests, backend
code, migrations, dependencies, CI, deployment config, branches, worktrees, staging, commits,
pushes, or Git history.

## Parallel-work assessment

- Classification: Green.
- Recommendation: current worktree.
- Reason: Docs-only product triage. No runtime files, schemas, routes, tests, config, or deployment
  files are owned.
- Expected owned files or folders: `tasks/T-014/`, `CURRENT.md`, `WORKLOG.md`.
- Shared files or dependencies: shared task bookkeeping only.

## Goal

Capture early Spanish GM tester feedback about the current Character Reference and in-session
experience without accidentally expanding MVP scope.

## Context

Certain:

- The first MVP loop is complete locally: Help me choose, review generated Fighter, save, My
  characters, and open saved Character Reference.
- The feedback is from an experienced GM reviewing the current Character Reference and likely
  in-session use.
- The feedback clusters around information density, action reminders, calculation detail,
  turn-time assistance, resource tracking, and combat state.

Assumption:

- The safest product response is to improve Character Reference readability before building a
  tactical assistant or resource engine.

## Product Direction

Treat this feedback as a prioritization signal, not a mandate to build every idea now.

Recommended immediate path:

1. Character Reference compact stat/header polish.
2. Attack action reminder badges, or calculation breakdown modal as the next small follow-up.

Explicitly defer:

- "It's my turn" tactical assistant.
- Full spell/resource tracker.
- Combat/exploration mode.
- Rest system.

## Scope

In scope for this docs-only task:

- Classify each feedback item.
- Identify the problem behind each suggestion.
- Propose a product response.
- Record implementation risk and dependencies.
- Decide whether each item should affect current MVP.
- Recommend priority.
- Recommend one or two small next implementation tasks.

Out of scope for this docs-only task:

- Any code, test, backend, migration, dependency, CI, deployment, branch, worktree, staging, commit,
  push, or Git history change.
- Any commitment to build a full combat assistant.
- Any new D&D rules engine requirement.

## Classification Buckets

1. Tiny fix.
2. Near-term Character Reference polish.
3. Mid-term interaction improvement.
4. Future combat assistant feature.
5. Out of scope for MVP.

## Recommended Next Tasks

Recommended first implementation slice:

- Character Reference compact stat/header polish.

Why this first:

- It directly addresses space pressure.
- It does not require rules calculation changes.
- It improves the existing complete MVP loop.
- It can be tested visually and with component tests.

Recommended second possible slice:

- Attack action reminder badges.

Why this second:

- It improves action usability while staying within Character Reference.
- It can reuse existing generated Fighter data and reference payload content.
- It avoids building resource tracking or tactical recommendations.

Alternative second slice:

- Calculation breakdown modal for attack hit bonus.

Why it may wait:

- It needs reliable source components for each calculation. For generated Fighters this is easy,
  but for future manual entry the data may be user-entered and incomplete.

## Validation

Run:

```sh
git diff --check
git status --short --branch
```

## Proposed Commit Message

```text
docs(product): triage GM feedback for character reference
```
