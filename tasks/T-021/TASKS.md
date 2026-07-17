# T-021 Tasks: Save and Invite Reliability

Status: complete

- [x] Confirm path, branch, clean status, and HEAD before editing.
- [x] Read `AGENTS.md`, `PROJECT.md`, `CURRENT.md`, `CHECKS.md`, and this task folder.
- [x] Report the parallel-work assessment before editing.
- [x] Add focused failing tests for duplicate submission prevention.
- [x] Add focused failing tests for Save disabled after success and the `Character saved.` toast.
- [x] Add focused failing tests proving the success toast emits exactly once.
- [x] Add focused failing tests for ordinary save navigation to saved Character Reference.
- [x] Add focused failing tests for invite save joining with the returned character ID.
- [x] Add focused failing tests proving automatic join starts exactly once.
- [x] Add focused failing tests proving rerender does not retry automatic join.
- [x] Add focused failing tests proving failed join retry does not create another character.
- [x] Add focused failing tests proving failed join Retry calls only Party join.
- [x] Add focused failing tests proving stale join success and stale join failure are ignored.
- [x] Add focused failing tests proving `invite_unavailable` clears only matching state.
- [x] Implement the synchronous save lock.
- [x] Engage the save lock before async work or React state updates.
- [x] Release the save lock only after character creation fails.
- [x] Keep the save lock permanently locked after character creation succeeds for that mounted flow.
- [x] Keep Save disabled after success.
- [x] Emit the exact success toast.
- [x] Implement ordinary saved Character Reference navigation.
- [x] Snapshot the current invite token and returned character ID before joining.
- [x] Start invite-launched automatic join exactly once outside rerendering effects.
- [x] Clear active and pending invite state and navigate to Party detail after successful join.
- [x] Clear only matching invite state and show the existing generic unavailable state for
  `invite_unavailable`.
- [x] Retain the matching token and saved character ID for recoverable join Retry.
- [x] Ensure Retry repeats only Party join and never calls character creation.
- [x] Ignore stale join results after replacement or cancellation.
- [x] Never delete the successfully saved character because Party joining failed.
- [x] Keep tokens and identifiers out of toast copy, rendered errors, logs, paths, and query strings.
- [x] Preserve invite-token privacy and existing safe retry behavior.
- [x] Remove the visible Draft state summary and its dead CSS.
- [x] Run focused validation.
- [x] Run complete frontend validation.
- [x] Run backend regression validation.
- [x] Run `git diff --check`.
- [x] Stop for review before commit, push, PR, deployment, or another task.
