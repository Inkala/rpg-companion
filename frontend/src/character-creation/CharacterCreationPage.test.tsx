import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterCreationPage } from './CharacterCreationPage';
import { createCharacter } from '../characters/api';

const createCharacterMock = vi.mocked(createCharacter);

vi.mock('../characters/api', async () => {
  const actual = await vi.importActual<typeof import('../characters/api')>(
    '../characters/api',
  );

  return {
    ...actual,
    createCharacter: vi.fn(),
  };
});

const renderCreationPage = (
  props: Partial<React.ComponentProps<typeof CharacterCreationPage>> = {},
) => {
  const onBack = vi.fn();
  render(<CharacterCreationPage onBack={onBack} {...props} />);
  return { onBack };
};

const startQuiz = () => {
  renderCreationPage();
  fireEvent.click(screen.getByRole('button', { name: /Help me choose/ }));
};

const startManualEntry = () => {
  renderCreationPage();
  fireEvent.click(screen.getByRole('button', { name: /Fill the sheet myself/ }));
};

const reviewValidMinimumManualCharacter = (
  props: Partial<React.ComponentProps<typeof CharacterCreationPage>> = {},
) => {
  renderCreationPage(props);
  fireEvent.click(screen.getByRole('button', { name: /Fill the sheet myself/ }));
  fillValidMinimumManualCharacter();
  fireEvent.click(screen.getByRole('button', { name: 'Review character' }));
};

const fillValidMinimumManualCharacter = () => {
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Seren Ashfall' },
  });
  fireEvent.change(screen.getByLabelText('Class'), {
    target: { value: 'Ranger' },
  });
  fireEvent.change(screen.getByLabelText('Level'), {
    target: { value: '3' },
  });
  fireEvent.change(screen.getByLabelText('Ancestry'), {
    target: { value: 'Human' },
  });
  fireEvent.change(screen.getByLabelText('Background'), {
    target: { value: 'Outlander' },
  });
  fireEvent.change(screen.getByLabelText('Strength'), {
    target: { value: '12' },
  });
  fireEvent.change(screen.getByLabelText('Dexterity'), {
    target: { value: '16' },
  });
  fireEvent.change(screen.getByLabelText('Constitution'), {
    target: { value: '14' },
  });
  fireEvent.change(screen.getByLabelText('Intelligence'), {
    target: { value: '10' },
  });
  fireEvent.change(screen.getByLabelText('Wisdom'), {
    target: { value: '15' },
  });
  fireEvent.change(screen.getByLabelText('Charisma'), {
    target: { value: '8' },
  });
  fireEvent.change(screen.getByLabelText('Current HP'), {
    target: { value: '26' },
  });
  fireEvent.change(screen.getByLabelText('Maximum HP'), {
    target: { value: '28' },
  });
  fireEvent.change(screen.getByLabelText('Armor Class'), {
    target: { value: '15' },
  });
  fireEvent.change(screen.getByLabelText('Speed'), {
    target: { value: '30' },
  });
  fireEvent.change(screen.getByLabelText('Proficiency bonus'), {
    target: { value: '2' },
  });
};

const chooseAnswer = (name: RegExp | string) => {
  fireEvent.click(screen.getByLabelText(name));
};

const goNext = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
};

const finishQuiz = (answers: (RegExp | string)[]) => {
  answers.forEach((answer, index) => {
    chooseAnswer(answer);
    fireEvent.click(
      screen.getByRole('button', {
        name: index === answers.length - 1 ? 'See recommendation' : 'Next',
      }),
    );
  });
};

describe('CharacterCreationPage', () => {
  beforeEach(() => {
    createCharacterMock.mockReset();
  });

  it('shows the one-page manual form after choosing Fill the sheet myself', () => {
    startManualEntry();

    expect(
      screen.getByRole('heading', { name: 'Fill the sheet yourself.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Basics' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Ability scores' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Combat stats' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Optional action' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Optional feature / note' })).toBeInTheDocument();
  });

  it('renders the required manual entry fields', () => {
    startManualEntry();

    [
      'Name',
      'Class',
      'Level',
      'Ancestry',
      'Background',
      'Strength',
      'Dexterity',
      'Constitution',
      'Intelligence',
      'Wisdom',
      'Charisma',
      'Current HP',
      'Maximum HP',
      'Armor Class',
      'Speed',
      'Proficiency bonus',
    ].forEach((label) => {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });
  });

  it('marks required manual entry fields without marking optional fields', () => {
    startManualEntry();

    [
      'Name',
      'Class',
      'Level',
      'Ancestry',
      'Background',
      'Strength',
      'Dexterity',
      'Constitution',
      'Intelligence',
      'Wisdom',
      'Charisma',
      'Current HP',
      'Maximum HP',
      'Armor Class',
      'Speed',
      'Proficiency bonus',
    ].forEach((label) => {
      const field = screen.getByLabelText(label);
      expect(field).toBeRequired();
      expect(field.closest('label')).toHaveTextContent(`${label} *`);
    });

    [
      'Subclass',
      'Concept',
      'Notes',
      'Initiative',
      'Passive Perception',
      'Action name',
      'Feature name',
    ].forEach((label) => {
      const field = screen.getByLabelText(label);
      expect(field).not.toBeRequired();
      expect(field.closest('label')).not.toHaveTextContent(`${label} *`);
    });
  });

  it('lets the user fill a valid minimum manual character and reach review', () => {
    startManualEntry();
    fillValidMinimumManualCharacter();

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    expect(
      screen.getByRole('heading', { name: 'Review manual character.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Seren Ashfall')).toBeInTheDocument();
    expect(screen.getByText('Human Ranger - Level 3')).toBeInTheDocument();
    expect(screen.getByText('Outlander')).toBeInTheDocument();
    expect(screen.getByText('26/28')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('30 ft.')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('STR 12')).toBeInTheDocument();
    expect(screen.getByText('CHA 8')).toBeInTheDocument();
    expect(screen.getByText(/Sign in to save this manual character/)).toBeInTheDocument();
    expect(createCharacterMock).not.toHaveBeenCalled();
  });

  it('shows validation messages for blank required manual fields', () => {
    startManualEntry();

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Fix the highlighted fields before reviewing.',
    );
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Class is required.')).toBeInTheDocument();
    expect(screen.getByText('Ancestry is required.')).toBeInTheDocument();
    expect(screen.getByText('Background is required.')).toBeInTheDocument();
    expect(screen.getByText('Strength is required.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Review manual character.' })).not.toBeInTheDocument();
  });

  it('focuses and scrolls to the first invalid manual field', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    startManualEntry();

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toHaveFocus();
    });
    expect(scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Fix the highlighted fields before reviewing.',
    );
  });

  it('focuses the first invalid manual field in form order instead of validator order', async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    startManualEntry();
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Seren Ashfall' },
    });
    fireEvent.change(screen.getByLabelText('Class'), {
      target: { value: 'Ranger' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Level')).toHaveFocus();
    });
    expect(screen.getByText('Level is required.')).toBeInTheDocument();
    expect(screen.getByText('Ancestry is required.')).toBeInTheDocument();
  });

  it('shows validation messages for invalid manual numeric values', () => {
    startManualEntry();
    fillValidMinimumManualCharacter();
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '21' } });
    fireEvent.change(screen.getByLabelText('Speed'), { target: { value: 'fast' } });
    fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '31' } });
    fireEvent.change(screen.getByLabelText('Proficiency bonus'), {
      target: { value: '-1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    expect(screen.getByText('Level must be between 1 and 20.')).toBeInTheDocument();
    expect(screen.getByText('Speed must be a number.')).toBeInTheDocument();
    expect(screen.getByText('Strength must be between 1 and 30.')).toBeInTheDocument();
    expect(screen.getByText('Proficiency bonus must be non-negative.')).toBeInTheDocument();
  });

  it('shows a validation message when current HP is greater than maximum HP', () => {
    startManualEntry();
    fillValidMinimumManualCharacter();
    fireEvent.change(screen.getByLabelText('Current HP'), {
      target: { value: '29' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    expect(
      screen.getByText('Current HP must be less than or equal to maximum HP.'),
    ).toBeInTheDocument();
  });

  it('shows optional manual action and feature on review when filled', () => {
    startManualEntry();
    fillValidMinimumManualCharacter();
    fireEvent.change(screen.getByLabelText('Action name'), {
      target: { value: 'Longbow' },
    });
    fireEvent.change(screen.getByLabelText('Action type'), {
      target: { value: 'Action' },
    });
    fireEvent.change(screen.getByLabelText('Attack bonus'), {
      target: { value: '+5' },
    });
    fireEvent.change(screen.getByLabelText('Damage'), {
      target: { value: '1d8 + 3 piercing' },
    });
    fireEvent.change(screen.getByLabelText('Range'), {
      target: { value: '150 / 600 ft.' },
    });
    fireEvent.change(screen.getByLabelText('Action summary'), {
      target: { value: 'A careful ranged weapon attack.' },
    });
    fireEvent.change(screen.getByLabelText('Feature name'), {
      target: { value: 'Favored Terrain Notes' },
    });
    fireEvent.change(screen.getByLabelText('Feature category'), {
      target: { value: 'Character note' },
    });
    fireEvent.change(screen.getByLabelText('Feature summary'), {
      target: { value: 'Ask the GM when wilderness knowledge applies.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    expect(screen.getByText('Longbow')).toBeInTheDocument();
    expect(screen.getByText('Action - +5 to hit - 1d8 + 3 piercing - 150 / 600 ft.')).toBeInTheDocument();
    expect(screen.getByText('A careful ranged weapon attack.')).toBeInTheDocument();
    expect(screen.getByText('Favored Terrain Notes')).toBeInTheDocument();
    expect(screen.getByText('Character note')).toBeInTheDocument();
    expect(screen.getByText('Ask the GM when wilderness knowledge applies.')).toBeInTheDocument();
  });

  it('omits empty optional manual action and feature on review', () => {
    startManualEntry();
    fillValidMinimumManualCharacter();

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    expect(screen.queryByText('Actions / Attacks')).not.toBeInTheDocument();
    expect(screen.queryByText('Features / Notes')).not.toBeInTheDocument();
  });

  it('goes back from manual review to the filled form for editing', () => {
    startManualEntry();
    fillValidMinimumManualCharacter();
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    fireEvent.click(screen.getByRole('button', { name: 'Back to edit' }));

    expect(screen.getByRole('heading', { name: 'Fill the sheet yourself.' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Seren Ashfall');
    expect(screen.getByLabelText('Dexterity')).toHaveValue('16');
  });

  it('shows sign-in-required copy for signed-out manual review and does not save', () => {
    const onSignIn = vi.fn();
    const onCreateAccount = vi.fn();
    reviewValidMinimumManualCharacter({ onSignIn, onCreateAccount });

    expect(screen.getByText(/Sign in to save this manual character/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save character' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(createCharacterMock).not.toHaveBeenCalled();
  });

  it('shows Save character for signed-in manual review', () => {
    reviewValidMinimumManualCharacter({ isSignedIn: true });

    expect(screen.getByRole('button', { name: 'Save character' })).toBeInTheDocument();
    expect(screen.queryByText(/Saving manual characters comes next/)).not.toBeInTheDocument();
  });

  it('saves the manual character for signed-in users and opens the ordinary reference immediately', async () => {
    const onOpenCharacterReference = vi.fn();
    createCharacterMock.mockResolvedValue(createdManualCharacterResponse('Seren Ashfall'));
    reviewValidMinimumManualCharacter({ isSignedIn: true, onOpenCharacterReference });

    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));

    await waitFor(() => {
      expect(createCharacterMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Seren Ashfall',
          className: 'Ranger',
          subclassName: null,
          level: 3,
          ancestry: 'Human',
          background: 'Outlander',
          abilityScores: {
            strength: 12,
            dexterity: 16,
            constitution: 14,
            intelligence: 10,
            wisdom: 15,
            charisma: 8,
          },
          hitPoints: { current: 26, max: 28 },
          armorClass: 15,
          speedFt: 30,
          referencePayload: expect.objectContaining({
            schemaVersion: 'CharacterSheetV1',
          }),
        }),
      );
    });
    await waitFor(() => {
      expect(onOpenCharacterReference).toHaveBeenCalledWith(
        '44444444-4444-4444-4444-444444444444',
      );
    });
    expect(screen.queryByRole('button', { name: 'Open Character Reference' })).not.toBeInTheDocument();
  });

  it('engages a synchronous manual save lock and keeps it after success', async () => {
    const onOpenCharacterReference = vi.fn();
    let resolveSave: (value: ReturnType<typeof createdManualCharacterResponse>) => void = () => {};
    createCharacterMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    reviewValidMinimumManualCharacter({
      isSignedIn: true,
      onOpenCharacterReference,
    });

    const saveButton = screen.getByRole('button', { name: 'Save character' });
    act(() => {
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(createCharacterMock).toHaveBeenCalledOnce();

    resolveSave(createdManualCharacterResponse('Seren Ashfall'));

    await waitFor(() => expect(onOpenCharacterReference).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Save character' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));
    expect(createCharacterMock).toHaveBeenCalledOnce();
  });

  it('disables the manual save button while saving', async () => {
    let resolveSave: (value: ReturnType<typeof createdManualCharacterResponse>) => void = () => {};
    createCharacterMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    reviewValidMinimumManualCharacter({ isSignedIn: true });

    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));

    expect(screen.getByRole('button', { name: 'Saving character...' })).toBeDisabled();

    resolveSave(createdManualCharacterResponse('Seren Ashfall'));

    await waitFor(() => {
      expect(screen.getByText('Character saved.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Save character' })).toBeDisabled();
  });

  it('keeps manual review visible and shows a retryable error when save fails', async () => {
    createCharacterMock.mockRejectedValue(new Error('network down'));
    reviewValidMinimumManualCharacter({ isSignedIn: true });

    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save the character. Check your connection and try again.',
    );
    expect(screen.getByRole('heading', { name: 'Review manual character.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save character' })).not.toBeDisabled();
  });

  it('shows a 5-question quiz with 4 answer options per question', () => {
    startQuiz();

    for (let questionNumber = 1; questionNumber <= 5; questionNumber += 1) {
      expect(
        screen.getByText(`Question ${questionNumber} of 5`),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(4);

      if (questionNumber < 5) {
        fireEvent.click(screen.getAllByRole('radio')[0]);
        goNext();
      }
    }
  });

  it('does not expose build labels or scoring mappings while answering', () => {
    startQuiz();

    for (let questionNumber = 1; questionNumber <= 5; questionNumber += 1) {
      expect(
        screen.queryByText('Strength melee Fighter'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Dexterity archer Fighter'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('strengthMelee')).not.toBeInTheDocument();
      expect(screen.queryByText('dexterityArcher')).not.toBeInTheDocument();
      expect(screen.queryByText('futureMagic')).not.toBeInTheDocument();

      if (questionNumber < 5) {
        fireEvent.click(screen.getAllByRole('radio')[1]);
        goNext();
      }
    }
  });

  it('blocks Next until an answer is selected and keeps answer text selectable', () => {
    startQuiz();

    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toBeDisabled();

    chooseAnswer(/Stand in front and take the pressure/);

    expect(screen.getByText('Selected')).toBeInTheDocument();
    expect(nextButton).not.toBeDisabled();
  });

  it('recommends a Strength melee Fighter from direct strength answers', () => {
    startQuiz();

    finishQuiz([
      /Stand in front and take the pressure/,
      /In the crush, shield high and feet planted/,
      /Rush in and make space for them/,
      /Force it open and keep moving/,
      /Everyone is safe because you held the line/,
    ]);

    expect(
      screen.getByRole('heading', { name: 'Strength melee Fighter' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your closest supported match is a Strength melee Fighter/),
    ).toBeInTheDocument();
  });

  it('recommends a Dexterity archer Fighter from direct archer answers', () => {
    startQuiz();

    finishQuiz([
      /Find a clean shot from a safer angle/,
      /At range, reading the field and picking targets/,
      /Drop the enemy pressuring them/,
      /Look for a careful route around it/,
      /The perfect shot landed at the perfect time/,
    ]);

    expect(
      screen.getByRole('heading', { name: 'Dexterity archer Fighter' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your closest supported match is a Dexterity archer Fighter/),
    ).toBeInTheDocument();
  });

  it('shows honest future-path messaging for unsupported fantasy results', () => {
    startQuiz();

    finishQuiz([
      /Reach for impossible power or a strange sign/,
      /In the middle of the plan/,
      /Patch them up or keep them standing/,
      /Use a spell, omen, or impossible shortcut/,
      /Reality bent just enough to save the day/,
    ]);

    expect(
      screen.getByRole('heading', { name: 'Dexterity archer Fighter' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This first version does not build spellcasters yet/),
    ).toBeInTheDocument();
  });

  it('lets the user accept the recommended Fighter build and opens review', () => {
    startQuiz();

    finishQuiz([
      /Stand in front and take the pressure/,
      /In the crush, shield high and feet planted/,
      /Rush in and make space for them/,
      /Force it open and keep moving/,
      /Everyone is safe because you held the line/,
    ]);

    fireEvent.click(
      screen.getByRole('button', { name: 'Use Strength melee Fighter' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Review before saving.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Human Fighter - Level 1')).toBeInTheDocument();
    expect(screen.getByText('Strength melee Fighter - Soldier')).toBeInTheDocument();
    expect(screen.queryByLabelText('Current draft fields')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft state')).not.toBeInTheDocument();
  });

  it('lets the user choose the other Fighter build and opens review with override state', () => {
    startQuiz();

    finishQuiz([
      /Find a clean shot from a safer angle/,
      /At range, reading the field and picking targets/,
      /Drop the enemy pressuring them/,
      /Look for a careful route around it/,
      /The perfect shot landed at the perfect time/,
    ]);

    fireEvent.click(
      screen.getByRole('button', { name: 'Choose Strength melee Fighter' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Review before saving.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Strength melee Fighter - Soldier')).toBeInTheDocument();
    expect(screen.queryByLabelText('Current draft fields')).not.toBeInTheDocument();
  });

  it('shows generated character review details', () => {
    startQuiz();

    finishQuiz([
      /Stand in front and take the pressure/,
      /In the crush, shield high and feet planted/,
      /Rush in and make space for them/,
      /Force it open and keep moving/,
      /Everyone is safe because you held the line/,
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Use Strength melee Fighter' }));

    expect(screen.getByLabelText('Name')).toHaveAttribute('placeholder', 'Aldren Vale');
    expect(screen.getByText('Ancestry')).toBeInTheDocument();
    expect(screen.getByText('Human')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByText('Soldier')).toBeInTheDocument();
    expect(screen.getByText('12/12')).toBeInTheDocument();
    expect(screen.getByText('19')).toBeInTheDocument();
    expect(screen.getByText('30 ft.')).toBeInTheDocument();
    expect(screen.getByText(/Longsword - \+5 to hit - 1d8 \+ 3 slashing/)).toBeInTheDocument();
    expect(screen.getByText('Defense')).toBeInTheDocument();
    expect(screen.getByText('Second Wind')).toBeInTheDocument();
    expect(screen.getByText(/Fixed beginner build/)).toBeInTheDocument();
  });

  it('allows editing the generated character name on review', () => {
    startQuiz();

    finishQuiz([
      /Find a clean shot from a safer angle/,
      /At range, reading the field and picking targets/,
      /Drop the enemy pressuring them/,
      /Look for a careful route around it/,
      /The perfect shot landed at the perfect time/,
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Use Dexterity archer Fighter' }));

    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Nera Quickshot' } });

    expect(nameInput).toHaveValue('Nera Quickshot');
    expect(screen.queryByLabelText('Current draft fields')).not.toBeInTheDocument();
  });

  it('shows sign-in-required copy for signed-out review and does not save', () => {
    const onSignIn = vi.fn();
    const onCreateAccount = vi.fn();
    renderCreationPage({ onSignIn, onCreateAccount });
    fireEvent.click(screen.getByRole('button', { name: /Help me choose/ }));

    finishQuiz([
      /Stand in front and take the pressure/,
      /In the crush, shield high and feet planted/,
      /Rush in and make space for them/,
      /Force it open and keep moving/,
      /Everyone is safe because you held the line/,
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Use Strength melee Fighter' }));

    expect(screen.getByText(/Sign in to save this character/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save character' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(createCharacterMock).not.toHaveBeenCalled();
  });

  it('saves the generated character for signed-in users and opens the ordinary reference immediately', async () => {
    const onOpenCharacterReference = vi.fn();
    createCharacterMock.mockResolvedValue(createdCharacterResponse('Branna Shieldhand'));
    renderCreationPage({ isSignedIn: true, onOpenCharacterReference });
    fireEvent.click(screen.getByRole('button', { name: /Help me choose/ }));

    finishQuiz([
      /Stand in front and take the pressure/,
      /In the crush, shield high and feet planted/,
      /Rush in and make space for them/,
      /Force it open and keep moving/,
      /Everyone is safe because you held the line/,
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Use Strength melee Fighter' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Branna Shieldhand' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));

    await waitFor(() => {
      expect(createCharacterMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Branna Shieldhand',
          className: 'Fighter',
          subclassName: null,
          level: 1,
          ancestry: 'Human',
          background: 'Soldier',
          hitPoints: { current: 12, max: 12 },
          armorClass: 19,
          speedFt: 30,
          referencePayload: expect.objectContaining({
            schemaVersion: 'CharacterSheetV1',
          }),
        }),
      );
    });
    await waitFor(() => {
      expect(onOpenCharacterReference).toHaveBeenCalledWith(
        '22222222-2222-2222-2222-222222222222',
      );
    });
    expect(screen.queryByRole('button', { name: 'Open Character Reference' })).not.toBeInTheDocument();
  });

  it('disables the save button while saving', async () => {
    let resolveSave: (value: ReturnType<typeof createdCharacterResponse>) => void = () => {};
    createCharacterMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    renderCreationPage({ isSignedIn: true });
    fireEvent.click(screen.getByRole('button', { name: /Help me choose/ }));

    finishQuiz([
      /Stand in front and take the pressure/,
      /In the crush, shield high and feet planted/,
      /Rush in and make space for them/,
      /Force it open and keep moving/,
      /Everyone is safe because you held the line/,
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Use Strength melee Fighter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));

    expect(screen.getByRole('button', { name: 'Saving character...' })).toBeDisabled();

    resolveSave(createdCharacterResponse('Aldren Vale'));

    await waitFor(() => {
      expect(screen.getByText('Character saved.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Save character' })).toBeDisabled();
  });

  it('keeps review visible and shows a retryable error when save fails', async () => {
    createCharacterMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(createdCharacterResponse('Aldren Vale'));
    renderCreationPage({ isSignedIn: true });
    fireEvent.click(screen.getByRole('button', { name: /Help me choose/ }));

    finishQuiz([
      /Stand in front and take the pressure/,
      /In the crush, shield high and feet planted/,
      /Rush in and make space for them/,
      /Force it open and keep moving/,
      /Everyone is safe because you held the line/,
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Use Strength melee Fighter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save the character. Check your connection and try again.',
    );
    expect(screen.getByRole('heading', { name: 'Review before saving.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save character' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));
    await waitFor(() => expect(createCharacterMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Character saved.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save character' })).toBeDisabled();
  });
});

const createdCharacterResponse = (name: string) => ({
  id: '22222222-2222-2222-2222-222222222222',
  ownerSubjectId: '33333333-3333-3333-3333-333333333333',
  name,
  className: 'Fighter',
  subclassName: null,
  level: 1,
  ancestry: 'Human',
  background: 'Soldier',
  abilityScores: {
    strength: 16,
    dexterity: 11,
    constitution: 15,
    intelligence: 9,
    wisdom: 13,
    charisma: 14,
  },
  hitPoints: {
    current: 12,
    max: 12,
  },
  armorClass: 19,
  speedFt: 30,
  referencePayload: {
    schemaVersion: 'CharacterSheetV1',
  },
  createdAt: '2026-07-07T10:00:00Z',
  updatedAt: '2026-07-07T10:00:00Z',
});

const createdManualCharacterResponse = (name: string) => ({
  id: '44444444-4444-4444-4444-444444444444',
  ownerSubjectId: '33333333-3333-3333-3333-333333333333',
  name,
  className: 'Ranger',
  subclassName: null,
  level: 3,
  ancestry: 'Human',
  background: 'Outlander',
  abilityScores: {
    strength: 12,
    dexterity: 16,
    constitution: 14,
    intelligence: 10,
    wisdom: 15,
    charisma: 8,
  },
  hitPoints: {
    current: 26,
    max: 28,
  },
  armorClass: 15,
  speedFt: 30,
  referencePayload: {
    schemaVersion: 'CharacterSheetV1',
  },
  createdAt: '2026-07-11T10:00:00Z',
  updatedAt: '2026-07-11T10:00:00Z',
});
