# T-021 Tasks: Save and Invite Reliability

Status: approved

- [ ] Confirm path, branch, clean status, and HEAD before editing.
- [ ] Read `AGENTS.md`, `PROJECT.md`, `CURRENT.md`, `CHECKS.md`, and this task folder.
- [ ] Report the parallel-work assessment before editing.
- [ ] Add focused failing tests for duplicate submission prevention.
- [ ] Add focused failing tests for Save disabled after success and the `Character saved.` toast.
- [ ] Add focused failing tests proving the success toast emits exactly once.
- [ ] Add focused failing tests for ordinary save navigation to saved Character Reference.
- [ ] Add focused failing tests for invite save joining with the returned character ID.
- [ ] Add focused failing tests proving automatic join starts exactly once.
- [ ] Add focused failing tests proving rerender does not retry automatic join.
- [ ] Add focused failing tests proving failed join retry does not create another character.
- [ ] Add focused failing tests proving failed join Retry calls only Party join.
- [ ] Add focused failing tests proving stale join success and stale join failure are ignored.
- [ ] Add focused failing tests proving `invite_unavailable` clears only matching state.
- [ ] Implement the synchronous save lock.
- [ ] Engage the save lock before async work or React state updates.
- [ ] Release the save lock only after character creation fails.
- [ ] Keep the save lock permanently locked after character creation succeeds for that mounted flow.
- [ ] Keep Save disabled after success.
- [ ] Emit the exact success toast.
- [ ] Implement ordinary saved Character Reference navigation.
- [ ] Snapshot the current invite token and returned character ID before joining.
- [ ] Start invite-launched automatic join exactly once outside rerendering effects.
- [ ] Clear active and pending invite state and navigate to Party detail after successful join.
- [ ] Clear only matching invite state and show the existing generic unavailable state for
  `invite_unavailable`.
- [ ] Retain the matching token and saved character ID for recoverable join Retry.
- [ ] Ensure Retry repeats only Party join and never calls character creation.
- [ ] Ignore stale join results after replacement or cancellation.
- [ ] Never delete the successfully saved character because Party joining failed.
- [ ] Keep tokens and identifiers out of toast copy, rendered errors, logs, paths, and query strings.
- [ ] Preserve invite-token privacy and existing safe retry behavior.
- [ ] Remove the visible Draft state summary and its dead CSS.
- [ ] Run focused validation.
- [ ] Run complete frontend validation.
- [ ] Run backend regression validation.
- [ ] Run `git diff --check`.
- [ ] Stop for review before commit, push, PR, deployment, or another task.
