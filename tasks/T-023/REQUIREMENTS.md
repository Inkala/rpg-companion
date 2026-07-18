# T-023 Requirements: Final TFM Submission Documentation

Status: approved

## Goal

Prepare the final evaluator-facing documentation and submission evidence once Marcela confirms the
product feature set is frozen.

## Scope

- Final evaluator-facing `README.md`.
- Detailed portrait-bank provenance and attribution documentation.
- Teacher-review account and credentials documentation when created.
- Slides and narrated-video URLs when available.
- Final CI and release SHA.
- Final deployed smoke-test evidence.
- Submission checklist and form evidence.

## README requirements

- Current product description and implemented functionality.
- Public deployment and repository URLs.
- Installation, local execution, tests, and deployment summary.
- Teacher-review credentials when created.
- Slides and narrated-video URLs when available.
- Final CI and release SHA.
- Known product limitations.
- Short AI-assisted development and generated-assets disclosure.

## Portrait-bank documentation requirements

- Add `docs/portrait-assets.md`.
- Reference the external application-ready package:
  `/Users/marce/Documents/Desarrollo con IA/assets/hunin/portrait-bank/application-ready/2026-07-17/`.
- Record that the 12 portraits were generated through the Codex desktop app using Marcela's personal
  ChatGPT Pro account.
- Record that the governing agreement is OpenAI's Europe Terms of Use, updated January 16, 2026:
  `https://openai.com/policies/terms-of-use/`.
- State that, between Marcela and OpenAI and to the extent permitted by applicable law, Marcela owns
  the generated output.
- State that output may not be unique and that third-party-rights review remains Marcela's
  responsibility.
- Do not describe the images as entirely human-generated.
- Record Marcela's human creative direction, selection, rejection decisions, correction direction,
  crop approval, and final editorial review.
- Record Codex assistance with prompt refinement, generation orchestration, visual QA, provenance,
  and deterministic asset preparation.
- Retain preliminary resemblance-review and jurisdiction-dependent copyright limitations.
- Do not describe the review as formal legal clearance.

## Presentation and video requirements

- The school presentation includes the portrait bank as an example of AI-assisted product asset
  creation.
- The presentation distinguishes AI-assisted development and asset creation from runtime product AI.
- The presentation discloses that portraits are AI-generated and human-directed.
- Selected portraits are used visually only after their application integration is approved.
- The narrated video includes one concise spoken disclosure of the AI-generated, human-directed
  portrait workflow.
- The video does not display prompts containing private data, account details, credentials, or
  unnecessary provenance internals.

## Final submission gate

- Teacher-review account.
- Final deployed smoke test.
- Final CI.
- README.
- Slides.
- Video.
- Submission form.
- Final commit SHA.

## Timing gate

T-023 documentation drafting may proceed in parallel with T-026 from a separate worktree. Final
slide and narrated-video production remains paused until Marcela says the product feature set is
frozen.

Drafts must retain explicit placeholders for T-026 final SHA, CI, deployment, implemented
functionality, screenshots, and public smoke evidence. T-023 must rebase onto final main after T-026
integrates and replace every placeholder before final merge.

## Parallel ownership and integration

T-023 owns `README.md`, evaluator-facing submission documentation,
`docs/submission-checklist.md`, `CURRENT.md`, `WORKLOG.md`, `BACKLOG.md`, and `tasks/T-023/`.

T-023 must not edit product code, canonical/generated rules data, `docs/rules-data.md`, or
`tasks/T-026/`.

Required merge order:

1. T-026 implementation, validation, deployment, and public smoke.
2. T-023 rebases onto final main, replaces every T-026 placeholder, reconciles final evidence, and
   merges last.
