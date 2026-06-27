# Ability Quick-Reference Bottom Sheet Wireframe

## Purpose

Answer the player’s question: “How does this work again?”

This bottom sheet opens over the Play View so the player keeps their character context visible underneath. It is fast to scan during a session and read-only in the sample-character flow.

## Mobile-first structure

### 1. Sheet handle / header

Purpose: make the sheet easy to recognize and dismiss.

Contains:

- drag handle or clear top edge affordance
- ability, feature, attack, or spell name
- dismiss control

Hierarchy:

- Most prominent: the name
- Secondary: dismiss control
- Quiet: drag handle

### 2. Immediate summary

Purpose: give the minimum answer without requiring scrolling.

Shown immediately:

- plain-language effect summary
- action type
- duration
- concentration state, when relevant
- resource or use limit, when relevant

This is the first thing the player should read.

### 3. Short reminder block

Purpose: capture the smallest useful “remember this” note.

Contains:

- one or two short reminders
- relevant character modifier, if applicable
- short context for how the ability is used

### 4. Expandable detail area

Purpose: reveal more context only if the player wants it.

Contains after expansion:

- longer explanation
- extra rules reminders
- notes about timing, targeting, or limits
- any additional detail that supports the summary

Should not default to full rules text.
Only show the `Show more details` control when additional detail exists.

## What is visible immediately without scrolling

- name
- plain-language effect summary
- action type
- duration
- concentration state when relevant
- resource or use limit when relevant

If space allows, show the reminder block before the player scrolls.

## What is shown only after expanding for more detail

- longer explanation
- additional rules reminders
- extra context that would otherwise crowd the sheet
- any content that is useful but not essential for the first answer

If there is no additional detail, do not render the expand action.
In that case, optionally show a small fallback note such as `No additional detail available`.

## Primary and secondary actions

Primary actions:

- dismiss the sheet
- return to the Play View context underneath

Secondary actions:

- expand additional detail, when available
- collapse detail again

The sheet must be easy to dismiss and must not trap keyboard or screen-reader users.
While the bottom sheet is open as a modal, keyboard focus must remain within the sheet.
The user must be able to dismiss it with the close control and Escape key where supported.
When dismissed, focus returns to the ability, feature, attack, or spell card that opened it.
Do not allow keyboard focus to move to the Play View underneath while the modal sheet is open.

## Behavior by content type

### Passive abilities

- show `Passive` as the action type or equivalent
- keep the summary short
- explain ongoing or triggered behavior in plain language

### Attacks

- show the attack name and what kind of attack it is
- include damage or effect summary if it is part of the quick answer
- keep weapon or attack reminders compact

### Spells

- show spell type and any concentration or duration information
- keep casting details short
- avoid full rules text by default

### Missing optional information

- if a field is not known, hide it rather than filling the sheet with placeholders
- do not repeat empty labels

### No additional detail available

- if there is no expanded detail, the sheet should still work as a complete quick-reference
- do not render `Show more details` when there is nothing extra to reveal
- optionally show a small note such as `No additional detail available`
- keep the bottom sheet useful even when the content is sparse

### Guest / read-only sample mode

- the content cannot be edited
- the sheet should not introduce account prompts
- the sheet should preserve the guest sample flow rather than redirecting to sign-up

## Hunter's Mark example

For the sample character, Hunter's Mark is a useful example because it is a spell that often needs a quick reminder.

Immediate summary example:

- name: Hunter's Mark
- type: Spell
- effect summary: marks a target so your hits deal extra damage
- duration: up to 1 hour
- concentration: yes
- resource or use limit: spell slot

Expanded detail example:

- who can be marked
- when the extra damage applies
- what happens if the target drops before the effect ends

## Accessibility and small-screen considerations

- Make the sheet readable on a narrow phone without horizontal scrolling.
- Keep the close action obvious and reachable.
- Ensure focus moves into the sheet and returns to the Play View cleanly when dismissed.
- Keep keyboard focus within the modal sheet while it is open, while always providing a clear close control and Escape-key dismissal where supported.
- Use semantic heading structure for the name and major content groups.
- Keep the summary short enough that the first answer fits quickly on screen.
- If content is long, let the detail area scroll rather than stretching the whole sheet beyond practical reach.
- Avoid relying on icons alone to communicate dismiss or expand behavior.
- Preserve the player’s context underneath the sheet so dismissal is predictable.

## ASCII wireframe

```text
┌──────────────────────────────────┐
│ ──────────────────────────────── │
│ Hunter's Mark                [x] │
│ Spell                            │
│                                  │
│ Marks a target so your hits      │
│ deal extra damage.               │
│                                  │
│ Type: Spell                      │
│ Duration: Up to 1 hour           │
│ Concentration: Yes               │
│ Cost: Spell slot                 │
│                                  │
│ Remember                         │
│ - Mark one target                │
│ - Extra damage on hit            │
│                                  │
│ [ Show more details ]            │
└──────────────────────────────────┘
     Play View remains visible
     underneath the sheet
```

## Notes

- This is a low-fidelity layout spec, not a styling spec.
- The same structure should work for abilities, features, attacks, and spells.
- The sample-character flow should stay read-only and quick to dismiss.
