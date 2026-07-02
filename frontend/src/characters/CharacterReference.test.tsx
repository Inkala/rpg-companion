import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CharacterReference } from './CharacterReference';
import { maraReferenceCharacter } from './maraReference';
import type { CharacterReferenceViewModel } from './types';

const testCharacter: CharacterReferenceViewModel = {
  name: 'Test Character',
  identity: 'Human Fighter · Level 1',
  supportingIdentity: 'Soldier',
  stats: {
    hitPoints: {
      current: 12,
      max: 12,
    },
    armorClass: '19',
    speed: '30 ft.',
    concentration: 'No concentration',
    secondary: [
      {
        label: 'Proficiency',
        value: '+2',
      },
    ],
  },
  sections: [
    {
      id: 'actions',
      label: 'Actions',
      defaultOpen: true,
      items: [
        {
          id: 'longsword',
          name: 'Longsword',
          hint: 'Reliable melee attack.',
          meta: ['Action', '+5 to hit', '1d8 + 3 slashing'],
        },
      ],
    },
    {
      id: 'features',
      label: 'Features',
      defaultOpen: false,
      items: [
        {
          id: 'second-wind',
          name: 'Second Wind',
          hint: 'Recover hit points once per short rest.',
          meta: ['Bonus Action', 'Healing'],
          quickReference: {
            title: 'Second Wind',
            label: 'Fighter feature',
            summary: 'Use a bonus action to regain a small amount of hit points.',
            metadata: [
              {
                label: 'Timing',
                value: 'Bonus Action',
              },
              {
                label: 'Resource',
                value: 'Once per short rest',
              },
            ],
            reminder: {
              heading: 'Remember',
              text: 'Use this when staying upright matters more than attacking with a bonus action.',
            },
            details: {
              collapsedLabel: 'Show more details',
              expandedLabel: 'Hide details',
              text: 'The exact healing amount comes from the character rules data.',
            },
          },
        },
      ],
    },
  ],
};

describe('CharacterReference', () => {
  it('renders a reusable character reference from a view model', () => {
    render(<CharacterReference character={testCharacter} onBack={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Test Character' })).toBeInTheDocument();
    expect(screen.getByText('Human Fighter · Level 1')).toBeInTheDocument();
    expect(screen.getByText('Soldier')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Actions, 1 items/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Longsword/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Features, 1 items/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('button', { name: /Second Wind/ })).not.toBeInTheDocument();
  });

  it('opens generic quick-reference sheet content and returns focus to the opener', async () => {
    const { opener: secondWindRow, sheet } = openSecondWindQuickReference();

    expect(secondWindRow).not.toHaveFocus();

    expect(within(sheet).getByText('Fighter feature')).toBeInTheDocument();
    expect(
      within(sheet).getByText('Use a bonus action to regain a small amount of hit points.'),
    ).toBeInTheDocument();

    fireEvent.click(
      within(sheet).getByRole('button', {
        name: 'Show more details',
      }),
    );
    expect(
      within(sheet).getByText('The exact healing amount comes from the character rules data.'),
    ).toBeInTheDocument();

    fireEvent.click(
      within(sheet).getByRole('button', {
        name: 'Close Second Wind quick reference',
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(secondWindRow).toHaveFocus();
    });
  });

  it('closes the quick-reference sheet with Escape and returns focus to the opener', async () => {
    const { opener: secondWindRow } = openSecondWindQuickReference();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(secondWindRow).toHaveFocus();
    });
  });

  it('closes the quick-reference sheet from the backdrop and returns focus to the opener', async () => {
    const { opener: secondWindRow, sheet } = openSecondWindQuickReference();

    fireEvent.mouseDown(sheet.parentElement ?? sheet);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(secondWindRow).toHaveFocus();
    });
  });

  it('keeps Tab and Shift+Tab focus inside the quick-reference sheet', () => {
    const { sheet } = openSecondWindQuickReference();
    const closeButton = within(sheet).getByRole('button', {
      name: 'Close Second Wind quick reference',
    });
    const detailsButton = within(sheet).getByRole('button', {
      name: 'Show more details',
    });

    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(detailsButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(closeButton).toHaveFocus();
  });

  it('starts Mara spells collapsed', () => {
    render(<CharacterReference character={maraReferenceCharacter} onBack={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Spells, 3 items/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('button', { name: /Hunter's Mark/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fog Cloud/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cure Wounds/ })).not.toBeInTheDocument();
  });

  it('keeps rows without quick-reference content as planned details', () => {
    render(<CharacterReference character={testCharacter} onBack={vi.fn()} />);

    const longswordRow = screen.getByRole('button', { name: /Longsword/ });

    expect(longswordRow).toHaveAttribute('aria-disabled', 'true');
    expect(within(longswordRow).getByText('Details planned')).toBeInTheDocument();

    fireEvent.click(longswordRow);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

function openSecondWindQuickReference() {
  render(<CharacterReference character={testCharacter} onBack={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: /Features, 1 items/ }));
  const opener = screen.getByRole('button', { name: /Second Wind/ });
  fireEvent.click(opener);

  const sheet = screen.getByRole('dialog', {
    name: 'Second Wind quick reference',
  });

  return { opener, sheet };
}
