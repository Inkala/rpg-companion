# T-019 Design: Account and character UX polish

## Registration design

Registration becomes account creation only. The backend still returns the public created user in
the `201` body, but it does not call the session-creation path. This makes the signed-out Sign in
screen truthful on refresh and avoids creating a session only to revoke it from the frontend.

The frontend separates registration success from authentication success. `AuthForm` requests a mode
change to Sign in and emits a registration-success callback. App hosts one Sonner `<Toaster>` and
shows `toast.success('Account created. Sign in to continue.')`.

Use Sonner `2.0.7` because it explicitly supports React 19, has TypeScript declarations, has no
runtime dependencies, and can be styled to Hunin's existing tokens. Configure a close button,
accessible labels, and a restrained duration. Do not include submitted values in toast content.

## Required-field design

Maintain one set describing fields required by the current manual validator. The field renderer
adds a visual, aria-hidden star and screen-reader required semantics. A short legend appears before
the form sections.

Inputs receive stable identifiers or refs keyed by validation field. When review fails, update
errors first, then focus and call `scrollIntoView` on the first invalid field. Keep the summary alert
and inline field errors so the user receives both overview and local guidance.

## Save-navigation design

After an ordinary create request succeeds, call the existing saved-character navigation callback
with the returned ID immediately. Do not infer an ID from the request. Keep a safe success fallback
only when no navigation callback is supplied.

The current Party flow supplies a custom saved action label. T-019 preserves that custom flow and
does not automatically navigate it. Its future replacement belongs to the separate Party follow-up.

## Shared-card design

Add a reusable saved/sample character card component driven by the character summary DTO plus a
resolved portrait. The shared structure owns:

- portrait or generic avatar;
- class reference eyebrow;
- name and identity line;
- `Expand` action;
- HP, AC, and Speed;
- featured-ability badges;
- landing concept.

Extend the owner-scoped character-list summary with the four presentation values already validated
inside CharacterSheetV1 summary data. Extract and map only these values. Do not serialize the full
JSON payload or identity fields that are not already approved.

Build Mara's card summary from the existing audited sample and add stable sample ID/timestamp values
only where the shared DTO requires them. Use the existing Mara portrait mapping; all unrecognized or
absent portrait IDs use the existing generic avatar.

## Home layout design

`SignedInHomeContent` renders a single My characters section. Its header contains the title/state
copy and Create character action. The list occupies a new full-width row below it. CSS uses
`minmax(0, 1fr)`, safe wrapping, and a narrow-width stack rather than fixed card widths.

## Security and privacy

This task references `docs/course-rubric.md` section 4 because registration changes an
authentication boundary.

- Registration creates no authenticated session.
- Existing password hashing, validation, throttling, and generic collision behavior remain.
- Toasts contain fixed public copy only.
- Character lists remain owner-scoped.
- Summary extensions contain presentation data only.
- Exact response-key and cross-owner tests remain merge-blocking.

## Risks and mitigations

- Registration regressions could create a hidden session: assert no `Set-Cookie`, no session row,
  and `GET /auth/session` remains `401` after registration.
- Toast-only feedback could be missed: navigate to a clearly labeled Sign in page and verify the
  live announcement.
- First-error focus can run before React commits errors: schedule focus after the error render and
  test the actual active element.
- Summary extraction could leak full payloads: add exact-key response assertions.
- Shared cards could overflow: use generic portraits, safe wrapping, and manual 320px checks.
- Party behavior could drift through shared App changes: prohibit Party-file edits and keep the
  existing Party regression suite green.

## Validation plan

- Backend focused auth tests, full backend tests, vet, build, and diff check.
- Frontend focused auth, creation, card, Home, and App tests.
- Frozen pnpm install, audit, lint, typecheck, full tests, production build, and diff check.
- Disposable PostgreSQL registration/session assertions.
- Manual keyboard and viewport checks at 320px, 390px, and 720px.
