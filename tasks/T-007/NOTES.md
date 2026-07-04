# T-007 Notes

## 2026-07-04

- T-006 is treated as completed and committed based on the clean Git state and user direction.
- T-007 is approved as a behavior-preserving frontend architecture refactor.
- Keep `App.tsx` at `frontend/src/App.tsx`; do not move it to `frontend/src/app/App.tsx`.
- Preserve T-006 visuals and behavior exactly.
- Keep `frontend/src/App.css`, `frontend/src/main.tsx`, `frontend/src/auth/api.ts`, and
  `frontend/src/characters/*` unchanged unless absolutely necessary.
- Implementation extracted home/account UI into pages and feature folders while leaving CSS and
  character/auth API files untouched.
- Existing App and Character Reference tests passed without adding new tests.
