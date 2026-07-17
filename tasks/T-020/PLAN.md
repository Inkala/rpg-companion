# T-020: Party quest-board cards and Home section contrast

Status: complete

## Parallel-work assessment

- Classification: Yellow.
- Can start in a separate worktree now: Yes, after this approved planning checkpoint is committed
  and pushed.
- Required base branch or commit: clean `main` at
  `66a17402aba74e80eb4f921f258390d66b66e89b` or a later legitimate main commit containing the
  T-019 merge.
- Files/folders this task owns: `backend/internal/parties/`, focused server Party tests,
  `frontend/src/parties/`, `frontend/src/features/home/SignedInHomeContent.tsx` only if structural
  hooks are needed, `frontend/src/features/home/home.css`, `frontend/src/pages/HomePage.test.tsx`,
  and focused route/App tests only if route serialization or integration requires them.
- Shared files it must not modify: shared orchestration records from worker sessions, CI,
  deployment configuration, infrastructure, migrations, auth behavior, character-creation flows,
  provider settings, and unrelated Party detail/invite/join behavior.
- Dependencies or tasks that must merge first: T-019 is merged, deployed, and validated through PR
  #27 at merge SHA `66a17402aba74e80eb4f921f258390d66b66e89b`.
- Planned integration point: one dedicated T-020 worktree and one task branch after this planning
  checkpoint.
- Intended merge order: Slice 1 backend Party-list contract first, then Slice 2 frontend Party/Home
  presentation on the same task branch.

## Goal

Improve the signed-in Home Party list with privacy-safe summary data, quest-board Party cards, real
link semantics, and clearer Home section contrast without changing global page background or Party
workflow behavior.

## Current production registration status

Current production registration works correctly from a fresh signed-out browser:

- no `Set-Cookie` is returned;
- the user remains signed out;
- the browser shows `/login`;
- the exact success toast appears: `Account created. Sign in to continue.`

No auth code change is currently justified. Reopen the defect only if it can be reproduced with the
original browser/session conditions. Registration is not an implementation slice in T-020.

## Implementation slices

### Slice 1: backend Party-list contract

- Model and response DTO.
- Membership-scoped query.
- Deterministic folding and ordering.
- Exact-key privacy tests.
- PostgreSQL integration tests.
- Complete backend validation.
- Stop for review before commit or Slice 2.

### Slice 2: frontend Party/Home presentation

- API types and fixtures.
- Quest-board Party cards.
- Semantic whole-card anchors.
- Muted My characters and My parties sections.
- Exact bordered empty Party card.
- Responsive one/two/three-column layout.
- Accessibility and navigation tests.
- Browser validation at `320px`, `390px`, `720px`, and desktop.
- Complete frontend/backend regression gates.
- Stop for review before commit, PR, or deployment.

## Out of scope

- No global background redesign.
- No profile display-name contract.
- No Party edit/delete/leave/kick/member-removal work.
- No invite-flow changes.
- No automatic Party linking after character creation.
- No migration.
- No auth implementation changes.
- No deployment, provider, CI, or infrastructure changes.

## Completion evidence

- T-020 merged and deployed as `e7053fb72f8b52e73e08dfdd8668b9a429abb803`.
- Controlled production rollout passed for the same SHA.
- Local `main` and `origin/main` were reconciled to the same SHA on 2026-07-17.
- No T-020 follow-up implementation remains in scope for this task.
