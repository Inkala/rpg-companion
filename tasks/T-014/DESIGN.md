# T-014 Design: Character Reference feedback response

## Design Verdict

Prioritize a cleaner Character Reference before adding more interaction.

The feedback points to a familiar in-session problem: players need the next useful number or
reminder fast, while GMs still want transparent calculations when something is questioned. The right
shape is progressive disclosure:

- main view: compact, action-oriented, low duplication;
- action rows: reminders attached where they are used;
- details: calculation breakdowns only on demand;
- future mode: tactical assistance only after resources and combat context exist.

## Information Architecture

Recommended visible order for the next Character Reference polish task:

1. Identity line: name, level, class/subclass, ancestry.
2. Primary combat stats: HP and AC first, Speed nearby but less visually dominant.
3. Secondary stats: Initiative, Passive Perception, Proficiency in a compact row.
4. Actions and attacks.
5. Conditional reminders attached to relevant actions.
6. Standalone features and traits only when they are not already represented in actions.
7. Spells and resources as static reference only, when present.

## Compact Header Direction

HP and AC can remain prominent because they are checked constantly in combat. Speed, Initiative,
Passive Perception, and Proficiency should stay findable but smaller.

Recommended layout behavior:

- Use compact stat chips or rows instead of large equal-weight boxes for every stat.
- Avoid a large block where all stats compete visually.
- Remove `No concentration` from the character header.
- Show concentration only when there is an active or relevant spellcasting context.

Accessibility note:

- Do not rely on color alone to distinguish primary and secondary stats.
- Preserve readable tap targets for any future interactive stat.
- Keep labels visible or available to screen readers.

## Action Reminder Direction

Actions should carry the reminders that matter while deciding what to do.

Examples:

- Longbow action: show `+7 to hit`, damage, range, and a badge such as `+1d8 if target is wounded`.
- Passive math source: do not show Archery as a separate top-level feature if its only purpose in
  this context is already included in the Longbow bonus.
- Standalone feature: keep features visible when they represent a separate choice, resource, or rule
  reminder.

Implementation should start with generated Fighter data only. Do not invent generic D&D feature
classification until a later task needs it.

## Calculation Details Direction

Calculation breakdowns are useful, but they should be on demand.

Preferred interaction:

- Attack bonus text or an adjacent details button opens a modal or disclosure.
- The detail shows known parts, for example `Dex +3`, `Proficiency +2`, `Archery +2`.
- If source parts are unknown, the UI should not pretend to know them.

This should be a separate task from header compaction because it needs calculation metadata and
accessible modal behavior.

## Deferred Combat Assistant Direction

Do not add an `It's my turn` button now.

A credible version needs:

- class and spell action data;
- current resource state;
- current HP and possibly ally HP;
- concentration and active effects;
- short-rest and long-rest recovery;
- clear boundaries so the app helps without replacing player or GM judgment.

Until those foundations exist, Hunin should provide reference and reminders, not tactical
recommendations.

## Small Slice Candidates

### Slice A: Character Reference compact stat/header polish

Recommended as the immediate next slice.

In scope:

- Compact the character stat/header area.
- Prioritize HP and AC.
- Reduce visual weight of Speed, Initiative, Passive Perception, and Proficiency.
- Remove or relocate `No concentration`.
- Keep Mara sample and saved generated Fighter reference working.

Out of scope:

- HP editing.
- Resource tracking.
- Combat mode toggle.
- Calculation modal.

### Slice B: Attack action reminder badges

Good follow-up after Slice A.

In scope:

- Show conditional reminders directly on relevant generated Fighter attacks.
- De-emphasize or hide duplicate passive math feature cards for known generated Fighter data.
- Keep standalone features visible.

Out of scope:

- Auto-applying conditional damage.
- Resource decrementing.
- Generic rules engine.

### Slice C: Calculation breakdown modal

Good follow-up if source calculation parts are available.

In scope:

- Show breakdown for generated Fighter attack bonus.
- Keep main action row clean.
- Use accessible modal/disclosure behavior.

Out of scope:

- Full sheet-wide calculation audit.
- Manual-entry calculation inference.
- Advantage/disadvantage logic.

## Deferrals

Explicitly deferred:

- `It's my turn` tactical assistant.
- Full spell/resource tracker.
- Short-rest and long-rest system.
- Combat/exploration mode.
- Tactical spell suggestions such as Hunter's Mark or Cure Wounds.

Allowed tiny precursor only if separately approved:

- Static resource notes in Character Reference, with no counters.
- Static class/action reminders attached to actions, with no recommendations.
