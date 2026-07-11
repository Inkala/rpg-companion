import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CharacterReference } from './CharacterReference';
import { HitPointValue } from './CharacterStats';
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
  it('uses the guest landing back label by default', () => {
    render(<CharacterReference character={testCharacter} onBack={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Back to guest landing page' }),
    ).toBeInTheDocument();
  });

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

  it('renders the generic avatar when a character has no portrait', () => {
    render(<CharacterReference character={testCharacter} onBack={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'Generic character avatar' })).toBeInTheDocument();
  });

  it('renders a provided portrait instead of the generic avatar', () => {
    render(
      <CharacterReference
        character={{
          ...testCharacter,
          portrait: {
            src: '/custom-portrait.webp',
            alt: 'Custom portrait',
          },
        }}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole('img', { name: 'Custom portrait' })).toHaveAttribute(
      'src',
      '/custom-portrait.webp',
    );
    expect(screen.queryByRole('img', { name: 'Generic character avatar' })).not.toBeInTheDocument();
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

  it('shows only maximum HP when Mara is at full HP', () => {
    render(<CharacterReference character={maraReferenceCharacter} onBack={vi.fn()} />);

    const primaryStats = screen.getByLabelText('Primary stats');
    const fullHp = within(primaryStats).getByText('26');

    expect(fullHp).toBeInTheDocument();
    expect(fullHp).toHaveClass('hp-value--full');
    expect(within(primaryStats).queryByText('26 / 26')).not.toBeInTheDocument();
  });

  it('renders reduced HP as muted current HP before primary maximum HP', () => {
    const { container } = render(
      <HitPointValue hitPoints={{ current: 22, max: 26 }} />,
    );

    const currentHp = screen.getByText('22');
    const separator = screen.getByText('/');
    const maxHp = screen.getByText('26');

    expect(container.textContent).toBe('22 / 26');
    expect(currentHp.compareDocumentPosition(separator)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(separator.compareDocumentPosition(maxHp)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(currentHp).toHaveClass('hp-value__current');
    expect(separator).toHaveClass('hp-value__separator');
    expect(maxHp).toHaveClass('hp-value__max');
  });

  it('starts Mara actions expanded', () => {
    render(<CharacterReference character={maraReferenceCharacter} onBack={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Actions, 2 items/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Longbow/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shortsword/ })).toBeInTheDocument();
  });

  it('expands Mara features on request', () => {
    render(<CharacterReference character={maraReferenceCharacter} onBack={vi.fn()} />);

    const featuresHeader = screen.getByRole('button', {
      name: /Features, 2 items/,
    });

    expect(featuresHeader).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Colossus Slayer/ })).not.toBeInTheDocument();

    fireEvent.click(featuresHeader);

    expect(featuresHeader).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Archery/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Colossus Slayer/ })).toBeInTheDocument();
  });

  it('opens the Mara Colossus Slayer sheet', () => {
    render(<CharacterReference character={maraReferenceCharacter} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Features, 2 items/ }));

    fireEvent.click(screen.getByRole('button', { name: /Colossus Slayer/ }));

    const sheet = screen.getByRole('dialog', {
      name: 'Colossus Slayer quick reference',
    });

    expect(sheet).toBeInTheDocument();
    expect(
      within(sheet).getByText(
        'After you hit an enemy that is already wounded, add 1d8 damage.',
      ),
    ).toBeInTheDocument();
    expect(within(sheet).getByText('Timing')).toBeInTheDocument();
    expect(within(sheet).getByText('Once per turn')).toBeInTheDocument();
  });

  it('closes the Mara sheet and returns focus to Colossus Slayer', async () => {
    render(<CharacterReference character={maraReferenceCharacter} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Features, 2 items/ }));

    const colossusRow = screen.getByRole('button', { name: /Colossus Slayer/ });
    fireEvent.click(colossusRow);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Close Colossus Slayer quick reference',
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(colossusRow).toHaveFocus();
    });
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

const openSecondWindQuickReference = () => {
  render(<CharacterReference character={testCharacter} onBack={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: /Features, 1 items/ }));
  const opener = screen.getByRole('button', { name: /Second Wind/ });
  fireEvent.click(opener);

  const sheet = screen.getByRole('dialog', {
    name: 'Second Wind quick reference',
  });

  return { opener, sheet };
};
