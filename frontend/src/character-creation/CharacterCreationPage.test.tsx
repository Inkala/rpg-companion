import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter } from '../characters/api';
import { CharacterCreationPage } from './CharacterCreationPage';

const createCharacterMock = vi.mocked(createCharacter);

vi.mock('../characters/api', async () => {
  const actual = await vi.importActual<typeof import('../characters/api')>('../characters/api');
  return { ...actual, createCharacter: vi.fn() };
});

const renderPage = (props: Partial<React.ComponentProps<typeof CharacterCreationPage>> = {}) => {
  const onBack = vi.fn();
  render(<CharacterCreationPage onBack={onBack} {...props} />);
  return { onBack };
};

const startManual = (props: Partial<React.ComponentProps<typeof CharacterCreationPage>> = {}) => {
  renderPage(props);
  fireEvent.click(screen.getByRole('button', { name: /Fill the sheet myself/ }));
};

const completeManualBasics = () => {
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Seren Ashfall' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Gender' }), { target: { value: 'Female' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: 'human' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'fighter' } });
  const language = screen.getByRole('listbox', { name: 'Human Extra Language (choose 1)' }) as HTMLSelectElement;
  const elvish = [...language.options].find((option) => option.value === 'elvish');
  if (elvish) elvish.selected = true;
  fireEvent.change(language);
  const fightingStyle = screen.queryByRole('listbox', { name: 'Fighter Fighting Style (choose 1)' }) as HTMLSelectElement | null;
  const defense = fightingStyle ? [...fightingStyle.options].find((option) => option.value === 'fighter-fighting-style-defense') : null;
  if (defense) {
    defense.selected = true;
    fireEvent.change(fightingStyle!);
  }
};

const completeGuidedDecisions = () => {
  const language = screen.getByRole('listbox', { name: 'Human Extra Language (choose 1)' }) as HTMLSelectElement;
  const elvish = [...language.options].find((option) => option.value === 'elvish');
  if (elvish) elvish.selected = true;
  fireEvent.change(language);
  const style = screen.getByRole('listbox', { name: 'Fighter Fighting Style (choose 1)' }) as HTMLSelectElement;
  const defense = [...style.options].find((option) => option.value === 'fighter-fighting-style-defense');
  if (defense) defense.selected = true;
  fireEvent.change(style);
};

const reviewManual = (props: Partial<React.ComponentProps<typeof CharacterCreationPage>> = {}) => {
  startManual(props);
  completeManualBasics();
  fireEvent.click(screen.getByRole('button', { name: 'Review character' }));
};

const startQuiz = (props: Partial<React.ComponentProps<typeof CharacterCreationPage>> = {}) => {
  renderPage(props);
  fireEvent.click(screen.getByRole('button', { name: /Help me choose/ }));
};

const finishQuiz = (answers: Array<RegExp | string>) => {
  answers.forEach((answer, index) => {
    fireEvent.click(screen.getByLabelText(answer));
    fireEvent.click(screen.getByRole('button', { name: index === 4 ? 'See recommendation' : 'Next' }));
  });
};

const finishStrengthQuiz = () => {
  finishQuiz([
    /Stand in front and take the pressure/,
    /In the crush, shield high and feet planted/,
    /Rush in and make space for them/,
    /Force it open and keep moving/,
    /Everyone is safe because you held the line/,
  ]);
};

const finishDexterityQuiz = () => {
  finishQuiz([
    /Find a clean shot from a safer angle/,
    /At range, reading the field and picking targets/,
    /Drop the enemy pressuring them/,
    /Look for a careful route around it/,
    /The perfect shot landed at the perfect time/,
  ]);
};

const goBackWithinQuiz = () => {
  const backButtons = screen.getAllByRole('button', { name: 'Back' });
  fireEvent.click(backButtons[backButtons.length - 1]);
};

describe('CharacterCreationPage structured V2 flow', () => {
  beforeEach(() => createCharacterMock.mockReset());

  it('renders the complete structured editor and removes superseded visible fields', () => {
    startManual();

    for (const name of [
      'Basics', 'Abilities and rule choices', 'HP and combat calculations', 'Attacks', 'Spells',
      'Features and traits', 'Equipment', 'Other',
    ]) expect(screen.getByRole('group', { name })).toBeInTheDocument();
    expect(screen.queryByLabelText('Ancestry')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Concept')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Notes')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Current HP')).not.toBeInTheDocument();
    expect(screen.getByText(/New characters start at full HP/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add manual spell' })).not.toBeInTheDocument();
  });

  it('offers all supported Classes, Races, Gender values, and levels 1 through 5', () => {
    startManual();
    expect(within(screen.getByRole('combobox', { name: 'Class' })).getAllByRole('option')).toHaveLength(14);
    expect(within(screen.getByRole('combobox', { name: 'Race' })).getAllByRole('option')).toHaveLength(15);
    expect(within(screen.getByRole('combobox', { name: 'Gender' })).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Choose Gender', 'Male', 'Female', 'Other',
    ]);
    expect(within(screen.getByRole('combobox', { name: 'Level' })).getAllByRole('option').map((option) => option.textContent)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('marks the V2 basic identity inputs as required', () => {
    startManual();

    for (const control of [
      screen.getByRole('textbox', { name: 'Name' }),
      screen.getByRole('combobox', { name: 'Gender' }),
      screen.getByRole('combobox', { name: 'Race' }),
      screen.getByRole('combobox', { name: 'Class' }),
      screen.getByRole('combobox', { name: 'Level' }),
      screen.getByRole('textbox', { name: 'Background' }),
    ]) {
      expect(control).toBeRequired();
    }
  });

  it('shows Ranger Hunter only at the canonical subclass level', () => {
    startManual();
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'ranger' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '2' } });
    expect(screen.queryByRole('combobox', { name: 'Subclass' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '3' } });
    const subclass = screen.getByRole('combobox', { name: 'Subclass' });
    expect(within(subclass).getByRole('option', { name: 'Hunter' })).toBeInTheDocument();
    expect(subclass).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Ranger Favored Enemy imported choice' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Ranger Natural Explorer imported choice' })).toHaveValue('');
  });

  it('marks unresolved subclass and bounded choices invalid, then removes their errors after selection', async () => {
    startManual();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Explicit Ranger' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Gender' }), { target: { value: 'Other' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: 'half-orc' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'ranger' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    const subclass = screen.getByRole('combobox', { name: 'Subclass' });
    expect(subclass).toHaveAttribute('aria-invalid', 'true');
    expect(subclass).toHaveAccessibleDescription('Choose a subclass for this Class level.');
    await waitFor(() => expect(subclass).toHaveFocus());
    fireEvent.change(subclass, { target: { value: 'hunter' } });
    expect(subclass).toHaveAttribute('aria-invalid', 'false');
    expect(subclass).not.toHaveAttribute('aria-describedby');
  });

  it('shows no canonical HP gains or spell automation for a level-5 Other Class', () => {
    startManual();
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'manual' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '5' } });
    expect(screen.queryByLabelText('Level 2 HP method')).not.toBeInTheDocument();
    expect(screen.getByText('Manual Class spellcasting is outside the approved V2 contract.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Other Class requires a maximum HP override and reason.');
  });

  it('exposes bounded Other identity fields and requires their explicit calculation fallbacks', () => {
    startManual();
    fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: 'manual' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'manual' } });
    expect(screen.getByRole('textbox', { name: 'Other Race name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Other Class name' })).toBeInTheDocument();
    expect(within(screen.getByRole('combobox', { name: 'Subclass' })).getAllByRole('option').map((option) => option.textContent)).toEqual(['No subclass', 'Other']);
    fireEvent.change(screen.getByRole('combobox', { name: 'Subclass' }), { target: { value: 'manual' } });
    expect(screen.getByRole('textbox', { name: 'Other Subclass name' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Other Race name is required.');
    expect(screen.getByRole('alert')).toHaveTextContent('Other Class name is required.');
    expect(screen.getByRole('alert')).toHaveTextContent('Other Race requires a Speed override and reason.');
    expect(screen.getByRole('alert')).toHaveTextContent('Other Class requires a maximum HP override and reason.');
  });

  it('focuses the visible Speed override checkbox for an Other Race', async () => {
    startManual();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Manual Race' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Gender' }), { target: { value: 'Other' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: 'manual' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Other Race name' }), { target: { value: 'Sky Folk' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'fighter' } });
    const style = screen.getByRole('listbox', { name: 'Fighter Fighting Style (choose 1)' }) as HTMLSelectElement;
    style.options[0].selected = true;
    fireEvent.change(style);

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    const speedToggle = within(screen.getByRole('group', { name: 'Speed override' })).getByRole('checkbox', { name: 'Use override' });
    await waitFor(() => expect(speedToggle).toHaveFocus());
    expect(speedToggle).toHaveAttribute('aria-invalid', 'true');
    expect(speedToggle).toHaveAccessibleDescription('Other Race requires a Speed override and reason.');
    const summaryLink = screen.getByRole('alert').querySelector<HTMLAnchorElement>(`a[href="#${speedToggle.id}"]`);
    expect(summaryLink).toBeTruthy();
    speedToggle.blur();
    fireEvent.click(summaryLink!);
    expect(speedToggle).toHaveFocus();
  });

  it('focuses the visible maximum HP override checkbox for an Other Class', async () => {
    startManual();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Manual Class' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Gender' }), { target: { value: 'Other' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: 'human' } });
    const language = screen.getByRole('listbox', { name: 'Human Extra Language (choose 1)' }) as HTMLSelectElement;
    language.options[0].selected = true;
    fireEvent.change(language);
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'manual' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Other Class name' }), { target: { value: 'Warden' } });

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    const maximumToggle = within(screen.getByRole('group', { name: 'Maximum HP override' })).getByRole('checkbox', { name: 'Use override' });
    await waitFor(() => expect(maximumToggle).toHaveFocus());
    expect(maximumToggle).toHaveAttribute('aria-invalid', 'true');
    expect(maximumToggle).toHaveAccessibleDescription('Other Class requires a maximum HP override and reason.');
    expect(screen.getByRole('alert').querySelector(`a[href="#${maximumToggle.id}"]`)).toBeTruthy();
  });

  it('orders combined Other Class and Other Race fallback errors by document order', async () => {
    startManual();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Manual Both' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Gender' }), { target: { value: 'Other' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: 'manual' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Other Race name' }), { target: { value: 'Sky Folk' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'manual' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Other Class name' }), { target: { value: 'Warden' } });

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    const maximumToggle = within(screen.getByRole('group', { name: 'Maximum HP override' })).getByRole('checkbox', { name: 'Use override' });
    const speedToggle = within(screen.getByRole('group', { name: 'Speed override' })).getByRole('checkbox', { name: 'Use override' });
    await waitFor(() => expect(maximumToggle).toHaveFocus());
    const fallbackLinks = within(screen.getByRole('alert')).getAllByRole('link')
      .filter((link) => /Other (Class|Race) requires/.test(link.textContent ?? ''));
    expect(fallbackLinks.map((link) => link.getAttribute('href'))).toEqual([
      `#${maximumToggle.id}`,
      `#${speedToggle.id}`,
    ]);
  });

  it('focuses enabled override values before their visible reasons', async () => {
    startManual();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Manual Both' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Gender' }), { target: { value: 'Other' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: 'manual' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Other Race name' }), { target: { value: 'Sky Folk' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'manual' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Other Class name' }), { target: { value: 'Warden' } });
    const maximumGroup = screen.getByRole('group', { name: 'Maximum HP override' });
    const speedGroup = screen.getByRole('group', { name: 'Speed override' });
    fireEvent.click(within(maximumGroup).getByRole('checkbox', { name: 'Use override' }));
    fireEvent.click(within(speedGroup).getByRole('checkbox', { name: 'Use override' }));
    fireEvent.change(within(maximumGroup).getByRole('spinbutton', { name: 'Maximum HP override value' }), { target: { value: '0' } });
    fireEvent.change(within(speedGroup).getByRole('spinbutton', { name: 'Speed override value' }), { target: { value: '1001' } });

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    const maximumValue = within(maximumGroup).getByRole('spinbutton', { name: 'Maximum HP override value' });
    await waitFor(() => expect(maximumValue).toHaveFocus());
    expect(maximumValue).toHaveAccessibleDescription('Maximum HP override must be between 1 and 9999.');
    fireEvent.change(maximumValue, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));
    await waitFor(() => expect(within(maximumGroup).getByRole('textbox', { name: 'Maximum HP override reason' })).toHaveFocus());

    fireEvent.change(within(maximumGroup).getByRole('textbox', { name: 'Maximum HP override reason' }), { target: { value: 'Transferred maximum.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));
    const speedValue = within(speedGroup).getByRole('spinbutton', { name: 'Speed override value' });
    await waitFor(() => expect(speedValue).toHaveFocus());
    expect(speedValue).toHaveAccessibleDescription('Speed override must be between 0 and 1000.');
    fireEvent.change(speedValue, { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));
    await waitFor(() => expect(within(speedGroup).getByRole('textbox', { name: 'Speed override reason' })).toHaveFocus());
  });

  it('summarizes validation, scrolls, and focuses the first invalid field', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    startManual();
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required.');
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus());
    expect(scrollIntoView).toHaveBeenCalledOnce();
  });

  it('focuses the first invalid structured field in rendered document order', async () => {
    startManual();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Seren Ashfall' } });

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Gender' })).toHaveFocus());
    expect(screen.getByRole('alert')).toHaveTextContent('Gender is required.');
  });

  it('focuses blank manual Race and its exact summary target', async () => {
    startManual();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Unresolved Race' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Gender' }), { target: { value: 'Other' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    const race = screen.getByRole('combobox', { name: 'Race' });
    await waitFor(() => expect(race).toHaveFocus());
    expect(race).toHaveAttribute('aria-invalid', 'true');
    expect(race).toHaveAccessibleDescription('Race is required.');
    const link = screen.getByRole('link', { name: 'Race is required.' });
    expect(link).toHaveAttribute('href', `#${race.id}`);
    race.blur();
    fireEvent.click(link);
    expect(race).toHaveFocus();
  });

  it('focuses blank manual Class after Race is explicit', async () => {
    startManual();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Unresolved Class' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Gender' }), { target: { value: 'Other' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: 'half-orc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    const selectedClass = screen.getByRole('combobox', { name: 'Class' });
    await waitFor(() => expect(selectedClass).toHaveFocus());
    expect(selectedClass).toHaveAccessibleDescription('Class is required.');
    expect(screen.getByRole('link', { name: 'Class is required.' })).toHaveAttribute('href', `#${selectedClass.id}`);
  });

  it('everyValidationSummaryLinkTargetsAVisibleInvalidControl', async () => {
    startManual();
    completeManualBasics();
    fireEvent.click(screen.getByRole('button', { name: 'Add attack' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Attack attack-1 damage dice 1/ }), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Attack attack-1 damage type 1/ }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add manual feature' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Other equipment' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Equipment 1 quantity' }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Other entry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    const links = within(screen.getByRole('alert')).getAllByRole('link');
    expect(links.length).toBeGreaterThan(8);
    for (const link of links) {
      const target = document.querySelector<HTMLElement>(link.getAttribute('href')!);
      expect(target, link.textContent ?? '').not.toBeNull();
      expect(target, link.textContent ?? '').toBeVisible();
      expect(target, link.textContent ?? '').toHaveAttribute('aria-invalid', 'true');
      const descriptionID = target!.getAttribute('aria-describedby');
      expect(descriptionID, link.textContent ?? '').toBeTruthy();
      expect(document.getElementById(descriptionID!), link.textContent ?? '').toBeVisible();
      target!.blur();
      fireEvent.click(link);
      expect(target, link.textContent ?? '').toHaveFocus();
    }
  });

  it('clears selected defense after equipment is unequipped and focuses the required armor control', async () => {
    startQuiz();
    finishStrengthQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Use Strength melee Fighter' }));
    completeGuidedDecisions();
    fireEvent.change(screen.getByRole('combobox', { name: 'Gender' }), { target: { value: 'Other' } });
    fireEvent.click(within(screen.getByRole('group', { name: 'Chain Mail' })).getByRole('checkbox', { name: 'Equipped' }));

    const armor = screen.getByRole('combobox', { name: 'Armor' });
    expect(armor).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));
    await waitFor(() => expect(armor).toHaveFocus());
    expect(armor).toHaveAccessibleDescription('Choose canonical armor.');
    expect(screen.getByRole('link', { name: 'Choose canonical armor.' })).toHaveAttribute('href', `#${armor.id}`);
    expect(screen.queryByRole('group', { name: 'Chain Mail' })).not.toBeInTheDocument();
  });

  it('preserves deliberate overrides across compatible downstream changes and resets imported abilities', () => {
    startManual();
    const maximumGroup = screen.getByRole('group', { name: 'Maximum HP override' });
    fireEvent.click(within(maximumGroup).getByLabelText('Use override'));
    fireEvent.change(within(maximumGroup).getByRole('spinbutton', { name: 'Maximum HP override value' }), { target: { value: '24' } });
    fireEvent.change(within(maximumGroup).getByRole('textbox', { name: 'Maximum HP override reason' }), { target: { value: 'Paper sheet total' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'ranger' } });
    expect(within(maximumGroup).getByRole('spinbutton', { name: 'Maximum HP override value' })).toHaveValue(24);
    expect(within(maximumGroup).getByRole('textbox', { name: 'Maximum HP override reason' })).toHaveValue('Paper sheet total');

    fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: 'human' } });
    const language = screen.getByRole('listbox', { name: 'Human Extra Language (choose 1)' }) as HTMLSelectElement;
    const elvish = [...language.options].find((option) => option.value === 'elvish');
    if (elvish) elvish.selected = true;
    fireEvent.change(language);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Strength' }), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset to calculated' }));
    expect(screen.getByLabelText('Calculated base scores')).toBeChecked();
    expect(screen.getByRole('spinbutton', { name: 'Strength' })).toHaveValue(15);
  });

  it('supports repeatable attacks, manual features, canonical and Other equipment, and Other entries', () => {
    startManual();
    fireEvent.click(screen.getByRole('button', { name: 'Add attack' }));
    expect(screen.getByRole('textbox', { name: /Attack attack-1 name/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add manual feature' }));
    expect(screen.getByRole('textbox', { name: 'Manual feature 1 description' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'SRD equipment' }), { target: { value: 'backpack' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add equipment' }));
    expect(screen.getByRole('group', { name: 'Backpack' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Other equipment' }));
    expect(screen.getByRole('textbox', { name: 'Other equipment 2 name' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Other entry' }));
    expect(screen.getByRole('textbox', { name: 'Other 1 description' })).toBeInTheDocument();
  });

  it('renders repeated Cleric Domain Spells with stable canonical feature identities', () => {
    startManual();
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'cleric' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '3' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Subclass' }), { target: { value: 'life' } });
    expect(screen.getAllByText('Domain Spells', { selector: '.canonical-list li' })).toHaveLength(2);
  });

  it('renders canonical feature lists without duplicate-key warnings for every Class through level five', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    startManual();
    const classSelect = screen.getByRole('combobox', { name: 'Class' }) as HTMLSelectElement;
    const classes = [...classSelect.options].map((option) => option.value).filter((value) => value !== 'manual');
    for (const classIndex of classes) {
      fireEvent.change(classSelect, { target: { value: classIndex } });
      for (let level = 1; level <= 5; level += 1) {
        fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: String(level) } });
        const subclass = screen.queryByRole('combobox', { name: 'Subclass' }) as HTMLSelectElement | null;
        const firstSubclass = subclass ? [...subclass.options].find((option) => option.value !== '') : undefined;
        if (subclass && firstSubclass) fireEvent.change(subclass, { target: { value: firstSubclass.value } });
      }
    }
    const duplicateKeyWarnings = consoleError.mock.calls.filter((arguments_) => arguments_.some((value) => String(value).includes('same key')));
    consoleError.mockRestore();
    expect(duplicateKeyWarnings).toEqual([]);
  });

  it('shows a structured attack and complete manual feature details on review', () => {
    startManual();
    completeManualBasics();
    fireEvent.click(screen.getByRole('button', { name: 'Add attack' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Attack attack-1 name' }), { target: { value: 'Training strike' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add manual feature' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Manual feature 1 name' }), { target: { value: 'Field Notes' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Manual feature 1 category' }), { target: { value: 'Character note' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Manual feature 1 description' }), { target: { value: 'Ask the GM when this knowledge applies.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    expect(screen.getByText('Training strike: +4 to hit')).toBeInTheDocument();
    expect(screen.getByText('Field Notes [Character note]: Ask the GM when this knowledge applies. (imported)')).toBeInTheDocument();
  });

  it('filters canonical spells by Class and level and shows full local metadata', () => {
    startManual();
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'wizard' } });
    expect(screen.getAllByRole('button', { name: 'Add imported spell' })).toHaveLength(2);
    const slotOverride = screen.getByRole('group', { name: 'Level 1 slot override' });
    fireEvent.click(within(slotOverride).getByLabelText('Use override'));
    expect(within(slotOverride).getByRole('spinbutton', { name: 'Level 1 slot maximum' })).toHaveValue(2);
    fireEvent.change(within(slotOverride).getByRole('textbox', { name: 'Level 1 slot override reason' }), { target: { value: 'Imported slot total' } });
    const spellSelect = screen.getByRole('listbox', { name: 'Initial spellbook (choose exactly 6 level 1 spells)' });
    expect(within(spellSelect).getByRole('option', { name: /Magic Missile/ })).toBeInTheDocument();
    expect(within(spellSelect).queryByRole('option', { name: /Fireball/ })).not.toBeInTheDocument();
    (within(spellSelect).getByRole('option', { name: /Magic Missile/ }) as HTMLOptionElement).selected = true;
    fireEvent.change(spellSelect);
    expect(screen.getByRole('group', { name: /Magic Missile/ })).toHaveTextContent('1 · evocation');
    expect(screen.getByRole('group', { name: /Magic Missile/ })).toHaveTextContent('1 action');
    expect(screen.getByRole('group', { name: /Magic Missile/ })).toHaveTextContent('120 feet');
    fireEvent.click(within(screen.getByRole('group', { name: 'Initial spellbook (choose exactly 6 level 1 spells)' })).getByRole('button', { name: 'Add imported spell' }));
    expect(screen.getByRole('textbox', { name: 'Spell manual-spell-1 description' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Spell manual-spell-1 higher-level text' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Spell manual-spell-1 import reason' })).toBeInTheDocument();
  });

  it('renders canonical mode-specific spell decisions without a client-selected final state', () => {
    startManual();
    const classSelect = screen.getByRole('combobox', { name: 'Class' });
    const levelSelect = screen.getByRole('combobox', { name: 'Level' });

    fireEvent.change(classSelect, { target: { value: 'wizard' } });
    fireEvent.change(levelSelect, { target: { value: '3' } });
    expect(screen.getByRole('group', { name: 'Initial spellbook (choose exactly 6 level 1 spells)' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Class level 2 spellbook additions (choose exactly 2)' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Class level 3 spellbook additions (choose exactly 2)' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Spell state' })).not.toBeInTheDocument();

    fireEvent.change(classSelect, { target: { value: 'bard' } });
    fireEvent.change(levelSelect, { target: { value: '2' } });
    expect(screen.getByRole('group', { name: 'Class level 1 spell decisions' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Class level 2 spell decisions' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Replace one previously known spell' })).toBeInTheDocument();

    fireEvent.change(classSelect, { target: { value: 'cleric' } });
    expect(screen.getByRole('group', { name: /Prepared spells.*abilityModifier.*classLevel/ })).toBeInTheDocument();
  });

  it('excludes automatic Life spells and preserves Fiend expanded spell options', () => {
    startManual();
    const classSelect = screen.getByRole('combobox', { name: 'Class' });
    fireEvent.change(classSelect, { target: { value: 'cleric' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Subclass' }), { target: { value: 'life' } });
    const prepared = screen.getByRole('listbox', { name: /Prepared spells/ });
    expect(within(prepared).queryByRole('option', { name: /Bless/ })).not.toBeInTheDocument();
    expect(within(prepared).queryByRole('option', { name: /Cure Wounds/ })).not.toBeInTheDocument();
    expect(within(prepared).getByRole('option', { name: /Guiding Bolt/ })).toBeInTheDocument();

    fireEvent.change(classSelect, { target: { value: 'warlock' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Subclass' }), { target: { value: 'fiend' } });
    const learned = screen.getByRole('listbox', { name: 'Learned spells (choose exactly 2)' });
    expect(within(learned).getByRole('option', { name: /Burning Hands/ })).toBeInTheDocument();
    expect(within(learned).getByRole('option', { name: /Command/ })).toBeInTheDocument();
  });

  it('focusesIncompleteWizardInitialSpellbookControl', async () => {
    startManual();
    completeManualBasics();
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'wizard' } });
    const cantrips = screen.getByRole('listbox', { name: 'Cantrips (choose exactly 3)' }) as HTMLSelectElement;
    [...cantrips.options].slice(0, 3).forEach((option) => { option.selected = true; });
    fireEvent.change(cantrips);

    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    const initial = screen.getByRole('listbox', { name: 'Initial spellbook (choose exactly 6 level 1 spells)' });
    await waitFor(() => expect(initial).toHaveFocus());
    expect(initial).toHaveAttribute('aria-invalid', 'true');
    const errorID = initial.getAttribute('aria-describedby');
    expect(errorID).toBeTruthy();
    expect(document.getElementById(errorID!)).toHaveTextContent('Choose exactly 6 initial spellbook spells.');
    expect(screen.getByRole('alert').querySelector(`a[href="#${initial.id}"]`)).toBeTruthy();
  });

  it('doesNotRenderCantripSelectorWhenRequiredCountIsZero', () => {
    startManual();
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'ranger' } });

    for (const level of [1, 2, 3, 4, 5]) {
      fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: String(level) } });
      expect(screen.queryByRole('listbox', { name: /Cantrips \(choose exactly 0\)/ })).not.toBeInTheDocument();
      expect(screen.queryByText('Cantrips (choose exactly 0)')).not.toBeInTheDocument();
    }
  });

  it('omitsEveryZeroChoiceSpellBucketFromTheKeyboardTabOrder', () => {
    startManual();
    const classControl = screen.getByRole('combobox', { name: 'Class' });
    const levelControl = screen.getByRole('combobox', { name: 'Level' });

    for (const classIndex of ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard']) {
      fireEvent.change(classControl, { target: { value: classIndex } });
      for (const level of [1, 2, 3, 4, 5]) {
        fireEvent.change(levelControl, { target: { value: String(level) } });
        expect(screen.queryByRole('listbox', { name: /choose exactly 0/i })).not.toBeInTheDocument();
        expect([...document.querySelectorAll('select[multiple]')].every((control) => control.querySelectorAll('option').length > 0)).toBe(true);
        expect([...document.querySelectorAll<HTMLElement>('select, input, button, textarea, a[href]')]
          .filter((control) => control.tabIndex >= 0)
          .some((control) => /choose exactly 0/i.test(control.getAttribute('aria-label') ?? ''))).toBe(false);
      }
    }
  });

  it('focusesInvalidReplacementInDocumentOrder', async () => {
    startManual();
    completeManualBasics();
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'bard' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '2' } });
    const cantrips = screen.getByRole('listbox', { name: 'Cantrips (choose exactly 2)' }) as HTMLSelectElement;
    [...cantrips.options].slice(0, 2).forEach((option) => { option.selected = true; });
    fireEvent.change(cantrips);
    for (const [label, count] of [['Learned spells (choose exactly 4)', 4], ['Learned spells (choose exactly 1)', 1]] as const) {
      const bucket = screen.getByRole('listbox', { name: label }) as HTMLSelectElement;
      [...bucket.options].slice(0, count).forEach((option) => { option.selected = true; });
      fireEvent.change(bucket);
    }
    fireEvent.click(screen.getByRole('checkbox', { name: 'Replace one previously known spell' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    const replacement = screen.getByRole('combobox', { name: 'Level 2 replacement spell' });
    await waitFor(() => expect(replacement).toHaveFocus());
    expect(replacement).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert').querySelector(`a[href="#${replacement.id}"]`)).toBeTruthy();
  });

  it('doesNotOfferRemovedSpellAsItsOwnReplacement', () => {
    startManual();
    completeManualBasics();
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'bard' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '2' } });
    const cantrips = screen.getByRole('listbox', { name: 'Cantrips (choose exactly 2)' }) as HTMLSelectElement;
    [...cantrips.options].slice(0, 2).forEach((option) => { option.selected = true; });
    fireEvent.change(cantrips);
    const learned = screen.getAllByRole('listbox', { name: /Learned spells/ }) as HTMLSelectElement[];
    [4, 1].forEach((count, index) => {
      [...learned[index].options].slice(0, count).forEach((option) => { option.selected = true; });
      fireEvent.change(learned[index]);
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Replace one previously known spell' }));

    const removal = screen.getByRole('combobox', { name: 'Level 2 spell to replace' }) as HTMLSelectElement;
    const replacement = screen.getByRole('combobox', { name: 'Level 2 replacement spell' }) as HTMLSelectElement;
    const removedIndex = removal.value.replace(/^spell-/, '');
    const remainingKnownIndexes = learned.flatMap((bucket) => [...bucket.selectedOptions].map((option) => option.value));

    expect([...replacement.options].map((option) => option.value)).not.toContain(removedIndex);
    remainingKnownIndexes.forEach((index) => expect([...replacement.options].map((option) => option.value)).not.toContain(index));
  });

  it('focusesSameSpellReplacementIfMalformedStateIsRestored', async () => {
    startManual();
    completeManualBasics();
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'bard' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '2' } });
    const cantrips = screen.getByRole('listbox', { name: 'Cantrips (choose exactly 2)' }) as HTMLSelectElement;
    [...cantrips.options].slice(0, 2).forEach((option) => { option.selected = true; });
    fireEvent.change(cantrips);
    const learned = screen.getAllByRole('listbox', { name: /Learned spells/ }) as HTMLSelectElement[];
    [4, 1].forEach((count, index) => {
      [...learned[index].options].slice(0, count).forEach((option) => { option.selected = true; });
      fireEvent.change(learned[index]);
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Replace one previously known spell' }));
    const removal = screen.getByRole('combobox', { name: 'Level 2 spell to replace' }) as HTMLSelectElement;
    const replacement = screen.getByRole('combobox', { name: 'Level 2 replacement spell' }) as HTMLSelectElement;
    const restored = document.createElement('option');
    restored.value = removal.value.replace(/^spell-/, '');
    restored.textContent = 'Malformed restored replacement';
    replacement.append(restored);
    fireEvent.change(replacement, { target: { value: restored.value } });
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    await waitFor(() => expect(replacement).toHaveFocus());
    expect(replacement).toHaveAttribute('aria-invalid', 'true');
    expect(replacement).toHaveAccessibleDescription('Replacement spell must be different from the removed spell.');
    expect(screen.getByRole('alert').querySelector(`a[href="#${replacement.id}"]`)).toHaveTextContent('Replacement spell must be different from the removed spell.');
  });

  it('tracksReplacementResultAsNextLevelRemovalSource', () => {
    startManual();
    completeManualBasics();
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'bard' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '3' } });
    const learned = screen.getAllByRole('listbox', { name: /Learned spells/ }) as HTMLSelectElement[];
    [4, 1, 1].forEach((count, index) => {
      [...learned[index].options].slice(index * 4, index * 4 + count).forEach((option) => { option.selected = true; });
      fireEvent.change(learned[index]);
    });
    const replacements = screen.getAllByRole('checkbox', { name: 'Replace one previously known spell' });
    fireEvent.click(replacements[0]);
    const level2Replacement = screen.getByRole('combobox', { name: 'Level 2 replacement spell' }) as HTMLSelectElement;
    const learnedIDs = new Set(learned.flatMap((bucket) => [...bucket.selectedOptions].map((option) => option.value)));
    const replacementOption = [...level2Replacement.options].find((option) => option.value && !learnedIDs.has(option.value));
    if (!replacementOption) throw new Error('No distinct replacement fixture was available');
    fireEvent.change(level2Replacement, { target: { value: replacementOption.value } });
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Replace one previously known spell' })[1]);

    const level3Removal = screen.getByRole('combobox', { name: 'Level 3 spell to replace' });
    expect(within(level3Removal).getByRole('option', { name: `spell-${replacementOption.value}` })).toBeInTheDocument();
    const level3Replacement = screen.getByRole('combobox', { name: 'Level 3 replacement spell' }) as HTMLSelectElement;
    expect([...level3Replacement.options].map((option) => option.value)).not.toContain(replacementOption.value);
    const level3RemovedIndex = (level3Removal as HTMLSelectElement).value.replace(/^spell-/, '');
    expect([...level3Replacement.options].map((option) => option.value)).not.toContain(level3RemovedIndex);
  });

  it('mapsManualSpellErrorsByStableSpellIdAcrossBuckets', () => {
    startManual();
    completeManualBasics();
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'wizard' } });
    const groups = [
      screen.getByRole('group', { name: 'Cantrips (choose exactly 3)' }),
      screen.getByRole('group', { name: 'Initial spellbook (choose exactly 6 level 1 spells)' }),
    ];
    groups.forEach((group) => fireEvent.click(within(group).getByRole('button', { name: 'Add imported spell' })));
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    const cantripName = screen.getByRole('textbox', { name: 'Spell manual-spell-1 name' });
    const spellbookName = screen.getByRole('textbox', { name: 'Spell manual-spell-2 name' });
    expect(cantripName.id).toContain('cantrips-spell-manual-spell-1-name');
    expect(spellbookName.id).toContain('spellbook-initial-spell-manual-spell-2-name');
    expect(screen.getByRole('alert').querySelector(`a[href="#${cantripName.id}"]`)).toBeTruthy();
    expect(screen.getByRole('alert').querySelector(`a[href="#${spellbookName.id}"]`)).toBeTruthy();
  });

  it('groups the ability score mode semantically and uses one restrained editor status region', () => {
    startManual();
    expect(screen.getByRole('group', { name: 'Ability score source' })).toBeInTheDocument();
    const liveRegions = document.querySelectorAll('[aria-live]');
    expect(liveRegions).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
  });

  it('announces bounded spell, equipment, override, and subclass changes without announcing text entry', async () => {
    startManual();
    const status = screen.getByRole('status');
    const maximumGroup = screen.getByRole('group', { name: 'Maximum HP override' });
    fireEvent.click(within(maximumGroup).getByLabelText('Use override'));
    expect(status).toHaveTextContent('Maximum HP override activated.');
    fireEvent.change(within(maximumGroup).getByRole('spinbutton', { name: 'Maximum HP override value' }), { target: { value: '20' } });
    expect(status).toHaveTextContent('Maximum HP override activated.');

    fireEvent.change(screen.getByRole('combobox', { name: 'SRD equipment' }), { target: { value: 'backpack' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add equipment' }));
    expect(status).toHaveTextContent('Backpack added to equipment.');

    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'wizard' } });
    await waitFor(() => expect(status).toHaveTextContent(/No Subclass selection is available at level 1/));
    const initial = screen.getByRole('listbox', { name: 'Initial spellbook (choose exactly 6 level 1 spells)' }) as HTMLSelectElement;
    const magicMissile = [...initial.options].find((option) => option.value === 'magic-missile');
    if (magicMissile) magicMissile.selected = true;
    fireEvent.change(initial);
    expect(status).toHaveTextContent('1 spell added from Initial spellbook');
  });

  it('filters invocation prerequisites and announces stale Pact selections', async () => {
    startManual();
    fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: 'half-orc' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'warlock' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '5' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Subclass' }), { target: { value: 'fiend' } });
    const invocations = screen.getByRole('listbox', { name: 'Warlock Eldritch Invocations (choose 3)' }) as HTMLSelectElement;
    const pact = screen.getByRole('listbox', { name: 'Warlock Pact Boon (choose 1)' }) as HTMLSelectElement;
    expect(within(invocations).queryByRole('option', { name: 'Eldritch Invocation: Thirsting Blade' })).not.toBeInTheDocument();
    ([...pact.options].find((option) => option.value === 'pact-of-the-blade') as HTMLOptionElement).selected = true;
    fireEvent.change(pact);
    const thirsting = within(invocations).getByRole('option', { name: 'Eldritch Invocation: Thirsting Blade' }) as HTMLOptionElement;
    const devil = within(invocations).getByRole('option', { name: "Eldritch Invocation: Devil's Sight" }) as HTMLOptionElement;
    const armor = within(invocations).getByRole('option', { name: 'Eldritch Invocation: Armor of Shadows' }) as HTMLOptionElement;
    thirsting.selected = true;
    devil.selected = true;
    armor.selected = true;
    fireEvent.change(invocations);
    [...pact.options].forEach((option) => { option.selected = option.value === 'pact-of-the-chain'; });
    fireEvent.change(pact);

    expect(invocations).toHaveValue(['eldritch-invocation-armor-of-shadows', 'eldritch-invocation-devils-sight']);
    expect(within(invocations).queryByRole('option', { name: 'Eldritch Invocation: Thirsting Blade' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2 unavailable Class choice selections removed.'));
  });

  it('announces removal of an unavailable manual spell after level reduction', async () => {
    startManual();
    fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: 'half-orc' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Class' }), { target: { value: 'wizard' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '5' } });
    const levelFive = screen.getByRole('group', { name: 'Class level 5 spellbook additions (choose exactly 2)' });
    fireEvent.click(within(levelFive).getByRole('button', { name: 'Add imported spell' }));
    fireEvent.change(within(levelFive).getByRole('spinbutton', { name: /Spell manual-spell-1 level/ }), { target: { value: '3' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: '1' } });

    expect(screen.queryByRole('group', { name: 'Class level 5 spellbook additions (choose exactly 2)' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 unavailable spell selection removed.'));
  });

  it('keeps the guided quiz and converts its Fighter result into an editable structured draft', () => {
    startQuiz();
    finishStrengthQuiz();
    expect(screen.getByRole('heading', { name: 'Strength melee Fighter' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use Strength melee Fighter' }));
    expect(screen.getByRole('heading', { name: 'Build your structured character.' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Aldren Vale');
    expect(screen.getByRole('combobox', { name: 'Class' })).toHaveValue('fighter');
    expect(screen.getByRole('combobox', { name: 'Race' })).toHaveValue('human');
    expect(screen.getByRole('listbox', { name: 'Human Extra Language (choose 1)' })).toHaveValue([]);
    expect(screen.getByRole('listbox', { name: 'Fighter Fighting Style (choose 1)' })).toHaveValue([]);
    completeGuidedDecisions();
    expect(screen.getByText('19')).toBeInTheDocument();
  });

  it('shows five guided questions with four answers and advances through every step', () => {
    startQuiz();

    for (let questionNumber = 1; questionNumber <= 5; questionNumber += 1) {
      expect(screen.getByText(`Question ${questionNumber} of 5`)).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(4);
      if (questionNumber < 5) {
        fireEvent.click(screen.getAllByRole('radio')[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      }
    }
  });

  it('uses native keyboard-focusable radios with accessible progress and non-redundant selection', () => {
    startQuiz();
    const question = screen.getByRole('group', { name: /Danger appears/ });
    const answer = screen.getByRole('radio', { name: /Stand in front and take the pressure/ });
    const next = screen.getByRole('button', { name: 'Next' });

    expect(question).toHaveAccessibleDescription('Question 1 of 5');
    expect(answer).toHaveAttribute('type', 'radio');
    answer.focus();
    expect(answer).toHaveFocus();
    expect(next).toBeDisabled();
    fireEvent.click(answer);

    expect(answer).toBeChecked();
    expect(answer.closest('.creation-answer-card')).toHaveAttribute('data-selected', 'true');
    expect(screen.queryByText('Selected')).not.toBeInTheDocument();
    expect(next).toBeEnabled();
  });

  it('supports Next, Back, retained answers, and changing an earlier answer', () => {
    startQuiz();
    fireEvent.click(screen.getByRole('radio', { name: /Stand in front and take the pressure/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();

    goBackWithinQuiz();
    expect(screen.getByRole('radio', { name: /Stand in front and take the pressure/ })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: /Find a clean shot from a safer angle/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    goBackWithinQuiz();

    expect(screen.getByRole('radio', { name: /Find a clean shot from a safer angle/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Stand in front and take the pressure/ })).not.toBeChecked();
  });

  it('does not expose internal build labels or scoring mappings while answering', () => {
    startQuiz();

    for (let questionNumber = 1; questionNumber <= 5; questionNumber += 1) {
      expect(screen.queryByText('Strength melee Fighter')).not.toBeInTheDocument();
      expect(screen.queryByText('Dexterity archer Fighter')).not.toBeInTheDocument();
      expect(screen.queryByText('strengthMelee')).not.toBeInTheDocument();
      expect(screen.queryByText('futureMagic')).not.toBeInTheDocument();
      if (questionNumber < 5) {
        fireEvent.click(screen.getAllByRole('radio')[1]);
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      }
    }
  });

  it('preserves the Strength melee Fighter recommendation outcome', () => {
    startQuiz();
    finishStrengthQuiz();

    expect(screen.getByRole('heading', { name: 'Strength melee Fighter' })).toBeInTheDocument();
    expect(screen.getByText(/Your closest supported match is a Strength melee Fighter/)).toBeInTheDocument();
  });

  it('preserves the Dexterity archer Fighter recommendation outcome', () => {
    startQuiz();
    finishDexterityQuiz();

    expect(screen.getByRole('heading', { name: 'Dexterity archer Fighter' })).toBeInTheDocument();
    expect(screen.getByText(/Your closest supported match is a Dexterity archer Fighter/)).toBeInTheDocument();
  });

  it('keeps honest fallback messaging for unsupported fantasy answers', () => {
    startQuiz();
    finishQuiz([
      /Reach for impossible power or a strange sign/,
      /In the middle of the plan/,
      /Patch them up or keep them standing/,
      /Use a spell, omen, or impossible shortcut/,
      /Reality bent just enough to save the day/,
    ]);

    expect(screen.getByRole('heading', { name: 'Dexterity archer Fighter' })).toBeInTheDocument();
    expect(screen.getByText(/This first version does not build spellcasters yet/)).toBeInTheDocument();
  });

  it('allows manual override to the other supported recommendation', () => {
    startQuiz();
    finishDexterityQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Choose Strength melee Fighter' }));

    expect(screen.getByRole('heading', { name: 'Build your structured character.' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Class' })).toHaveValue('fighter');
    expect(screen.getByRole('combobox', { name: 'Race' })).toHaveValue('human');
    completeGuidedDecisions();
    expect(screen.getByText('19')).toBeInTheDocument();
  });

  it('returns from a recommendation to the final answered question', () => {
    startQuiz();
    finishStrengthQuiz();
    goBackWithinQuiz();

    expect(screen.getByText('Question 5 of 5')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Everyone is safe because you held the line/ })).toBeChecked();
  });

  it('reviews guided V2 details and returns to the populated editor', () => {
    startQuiz();
    finishStrengthQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Use Strength melee Fighter' }));
    completeGuidedDecisions();
    fireEvent.change(screen.getByRole('combobox', { name: 'Gender' }), { target: { value: 'Female' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    expect(screen.getByRole('heading', { name: 'Review structured character.' })).toBeInTheDocument();
    expect(screen.getByText(/Aldren Vale/)).toBeInTheDocument();
    expect(screen.getByText(/Human Fighter/)).toBeInTheDocument();
    expect(screen.getByText(/New characters start at full HP/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to edit' }));

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Aldren Vale');
    expect(screen.getByRole('combobox', { name: 'Gender' })).toHaveValue('Female');
  });

  it('keeps guided signed-out review private and routes only through auth actions', () => {
    const onSignIn = vi.fn();
    const onCreateAccount = vi.fn();
    startQuiz({ onSignIn, onCreateAccount });
    finishStrengthQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Use Strength melee Fighter' }));
    completeGuidedDecisions();
    fireEvent.change(screen.getByRole('combobox', { name: 'Gender' }), { target: { value: 'Female' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));

    expect(screen.queryByRole('button', { name: 'Save character' })).not.toBeInTheDocument();
    expect(screen.getByText(/Sign in to save this character/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(onSignIn).toHaveBeenCalledOnce();
    expect(onCreateAccount).toHaveBeenCalledOnce();
    expect(createCharacterMock).not.toHaveBeenCalled();
  });

  it('saves a guided V2 request and opens the returned ordinary Character Reference', async () => {
    const onOpenCharacterReference = vi.fn();
    createCharacterMock.mockResolvedValue({ id: 'guided-v2' } as never);
    startQuiz({ isSignedIn: true, onOpenCharacterReference });
    finishStrengthQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Use Strength melee Fighter' }));
    completeGuidedDecisions();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Branna Shieldhand' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Gender' }), { target: { value: 'Female' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review character' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));

    await waitFor(() => expect(createCharacterMock).toHaveBeenCalledOnce());
    expect(createCharacterMock.mock.calls[0][0]).toMatchObject({
      schemaVersion: 'CharacterSheetV2',
      creationSource: 'guided',
      identity: {
        name: 'Branna Shieldhand',
        gender: 'Female',
        race: { source: 'srd', index: 'human' },
        class: { source: 'srd', index: 'fighter' },
      },
    });
    await waitFor(() => expect(onOpenCharacterReference).toHaveBeenCalledWith('guided-v2'));
  });

  it('builds and saves the exact versioned V2 request without client-authoritative result fields', async () => {
    const onOpenCharacterReference = vi.fn();
    createCharacterMock.mockResolvedValue({ id: 'character-v2' } as never);
    reviewManual({ isSignedIn: true, onOpenCharacterReference });
    expect(screen.getByRole('heading', { name: 'Review structured character.' })).toBeInTheDocument();
    expect(screen.getByText(/New characters start at full HP/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));

    await waitFor(() => expect(createCharacterMock).toHaveBeenCalledTimes(1));
    const request = createCharacterMock.mock.calls[0][0];
    expect(request).toMatchObject({
      schemaVersion: 'CharacterSheetV2', creationSource: 'manual-transfer',
      identity: { name: 'Seren Ashfall', gender: 'Female', race: { source: 'srd', index: 'human' }, class: { source: 'srd', index: 'fighter' } },
    });
    expect(request).not.toHaveProperty('ownerSubjectId');
    expect(request).not.toHaveProperty('currentHp');
    expect(request).not.toHaveProperty('referencePayload');
    await waitFor(() => expect(onOpenCharacterReference).toHaveBeenCalledWith('character-v2'));
  });

  it('keeps a signed-out review available while withholding save and preserving auth actions', () => {
    const onSignIn = vi.fn();
    const onCreateAccount = vi.fn();
    reviewManual({ onSignIn, onCreateAccount });
    expect(screen.queryByRole('button', { name: 'Save character' })).not.toBeInTheDocument();
    expect(screen.getByText(/Sign in to save this character/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(onSignIn).toHaveBeenCalledOnce();
    expect(onCreateAccount).toHaveBeenCalledOnce();
    expect(createCharacterMock).not.toHaveBeenCalled();
  });

  it('locks duplicate saves until the request resolves', async () => {
    let resolveSave: (value: never) => void = () => undefined;
    createCharacterMock.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    reviewManual({ isSignedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));
    expect(screen.getByRole('button', { name: 'Saving character...' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Saving character...' }));
    expect(createCharacterMock).toHaveBeenCalledOnce();
    await act(async () => resolveSave({ id: 'saved-v2' } as never));
    expect(screen.getByText('Character saved.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save character' })).toBeDisabled();
  });

  it('keeps review visible and unlocks one retry after a generic save failure', async () => {
    createCharacterMock.mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce({ id: 'saved-v2' } as never);
    reviewManual({ isSignedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the character. Check your connection and try again.');
    expect(screen.getByRole('heading', { name: 'Review structured character.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save character' }));
    await waitFor(() => expect(createCharacterMock).toHaveBeenCalledTimes(2));
  });
});
