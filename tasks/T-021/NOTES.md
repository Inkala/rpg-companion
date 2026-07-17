# T-021 Notes: Save and Invite Reliability

Status: complete

## Context

- T-020 merged and deployed as `e7053fb72f8b52e73e08dfdd8668b9a429abb803`.
- T-021 merged through PR #29 as `a5bef8c3f160e45a29db58979c32436f55a55af7`.
- It is intentionally separated from T-022 so save/invite reliability and Character Reference visual
  QA can proceed in parallel without overlapping file ownership.

## Completion evidence

- PR: #29.
- Merge SHA: `a5bef8c3f160e45a29db58979c32436f55a55af7`.
- Implementation completed:
  - synchronous character-save lock;
  - Save remains disabled after success;
  - fixed success toast `Character saved.`;
  - ordinary creation navigates to the returned Character Reference;
  - invite-launched creation snapshots the token and returned character ID;
  - automatic invite join starts once;
  - successful invite join clears active/pending invite state and navigates to Party detail;
  - failed join Retry repeats only Party join and never recreates the character;
  - stale join results are ignored;
  - `invite_unavailable` clears only matching invite state;
  - the visible Draft state summary and dead CSS were removed.
- Tests covered the save lock, one-time toast, ordinary navigation, automatic join, no rerender
  retry, retry-only join, stale-result handling, unavailable-invite clearing, and Draft-summary
  removal.
- Privacy evidence: invite tokens and identifiers remain out of toast copy, rendered errors, logs,
  paths, and query strings.
- Deployment evidence: included in the later final main rollout at
  `ce57d79f3465df6ae166622521c1c26379cbd5f3`, which passed Frontend, Backend, Secret history,
  Railway, Cloudflare, and public visual smoke validation.

## Remaining limitations

- Existing-member linked-character replacement remains deferred.
- Failed Party joining never deletes the successfully saved character.

## Deferred decisions

- Existing-member linked-character replacement is deferred until explicitly approved.
- Built-in portrait-bank integration, gender selector/data contract, editing/deletion flows, and
  Party management expansion remain backlog items.
