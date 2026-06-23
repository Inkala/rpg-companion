# Checks

Commands will be filled in once the technology stack is confirmed (T-001).
See `DECISIONS.md` for tool choices as they are made.

---

## Quick Checks

```sh
# TBD after stack decisions
```

## Tests

```sh
# Frontend (TBD: Vitest or Jest)
# npm test

# Backend (Go standard library)
# go test ./...
```

## Type Check and Lint

```sh
# Frontend
# npx tsc --noEmit
# npx eslint .

# Backend
# go vet ./...
```

## Build

```sh
# Docker (all services)
docker compose build

# Frontend only (TBD)
# npm run build

# Backend only
# go build ./...
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
