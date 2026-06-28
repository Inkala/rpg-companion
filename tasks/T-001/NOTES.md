# T-001 Notes: Foundation

## Open questions

- Which Figma alternative (if any) for wireframes? Figma free tier, Excalidraw, or paper sketch
  photographed? The output matters more than the tool.
- Cloud provider: Render, Railway, or Fly.io? All support Go + PostgreSQL. Evaluate free tier
  limits before committing.
- Go HTTP framework: standard `net/http`, Chi, Echo, or Gin? Decision affects folder structure.
  Note in architecture ADR.
- Frontend tooling: Vite confirmed (from product-decisions.md context). State management TBD.

## Decisions made

- CI uses GitHub Actions with separate frontend and backend jobs on Ubuntu. Frontend uses Node 24 LTS
  and pnpm 10.17.1. Backend uses the Go version declared in `backend/go.mod`.

## Blockers

(none)
