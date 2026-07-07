import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CharacterCreationPage } from './CharacterCreationPage';

const renderCreationPage = () => {
  const onBack = vi.fn();
  render(<CharacterCreationPage onBack={onBack} />);
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
  const row = screen.getByText(label).closest('div');
  if (!row) {
    throw new Error(`Missing draft row for ${label}`);
  }

  return within(row).getByRole('definition');
};

describe('CharacterCreationPage', () => {
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

  it('lets the user accept the recommended Fighter build', () => {
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

    expect(getDraftValue('Selected build')).toHaveTextContent(
      'Strength melee Fighter',
    );
    expect(getDraftValue('Recommendation overridden')).toHaveTextContent('No');
  });

  it('lets the user choose the other Fighter build and shows override state', () => {
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

    expect(getDraftValue('Recommended build')).toHaveTextContent(
      'Dexterity archer Fighter',
    );
    expect(getDraftValue('Selected build')).toHaveTextContent(
      'Strength melee Fighter',
    );
    expect(getDraftValue('Recommendation overridden')).toHaveTextContent('Yes');
  });
});
