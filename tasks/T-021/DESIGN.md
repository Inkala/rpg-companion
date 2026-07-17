# T-021 Design: Save and Invite Reliability

Status: complete

## Parallel-work assessment

- Classification: Yellow.
- Recommendation: separate worktree.
- Reason: the task owns the character-save and invite-return path across central routing and Party
  API integration, but it can run in parallel with T-022 if file ownership stays disjoint.
- Expected owned files or folders: character creation page, central App route orchestration, Party
  join page/API helpers, and their focused tests.
- Shared files or dependencies: route serializer, auth destination handling, Sonner toast surface,
  Party invite token state, and saved Character Reference navigation.

## Implementation design

- Use a synchronous in-memory lock for character-save submission, separate from render timing.
- Engage the lock before any async work or React state update so repeated events in the same tick
  cannot start another create request.
- Release the lock only if character creation fails.
- Keep the lock permanently locked for the mounted creation flow after character creation succeeds.
- Track success state so the Save control stays disabled after the backend returns the saved
  character.
- Emit one success toast with the exact copy `Character saved.` after the character is persisted.
- For ordinary saves, navigate to the saved Character Reference using the existing route serializer.
- For invite-launched saves, snapshot the current invite token and returned character ID before
  attempting the existing Party join flow.
- Start automatic join exactly once from the save continuation, not from an effect that could rerun
  on render.
- On successful join, clear active and pending invite state and navigate to Party detail.
- On `invite_unavailable`, clear only matching invite state and show the existing generic unavailable
  state.
- On recoverable join failure, preserve the saved character, retain the matching token and character
  ID, and expose Retry.
- Retry repeats only the Party join attempt. It never calls character creation again.
- Treat a replacement or cancelled invite as making older join results stale. Stale success or
  failure must not alter current state.
- Never delete the successfully saved character because Party joining failed.
- Keep invite tokens in the existing private state channel. Do not add arbitrary return URLs.
- Never include tokens or identifiers in toast copy, rendered errors, logs, paths, or query strings.
- Remove the Draft state summary from the creation view and delete CSS selectors that only supported
  that summary.

## Test design

- Use tests that submit twice in the same user interaction window and assert one create call.
- Assert Save is disabled while saving and remains disabled after success.
- Assert the exact toast appears and contains no submitted identifiers or invite token.
- Assert ordinary save navigates to the saved Character Reference.
- Assert invite save snapshots the matching token and returned character ID.
- Assert invite save starts automatic join exactly once.
- Assert rerenders do not trigger another join.
- Assert failed join retry does not call character creation again.
- Assert Retry calls only the Party join.
- Assert stale join success and stale join failure are ignored.
- Assert `invite_unavailable` clears only matching state.
- Assert existing-member replacement remains absent.

## Merge order

- T-021 should merge before T-022 when both are ready because it owns central route orchestration.
- If T-022 merges first, T-021 must rebase onto current main and rerun all focused App, creation, and
  Party route tests before review.
