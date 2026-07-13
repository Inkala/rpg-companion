import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CharacterSummaryDTO } from '../characters/apiTypes';
import { PartiesApiError } from './api';
import type {
  JoinPartyResponseDTO,
  PartyInviteInspectionResponseDTO,
} from './apiTypes';
import { JoinPartyPage } from './JoinPartyPage';

const token = 'a'.repeat(43);

const inspection: PartyInviteInspectionResponseDTO = {
  party: { id: 'party-1', name: 'The Lantern Guard' },
  expiresAt: '2026-07-19T10:00:00Z',
};

const characters: CharacterSummaryDTO[] = [
  {
    id: 'character-1',
    name: 'Branna Shieldhand',
    className: 'Fighter',
    subclassName: null,
    level: 1,
    ancestry: 'Human',
    background: 'Soldier',
    hitPoints: { current: 12, max: 12 },
    armorClass: 19,
    speedFt: 30,
    updatedAt: '2026-07-12T10:00:00Z',
  },
  {
    id: 'character-2',
    name: 'Mara Velard',
    className: 'Ranger',
    subclassName: 'Hunter',
    level: 3,
    ancestry: 'Human',
    background: 'Outlander',
    hitPoints: { current: 26, max: 26 },
    armorClass: 14,
    speedFt: 30,
    updatedAt: '2026-07-12T10:00:00Z',
  },
];

const joinedParty: JoinPartyResponseDTO = {
  partyId: 'party-1',
  membershipId: 'membership-1',
  role: 'player',
  characterId: 'character-1',
  joinedAt: '2026-07-12T11:00:00Z',
};

describe('JoinPartyPage', () => {
  it('reveals no invite details and performs no requests while signed out', () => {
    const inspectInvite = vi.fn();
    const loadCharacters = vi.fn();
    const joinParty = vi.fn();
    const onSignIn = vi.fn();
    const onCancel = vi.fn();

    renderPage({
      isSignedIn: false,
      inspectInvite,
      loadCharacters,
      joinParty,
      onSignIn,
      onCancel,
    });

    expect(screen.getByRole('heading', { name: 'Sign in to use this party invite' })).toBeInTheDocument();
    expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(token);
    expect(inspectInvite).not.toHaveBeenCalled();
    expect(loadCharacters).not.toHaveBeenCalled();
    expect(joinParty).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSignIn).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows a safe unavailable state for a missing token without loading', () => {
    const inspectInvite = vi.fn();
    const loadCharacters = vi.fn();

    renderPage({ token: null, inspectInvite, loadCharacters });

    expect(screen.getByRole('alert')).toHaveTextContent('This party invite is unavailable.');
    expect(inspectInvite).not.toHaveBeenCalled();
    expect(loadCharacters).not.toHaveBeenCalled();
  });

  it('loads inspection and owned characters with an accessible loading state', () => {
    const inspectionLoad = deferred<PartyInviteInspectionResponseDTO>();
    const characterLoad = deferred<CharacterSummaryDTO[]>();
    const inspectInvite = vi.fn().mockReturnValue(inspectionLoad.promise);
    const loadCharacters = vi.fn().mockReturnValue(characterLoad.promise);

    renderPage({ inspectInvite, loadCharacters });

    expect(screen.getByRole('status')).toHaveTextContent('Checking party invite...');
    expect(inspectInvite).toHaveBeenCalledWith({ token });
    expect(loadCharacters).toHaveBeenCalledOnce();
    expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(token);
  });

  it('shows the inspected Party and owned characters as one accessible selection group', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Join The Lantern Guard' })).toBeInTheDocument();
    const characterGroup = screen.getByRole('group', { name: 'Choose a character' });
    const characterOptions = within(characterGroup).getAllByRole('radio');
    expect(characterOptions).toHaveLength(2);
    expect(within(characterGroup).getByLabelText(/Branna Shieldhand/)).toBeInTheDocument();
    expect(within(characterGroup).getByText('Fighter - Level 1')).toBeInTheDocument();
    expect(within(characterGroup).getByLabelText(/Mara Velard/)).toBeInTheDocument();
    expect(within(characterGroup).getByText('Ranger - Hunter - Level 3')).toBeInTheDocument();
  });

  it('provides scoped join-form and radio-card hooks without adding another group', async () => {
    const { container } = renderPage();

    const heading = await screen.findByRole('heading', { name: 'Join The Lantern Guard' });
    expect(container.querySelector('main')).toHaveClass('party-page', 'party-join-page');
    expect(heading).toHaveClass('party-join__title');
    expect(heading.closest('section')).toHaveClass('party-join-card');

    const groups = screen.getAllByRole('group', { name: 'Choose a character' });
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveClass('party-character-picker');
    within(groups[0]).getAllByRole('radio').forEach((radio) => {
      expect(radio.closest('label')).toHaveClass('party-character-option');
    });
  });

  it('requires one character selection before joining', async () => {
    const joinParty = vi.fn();
    renderPage({ joinParty });

    await screen.findByRole('heading', { name: 'Join The Lantern Guard' });
    fireEvent.click(screen.getByRole('button', { name: 'Join party' }));

    expect(joinParty).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a character before joining.');
    expect(screen.getByRole('group', { name: 'Choose a character' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getAllByRole('radio')[0]).toHaveFocus();
  });

  it('directs a user without characters to create or transfer one', async () => {
    const onCreateCharacter = vi.fn();
    renderPage({
      loadCharacters: vi.fn().mockResolvedValue([]),
      onCreateCharacter,
    });

    expect(await screen.findByRole('heading', { name: 'Create or transfer a character first' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create or transfer character' }));
    expect(onCreateCharacter).toHaveBeenCalledOnce();
  });

  it('prevents duplicate joins and reports the joined Party id', async () => {
    const pendingJoin = deferred<JoinPartyResponseDTO>();
    const joinParty = vi.fn().mockReturnValue(pendingJoin.promise);
    const onJoined = vi.fn();
    renderPage({ joinParty, onJoined });

    const characterOption = await screen.findByRole('radio', { name: /Branna Shieldhand/ });
    fireEvent.click(characterOption);
    const submitButton = screen.getByRole('button', { name: 'Join party' });
    const form = submitButton.closest('form') as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(screen.getByRole('button', { name: 'Joining party...' })).toBeDisabled();
    expect(characterOption).toBeDisabled();
    expect(joinParty).toHaveBeenCalledOnce();
    expect(joinParty).toHaveBeenCalledWith({ token, characterId: 'character-1' });

    await act(async () => {
      pendingJoin.resolve(joinedParty);
      await pendingJoin.promise;
    });
    expect(onJoined).toHaveBeenCalledWith('party-1');
  });

  it('shows locally mapped join errors without backend prose or the raw token', async () => {
    const joinParty = vi.fn().mockRejectedValue(
      new PartiesApiError(
        `backend rejected invite ${token}`,
        409,
        'already_member',
      ),
    );
    renderPage({ joinParty });

    const characterOption = await screen.findByRole('radio', { name: /Branna Shieldhand/ });
    fireEvent.click(characterOption);
    fireEvent.click(screen.getByRole('button', { name: 'Join party' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('You are already a member of this party.');
    expect(alert).not.toHaveTextContent('backend rejected');
    expect(document.body).not.toHaveTextContent(token);
    expect(characterOption).toBeChecked();
  });

  it('shows a safe recoverable load error and retries', async () => {
    const inspectInvite = vi
      .fn()
      .mockRejectedValueOnce(new Error(`backend leaked ${token}`))
      .mockResolvedValueOnce(inspection);
    const loadCharacters = vi.fn().mockResolvedValue(characters);
    renderPage({ inspectInvite, loadCharacters });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load this party invite. Please try again.');
    expect(document.body).not.toHaveTextContent(token);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByRole('status')).toHaveTextContent('Checking party invite...');
    expect(await screen.findByRole('heading', { name: 'Join The Lantern Guard' })).toBeInTheDocument();
    expect(inspectInvite).toHaveBeenCalledTimes(2);
    expect(loadCharacters).toHaveBeenCalledTimes(2);
  });

  it('ignores stale load results after token and loader changes', async () => {
    const oldInspection = deferred<PartyInviteInspectionResponseDTO>();
    const oldCharacters = deferred<CharacterSummaryDTO[]>();
    const oldInspectInvite = vi.fn().mockReturnValue(oldInspection.promise);
    const oldLoadCharacters = vi.fn().mockReturnValue(oldCharacters.promise);
    const props = defaultProps({
      inspectInvite: oldInspectInvite,
      loadCharacters: oldLoadCharacters,
    });
    const replacementInspection = {
      party: { id: 'party-2', name: 'The Silver Company' },
      expiresAt: '2026-07-19T10:00:00Z',
    };
    const { rerender } = render(<JoinPartyPage {...props} />);

    rerender(
      <JoinPartyPage
        {...props}
        token={'b'.repeat(43)}
        inspectInvite={vi.fn().mockResolvedValue(replacementInspection)}
        loadCharacters={vi.fn().mockResolvedValue([])}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'Create or transfer a character first' })).toBeInTheDocument();

    oldInspection.resolve(inspection);
    oldCharacters.resolve(characters);
    await waitFor(() => {
      expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
      expect(screen.getByText('The Silver Company')).toBeInTheDocument();
    });
  });

  it('ignores stale loads and join completion after signing out', async () => {
    const pendingInspection = deferred<PartyInviteInspectionResponseDTO>();
    const pendingCharacters = deferred<CharacterSummaryDTO[]>();
    const props = defaultProps({
      inspectInvite: vi.fn().mockReturnValue(pendingInspection.promise),
      loadCharacters: vi.fn().mockReturnValue(pendingCharacters.promise),
    });
    const { rerender } = render(<JoinPartyPage {...props} />);

    rerender(<JoinPartyPage {...props} isSignedIn={false} />);
    pendingInspection.resolve(inspection);
    pendingCharacters.resolve(characters);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in to use this party invite' })).toBeInTheDocument();
      expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
    });
  });

  it('ignores late join completion after authentication changes', async () => {
    const pendingJoin = deferred<JoinPartyResponseDTO>();
    const joinParty = vi.fn().mockReturnValue(pendingJoin.promise);
    const onJoined = vi.fn();
    const props = defaultProps({ joinParty, onJoined });
    const { rerender } = render(<JoinPartyPage {...props} />);

    fireEvent.click(await screen.findByRole('radio', { name: /Branna Shieldhand/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Join party' }));
    rerender(<JoinPartyPage {...props} isSignedIn={false} />);

    await act(async () => {
      pendingJoin.resolve(joinedParty);
      await pendingJoin.promise;
    });
    expect(onJoined).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Sign in to use this party invite' })).toBeInTheDocument();
  });

  it('ignores late load results after unmounting', async () => {
    const pendingInspection = deferred<PartyInviteInspectionResponseDTO>();
    const pendingCharacters = deferred<CharacterSummaryDTO[]>();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderPage({
      inspectInvite: vi.fn().mockReturnValue(pendingInspection.promise),
      loadCharacters: vi.fn().mockReturnValue(pendingCharacters.promise),
    });

    unmount();
    pendingInspection.resolve(inspection);
    pendingCharacters.resolve(characters);

    await waitFor(() => {
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
    consoleErrorSpy.mockRestore();
  });
});

const renderPage = (overrides: Partial<Parameters<typeof JoinPartyPage>[0]> = {}) => {
  return render(<JoinPartyPage {...defaultProps(overrides)} />);
};

const defaultProps = (
  overrides: Partial<Parameters<typeof JoinPartyPage>[0]> = {},
): Parameters<typeof JoinPartyPage>[0] => ({
  token,
  isSignedIn: true,
  inspectInvite: vi.fn().mockResolvedValue(inspection),
  loadCharacters: vi.fn().mockResolvedValue(characters),
  joinParty: vi.fn().mockResolvedValue(joinedParty),
  onSignIn: vi.fn(),
  onCreateCharacter: vi.fn(),
  onJoined: vi.fn(),
  onCancel: vi.fn(),
  ...overrides,
});

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};
