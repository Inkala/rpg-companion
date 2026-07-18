# T-023 Notes: Final TFM Submission Documentation

Status: approved

## Timing

T-026 source implementation merged to `main` at
`232335f26b8a16b5addcc68bf5de29bd22451b3f`. T-023 rebased its reviewed drafting checkpoint onto
that exact SHA. Final slide and video production remains paused until Marcela says the product
feature set is frozen.

T-023 now records confirmed merged-source functionality, final CI, exact-SHA deployments, test
evidence, and public Level Up smoke. Teacher access, slides, video, feature freeze, and submission
evidence remain pending. T-023 reconciles only confirmed evidence and merges last.

## Ownership

T-023 owns evaluator-facing README/submission documentation, `docs/submission-checklist.md`, shared
status records, and `tasks/T-023/`. It must not edit product code, canonical/generated rules data,
`docs/rules-data.md`, or `tasks/T-026/`.

## Missing information

- `[TEACHER_USERNAME]`: dedicated teacher-review username.
- `[TEACHER_PASSWORD_OR_ACCESS_INSTRUCTIONS]`: dedicated password or safe access instructions.
- `[SLIDES_URL]`: published slides URL.
- `[VIDEO_URL]`: published narrated-video URL.
- `[FINAL_SUBMISSION_DATE]`: actual form submission date.
- Submission form confirmation or receipt, if the school surface provides one.

Confirmed source integration:

- T-026 merge SHA: `232335f26b8a16b5addcc68bf5de29bd22451b3f`.
- Rebased T-023 drafting commit: `38e466968fd1c9ce97bf85f88e771147057cb460`.
- `docs/rules-data.md`: present and locally resolvable.
- Merged behavior: owner-only, saved single-class characters, all 12 SRD 5.1/2014 classes, exactly
  one level at a time, current levels 1 through 4, target levels 2 through 5 only.

## Confirmed release evidence

- CI: `https://github.com/Inkala/rpg-companion/actions/runs/29647619803`, successful.
- CI jobs: Frontend `88088389787`, Backend `88088389776`, Secret history `88088389784`, all
  successful.
- Frontend: 32 test files and 649 tests passed; audit found no known vulnerabilities; lint,
  typecheck, and production build passed.
- Backend: `go test -p 1 ./...` passed all 9 packages with PostgreSQL-backed tests; govulncheck found
  no vulnerabilities; vet and build passed.
- Railway: deployment `0d40c230-9b63-42ff-b162-9f7bf38c4783`, Active and successful at exact SHA.
- Cloudflare Pages: deployment `18ff8791-beb0-4bfc-9de6-898ed49d4c69`, successful at exact SHA.
- Automatic provider deployments remain enabled.
- Public availability: frontend HTTP 200; backend health HTTP 200 with
  `{"status":"ok","service":"hunin-backend"}`.
- Public smoke date: `2026-07-18`.
- Level Up smoke: `Rook Ember QA` passed 1 to 2, 2 to 3 with Champion, 3 to 4 with Strength +2 ASI,
  and 4 to 5. Every transition showed `Character leveled up.`
- Level-5 bounded state, refresh persistence, proficiency +3, Passive Perception 14, Extra Attack,
  Party-link preservation, updated GM read-only view, and absence of GM Level Up all passed.
- Desktop and 390px showed no overflow; mobile dialog scrolling, 44px controls, focus-to-heading,
  and zero console errors passed.
- Evidence limitation: browser automation could not conclusively verify the visible focus ring
  through Tab navigation. This is not a confirmed accessibility defect.
- Production residue: two signed-out fictional accounts, `Rook Ember QA` at level 5, Party
  `Silver Lantern QA`, one Player membership, and one generated invite. No credentials or invite
  token are recorded.

Do not invent missing values, copy personal credentials into placeholders, or reuse disposable
smoke-account credentials without Marcela's explicit approval.

## 2026-07-18 drafting slice

Starting point:

- Shared planning branch: `codex/t021-t022-closure`.
- Exact base SHA: `06a9b2a9386aa110e33438ecf96ef416f50e43fe`.
- Confirmed ancestor: T-024 merge
  `b942700a31af7efa22b0349018d692084b32965b`.
- Documentation worktree: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-submission-docs`.
- Documentation branch: `codex/t023-submission-docs`.
- Parallel T-026 worktree: `/Users/marce/Documents/Desarrollo con IA/worktrees/rpg-companion-level-up`.
- Parallel T-026 branch: `codex/t026-level-up`.

Drafted in this slice:

- evaluator-facing README covering current guest, authentication, character, Party, and Character
  Reference functionality;
- an explicit pending-T-026 Level-up section and final evidence placeholders;
- local setup, validation, architecture/deployment, security/privacy, accessibility/responsive,
  limitations, AI-assistance, portrait, rules attribution, teacher-access, slides, and video
  sections;
- `docs/portrait-assets.md` from the finalized external rights and attribution record, without
  personal account identifiers or evaluator-facing absolute local paths;
- submission-checklist reconciliation for confirmed T-024 evidence while leaving all final T-026,
  account, CI, deployment, smoke, slide, video, form, and final-commit gates open.

This drafting slice did not claim T-026 or the submission package complete. The later rebased
correction records only confirmed source integration and remains unstaged for review.

## Exact post-T-026 reconciliation

Completed source-integration order:

1. T-026 implementation and local validation completed.
2. T-026 merged to `main` at `232335f26b8a16b5addcc68bf5de29bd22451b3f`.
3. T-023 rebased its single drafting commit onto that SHA without changing integrated T-026/T-027
   files.
4. The rebased branch was force-with-lease pushed after exact remote-SHA verification.

Remaining final reconciliation:

1. Replace the remaining five explicit placeholders with confirmed values. If any value is still
   missing, leave the related checklist item unchecked and do not merge T-023.
2. Create or verify the dedicated teacher-review account without exposing personal credentials.
3. Run the dedicated teacher-account smoke.
4. Obtain Marcela's explicit feature-freeze confirmation, publish the slides and narrated video,
   add their URLs, complete the submission form, and record its confirmation and date.
5. Re-run Markdown-link, heading, code-fence, placeholder, privacy, `git diff --check`, and complete
   diff review.
6. Stop for Marcela's review. T-023 merges last only after every final gate is evidenced.
