# T-013 Design: Review and save generated Fighter

## Design Verdict

Use a review-before-save flow.

The Help me choose result should not immediately create a character. The user should first see the
generated sheet summary, confirm the name, understand this is a fixed beginner build, and then save.

## Flow

### 1. Quiz result

T-012 already resolves to:

- Strength melee Fighter;
- Dexterity archer Fighter.

Keep the current accept or override behavior. After the user chooses a supported build, move to
review instead of stopping at selected build state.

### 2. Review

Review content:

- Name input or editable name row.
- Build label.
- Human Fighter, level 1.
- Background.
- HP.
- AC.
- Speed.
- Main attack.
- Fighting Style.
- Second Wind.
- Future path note from the quiz, if one was shown.

Recommended review layout:

- compact identity header;
- stat strip for HP, AC, speed;
- primary attack panel;
- features list;
- fixed-build scope note;
- save area.

Do not expose all generated raw data on the review screen. Keep the full `CharacterSheetV1` detail
for Character Reference after save.

### 3. Signed-in save

Signed-in users see:

```text
Save character
```

On click:

1. Validate required review fields, especially name.
2. Build the create payload.
3. Disable save while the request is in flight.
4. Call `POST /characters`.
5. On success, navigate either home with the list refreshed or directly to the saved Character
   Reference.

Recommendation: navigate directly to the saved Character Reference after save, with the home list
also showing the new character when the user returns. This gives immediate confirmation that the
save produced a usable character.

### 4. Signed-out preview

Signed-out users see the same review content but cannot save.

The save area should say:

```text
Sign in to save this character.
```

Recommended actions:

- primary: `Sign in`;
- secondary: `Create account`.

The copy should explain that the preview stays available in this session, but saving requires an
account. Do not promise migration across login until localStorage draft migration is implemented.

### 5. Save error

Error placement:

- directly above or below the save action;
- announced to assistive technology with a polite status or alert pattern;
- does not move the user away from review.

Error copy examples:

- 401: `Your session expired. Sign in again to save this character.`
- validation: `Some generated character data was rejected. Please try again after refreshing.`
- network/server: `Could not save the character. Check your connection and try again.`

## Generated Build Cards

### Strength melee Fighter review card

Display:

- `Human Fighter - Level 1`
- `Strength melee Fighter - Soldier`
- `HP 12/12`
- `AC 19`
- `Speed 30 ft.`
- `Longsword: +5 to hit, 1d8 + 3 slashing`
- `Defense: +1 AC while wearing armor`
- `Second Wind: regain 1d10 + 1 HP once per short rest`

### Dexterity archer Fighter review card

Display:

- `Human Fighter - Level 1`
- `Dexterity archer Fighter - Outlander`
- `HP 12/12`
- `AC 14`
- `Speed 30 ft.`
- `Longbow: +7 to hit, 1d8 + 3 piercing, 150 / 600 ft.`
- `Archery: +2 to ranged weapon attack rolls`
- `Second Wind: regain 1d10 + 1 HP once per short rest`

## Character Reference Design

Saved generated Fighters should use the same Character Reference component as Mara.

The generated `CharacterSheetV1.summary.referenceSections` should produce:

- Actions: open by default.
- Features: closed by default.
- Spells: absent or empty.

Generated Actions section:

- Strength: Longsword, Javelin.
- Dexterity: Longbow, Shortsword.

Generated Features section:

- Fighting Style.
- Second Wind.

No portrait is required. If no `portraitAssetId` exists, Character Reference should render without a
portrait or with the existing neutral fallback, depending on current component behavior.

## Data Mapping Design

Use one source of generated build data per build.

Recommended structure for implementation:

- `GeneratedFighterBuildId`
- `GeneratedFighterBuild`
- `generatedFighterBuilds`
- `buildGeneratedFighterCharacterSheet`
- `buildCreateCharacterRequest`

The create request and `CharacterSheetV1` should be derived from the same build definition so HP,
AC, ability scores, speed, attacks, and features cannot drift.

## Accessibility

Follow `docs/design.md` accessibility requirements:

- use real form labels for the name field;
- keep buttons as `<button>`;
- keep visible focus;
- use non-color status signals;
- ensure touch targets are at least 44px;
- announce save errors and save success;
- keep heading order logical from quiz result to review.

## Deferred Design

Defer:

- choosing class, background, ancestry, fighting style, or equipment.
- changing ability scores.
- full CharacterSheet editing before save.
- generated portraits.
- localStorage draft migration.
- party selection after save.
- advanced quick-reference cards beyond a concise reminder for Fighting Style and Second Wind.
