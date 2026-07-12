# T-016 Notes

## Discoveries

- Certain: the authoritative TFM document is
  `/Users/marce/Documents/Desarrollo con IA/contenido/9. TFM/Documento del TFM.pdf`.
- Certain: the stated deadline is 20 July 2026.
- Certain: required submission resources are a complete README, source repository, deployment when
  possible, public slides, a narrated screen-capture video, and test credentials when login exists.
- Certain: the course-derived project checklist is broader than the formal TFM contract.
- Certain: `main` and `origin/main` are at `86fe342` before T-016 documentation edits.
- Certain: the three uncommitted frontend files are a test-first, fully validated T-015 mobile
  profile navigation follow-up. They are not part of T-016.
- Certain: the T-015 profile worktree is clean at `86fe342`.
- Certain: current GitHub CI for `86fe342` passed and there are no open pull requests.

## Open Questions

- Dedicated teacher-review credentials.
- Public slides URL.
- Public narrated screen-capture video URL.

## 2026-07-11 implementation

- Certain: added `docs/submission-checklist.md` from the authoritative TFM requirements and made it
  the final-week priority source.
- Certain: added `docs/orchestration.md` with authority order, worktree ownership, SDD approval,
  worker report, Git safety, and integration rules.
- Certain: updated AGENTS, session routines, and worktree policy so the orchestrator owns shared
  planning state and workers report rather than editing shared files.
- Certain: rewrote stale current status, backlog, and README content around the actual deployed
  baseline and required submission artifacts.
- Certain: recorded the formal deadline, educational purpose, temporary deployment lifecycle, and
  deferred AI/product scope.
- Certain: reconciled verified course-checklist items without marking partial evidence complete.
- Certain: GitHub issue 8 was closed as completed. Issue 7 was retitled and narrowed to guest draft
  persistence/conversion.
- Certain: all 21 GitHub project items now have Status, Priority, and Release; applicable items have
  Area. Issue 21 is Waiting / Blocked pending its persistence decision.
- Certain: the GitHub app write path returned 403, so the authenticated `gh` CLI was used as the
  documented fallback.
- Certain: T-016 did not edit frontend or backend product files. The three product-code changes in
  the main checkout predate T-016 and belong to the validated T-015 mobile follow-up.

## Validation

- Authoritative TFM PDF: extracted and visually reviewed, 2 pages.
- GitHub issue readback: issue 7 open with narrowed scope; issue 8 closed as completed.
- GitHub project readback: 21 items reconciled.
- `git diff --check`: passed before final bookkeeping and must be rerun after it.
- Product-code ownership check: no T-016 frontend/backend edit.

## Links

- Public frontend: `https://hunin.marceramirez.com`
- Public backend health: `https://api.hunin.marceramirez.com/healthz`
- Repository: `https://github.com/Inkala/rpg-companion`
- Project board: `https://github.com/users/Inkala/projects/1`
