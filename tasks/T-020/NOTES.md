# T-020 Notes

Status: complete

## Planning evidence

- T-020 starts after T-019 merged through PR #27 as
  `66a17402aba74e80eb4f921f258390d66b66e89b`.
- Production rollout for that merge was verified on 2026-07-14:
  - Frontend main CI passed.
  - Backend main CI passed.
  - Secret history passed.
  - Railway deployed the merge SHA.
  - Cloudflare Pages deployed the merge SHA.
  - `https://hunin.marceramirez.com` returned HTTP 200.
  - `https://api.hunin.marceramirez.com/healthz` returned HTTP 200 with
    `{"status":"ok","service":"hunin-backend"}`.
- A reported registration issue was investigated against current production from a fresh signed-out
  browser profile. Current production behaved correctly:
  - no cookies existed before registration;
  - `GET /auth/session` returned 401 before registration;
  - `POST /auth/register` returned 201;
  - no `Set-Cookie` was returned;
  - `GET /auth/session` returned 401 immediately after registration;
  - the browser showed `/login`;
  - the toast `Account created. Sign in to continue.` appeared.
- Registration is therefore not part of T-020 implementation. Reopen only with reproduction
  evidence from the original browser/session conditions.

## Visual reference

Use `/Users/marce/Desktop/Screenshot 2026-07-14 at 19.24.46.png` as the visual reference for the
individual loaded Party pamphlet card. Ignore darker-board proposals and preserve Hunin's global
light page background.

## Completion evidence

- T-020 merged and deployed as `e7053fb72f8b52e73e08dfdd8668b9a429abb803`.
- Marcela reported the controlled production rollout passed for the same SHA.
- On 2026-07-17, the main checkout was clean, `git pull --ff-only` completed, and local `main` plus
  `origin/main` both resolved exactly to `e7053fb72f8b52e73e08dfdd8668b9a429abb803`.
- T-020 is complete. The next work is separate QA follow-up planning, not additional T-020 scope.
