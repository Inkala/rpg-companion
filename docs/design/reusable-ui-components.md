# Reusable UI Components for the Guest Flow

This document identifies the first reusable components needed to build the currently documented guest flow:

- guest landing page
- sample character mobile Character Reference
- ability quick-reference bottom sheet

It stays intentionally small. The goal is to support the current wireframes, not to define a general-purpose design system.

## 1. Foundation primitives

### Button

- Purpose: primary action control for clear commands.
- Where it appears: guest landing primary actions, sample Character Reference section controls, bottom-sheet expand action.
- Minimum responsibilities: render a clear action, support enabled and disabled states, support compact and full-width variants when needed.
- Should not handle yet: icons as a requirement, loading orchestration, routing, form submission logic, or styling decisions beyond basic behavior.
- First implementation slice: needed.

### Icon button

- Purpose: compact action control for close, dismiss, or similar single-purpose actions.
- Where it appears: ability quick-reference bottom sheet close control.
- Minimum responsibilities: present an icon-based action with an accessible name and obvious tap target.
- Should not handle yet: generic menu behavior, toolbars, or multiple icon states.
- First implementation slice: needed.

### Card

- Purpose: container for compact, scan-friendly content blocks.
- Where it appears: sample-character preview card, ability row/card previews, possibly compact stat blocks.
- Minimum responsibilities: group content with a clear boundary and readable stacking.
- Should not handle yet: navigation logic, expansion logic, or any character-specific rules.
- First implementation slice: needed.

### Expandable section

- Purpose: vertically stacked disclosure container for grouped Character Reference sections.
- Where it appears: Actions, Bonus Actions, Reactions, Features, and Spells on the mobile Character Reference.
- Minimum responsibilities: show a section header, expand or collapse vertically, hide itself when it has no content.
- Should not handle yet: horizontal tab behavior, search, filtering, or section-specific business rules.
- First implementation slice: needed.

### Stat display

- Purpose: small, consistent presentation of a single stat or stat pair.
- Where it appears: guest sample preview, Character Reference overview, bottom-sheet summary fields.
- Minimum responsibilities: show label, value, and compact layout for things like HP, AC, temporary HP, duration, or cost.
- Should not handle yet: derived-value calculation, editing, or any game-rule interpretation.
- First implementation slice: can wait.
- Reason to defer: do not extract a universal stat display until repeated layouts prove it is useful.

### Badge

- Purpose: compact label for categorical or state information.
- Where it appears: action type, concentration, passive indicator, or other short state labels.
- Minimum responsibilities: present a short, scannable label.
- Should not handle yet: rich text, interactive menus, or multiple layered statuses.
- First implementation slice: needed.

### Bottom-sheet modal behavior

- Purpose: modal presentation behavior for the quick-reference sheet.
- Where it appears: ability quick-reference bottom sheet.
- Minimum responsibilities: open over the current Character Reference, trap focus while open, support dismiss and return-focus behavior, and preserve the underlying context.
- Should not handle yet: nested modals, complex stacks, or unrelated overlay systems.
- First implementation slice: needed.

### Empty state

- Purpose: calm fallback when a section or sample content has nothing to show.
- Where it appears: sample Character Reference empty section states and sample-load failure fallback.
- Minimum responsibilities: explain the absence of content without breaking the layout.
- Should not handle yet: retry orchestration, account messaging, or product-level onboarding.
- First implementation slice: can wait.
- Reason to defer: the first sample data can be static, so a reusable empty-state component is not required yet.

### Loading state

- Purpose: temporary state while sample content or detail content is being fetched.
- Where it appears: sample character load and quick-reference load.
- Minimum responsibilities: indicate that content is coming without disrupting layout.
- Should not handle yet: skeleton-system design or every possible loading variation.
- First implementation slice: can wait if the initial sample data is static, but should be planned.
- Reason to defer: the first sample data can be static, so a reusable loading state is not required yet.

### Error message

- Purpose: clear fallback when sample content or detail content cannot load.
- Where it appears: guest landing sample preview load failure, Character Reference sample load failure, bottom-sheet load failure.
- Minimum responsibilities: explain the failure and offer retry where appropriate.
- Should not handle yet: logging, alerting, or recovery policy.
- First implementation slice: needed.

## 2. Hunin domain components

### Character preview

- Purpose: compact sample-character snapshot on the guest landing page.
- Where it appears: guest landing page compact preview.
- Minimum responsibilities: show name, class, level, HP, AC, and one or two recognizable abilities or features, plus the `Explore [character name]` action.
- Should not handle yet: editing, guest storage prompts, party membership, or full-sheet detail.
- First implementation slice: needed.

### Character summary

- Purpose: top-of-screen identity and stat summary for the sample Character Reference.
- Where it appears: mobile Character Reference top summary block and stat row.
- Minimum responsibilities: show character identity, current HP, temporary HP, AC, concentration state, and the few stats that must be seen immediately.
- Should not handle yet: full character sheet rendering, search, or progression.
- First implementation slice: needed.

### Ability row

- Purpose: compact preview line or card for an ability, feature, attack, or spell.
- Where it appears: the expandable sections of the mobile Character Reference.
- Minimum responsibilities: show the name, a one-line effect hint, and any brief type or usage hint needed to decide whether to open it.
- Should not handle yet: full rules text, editing, or detailed calculations.
- First implementation slice: needed.

### Quick-reference sheet

- Purpose: read-only bottom-sheet content for a single ability, feature, attack, or spell.
- Where it appears: ability quick-reference bottom sheet.
- Minimum responsibilities: show name, plain-language summary, action type, duration, concentration, resource or use limit, and optional expanded detail.
- Should not handle yet: editing, account prompts, or long-form rules browsing.
- First implementation slice: needed.

### Action type indicator

- Purpose: tell the player whether something is an Action, Bonus Action, Reaction, Passive, or Spell.
- Where it appears: ability rows, quick-reference sheet, and any compact summary where timing matters.
- Minimum responsibilities: display a short, consistent timing label.
- Should not handle yet: full turn-order logic or action-economy validation.
- First implementation slice: needed.

### Resource tracker

- Purpose: show compact status for trackable resources in the Character Reference overview.
- Where it appears: Character Reference overview area.
- Minimum responsibilities: show current state for simple trackable resources relevant to the sample character.
- Should not handle yet: full resource management, persistence rules, or leveling logic.
- First implementation slice: can wait.
- Reason to defer: resource tracking is read-only and can be shown as plain text until mutable resources are implemented.

### Concentration indicator

- Purpose: show whether concentration is active.
- Where it appears: Character Reference overview and quick-reference sheet when relevant.
- Minimum responsibilities: state whether concentration is active or absent.
- Should not handle yet: concentration rules enforcement or state changes.
- First implementation slice: needed.

## 3. Page compositions

### Guest landing page

- Purpose: first guest-facing screen that introduces the product and points to the first action path.
- Where it appears: guest landing wireframe.
- Minimum responsibilities: combine the brand block, compact sample-character preview, primary actions, and quiet secondary actions.
- Should not handle yet: account prompts during sample exploration, party management, or full character creation.
- First implementation slice: needed.

### Sample character mobile Character Reference

- Purpose: read-only mobile character-reference view for the sample character.
- Where it appears: mobile Character Reference wireframe.
- Minimum responsibilities: combine the top summary, overview stats, default-open Actions section, and collapsed grouped sections for Bonus Actions, Reactions, Features, and Spells.
- Should not handle yet: editing, search, Items, Notes, or full-sheet completeness.
- First implementation slice: needed.

### Ability quick-reference bottom sheet

- Purpose: modal quick answer for one selected ability, feature, attack, or spell.
- Where it appears: ability quick-reference bottom-sheet wireframe.
- Minimum responsibilities: combine the title, quick summary, optional expandable detail, and dismiss behavior while preserving the Character Reference context underneath.
- Should not handle yet: persistent navigation, account flows, or any edit state.
- First implementation slice: needed.

## Component boundaries and anti-patterns

- Prefer small, visible components that map directly to the guest flow instead of inventing a universal content renderer.
- Keep the Character Reference grouped sections separate from the ability rows they contain.
- Do not merge the sample preview, top summary, and ability detail into one generic “character card” abstraction.
- Do not create a universal modal system just because the quick-reference sheet needs one modal-like behavior.
- Do not add components for Items, Notes, search, party management, account prompts, or full-sheet editing until those screens exist.
- If two screens share a visual pattern, extract only the smallest reusable piece that clearly repeats.
- Let page compositions orchestrate the experience; keep primitives and domain components focused on one job.

## First implementation slice

Build only the components needed to ship this path:

1. Guest landing page
2. Sample character mobile Character Reference
3. Ability quick-reference bottom sheet

Minimum component set:

- Button
- Icon button
- Card
- Expandable section
- Badge
- Bottom-sheet modal behavior
- Character preview
- Character summary
- Ability row
- Quick-reference sheet
- Action type indicator
- Concentration indicator
- Guest landing page composition
- Sample character mobile Character Reference composition
- Error message

Deferred for a later slice:

- Stat display
- Empty state
- Loading state
- Resource tracker

Why these can wait:

- The first sample data can be static, so a reusable loading state is not required yet.
- The sample character is intentionally populated, so a reusable empty-state component is not required yet.
- Resource tracking is read-only and can be shown as plain text until mutable resources are implemented.
- Do not extract a universal stat display until repeated layouts prove it is useful.
