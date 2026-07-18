# T-023 Notes: Final TFM Submission Documentation

Status: approved

## Timing

Documentation drafting may proceed in parallel with T-026 from a separate worktree. Final slide and
video production remains paused until Marcela says the product feature set is frozen.

T-023 retains placeholders for T-026 final SHA, CI, deployment, functionality, screenshots, and
public smoke. T-026 integrates first. T-023 then rebases onto final main, replaces every placeholder,
reconciles final evidence, and merges last.

## Ownership

T-023 owns evaluator-facing README/submission documentation, `docs/submission-checklist.md`, shared
status records, and `tasks/T-023/`. It must not edit product code, canonical/generated rules data,
`docs/rules-data.md`, or `tasks/T-026/`.

## Missing information

- `[T026_FINAL_SHA]`: final integrated and deployed T-026/main SHA.
- `[T026_CI_RUN_URL]`: green GitHub Actions run for final main.
- `[T026_DEPLOYMENT_STATUS]`: matching Railway and Cloudflare deployment evidence.
- `[T026_PUBLIC_SMOKE_DATE]`: date and evidence for the final public smoke.
- `[FINAL_FRONTEND_TEST_COUNT]`: final frontend test count from final main.
- `[FINAL_BACKEND_TEST_EVIDENCE]`: final backend unit and disposable-PostgreSQL evidence.
- `[TEACHER_USERNAME]`: dedicated teacher-review username.
- `[TEACHER_PASSWORD_OR_ACCESS_INSTRUCTIONS]`: dedicated password or safe access instructions.
- `[SLIDES_URL]`: published slides URL.
- `[VIDEO_URL]`: published narrated-video URL.
- `[FINAL_SUBMISSION_DATE]`: actual form submission date.
- Submission form confirmation or receipt, if the school surface provides one.

Do not invent these values, copy personal credentials into them, or reuse disposable smoke-account
credentials without Marcela's explicit approval.

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

This drafting slice does not claim T-026 or the submission package complete. The changes remain
unstaged for review.

## Exact post-T-026 reconciliation

Required merge order:

1. Finish T-026 implementation and its complete frontend, backend, rules-generation, security,
   accessibility, responsive, and disposable-PostgreSQL validation.
2. Merge T-026 to `main` first.
3. Confirm GitHub Actions is green for the integrated SHA.
4. Confirm Railway and Cloudflare deploy that exact SHA.
5. Run the approved public Level-up smoke and record the date and evidence.
6. In this T-023 worktree, fetch the final `main` and rebase `codex/t023-submission-docs` onto it.
7. Resolve documentation conflicts in favor of final confirmed product and rules-data evidence. Do
   not overwrite T-026-owned `docs/rules-data.md` or `tasks/T-026/*`.
8. Replace all eleven explicit placeholders with confirmed values. If any value is still missing,
   leave the related checklist item unchecked and do not merge T-023.
9. Update the Level-up README section from pending language to the exact shipped behavior and known
   limitations. Link the final T-026 rules-data attribution record.
10. Create or verify the dedicated teacher-review account without exposing personal credentials.
11. Run final frontend and backend validation on rebased final main, record the test evidence, and
    run desktop plus mobile public smoke with the teacher-review account.
12. Freeze the feature set, publish the slides and narrated video, add their URLs, complete the
    submission form, and record its confirmation and date.
13. Re-run Markdown-link, heading, code-fence, placeholder, privacy, `git diff --check`, and complete
    diff review.
14. Stop for Marcela's review. T-023 merges last only after every final gate is evidenced.
