# T-021 Requirements: Save and Invite Reliability

Status: approved

## Goal

Make character save behavior resistant to repeated submissions and complete the invite-launched save
path without duplicating character creation.

## Required behavior

- Engage the synchronous character-save lock before any async work or React state update.
- Release the character-save lock only after character creation fails.
- Keep the character-save lock permanently locked for that mounted creation flow after character
  creation succeeds.
- Keep Save disabled after a successful save.
- Emit exactly one fixed toast after successful character persistence: `Character saved.`
- Ordinary character creation then navigates to the returned Character Reference.
- Invite-launched character creation snapshots the current invite token and returned character ID
  before attempting the join.
- Start the automatic join exactly once. Do not trigger it from a rerendering effect that could
  repeat.
- Successful join clears active and pending invite state and navigates to Party detail.
- `invite_unavailable` clears only matching invite state and shows the existing generic unavailable
  state.
- A recoverable join failure retains the matching token and saved character ID and exposes Retry.
- Retry repeats only the Party join. It must never call character creation again.
- A replacement or cancelled invite makes older join results stale. Stale success or failure must
  not alter current state.
- Never delete the successfully saved character because Party joining failed.
- Preserve safe retry behavior and invite-token privacy.
- Never put tokens or identifiers in toast copy, rendered errors, logs, paths, or query strings.
- Remove the visible green Draft state summary from character creation and remove its dead CSS.
- Preserve typed auth destinations and existing route behavior.

## Non-goals

- Do not implement existing-member linked-character replacement.
- Do not change Party editing, deletion, invite generation, roster management, or Party detail UI.
- Do not change backend Party authorization or database schema.
- Do not add profile, portrait-bank, gender, or character-editing features.
- Do not change global Home layout or Character Reference visual QA items owned by T-022.

## Acceptance criteria

- Double-clicking Save, pressing Enter repeatedly, or submitting while a save is in flight creates at
  most one character.
- After success, Save remains disabled and the user sees `Character saved.`
- Ordinary saves land on the saved Character Reference.
- Invite saves call the Party join flow with the saved character ID exactly once.
- The `Character saved.` toast is emitted once.
- Automatic join starts once and does not retry on rerender.
- Failed invite join surfaces a retry path that does not resubmit character creation.
- Failed join Retry calls only the Party join.
- Stale join success and stale join failure are ignored.
- `invite_unavailable` clears only matching invite state.
- Ordinary save navigation is preserved.
- Invite tokens do not appear in rendered output, logs, query strings, or toast copy.
- Existing-member character replacement is explicitly deferred.

## Deferred from this task

- Built-in portrait-bank integration.
- Gender selector and data contract.
- Character/profile/account editing and deletion.
- Party editing/deletion, description, and member removal.
- Existing-member linked-character replacement.
