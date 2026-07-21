# T-029 Requirements: Join Party code form polish

Status: approved

## Goal

Correct the bare Join Party code-entry presentation to match the approved reference while preserving the existing invitation-code, authentication-continuation, direct-link, recovery, and privacy behavior.

## Content

- Remove the visible `Party invite` eyebrow from the bare code-entry state.
- Keep `Join a party`, `Enter the invitation code shared by your GM.`, and the visible `Invitation code` label.
- Remove the permanently visible format helper.
- Show format guidance only as an accessible validation error after invalid submission.
- Do not show a validation error before interaction or submission.
- Preserve privacy-safe unavailable and recovery states.

## Input and accessibility

- Reuse the existing Sign in input treatment and design tokens for the invitation-code input.
- Preserve the visible focus treatment, label association, autocomplete behavior, normalization, and safe maximum length.
- Set `aria-invalid` only while an error exists.
- Associate the validation error programmatically only while it exists.
- Preserve keyboard operation, clear error announcement, and 44px minimum controls.

## Responsive layout

- At 720px and wider, place the growing labelled input and the content-sized Continue and Cancel actions in one horizontal row. The error may sit beneath the input without disturbing action alignment.
- At 320px and 390px, place the labelled full-width input first and both separate actions together in one balanced row.
- Avoid horizontal overflow at all approved widths.

## Preserved behavior

- Valid short codes normalize and submit, including lowercase and displayed-hyphen variants.
- Invalid values stay client-side and trigger no inspection request.
- Cancel returns Home and clears pending credentials safely.
- Authentication continuation remains private and direct strong links remain functional.
- Unknown, expired, revoked, and replaced credentials retain the generic unavailable response.
- No credential enters pathname, query, browser storage, history, errors, logs, or rendered feedback.

## Exclusions

- No backend, migration, invitation API, T-025, T-023, shared coordination, provider, deployment, or production change.
- Do not add the reference screenshots to Git.
