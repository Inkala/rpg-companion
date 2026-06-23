# Product Decisions — RPG Player Companion

**Status:** Active decision record  
**Last updated:** 20 June 2026  
**Working name:** TBD — one-word fantasy/mythological animal or wisdom-guide name  
**Tagline direction:** “Your party companion” / “Join the adventure, not the homework.”

---

## 1. Product Concept

A D&D 5E-first companion app that helps busy, occasional, or new-to-D&D players join a party, understand their character, quickly look up what their abilities do, and manage character progression over time.

The app is not intended to replace a complete rules platform, virtual tabletop, or official character-sheet service.

Its core purpose is:

> Help players spend less time decoding rules and character sheets, and more time playing.

The product should be useful for:

- people who are new to D&D but familiar with other RPG systems
- players who do not want to read hundreds of pages before their first session
- groups that play infrequently and forget how abilities work between sessions
- players who already have a character but want a clearer, more practical reference during play
- game masters who need quick access to their party’s character sheets

The app should not be framed only as a tool for “overwhelmed” or neurodivergent players. Clear onboarding, reduced rule friction, and memory support are useful for many busy adults and occasional players.

---

## 2. Primary User

The primary user is the **player**, not the GM.

Example user journey:

1. A player receives an invitation to join a D&D party/campaign.
2. They join through the app.
3. The app sees they do not yet have a character.
4. The player chooses one of these paths:
   - Add an existing character
   - Create a new character with guidance
   - Finish later
5. During sessions, the player uses the app mainly on their phone to:
   - view their character
   - check spells, features, and abilities
   - understand action economy, concentration, durations, and resources
   - quickly remember what their character can do
6. Between sessions, the player can update their character and later use guided level-up support.

### Guest-First Access

Visitors should be able to try useful parts of the app before creating an account.

Guests can:

- explore a sample character
- start creating a new character
- add an existing character
- use character quick-reference views and ability explanations
- keep a temporary character draft saved locally on the current device

An account is required only for features that need persistent or shared data:

- saving a character across devices
- joining a party
- creating a party
- inviting players
- sharing a character sheet with the GM
- preserving character progression and history

The app should request sign-up at a clear value moment, rather than showing login as the first screen.

---

## 3. GM Role

The GM is a supporting user.

The GM can:

- create a party/campaign
- create an invite link or invite code
- view the full character sheets of all party members
- use the party overview to understand the group

Players share their full sheet with the GM by default because this reflects the current group workflow: when characters level up, players already send their updated sheets to the GM.

The product is mainly a player companion, not a GM campaign-management system.

---

## 4. Core User Problems

### Problem A — Existing character information is hard to use at the table

Traditional character sheets contain important information, but they can be dense and hard to scan quickly during a session.

Examples:

- forgetting what a feature does
- forgetting whether something uses an Action, Bonus Action, Reaction, or concentration
- not remembering a spell’s duration or resource cost
- not knowing which bonuses apply in a situation
- not remembering abilities between monthly sessions

### Problem B — New players face too much terminology too early

A new D&D player may be asked to choose race/species, class, background, alignment, ability scores, skills, spells, equipment, and personality details before understanding what these choices mean.

The app should make this feel more approachable.

### Problem C — Existing players need transfer, not forced character creation

Many players will already have a character sheet outside the app.

The app must support a guided manual transfer flow so a group can start using the app without recreating characters from scratch.

### Problem D — Leveling up is infrequent but confusing

When characters level up, players need help distinguishing:

- what updates automatically
- what choices they must make
- what options may fit their existing character concept and play style

---

## 5. Product Principles

### Player-first

The player experience is the central product. GM features exist to support group onboarding and party visibility.

### Useful without AI

The app must work well even if no AI feature is available.

Core game data and character calculations should be structured and deterministic.

### AI as a guide, not a rules authority

AI may help explain, summarize, compare, or recommend options.

AI should not be treated as the authoritative source for official rules or calculations.

### Help is optional at every step

During character creation, users should be able to choose:

- Help me choose
- I know what I want
- Decide later

The app should guide, not force.

### Mobile-first during sessions

The most frequent real-world use case is checking a character during a session.

The mobile experience should prioritize:

- readable character summary
- abilities
- spells
- actions / bonus actions / reactions
- resources
- quick search
- short explanations

Character creation and detailed editing can prioritize laptop/tablet layouts.

### Progressive disclosure

Do not make users fill in every field immediately.

Let them start with basics and add details later.

### Clear over ornamental

The visual style can be fantasy-inspired, but must remain readable, accessible, and calm.

Avoid dense fake-parchment interfaces that make information harder to scan.

---

## 6. Existing Character Flow

The app should call this:

> **Add an existing character**

Not “Upload character,” unless an actual file-upload feature is added later.

Suggested progressive transfer steps:

1. Character name
2. Level
3. Class and subclass
4. Species/race
5. Background
6. Alignment
7. Ability scores
8. HP, AC, speed, proficiency bonus
9. Skills and saving throws
10. Attacks and equipment
11. Spells, features, traits, and resources
12. Backstory and notes — optional

The user should be able to stop after the basics and complete the sheet later.

---

## 7. Guided Character Creation

Guided creation should be split into steps.

At each step, the user can choose whether they want help.

The app should use short narrative scenarios to discover play-style preferences.

Example:

> You notice a creature hiding in a dark alley, ready to ambush you. What is your instinct?

Possible responses may suggest preferences such as:

- direct weapon combat
- magic
- stealth
- observation and planning
- persuasion
- protection/support

The app should then recommend a small, explainable shortlist.

Example:

> Your answers suggest you may enjoy agile, tactical characters. You might want to explore Ranger, Rogue, Monk, or Bard.

The app should never lock users into a choice based on the quiz.

For any decision, users should be able to browse, override, or skip guidance.

---

## 8. Character Views

### Play View

A simplified, mobile-first view for active sessions.

Should prioritize:

- HP and temporary HP
- AC
- speed
- main attacks
- actions
- bonus actions
- reactions
- spells
- active effects
- concentration status
- trackable resources
- important passive features
- quick “what can I do?” reference

### Sheet View

A fuller, printable character-sheet style view.

This should be generated from app data using an original layout rather than copying an official D&D character sheet design exactly.

Possible future feature:

- Export or print character sheet as PDF

---

## 9. Ability and Spell Quick Reference

A core feature is a short, practical reference card when a user taps an ability, spell, or feature.

Example structure:

```text
Hunter’s Mark

Quick effect:
Mark a creature. Your weapon attacks deal extra damage to it.

Cast:
Bonus Action

Duration:
Up to 1 hour

Concentration:
Yes

Resource:
Spell slot

Remember:
Moving the mark to a new target after the first one drops also uses a Bonus Action.
```

Quick-reference cards should prioritize:

- plain-language effect
- action type
- duration
- concentration
- resource cost
- usage limits
- important reminders
- relevant character stats or modifiers

The app should support the frequent user question:

> “How does this ability work again?”

Example current real-world question:

> “Please remind me how Colossus Slayer works.”

---

## 10. Search

There are two useful search types.

### Character Search

Search within the player’s own character:

- spells
- class features
- attacks
- equipment
- conditions
- proficiencies
- resources

### Rules Search

Search supported D&D 5E content, such as:

- spells
- conditions
- actions
- equipment
- selected creatures
- basic rules concepts

The MVP can support only a limited curated/open rules dataset.

Creature search is useful but not required for the earliest version.

---

## 11. Level-Up Guidance

Level-up support is an important future feature, though not the first priority because it is used less frequently than in-session ability lookup.

The intended flow:

1. User presses “Level up.”
2. App identifies their current character state.
3. App separates changes into:
   - Automatic updates
   - Decisions required from the player
4. App explains each decision in plain language.
5. App may offer recommendations based on the character’s build, play style, story, and prior choices.

Examples of automatic changes:

- hit-point changes
- class features automatically gained
- spell-slot changes
- proficiency changes where applicable

Examples of decisions:

- ability score improvement versus feat
- spell selection
- subclass choice
- fighting style or class-specific choices
- prepared/known spell updates

Recommendations should be phrased as suggestions, not universal “best build” advice.

Example:

> Because your character often uses a longbow, has high Dexterity, and uses Hunter’s Mark, these options may complement your current play style.

---

## 12. AI Role

AI is optional enhancement, not core infrastructure.

Good AI uses:

- explain abilities in plain language
- compare character options
- suggest a shortlist during guided creation
- explain why an option may fit a selected play style
- summarize level-up changes
- suggest spells or features based on character story and build
- answer contextual questions using the player’s own character information
- help generate backstory flavor

AI should not:

- invent official rules
- be the source of truth for calculations
- replace deterministic character logic
- perform live web search for every question
- replace GM judgment
- promise correct answers for unsupported or copyrighted content

Architecture principle:

> **Structured rules and character data first. AI explanation and guidance second.**

---

## 13. Rules and Copyright Strategy

The MVP is D&D 5E-first.

The exact supported rules version is pending confirmation from the DM:

- 2014 rules
- 2024 revised rules
- mixed/house-rule setup

Until confirmed, do not commit to supporting both versions.

For the public/demo version:

- use open/SRD-compatible content where appropriate
- do not ship content from paid rulebooks unless permission clearly allows it
- do not position the app as a complete replacement for official D&D platforms
- allow manually entered custom notes/features where useful
- avoid full private rulebook PDF ingestion in the MVP

Future possibility:

- private custom rules or user-owned content, handled carefully and not redistributed

---

## 14. Visual Direction

Preferred direction:

> Modern, polished UI with fantasy-game accents.

Reference mood:

- CodeCombat-like playful fantasy energy
- clear panels and strong visual hierarchy
- subtle fantasy borders, icons, creature/mascot details, or magical accents
- modern readable card layouts
- calm enough to scan quickly during play

Avoid:

- overly dense parchment backgrounds
- fake medieval manuscript styling across every screen
- decorative UI that harms readability
- visually noisy interfaces

Possible compromise:

- modern app UI for the main product
- optional parchment-inspired print/export character sheet

---

## 15. Naming Direction

The final name should be one word.

Desired naming qualities:

- fantasy-adjacent
- associated with a wise real or mythological animal
- feels like a guide, oracle, familiar, or keeper of knowledge
- not necessarily explicitly D&D-branded
- can pair with a slogan such as “Your party companion”

Ideas to explore later:

- Munin
- Hugin
- Strix
- Corvus
- Tyto
- Mimir
- Sova

No final name selected yet.

---

# Feature Roadmap

The product should evolve in layers.

At every layer, the app should remain usable and testable.

---

## v1: Core Party and Character Access

**Goal:** A real party can join one campaign and add/view characters.

### Must have

- User authentication
- GM creates one party/campaign
- GM creates invite link or invite code
- Player joins party
- Player manually adds an existing character
- Character basics:
  - name
  - class
  - level
  - species/race
  - background
  - alignment
  - ability scores
  - HP
  - AC
  - proficiency bonus
- Player character page
- GM party roster
- GM full-sheet access for all characters
- Mobile-responsive character view

### Success condition

A real party can join the app and transfer enough character information to test it together.

---

## v2: In-Session Character Companion

**Goal:** The app becomes a better at-the-table reference than a static PDF.

### Add

- Attacks, abilities, features, and spells
- Clickable quick-reference cards
- Tags for:
  - Action
  - Bonus Action
  - Reaction
  - Concentration
  - Short Rest
  - Long Rest
  - Passive
- Trackable resources:
  - spell slots
  - HP
  - temporary HP
  - limited-use abilities
- Search within the user’s own character
- Mobile-first Play View
- Printable/exportable original character-sheet layout

### Success condition

A player can answer “What does this ability do?” faster than by searching through a PDF or rulebook.

---

## v3: Guided Onboarding

**Goal:** A new player can create a basic character without understanding every D&D term in advance.

### Add

- Create-new-character flow
- Each step supports:
  - Help me choose
  - I know what I want
  - Decide later
- Narrative mini-questions to suggest play styles
- Guided shortlist for class and basic character direction
- Beginner-friendly descriptions
- Ability-score guidance
- Background/alignment/personality support
- Curated, limited set of supported D&D options

### Success condition

A new player can begin making a character without first reading a rulebook cover to cover.

---

## v4: Character Progression

**Goal:** The app supports character progression and richer party use.

### Add

- Level-up button
- Automatic updates versus player decisions
- Guided level-up checklist
- Basic option recommendations
- Character level history
- Expanded party overview for GM
- Shared campaign notes
- House-rule notes
- Search across a limited supported rules dataset
- Conditions and rest tracking

### Success condition

A player can level up with confidence and understand what changed.

---

## v5: Advanced Guidance and Future Expansion

**Goal:** Make the product more intelligent, flexible, and system-extensible.

### Add

- AI character adviser
- AI backstory helper
- Context-aware spell/feature recommendations
- “What can I do this turn?” assistant
- More complete rules coverage
- Additional RPG systems
- Custom/homebrew rules
- Private user-owned rule content
- Combat/session mode
- Initiative tracking
- Custom themes
- Additional export/import formats
- Expanded GM tools

### Success condition

The product becomes a broader tabletop companion platform rather than only a D&D 5E character reference tool.

---

# Current Priority Order

1. v1: Core party and character access
2. v2: In-session character companion
3. One feature from v3: guided onboarding
4. v4: Character progression features
5. AI enhancements
6. v5: Advanced guidance and future expansion

The first real user test should prioritize:

- joining a party
- transferring an existing character
- viewing the character on a phone
- checking how abilities work

Character creation guidance is important, but comes after the existing-character flow because the first testers already have characters.

---

# Open Decisions

- [ ] Confirm whether the current party uses D&D 2014 rules, D&D 2024 rules, or a mixed/house-rule version.
- [ ] Choose final app name.
- [ ] Decide whether invite links, invite codes, or both are needed.
- [ ] Decide the minimum character fields required before a player can use Play View.
- [ ] Decide which class/race/background options are supported in guided creation first.
- [ ] Decide whether character PDF export is required for MVP or Scooter stage.
- [ ] Decide which open/SRD rules source will support search and quick-reference content.
- [ ] Decide the exact visual direction after reviewing examples.
- [ ] Decide whether party members can see each other’s full sheets or only the GM can.
- [ ] Decide whether AI is included before submission or treated as a final optional enhancement.

---

# Current Research / Validation Plan

Before expanding scope:

1. Confirm the D&D rules version with the DM.
2. Ask party members whether they would transfer their current sheets once for testing.
3. Ask them which character details they look up most often.
4. Test whether phone-first character reference is more useful than a PDF during a session.
5. Validate whether “quick ability cards” solve the real problem better than a generic search page.
6. Only then decide how much character-creation guidance and AI is worth building.
