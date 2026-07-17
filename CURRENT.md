# Current Work

Submission deadline: 20 July 2026

Active task: T-021/T-022 approved QA follow-up planning

State: T-020 Party quest-board cards and Home section contrast is complete, merged, deployed, and
validated. Final merge/deployment SHA:
`e7053fb72f8b52e73e08dfdd8668b9a429abb803`.

T-021 and T-022 are approved as two parallel implementation lanes. They may run in parallel only
under their documented strict file boundaries. T-021 must merge first; T-022 must then rebase onto
updated main and rerun its complete validation. No implementation worktree exists yet and no
implementation has started.

## Completed T-020 result

- Merge/deployment SHA: `e7053fb72f8b52e73e08dfdd8668b9a429abb803`.
- Controlled production rollout: passed.
- Local reconciliation on 2026-07-17: checkout was clean, `git pull --ff-only` completed, and local
  `main` plus `origin/main` both matched the final SHA exactly.
- Status: complete. Party-list cards use the quest-board presentation, Home section contrast is
  applied, and the approved backend Party-list privacy boundary is deployed.

## Completed T-019 result

- Branch: `codex/t019-ux-polish`.
- PR: #27.
- Merge SHA: `66a17402aba74e80eb4f921f258390d66b66e89b`.
- Slice 1 commit: `cf79f919f3ef56b77f6e1779606c3bc7aa94e77d`.
- Slice 2 commit: `c53de604388ff89d2750bc4b757155db7b6d0143`.
- Slice 3 commit: `b6ce49b457aa1225a505aa3be6ded8ef2a693f98`.
- Evidence checkpoint commit: `836b6816c328fa1dd9634eec7a519b640feb2272`.
- Secret-history suppression commit: `242179e4edcc40ad25ffc635b10625cf6b644286`.
- Status: complete. Registration now requires explicit sign-in and shows the success toast, required
  character fields and first-invalid focus are polished, ordinary saves navigate to Character
  Reference, and shared Mara/saved-character cards plus the full-width My characters layout are
  deployed.
- Party behavior: unchanged. Automatic Party linking after character creation remains deferred.

## Registration production investigation

A reported production registration problem was not reproducible from a fresh signed-out production
browser after T-019 deployed:

- no `Set-Cookie` was returned from registration;
- immediate `GET /auth/session` remained 401;
- the user remained signed out;
- the browser showed `/login`;
- the exact toast appeared: `Account created. Sign in to continue.`

Do not reopen auth implementation without reproduction evidence from the original browser/session
conditions.

## Completed T-020 work

### Scope

- Extend the authenticated membership-scoped Party-list response with `gm.username` and linked
  Player character summaries.
- Redesign loaded Party cards as light quest-board pamphlet anchors.
- Preserve the current light global page background.
- Apply muted backgrounds to My characters and My parties containing sections.
- Replace the authenticated empty Party list with the exact bordered light-surface card.

### Parallel-work assessment

- Classification: Yellow.
- Recommendation: one separate worktree from the committed T-020 planning checkpoint.
- Reason: T-020 crosses a backend API contract, Party repository tests, frontend Party presentation,
  and signed-in Home styling.
- Expected owned files or folders: `backend/internal/parties/`, focused server Party tests,
  `frontend/src/parties/`, `frontend/src/features/home/`, `frontend/src/pages/HomePage.test.tsx`,
  and focused route/App tests only if needed.
- Shared files or dependencies: Party API contract, Home integration, existing route serializer.
- Merge order: Slice 1 backend contract first, then Slice 2 frontend presentation on the same task
  branch.

## Approved T-021 and T-022 work

### T-021: Save and invite reliability

- Classification: Yellow.
- Recommendation: separate worktree.
- Expected owned files/folders: `frontend/src/character-creation/CharacterCreationPage.tsx`,
  `frontend/src/character-creation/CharacterCreationPage.test.tsx`,
  `frontend/src/character-creation/characterCreation.css`, `frontend/src/App.tsx`,
  `frontend/src/App.test.tsx`, `frontend/src/parties/JoinPartyPage.tsx`,
  `frontend/src/parties/JoinPartyPage.test.tsx`, `frontend/src/parties/api.ts`,
  `frontend/src/parties/api.test.ts`, and `frontend/src/parties/apiTypes.ts`.
- Scope: save lock, Save disabled after success, `Character saved.` toast, ordinary saved Character
  Reference navigation, invite-launched Party join with the returned character ID, failed-join retry
  without duplicate creation, invite-token privacy, and removal of the Draft state summary.
- Strict boundary: T-021 must not edit `frontend/src/characters/` or
  `frontend/src/features/home/home.css`.

### T-022: Character Reference visual QA

- Classification: Yellow.
- Recommendation: separate worktree.
- Expected owned files/folders: Character Reference components, `frontend/src/characters/types.ts`,
  `frontend/src/characters/characterSheetToReference.ts`,
  `frontend/src/characters/characterSheetToReference.test.ts`,
  `frontend/src/characters/CharacterStats.tsx` only if implementation requires a change,
  `frontend/src/characters/characters.css`, `frontend/src/characters/CharacterSummaryCard.tsx`, and
  `frontend/src/features/home/home.css`.
- Scope: centered signed-out Home action text, normalized expanded stat tiles, AC blue on Home and
  expanded Character Reference, secondary stat tile visual consistency, and muted beige
  `.section-panel`.
- Strict boundary: T-022 must not edit `frontend/src/App.tsx`, `frontend/src/App.test.tsx`,
  `frontend/src/character-creation/`, `frontend/src/parties/`, Party API files, or Party components.

### Parallel merge order

- Required order: merge T-021 first, then rebase T-022 onto current main and run focused plus
  complete validation.
- If T-022 merges first by exception, T-021 must rebase and rerun App, character-creation, and Party
  route validations.

## Completed T-017 feature worktrees

### T-017A backend

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-backend`
- Branch: `codex/t017a-party-backend`
- Final branch HEAD: `8f69c94`
- Integration: PR #24 merged as `02b0bc8`.
- Status: complete. Cleanup requires explicit approval later.

### T-017B isolated frontend

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-frontend`
- Branch: `codex/t017b-party-frontend`
- Final branch HEAD: `8073d4a`
- Integration: PR #25 merged as `af592ec`.
- Status: complete. Cleanup requires explicit approval later.

### T-017C integration

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-party-integration`
- Branch: `codex/t017c-party-integration`
- Final branch HEAD: `38bb93c`.
- Integration: PR #26 merged as `4f7116f`.
- Status: complete and deployed through T-017D. Cleanup requires explicit approval later.

## Completed T-018 worktrees

### Security baseline

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-security-hardening`
- Branch: `codex/t018-security-hardening`
- Final branch HEAD: `8fa4df0`
- Integration: PR #22 merged as `e1ea298`.
- Status: complete. Cleanup requires explicit approval later.

### CI stability follow-up

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-ci-stability`
- Branch: `codex/t018-ci-stability`
- Final branch HEAD: `bb1deff`
- Integration: PR #23 merged as `cab97da`.
- Status: complete. Cleanup requires explicit approval later.

## Source of truth

1. `docs/submission-checklist.md`: final-week delivery priorities.
2. This file: active worktrees, integration state, and one next action.
3. Active task documents: scope, checklist, and validation evidence.
4. `docs/project-checklist.md`: broader course-evidence backlog.
5. GitHub project board: mirrored planning view.

## Delivered baseline

- Public frontend and backend are deployed and smoke-tested.
- Registration, sign-in, sign-out, and session restoration work.
- Signed-in users can create, save, list, and reopen generated or manual characters.
- Mara Vale remains a public guest sample with quick reference.
- T-014A compact Character Reference polish is merged.
- T-015 read-only profile page and mobile profile navigation are merged.
- T-018 whole-application Security baseline is merged, deployed, and verified.
- T-017 Party creation, secure invitation, atomic joining, roster, and GM read-only access are
  deployed and publicly smoke-tested.
- T-019 account and character UX polish is merged, deployed, and validated.
- T-020 Party quest-board cards and Home section contrast is merged, deployed, and validated.

## Final-week constraints

- Formal submission artifacts outrank optional product features.
- No new coding task starts in the main checkout.
- Parallel coding uses separate worktrees with disjoint ownership.
- Worker sessions do not edit shared coordination records.
- T-021/T-022 implementation may proceed only after this planning checkpoint is committed, pushed,
  and separate implementation worktrees are created.

## Single next action

Commit and push the T-021/T-022 planning checkpoint on a non-main branch. After that, create
dedicated worktrees and start T-021 first while T-022 remains allowed in parallel with strict file
ownership.

Last updated: 2026-07-17
