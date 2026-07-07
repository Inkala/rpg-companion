import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const getDraftValue = (label: string) => {
  const draftFields = screen.getByLabelText('Current draft fields');
  const row = within(draftFields).getByText(label).closest('div');
  if (!row) {
    throw new Error(`Missing draft row for ${label}`);
  }

  return within(row).getByRole('definition');
};

describe('CharacterCreationPage', () => {
  beforeEach(() => {
    createCharacterMock.mockReset();
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
    expect(getDraftValue('Selected build')).toHaveTextContent(
      'Strength melee Fighter',
    );
    expect(getDraftValue('Recommendation overridden')).toHaveTextContent('No');
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
    expect(getDraftValue('Recommended build')).toHaveTextContent(
      'Dexterity archer Fighter',
    );
    expect(getDraftValue('Selected build')).toHaveTextContent(
      'Strength melee Fighter',
    );
    expect(getDraftValue('Recommendation overridden')).toHaveTextContent('Yes');
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
    expect(getDraftValue('Name')).toHaveTextContent('Nera Quickshot');
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

  it('saves the generated character for signed-in users', async () => {
    createCharacterMock.mockResolvedValue(createdCharacterResponse('Branna Shieldhand'));
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
    expect(screen.getByText(/Branna Shieldhand is saved/)).toBeInTheDocument();
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
      expect(screen.getByText(/Aldren Vale is saved/)).toBeInTheDocument();
    });
  });

  it('keeps review visible and shows a retryable error when save fails', async () => {
    createCharacterMock.mockRejectedValue(new Error('network down'));
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
