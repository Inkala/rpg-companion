# T-006 Design

## Home IA

### Signed-out

Order:

1. Header with Hunin brand and lightweight account controls.
2. Main action group:
   - Create character: primary planned action.
   - Create party: secondary planned action.
   - Join party: secondary planned action.
3. Mara sample/demo card.

Party helper copy:

> You’ll need an account to create or join a party.

### Signed-in empty

Order:

1. Header with account identity and Sign out.
2. My characters empty state with Create character.
3. My parties empty state with Create party and Join party planned affordances.
4. Mara sample/demo card.

## Account Header

Desktop:

- Show Sign in and Create account inline when accounts are available.
- Show compact signed-in identity and Sign out when authenticated.
- Do not use a large Accounts card on the landing page.

Mobile:

- Show a text-labeled Menu affordance.
- Keep it compact and non-dominant.
- Do not implement menu behavior in this slice.

## Buttons

- Primary: Create character.
- Secondary: Create party, Join party, Explore Mara, Create account.
- Quiet/text: Sign in, Sign out, account switches, Back.
- Desktop/tablet: use intrinsic button widths or constrained grid cells.
- Mobile: keep stacked full-width buttons for tap comfort.
- Planned actions remain non-functional and use planned tags plus helper text.

## Forms

- Keep existing validation behavior.
- Style `.form-error` smaller and lighter.
- Keep errors close to fields and continue using `role="alert"` with `aria-describedby`.

## Boundaries

Create character is visible as the main next action, but this task does not create the mode-choice
screen or any creation flow. Party actions are visible for IA clarity only and remain planned.

