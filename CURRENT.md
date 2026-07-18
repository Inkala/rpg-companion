# Current Work

Submission deadline: 20 July 2026

Active tasks: T-026 Bounded Level-up MVP implementation and T-023 Final TFM submission
documentation drafting

State: T-021 Save and invite reliability, T-022 Character Reference visual QA, and T-024 Quick QA
consistency fixes are complete, merged, deployed, and validated. T-024 is deployed at
`b942700a31af7efa22b0349018d692084b32965b`, so its integration gate for T-026 is satisfied. T-026
bounded Level-up MVP is approved, and Marcela explicitly accepts that implementation may miss the
20 July deadline. T-023 may draft in parallel in a separate worktree with T-026 final-evidence
placeholders, while final slide/video production still waits for feature freeze. T-026 must merge,
deploy, and complete public smoke first; T-023 then rebases, replaces placeholders, reconciles final
evidence, and merges last. T-025 remains deferred.

T-020 is complete, merged, deployed, and validated at
`e7053fb72f8b52e73e08dfdd8668b9a429abb803`.

T-021 merged through PR #29 as `a5bef8c3f160e45a29db58979c32436f55a55af7`.

T-022 merged through PR #30 as `ce57d79f3465df6ae166622521c1c26379cbd5f3`. Final main CI
`https://github.com/Inkala/rpg-companion/actions/runs/29580552807` passed Frontend, Backend, and
Secret history. Railway and Cloudflare deployed the exact final SHA successfully. Public visual
smoke at `390px` passed and no runtime errors were found.

## Active parallel T-026 and T-023 worktrees

### T-026 implementation

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-level-up`.
- Branch: `codex/t026-level-up`.
- Base SHA: `06a9b2a9386aa110e33438ecf96ef416f50e43fe`.
- Status: running separately under the approved product, rules-data, generation, test, and T-026
  task-document ownership.
- Integration: must merge, deploy, and complete public smoke before T-023 final reconciliation.

### T-023 documentation

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-submission-docs`.
- Branch: `codex/t023-submission-docs`.
- Base SHA: `06a9b2a9386aa110e33438ecf96ef416f50e43fe`.
- Status: evaluator-facing draft prepared with explicit final-evidence placeholders; changes are
  unstaged for review.
- Ownership: README, portrait attribution, submission checklist, T-023 task documentation, and
  explicitly assigned shared coordination records only. No product, rules-data, T-026, migration,
  deployment, or provider files.
- Integration: rebase onto final main after T-026, replace every placeholder, revalidate, and merge
  last.

## Approved T-023, T-024, and T-025 planning

### T-023: Final TFM submission documentation

- Status: approved.
- Timing: wait until Marcela says the product feature set is frozen before restarting final slides
  or narrated-video production.
- Scope: evaluator-facing README, portrait attribution/provenance, teacher credentials, slides and
  video URLs, final CI/release SHA, final smoke test, submission checklist, and submission form
  evidence.

### T-024: Quick QA consistency fixes

- Status: complete, merged, deployed, and publicly validated.
- Final SHA: `b942700a31af7efa22b0349018d692084b32965b`.
- Classification: Yellow.
- Recommendation: separate implementation worktree.
- Scope: global navigation/menu, sign-out confirmation, confirm password, toast polish, empty Home
  sections, guided selection state, Quick Reference modal/detail contract, and Party presentation
  terminology/icons/GM badge.
- Excludes: full CharacterSheetV2, SRD import, derived calculations, edit/delete flows, Party
  administration, portrait integration, migrations, deployment, and provider changes.

### T-025: Character-sheet fidelity, SRD data, and derived calculations

- Status: deferred.
- Classification: Red.
- Timing: implementation deferred until Marcela explicitly approves it after the TFM submission.
- Scope: SRD 5.1/2014 development-time import, normalized local snapshot, CC-BY-4.0 attribution,
  Gender selector, Race/Class/Subclass dropdowns, derived calculations with provenance, structured
  attacks/spells/features/equipment/other entries, CharacterSheetV1 display compatibility, and Mara
  compatibility tests.
- Estimate: 4 to 7 focused implementation days. Full implementation is not responsible before the
  20 July submission deadline.

## Approved T-026 implementation

### T-026: Bounded Level-up MVP

- Status: approved.
- Classification: Red.
- Recommendation: dedicated implementation worktree with strict product/rules/test ownership.
  Marcela explicitly accepts that implementation may miss the 20 July deadline.
- Scope: owner-only level-up for saved single-class characters across all 12 SRD 5.1/2014 classes,
  exactly one level at a time, supported transitions 1 to 2, 2 to 3, 3 to 4, and 4 to 5 only, SRD
  content only, manual fallback for existing non-SRD content, optimistic concurrency, and complete
  review before persistence.
- Audit result: CharacterSheetV1 can carry the result without schema expansion only if T-026 uses
  one canonical schema-validated SRD source, generated TypeScript/Go representations, exact
  existing-field provenance, and server-authoritative reconstruction. Existing characters above
  level 5 remain readable but cannot use Level up.
- Excludes: level 5 to 6 and above, multiclassing, level reduction, character deletion,
  general-purpose complete-sheet editing, Party/profile management, full T-025, portrait
  integration, broad CRUD, Party administration, feats catalog, homebrew automation, paid-book
  content, live runtime rules API, and non-SRD Player's Handbook content.
- Estimate: 6 focused days minimum from the integrated T-024 baseline, more likely 8 to 10 focused
  days with
  canonical class/spell data, parity generation, PATCH CORS, prerequisite recovery,
  server-authoritative validation, PostgreSQL tests, frontend tests, browser QA, CI, deployment, and
  public smoke. Schedule risk before 20 July is critical. T-023 formal submission documentation
  takes priority if T-026 cannot reach a tested, deployable state without threatening submission
  completion.

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
- Party behavior at T-019: unchanged. T-021 later implemented invite-launched automatic Party join;
  existing-member linked-character replacement remains deferred.

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

## Completed T-021 and T-022 work

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
- Status: complete. PR #29 merged as `a5bef8c3f160e45a29db58979c32436f55a55af7`.
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
- Status: complete. PR #30 merged as `ce57d79f3465df6ae166622521c1c26379cbd5f3`.
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
- T-021 Save and invite reliability is merged, deployed, and validated.
- T-022 Character Reference visual QA is merged, deployed, and validated.

## Final-week constraints

- Formal submission artifacts outrank optional product features.
- No new coding task starts in the main checkout.
- Parallel coding uses separate worktrees with disjoint ownership.
- Worker sessions do not edit shared coordination records.
- New implementation work must start from a fresh approved task and separate worktree.

## Single next action

Review the unstaged T-023 documentation draft while T-026 continues separately. T-026 must merge,
deploy, and complete public smoke first. T-023 then rebases onto final main, replaces all final
evidence placeholders, completes the teacher/slides/video/submission gates, revalidates, and merges
last. Keep T-025 and portrait integration deferred, and do not restart final slide/video production
until feature freeze.

Last updated: 2026-07-18
