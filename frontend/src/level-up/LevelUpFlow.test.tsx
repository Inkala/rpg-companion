import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildGeneratedFighterCharacterSheet } from '../character-creation/generatedFighterBuilds';
import { CharactersApiError } from '../characters/api';
import type { CharacterDTO, LevelUpCharacterRequestDTO } from '../characters/apiTypes';
import type { CharacterSheetV1 } from '../characters/characterSheet';
import { testCharacterV2DTO } from '../characters/characterSheetV2TestFixtures';
import {
  LevelUpFlow,
  LevelUpClassChoiceStep,
  LevelUpReviewStep,
  buildLevelUpReview,
  buildLevelUpRequest,
  eligibleLevelUpSpells,
  validateLevelUpDraft,
  createLevelUpDraft,
} from './LevelUpFlow';
import { buildLevelUpPlan, getLevelUpEligibility } from './stateMachine';
import { completeDraftFor, viableCharacterAt } from './levelUpTestFixtures';

describe('LevelUpFlow', () => {
  it('keeps V2 level-four choices and review inputs inside the bounded contract', () => {
    const character = testCharacterV2DTO('Bounded V2 Hero', 3);
    const eligibility = getLevelUpEligibility(character);
    if (!eligibility.eligible) throw new Error(`unexpected V2 ineligibility: ${eligibility.reason}`);
    render(
      <LevelUpFlow
        character={character}
        sheet={eligibility.sheet}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onSuccess={vi.fn()}
        onReload={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Choose an Ability Score Improvement' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Record a manual feat note')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Strength: 15'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByLabelText(/I reviewed the values that will be retained/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.queryByText('Explicit typed overrides (optional)')).not.toBeInTheDocument();
    expect(screen.getByText('Armor Class').closest('.level-up-review-row')).toHaveTextContent(/Proposed:\s*\d+/);
    expect(screen.getByText('Speed').closest('.level-up-review-row')).toHaveTextContent(/Proposed:\s*\d+ ft/);
    expect(screen.getByText('Attacks').closest('.level-up-review-row')).toHaveTextContent('Proposed: No represented attacks');
  });
  it('submits once synchronously, keeps the sheet out of the DTO, and renders the server result', async () => {
    const character = eligibleFighter();
    let resolveSubmit: ((value: CharacterDTO) => void) | undefined;
    const onSubmit = vi.fn<(request: LevelUpCharacterRequestDTO) => Promise<CharacterDTO>>(() => new Promise<CharacterDTO>((resolve) => {
      resolveSubmit = resolve;
    }));
    const onSuccess = vi.fn();
    renderFlow(character, { onSubmit, onSuccess });

    advanceFromPrerequisitesToReview();
    const submit = screen.getByRole('button', { name: 'Confirm level up' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const request = onSubmit.mock.calls[0][0];
    expect(request).toEqual(expect.objectContaining({
      expectedUpdatedAt: character.updatedAt,
      hp: { mode: 'fixed-average' },
      currentHp: { mode: 'increase-by-gain' },
      prerequisiteChoices: [],
      classChoices: [],
      decisionSummary: [],
    }));
    expect(request).not.toEqual(expect.objectContaining({
      className: expect.anything(),
      fromLevel: expect.anything(),
      toLevel: expect.anything(),
      character: expect.anything(),
      referencePayload: expect.anything(),
    }));

    const updated = { ...character, level: 2, updatedAt: '2026-07-18T11:00:00Z' };
    resolveSubmit?.(updated);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(updated));
  });

  it('accepts a successful response after the React Strict Mode effect replay', async () => {
    const character = eligibleFighter();
    const updated = { ...character, level: 2, updatedAt: '2026-07-18T11:00:00Z' };
    const onSuccess = vi.fn();

    render(
      <StrictMode>
        <LevelUpFlow
          character={character}
          sheet={character.referencePayload as CharacterSheetV1}
          onClose={vi.fn()}
          onSubmit={vi.fn().mockResolvedValue(updated)}
          onSuccess={onSuccess}
          onReload={vi.fn()}
        />
      </StrictMode>,
    );
    advanceFromPrerequisitesToReview();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm level up' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(updated));
  });

  it('keeps ordinary failures retryable with the same draft', async () => {
    const character = eligibleFighter();
    const onSubmit = vi.fn()
      .mockRejectedValueOnce(new CharactersApiError('Temporary failure.', 500))
      .mockResolvedValueOnce({ ...character, level: 2 });
    const onSuccess = vi.fn();
    renderFlow(character, { onSubmit, onSuccess });
    advanceFromPrerequisitesToReview();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm level up' }));
    expect(await screen.findByText('Temporary failure.')).toBeInTheDocument();
    expect(screen.getByText('Maximum HP')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('treats 409 as reload required and never retries automatically', async () => {
    const character = eligibleFighter();
    const onSubmit = vi.fn().mockRejectedValue(
      new CharactersApiError('character changed; reload before leveling up', 409),
    );
    const onReload = vi.fn();
    renderFlow(character, { onSubmit, onReload });
    advanceFromPrerequisitesToReview();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm level up' }));

    expect(await screen.findByRole('heading', { name: 'Reload required' })).toBeInTheDocument();
    expect(screen.getByText(/will not retry this request automatically/)).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reload character' }));
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('reviews the complete Constitution ASI hit-point gain before submission', () => {
    const character = eligibleFighter(3);
    const sheet = character.referencePayload as CharacterSheetV1;
    sheet.identity.classes[0].subclass = 'Champion';
    character.subclassName = 'Champion';
    sheet.combat.hitPoints = { current: 20, max: 28, temporary: 0 };
    character.hitPoints = { current: 20, max: 28 };
    renderFlow(character);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Constitution: 15'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByLabelText(/I reviewed the values that will be retained/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const maxHpRow = screen.getByText('Maximum HP').closest('.level-up-review-row');
    expect(maxHpRow).not.toBeNull();
    expect(within(maxHpRow as HTMLElement).getByText(/Proposed:/).parentElement).toHaveTextContent('Proposed: 40');
    const currentHpRow = screen.getByText('Current HP').closest('.level-up-review-row');
    expect(within(currentHpRow as HTMLElement).getByText(/Proposed:/).parentElement).toHaveTextContent('Proposed: 32');
  });

  it('focuses the first invalid field and exposes a non-color error summary', async () => {
    const character = eligibleFighter();
    renderFlow(character);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByLabelText(/Enter a d10 roll/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a whole-number d10 roll');
    await waitFor(() => expect(screen.getByLabelText('Hit die roll')).toHaveFocus());
  });

  it('requires an explicit Fighter subclass selection and preserves it when returning Back', async () => {
    const character = eligibleFighter(2);
    renderFlow(character);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const champion = screen.getByRole('radio', { name: /Use SRD Champion/ });
    const manual = screen.getByRole('radio', { name: /Retain a reviewed manual subclass/ });
    expect(champion).not.toBeChecked();
    expect(manual).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Choose a subclass' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a subclass.');
    await waitFor(() => expect(champion).toHaveFocus());

    fireEvent.click(champion);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('radio', { name: /Use SRD Champion/ })).toBeChecked();
  });

  it('starts a fresh Fighter subclass flow unselected after a prior explicit choice', () => {
    const first = eligibleFighter(2);
    const rendered = renderFlow(first);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('radio', { name: /Use SRD Champion/ }));
    expect(screen.getByRole('radio', { name: /Use SRD Champion/ })).toBeChecked();
    rendered.unmount();

    renderFlow({ ...eligibleFighter(2), id: '44444444-4444-4444-4444-444444444444' });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('radio', { name: /Use SRD Champion/ })).not.toBeChecked();
  });

  it('does not preselect the representative Druid subclass at its canonical timing', () => {
    const character = viableCharacterAt('Druid', 1);
    renderFlow(character);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('heading', { name: 'Choose a subclass' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Use SRD Land/ })).not.toBeChecked();
  });

  it('renders only eligible level-two Warlock invocations without preselecting one', () => {
    const character = viableCharacterAt('Warlock', 1);
    const sheet = character.referencePayload as CharacterSheetV1;
    const plan = buildLevelUpPlan(character, sheet);
    const draft = createLevelUpDraft();
    render(
      <LevelUpClassChoiceStep
        plan={plan}
        sheet={sheet}
        draft={draft}
        updateDraft={vi.fn()}
        errors={[]}
      />,
    );

    expect(screen.queryByRole('checkbox', { name: /Book of Ancient Secrets/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Voice of the Chain Master/ })).not.toBeInTheDocument();
    const invocations = screen.getAllByRole('checkbox');
    expect(invocations.length).toBeGreaterThan(0);
    for (const invocation of invocations) expect(invocation).not.toBeChecked();
  });

  it('reviews reliable proficiency-derived skills while preserving manual exceptions', () => {
    const character = eligibleFighter(4);
    const sheet = character.referencePayload as CharacterSheetV1;
    sheet.identity.classes[0].subclass = 'Champion';
    character.subclassName = 'Champion';
    sheet.proficiencies.skills.push({
      name: 'Acrobatics',
      proficient: false,
      modifier: 0,
    });
    sheet.proficiencies.skills.find((skill) => skill.name === 'Intimidation')!.needsConfirmation = true;
    renderFlow(character);

    advanceFromPrerequisitesToReview();

    const skillsRow = screen.getByText('Reliable skill modifiers').closest('.level-up-review-row');
    expect(skillsRow).not.toBeNull();
    expect(skillsRow).toHaveTextContent('Athletics +5');
    expect(skillsRow).toHaveTextContent('Athletics +6');
    expect(skillsRow).not.toHaveTextContent('Intimidation');
    expect(skillsRow).not.toHaveTextContent('Acrobatics');
    const passiveRow = screen.getByText('Passive Perception').closest('.level-up-review-row');
    expect(passiveRow).toHaveTextContent('Derived from the reliable resulting Perception');
  });

  it('shows explicit override precedence and sends typed override fields only', async () => {
    const character = eligibleFighter();
    const onSubmit = vi.fn().mockResolvedValue({ ...character, level: 2 });
    renderFlow(character, { onSubmit });
    advanceFromPrerequisitesToReview();
    fireEvent.change(screen.getByLabelText('Passive Perception override'), { target: { value: '19' } });

    const passiveRow = screen.getByText('Passive Perception').closest('.level-up-review-row');
    expect(passiveRow).toHaveTextContent('Proposed: 19');
    expect(passiveRow).toHaveTextContent('Explicit typed manual override');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm level up' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0].overrides).toEqual({ passivePerception: 19 });
  });

  it('supports rolled HP with retained and manual current-HP confirmation', () => {
    const character = eligibleFighter();
    renderFlow(character);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByLabelText(/Enter a d10 roll/));
    fireEvent.change(screen.getByLabelText('Hit die roll'), { target: { value: '7' } });
    fireEvent.click(screen.getByLabelText(/Retain 12 current HP/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByLabelText(/I reviewed the values that will be retained/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Current HP').closest('.level-up-review-row')).toHaveTextContent('Proposed: 12');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByLabelText(/Enter current HP manually/));
    fireEvent.change(screen.getByLabelText('Final current HP'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Current HP').closest('.level-up-review-row')).toHaveTextContent('Proposed: 9');
  });

  it('ignores a late successful response after the flow unmounts', async () => {
    const character = eligibleFighter();
    let resolveSubmit: ((value: CharacterDTO) => void) | undefined;
    const onSubmit = vi.fn<(request: LevelUpCharacterRequestDTO) => Promise<CharacterDTO>>(
      () => new Promise((resolve) => { resolveSubmit = resolve; }),
    );
    const onSuccess = vi.fn();
    const { unmount } = renderFlow(character, { onSubmit, onSuccess });
    advanceFromPrerequisitesToReview();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm level up' }));
    unmount();

    resolveSubmit?.({ ...character, level: 2 });

    await waitFor(() => expect(onSuccess).not.toHaveBeenCalled());
  });

  it.each([
    ['Bard', 1, 'known spells'],
    ['Cleric', 1, 'prepared spells'],
    ['Paladin', 1, 'prepared spells'],
    ['Ranger', 1, 'known spells'],
    ['Wizard', 1, 'Wizard spellbook'],
    ['Warlock', 1, 'Pact Magic'],
  ] as const)('names the complete %s %s review', (className, level, expectedModeText) => {
    const character = viableCharacterAt(className, level);
    const sheet = character.referencePayload as CharacterSheetV1;
    const plan = buildLevelUpPlan(character, sheet);
    const draft = completeDraftFor(plan, sheet);
    render(
      <LevelUpReviewStep
        plan={plan}
        sheet={sheet}
        draft={draft}
        updateDraft={vi.fn()}
        errors={[]}
      />,
    );

    expect(screen.getAllByText(new RegExp(expectedModeText, 'i')).length).toBeGreaterThan(0);
    for (const spellId of [...draft.spellAdditions, ...draft.wizardSpellbookAdditions, ...draft.preparedSpellIds]) {
      const spell = eligibleLevelUpSpells(plan, sheet, draft).find((candidate) => candidate.index === spellId) ??
        sheet.spellcasting?.spells.find((candidate) => candidate.id === spellId);
      expect(screen.getAllByText(new RegExp(spell?.name ?? spellId, 'i')).length).toBeGreaterThan(0);
    }
  });

  it.each([
    ['Paladin', 1, 'paladin-fighting-style'],
    ['Bard', 2, 'bard-expertise'],
    ['Druid', 2, 'druid-land-circle'],
    ['Sorcerer', 2, 'sorcerer-metamagic'],
    ['Warlock', 1, 'warlock-eldritch-invocations'],
    ['Warlock', 2, 'warlock-pact-boon'],
  ] as const)('names the selected %s class-choice mode at level %s', (className, level, choiceId) => {
    const character = viableCharacterAt(className, level);
    const sheet = character.referencePayload as CharacterSheetV1;
    const plan = buildLevelUpPlan(character, sheet);
    const draft = completeDraftFor(plan, sheet);
    render(
      <LevelUpReviewStep
        plan={plan}
        sheet={sheet}
        draft={draft}
        updateDraft={vi.fn()}
        errors={[]}
      />,
    );

    const choiceRule = plan.classRule.choices.find((choice) => choice.id === choiceId)!;
    const selectedNames = (draft.choices[choiceId]?.optionIds ?? []).map((optionId) =>
      choiceRule.options.find((option) => option.index === optionId)?.name ?? optionId,
    );
    expect(plan.steps).toContain('decision-class-specific');
    expect(selectedNames.length).toBeGreaterThan(0);
    const row = screen.getByText('Class choices').closest('.level-up-review-row');
    for (const selectedName of selectedNames) expect(row).toHaveTextContent(selectedName);
  });

  it('names always-prepared spells and recovered earlier subclass features', () => {
    const character = viableCharacterAt('Cleric', 1);
    const sheet = character.referencePayload as CharacterSheetV1;
    sheet.identity.classes[0].subclass = undefined;
    character.subclassName = null;
    sheet.features = [];
    const plan = buildLevelUpPlan(character, sheet);
    const draft = completeDraftFor(plan, sheet);
    const review = buildLevelUpReview(plan, sheet, draft);

    const subclassFeatures = review.find((row) => row.label === 'Subclass features');
    const alwaysPrepared = review.find((row) => row.label === 'Always-prepared subclass spells');
    expect(subclassFeatures?.proposed).toMatch(/Bonus Proficiency|Disciple of Life|Preserve Life/);
    expect(alwaysPrepared?.proposed).toMatch(/Bless|Cure Wounds/);
  });

  it('names a known-spell replacement as old spell to new spell', () => {
    const character = viableCharacterAt('Bard', 1);
    const sheet = character.referencePayload as CharacterSheetV1;
    const plan = buildLevelUpPlan(character, sheet);
    const draft = completeDraftFor(plan, sheet);
    const oldSpell = sheet.spellcasting!.spells.find((spell) => spell.level > 0)!;
    const newSpell = eligibleLevelUpSpells(plan, sheet, draft).find((spell) =>
      spell.level > 0 && !sheet.spellcasting!.spells.some((existing) => existing.id === spell.index) && !draft.spellAdditions.includes(spell.index),
    )!;
    draft.replacementRemoveSpellId = oldSpell.id;
    draft.replacementAddSpellId = newSpell.index;

    const replacement = buildLevelUpReview(plan, sheet, draft).find((row) => row.label === 'Spell replacement');
    expect(replacement?.proposed).toBe(`${oldSpell.name} → ${newSpell.name}`);
  });

  it('accepts manual current HP that becomes valid only after a Constitution ASI', () => {
    const character = eligibleFighter(3);
    const sheet = character.referencePayload as CharacterSheetV1;
    sheet.identity.classes[0].subclass = 'Champion';
    character.subclassName = 'Champion';
    sheet.combat.hitPoints = { current: 28, max: 28, temporary: 0 };
    character.hitPoints = { current: 28, max: 28 };
    renderFlow(character);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByLabelText(/Enter current HP manually/));
    fireEvent.change(screen.getByLabelText('Final current HP'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Choose an Ability Score Improvement' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Constitution: 15'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByLabelText(/I reviewed/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Current HP').closest('.level-up-review-row')).toHaveTextContent('Proposed: 40');
  });

  it('rejects final manual current HP without the Constitution ASI and focuses its field', async () => {
    const character = eligibleFighter(3);
    const sheet = character.referencePayload as CharacterSheetV1;
    sheet.identity.classes[0].subclass = 'Champion';
    character.subclassName = 'Champion';
    sheet.combat.hitPoints = { current: 28, max: 28, temporary: 0 };
    character.hitPoints = { current: 28, max: 28 };
    renderFlow(character);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByLabelText(/Enter current HP manually/));
    fireEvent.change(screen.getByLabelText('Final current HP'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Strength: 16'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByLabelText(/I reviewed/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/manual current HP cannot exceed the final maximum of 36/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Final current HP')).toHaveFocus());
  });

  it('clears a stale replacement target when that spell becomes a normal addition', () => {
    const character = viableCharacterAt('Bard', 1);
    const sheet = character.referencePayload as CharacterSheetV1;
    renderFlow(character);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const remove = screen.getByLabelText('Existing spell to replace');
    fireEvent.change(remove, { target: { value: sheet.spellcasting!.spells.find((spell) => spell.level > 0)!.id } });
    const replacement = screen.getByLabelText('Replacement SRD spell') as HTMLSelectElement;
    const replacementId = Array.from(replacement.options).find((option) => option.value)?.value ?? '';
    fireEvent.change(replacement, { target: { value: replacementId } });
    const replacementName = Array.from(replacement.options).find((option) => option.value === replacementId)!.textContent!;
    fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(replacementName, 'i') }));

    expect(screen.getByLabelText('Replacement SRD spell')).toHaveValue('');
  });

  it('rejects and sanitizes duplicate spell IDs across bounded DTO collections', () => {
    const character = viableCharacterAt('Bard', 1);
    const sheet = character.referencePayload as CharacterSheetV1;
    const plan = buildLevelUpPlan(character, sheet);
    const draft = completeDraftFor(plan, sheet);
    const duplicate = draft.spellAdditions.find((id) => id !== undefined)!;
    draft.replacementRemoveSpellId = sheet.spellcasting!.spells.find((spell) => spell.level > 0)!.id;
    draft.replacementAddSpellId = duplicate;
    draft.wizardSpellbookAdditions = [duplicate];

    expect(validateLevelUpDraft(draft, plan, sheet)).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringMatching(/cannot be selected in more than one spell change/i) }),
    ]));
    const request = buildLevelUpRequest(character, sheet, plan, draft);
    const allAdded = [
      ...(request.spells?.additions.map((spell) => spell.index) ?? []),
      ...(request.spells?.replacements.map((replacement) => replacement.add.index) ?? []),
      ...(request.spells?.wizardSpellbookAdditions.map((spell) => spell.index) ?? []),
    ];
    expect(new Set(allAdded).size).toBe(allAdded.length);
  });
});

const advanceFromPrerequisitesToReview = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByLabelText(/I reviewed the values that will be retained/));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('heading', { name: 'Review level up' })).toBeInTheDocument();
};

const renderFlow = (
  character: CharacterDTO,
  overrides: Partial<{
    onSubmit: React.ComponentProps<typeof LevelUpFlow>['onSubmit'];
    onSuccess: React.ComponentProps<typeof LevelUpFlow>['onSuccess'];
    onReload: () => void;
  }> = {},
) => render(
  <LevelUpFlow
    character={character}
    sheet={character.referencePayload as CharacterSheetV1}
    onClose={vi.fn()}
    onSubmit={overrides.onSubmit ?? vi.fn().mockResolvedValue({ ...character, level: character.level + 1 })}
    onSuccess={overrides.onSuccess ?? vi.fn()}
    onReload={overrides.onReload ?? vi.fn()}
  />,
);

const eligibleFighter = (level = 1): CharacterDTO => {
  const sheet = buildGeneratedFighterCharacterSheet('strength-melee-fighter', 'Flow Hero');
  sheet.identity.classes[0].level = level;
  sheet.summary.displayLine = `Human Fighter - Level ${level}`;
  sheet.features[0] = {
    ...sheet.features[0],
    id: 'fighter-fighting-style-defense',
  };
  return {
    id: '22222222-2222-2222-2222-222222222222',
    ownerSubjectId: '33333333-3333-3333-3333-333333333333',
    name: 'Flow Hero',
    className: 'Fighter',
    subclassName: null,
    level,
    ancestry: 'Human',
    background: 'Soldier',
    abilityScores: { ...sheet.abilities.scores },
    hitPoints: { current: sheet.combat.hitPoints.current, max: sheet.combat.hitPoints.max },
    armorClass: sheet.combat.armorClass.value ?? 0,
    speedFt: sheet.combat.speed[0].feet,
    referencePayload: sheet,
    createdAt: '2026-07-07T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  };
};
