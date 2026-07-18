# Current Work

Submission deadline: 20 July 2026

Active work: T-023 Final TFM submission documentation reconciliation

State: T-026 bounded Level Up source implementation is complete and merged to `main` at
`232335f26b8a16b5addcc68bf5de29bd22451b3f`. The merged source contains the all-12-SRD-class,
single-class, levels-1-through-5 flow, canonical rules data, generated runtime representations,
server-authoritative update contract, and focused plus complete local validation evidence. T-027
Party empty-state layout behavior is also preserved in that main history. GitHub Actions run
`29647619803` passed Frontend, Backend, and Secret history. Railway deployment
`0d40c230-9b63-42ff-b162-9f7bf38c4783` and Cloudflare Pages deployment
`18ff8791-beb0-4bfc-9de6-898ed49d4c69` succeeded at the exact SHA. Public Level Up smoke passed on
2026-07-18. T-023 has rebased its drafting checkpoint and is applying this confirmed evidence in an
unstaged correction. The feature set is not claimed frozen. Dedicated teacher access and smoke,
slides, video, submission evidence, T-025, and portrait integration remain pending or deferred.

T-020 is complete, merged, deployed, and validated at
`e7053fb72f8b52e73e08dfdd8668b9a429abb803`.

T-021 merged through PR #29 as `a5bef8c3f160e45a29db58979c32436f55a55af7`.

T-022 merged through PR #30 as `ce57d79f3465df6ae166622521c1c26379cbd5f3`. Final main CI
`https://github.com/Inkala/rpg-companion/actions/runs/29580552807` passed Frontend, Backend, and
Secret history. Railway and Cloudflare deployed the exact final SHA successfully. Public visual
smoke at `390px` passed and no runtime errors were found.

## Confirmed T-026 release and active T-023 documentation

### T-026 source integration

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-level-up`.
- Branch: `codex/t026-level-up`.
- Main merge SHA: `232335f26b8a16b5addcc68bf5de29bd22451b3f`.
- Status: source merged, final CI passed, Railway and Cloudflare deployments succeeded at the exact
  SHA, and public smoke passed on `2026-07-18`.
- Preserved ownership: product code, canonical and generated rules data, generator, tests,
  `docs/rules-data.md`, and `tasks/T-026/*` remain exactly as integrated from main.

### T-023 documentation

- Path: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-submission-docs`.
- Branch: `codex/t023-submission-docs`.
- Rebase base: `232335f26b8a16b5addcc68bf5de29bd22451b3f`.
- Rebased drafting commit: `38e466968fd1c9ce97bf85f88e771147057cb460`.
- Status: rebased drafting checkpoint pushed; post-T-026 source-state correction is unstaged for
  review.
- Ownership: README, portrait attribution, submission checklist, T-023 task documentation, and
  explicitly assigned shared coordination records only. No product, rules-data, T-026, migration,
  deployment, or provider files.
- Integration: confirmed technical release evidence is reconciled. Retain teacher, slides, video,
  submission-date, and feature-freeze gates until Marcela confirms them; revalidate and merge last.

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

## Integrated T-026 implementation

### T-026: Bounded Level-up MVP

- Status: source implementation complete, merged, deployed, and publicly smoke-tested at
  `232335f26b8a16b5addcc68bf5de29bd22451b3f`.
- Classification: Red.
- Implementation: completed in a dedicated worktree with strict product/rules/test ownership.
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
- Validation: 32 frontend test files and 649 tests passed with audit, lint, typecheck, and build;
  all 9 backend packages passed with PostgreSQL-backed tests plus govulncheck, vet, and build; CI,
  exact-SHA provider deployments, and public Level Up smoke passed. Focus-ring visibility through
  automated Tab navigation remains inconclusive evidence, not a confirmed defect.

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
- T-026 bounded Level Up is merged, deployed at the exact SHA, and publicly smoke-tested.

## Final-week constraints

- Formal submission artifacts outrank optional product features.
- No new coding task starts in the main checkout.
- Parallel coding uses separate worktrees with disjoint ownership.
- Worker sessions do not edit shared coordination records.
- New implementation work must start from a fresh approved task and separate worktree.

## Single next action

Review the unstaged T-023 release-evidence correction. Do not claim feature freeze until Marcela
confirms it. Create and smoke-test the dedicated teacher account, publish slides and narrated video,
record the submission date and form evidence, then revalidate and merge T-023 last. Keep T-025 and
portrait integration deferred.

Last updated: 2026-07-18
