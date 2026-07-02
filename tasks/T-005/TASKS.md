# T-005 Tasks

Status: planning

This is a design/documentation task. No application implementation should happen inside T-005.

## 1. Approve T-005 design direction

## Parallel-work assessment

- Classification: Green
- Recommendation: current worktree
- Reason: Review only. No file ownership beyond `tasks/T-005/` and status docs.
- Expected owned files or folders: `tasks/T-005/`
- Shared files or dependencies: `CURRENT.md`, `WORKLOG.md`

- [ ] Review and approve the T-005 design direction before implementation tasks begin.

## 2. Safe CSS/UI polish

## Parallel-work assessment

- Classification: Yellow
- Recommendation: separate worktree after T-005 approval, or current worktree if no other frontend
  UI task is active
- Reason: Small CSS changes touch shared visual primitives used by landing, account, and Character
  Reference.
- Expected owned files or folders: `frontend/src/App.css`, focused frontend tests if behavior
  changes
- Shared files or dependencies: `frontend/src/App.tsx`, `frontend/src/characters/`

- [ ] Plan and implement smaller/lighter form errors and less full-width desktop/tablet buttons.

## 3. Home and account hierarchy redesign

## Parallel-work assessment

- Classification: Yellow
- Recommendation: separate worktree after T-005 approval
- Reason: This touches `App.tsx` composition and shared landing/account styling while guided
  creation may also need app-level navigation.
- Expected owned files or folders: `frontend/src/App.tsx`, `frontend/src/App.css`, focused landing
  and account tests
- Shared files or dependencies: auth API client, Character Reference entry point, future creation
  entry point

- [ ] Move account actions toward the top/header and make signed-out home prioritize create/add
  actions before Mara.

## 4. Signed-in home target IA planning

## Parallel-work assessment

- Classification: Green
- Recommendation: planning only until a character list/home API task is approved
- Reason: The target IA can be documented now, but full implementation depends on future character
  list and party data.
- Expected owned files or folders: future task docs for character list/home
- Shared files or dependencies: future `GET /characters`, future party APIs

- [ ] Create a future implementation task for signed-in home once character list/home scope is
  approved.

## 5. Guided creation entry and choice UX

## Parallel-work assessment

- Classification: Yellow
- Recommendation: separate worktree after T-003 derivation work is ready
- Reason: Creation UI will touch new feature files and app-level view coordination.
- Expected owned files or folders: `frontend/src/character-creation/`, focused creation tests
- Shared files or dependencies: `frontend/src/App.tsx`, `frontend/src/App.css`,
  `frontend/src/characters/`

- [ ] Implement Help me choose vs I know what I want entry using the approved Fighter-only scope.

## 6. Guided preference questions

## Parallel-work assessment

- Classification: Green
- Recommendation: separate worktree or same creation worktree
- Reason: Narrow option selection can stay inside the character creation feature folder.
- Expected owned files or folders: `frontend/src/character-creation/`
- Shared files or dependencies: creation option data and derivation utilities

- [ ] Add the first Help me choose question(s) that recommend Strength melee Fighter or Dexterity
  archer Fighter.

## 7. Manual selection descriptions and disclosures

## Parallel-work assessment

- Classification: Green
- Recommendation: same creation worktree as manual selection UI
- Reason: The work is local to creation components and option copy.
- Expected owned files or folders: `frontend/src/character-creation/`
- Shared files or dependencies: creation option data

- [ ] Add manual selectors with accessible descriptions/disclosures for approved choices.

## 8. Story textarea and image placeholder

## Parallel-work assessment

- Classification: Green
- Recommendation: same creation worktree as the creation form
- Reason: Story and image placeholder are local UI/data additions if actual upload/storage remains
  deferred.
- Expected owned files or folders: `frontend/src/character-creation/`
- Shared files or dependencies: draft type and derived review mapping

- [ ] Add optional story textarea and visible image placeholder without implementing image upload or
  storage.

## 9. Character Reference scalable section model

## Parallel-work assessment

- Classification: Yellow
- Recommendation: separate worktree after creation MVP proves what reference payloads need
- Reason: Section modeling touches reusable Character Reference types and rendering behavior.
- Expected owned files or folders: `frontend/src/characters/`, focused Character Reference tests
- Shared files or dependencies: creation reference payload derivation, Mara demo data

- [ ] Extend the Character Reference model toward Overview, Combat, Actions / Attacks, Features &
  Traits, Skills & Saves, Equipment, Personality / Story, Spells, and Notes when product data needs
  it.

## 10. Figma frame creation later

## Parallel-work assessment

- Classification: Green
- Recommendation: planning only until Figma MCP or manual Figma work is available
- Reason: Figma MCP is unavailable in this Codex session.
- Expected owned files or folders: none in repo unless exported design artifacts are later approved
- Shared files or dependencies: none

- [ ] Create Figma pages, frames, and components later from `DESIGN.md` when Figma access is
  available.
