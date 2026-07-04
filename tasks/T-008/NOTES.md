# T-008 Notes

## 2026-07-04

- T-008 is approved as a lightweight frontend routing slice.
- Use a custom History API router, no new dependencies.
- Use `/characters/sample` for the Mara sample Character Reference.
- Do not implement future routes yet: `/characters/new`, `/characters/:id`, `/account`.
- Production hosting will need SPA fallback configuration for direct route visits, but deployment
  config is out of scope for this task.
- Implementation uses `window.history.pushState` for app navigation and a `popstate` listener for
  browser Back/Forward.
- Added direct-route, click-navigation, account switch, not-found, and Back/Forward coverage in
  `frontend/src/App.test.tsx`.
