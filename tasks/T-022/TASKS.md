# T-022 Tasks: Character Reference Visual QA

Status: approved

- [ ] Confirm path, branch, clean status, and HEAD before editing.
- [ ] Read `AGENTS.md`, `PROJECT.md`, `CURRENT.md`, `CHECKS.md`, and this task folder.
- [ ] Report the parallel-work assessment before editing.
- [ ] Add or update focused tests for AC color and stat tile classes where practical.
- [ ] Add focused assertion that Home AC receives `stat--ac`.
- [ ] Add focused assertions that mapped Initiative, Passive Perception, and Proficiency have their
  exact emphasis values.
- [ ] Add focused assertion that expanded stat hooks retain semantic `dl`/`dt`/`dd` markup.
- [ ] Add focused assertion that `.section-panel` content remains semantically intact after the
  background change.
- [ ] Center signed-out Home action button text.
- [ ] Normalize expanded HP, AC, and Speed tile size/background.
- [ ] Make AC blue on Home and expanded Character Reference.
- [ ] Normalize Initiative, Passive Perception, and Proficiency tile size/background while preserving
  approved semantic colors.
- [ ] Apply Initiative value `var(--color-state-action)`.
- [ ] Apply Passive Perception value `var(--color-state-ac)`.
- [ ] Apply Proficiency value `var(--color-state-bonus)`.
- [ ] Apply AC value `var(--color-state-ac)`.
- [ ] Apply Character Reference label color `var(--color-text-secondary)` on muted stat backgrounds.
- [ ] Ensure colors remain supplemental and visible labels carry meaning.
- [ ] Make primary and secondary expanded stat groups use three equal `minmax(0, 1fr)` columns.
- [ ] Match muted backgrounds, padding, and gap across primary and secondary expanded stat groups.
- [ ] Keep stat tiles at least `72px` high with safe label wrapping.
- [ ] Confirm computed tile dimensions match within `1px` during browser validation.
- [ ] Apply muted beige to `.section-panel`.
- [ ] Confirm no edits were made to character creation, App, Join Party, Party API, or Party
  component files.
- [ ] Run focused tests.
- [ ] Run complete frontend validation.
- [ ] Run browser checks at 320px, 390px, 720px, and desktop.
- [ ] Run `git diff --check`.
- [ ] Stop for review before commit, push, PR, deployment, or another task.
