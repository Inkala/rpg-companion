# T-008 Requirements: Lightweight frontend routing

## Problem

Meaningful Hunin views still change through React state only, so the browser URL does not change.

Examples:

- Opening the sign-in form does not navigate to `/login`.
- Opening the create-account form does not navigate to `/sign-up`.
- Opening the Mara sample Character Reference does not navigate to `/characters/sample`.

This makes refresh, direct linking, and browser Back/Forward behavior weaker than the app now needs.

## Goal

Add lightweight frontend routing for meaningful app locations while preserving current behavior,
visual design, auth/session behavior, account validation, and Character Reference behavior.

## Implemented routes

```text
/                    -> home
/login               -> account page, sign-in mode
/sign-up             -> account page, register mode
/characters/sample   -> Mara sample Character Reference
*                    -> simple not-found view with a Home action
```

## Future routes to document only

```text
/characters/new      -> guided/manual character creation entry
/characters/:id      -> saved character reference
/account             -> future account/settings page, if needed
```

## Routing approach

Use a tiny custom History API router. Do not add `react-router-dom` or any dependency.

## Behavior requirements

- Direct visit to `/` renders home.
- Direct visit to `/login` renders sign-in.
- Direct visit to `/sign-up` renders create account.
- Direct visit to `/characters/sample` renders Mara Character Reference.
- Clicking Sign in updates the URL to `/login`.
- Clicking Create account updates the URL to `/sign-up`.
- Clicking Explore Mara updates the URL to `/characters/sample`.
- Browser Back and Forward work between these views.
- Refresh preserves the current route once the SPA is served.
- Unknown paths show a simple not-found view with a Home action.
- Account form internal switches update the URL:
  - switch to register -> `/sign-up`
  - switch to sign in -> `/login`
- After successful auth or sign-out, navigate to `/`.
- Existing account form validation behavior remains unchanged.
- Existing session restore behavior remains unchanged.
- Existing signed-in/signed-out home behavior remains unchanged.
- Existing Character Reference behavior remains unchanged.

## Deployment note

The frontend can handle these routes after the SPA loads, but production hosting must be configured
to serve the SPA entry point for direct visits to routes like `/login`, `/sign-up`, and
`/characters/sample`. Do not change deployment config in this task.

## Non-goals

- No `/characters/new` implementation.
- No `/characters/:id` implementation.
- No `/account` implementation.
- No guided character creation.
- No saved character loading.
- No backend changes.
- No auth behavior changes.
- No migrations.
- No dependencies.
- No CI changes.
- No deployment config changes.
- No visual redesign.
- No Figma changes.
