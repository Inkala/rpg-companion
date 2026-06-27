# Checks

These checks cover the current frontend and backend scaffold. Run the smaller service-specific checks while working, then the full relevant service checks before handing off changes.

---

## Quick Checks

```sh
# Frontend
cd frontend
npm run typecheck
npm run lint
npm test

# Backend
cd backend
go test ./...
go vet ./...
```

## Tests

```sh
# Frontend
cd frontend
npm test

# Backend
cd backend
go test ./...
```

## Type Check and Lint

```sh
# Frontend
cd frontend
npm run typecheck
npm run lint

# Backend
cd backend
go vet ./...
```

## Build

```sh
# Frontend
cd frontend
npm run build

# Backend
cd backend
go build ./cmd/server
```

## Backend Health Check

Start the backend:

```sh
cd backend
go run ./cmd/server
```

Then verify the health endpoint from another terminal:

```sh
curl http://localhost:8080/healthz
```

Expected JSON:

```json
{"status":"ok","service":"hunin-backend"}
```

## Manual Smoke Test

### Guest flow
- [ ] Open the app without logging in.
- [ ] Start creating a character.
- [ ] Confirm the save button is disabled and a popover appears explaining sign-in is required.
- [ ] Confirm the draft survives navigating to the sign-up screen.
- [ ] Register a new account.
- [ ] Confirm the draft is migrated to the new account.

### Party flow (v1)
- [ ] Log in as a GM.
- [ ] Create a party.
- [ ] Generate an invite link or code.
- [ ] Log in as a different user (player).
- [ ] Join the party using the invite.
- [ ] Link a character to the party.
- [ ] Log back in as GM and confirm the player and their character appear on the roster.
- [ ] Open the player's character sheet as GM.

### In-session flow (v2)
- [ ] Log in as a player.
- [ ] Open the Play View for a character with abilities and spells.
- [ ] Confirm the layout is usable on a phone screen (no horizontal scroll, readable text).
- [ ] Tap an ability and confirm the quick-reference card opens with the correct information.
- [ ] Adjust HP and confirm it persists after page refresh.
- [ ] Mark a spell slot as used and confirm it persists.

### Permission checks
- [ ] Attempt to access another player's character URL directly. Confirm 403.
- [ ] Attempt to access a party the user has not joined. Confirm 403.
- [ ] Attempt an API request with no auth token. Confirm 401.

## Notes

Run the smallest check first. Run the full suite before any commit that touches shared logic,
auth, permissions, database schema, or user-facing flows.

CI runs all checks automatically on push. See `.github/workflows/` once configured.
