# T-005: UI direction for home, account, Character Reference, and guided creation

Status: planning

## Parallel-work assessment

- Classification: Green
- Recommendation: current worktree
- Reason: This is a documentation-only design planning task. It does not touch app code, backend code,
  dependencies, infrastructure, Git history, Figma, or generated artifacts.
- Expected owned files or folders: `tasks/T-005/`
- Shared files or dependencies: `CURRENT.md`, `WORKLOG.md`, and the stale Character Reference
  extraction checkbox in `tasks/T-003/TASKS.md`

## Goal

Create a Figma-ready design direction for Hunin before guided character creation implementation
continues.

The task records product-owner UI decisions for:

- signed-out home,
- signed-in home,
- account affordances,
- form and error styling,
- scalable Character Reference sections,
- guided character creation,
- future Figma frames and components.

This task is planning only. It should make the next implementation slices smaller and safer without
blocking the MVP on a full redesign.

## Context

Hunin is a D&D 5E 2014 companion app for occasional or busy players. The app's main value is helping
players create, understand, and grow characters. In-game reference is a lightweight reminder
experience, not the whole product.

T-004 Character Reference extraction has merged into `main`. The current reusable foundation lives
under:

```text
frontend/src/characters/
```

Some status docs are stale and still imply Character Reference extraction has not started. This task
may update only the stale status lines needed to reflect that T-004 has merged.

Figma MCP is not available in this Codex session. Neither `figma` nor `figma-local` is exposed, so
this task creates Markdown plans only.

## Product-owner decisions recorded by this task

- Keep the warm parchment, forest green, brass, and ink direction.
- Treat the current visual direction as good. This is refinement, not a full redesign.
- Make form error text smaller, lighter, and less bold.
- Reduce full-width buttons on desktop and tablet. Keep full-width where useful on narrow mobile.
- Move account actions toward the top or header area.
- Keep Mara as signed-out sample/demo content.
- Make signed-in home prioritize My characters, My parties, empty-state create/add actions, and Mara
  as secondary demo content.
- Design signed-in home now as target information architecture, even though full implementation
  waits for a future character list/home task.
- Treat character creation as mostly desktop/browser-first.
- Treat Character Reference as mobile-first.
- Support two guided creation paths over time: Help me choose and I know what I want.
- Keep the first Help me choose implementation narrow: recommend between the approved Strength melee
  Fighter and Dexterity archer Fighter presets.
- Leave room for manual choice descriptions, tooltips, and disclosures.
- Include design space for a background story textarea and character image upload placeholder.
- Defer actual image upload and storage implementation.
- Consider future light/dark mode in tokens, but do not implement theme switching now.
- Add favicon as later small polish.
- Keep the quick-reference card/dialog mostly as-is until more real information needs are known.

## Scope

In scope:

- T-005 planning documents.
- Figma-ready Markdown structure.
- Future implementation task sequence and parallel-work assessments.
- Minimal status updates to point current work at T-005.
- Minimal stale T-003 checkbox update for merged Character Reference extraction.

Out of scope:

- Application code changes.
- CSS changes.
- Backend code or API changes.
- Migrations.
- Tests.
- Dependency changes.
- CI or deployment changes.
- Worktree, branch, staging, commit, push, reset, or stash operations.
- Figma file creation or modification.
- Figma MCP troubleshooting.

## Deliverables

- `tasks/T-005/PLAN.md`
- `tasks/T-005/REQUIREMENTS.md`
- `tasks/T-005/DESIGN.md`
- `tasks/T-005/TASKS.md`
- `tasks/T-005/NOTES.md`

## Validation

Planning validation:

- Documentation review.
- `git diff --check`.
- `git status --short`.

No app checks are required because this task does not change application code.

## Next action

Review and approve the T-005 design direction. After approval, use `TASKS.md` to select the first
future implementation task.
