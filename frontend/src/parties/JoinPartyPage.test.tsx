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
  it('renders an accessible invitation-code form for a bare Join route', async () => {
    const onSubmitCode = vi.fn();
    const onCancel = vi.fn();

    renderPage({ token: null, isSignedIn: false, onSubmitCode, onCancel });

    expect(screen.getByRole('heading', { name: 'Join a party' })).toBeInTheDocument();
    expect(screen.getByText('Enter the invitation code shared by your GM.')).toBeInTheDocument();
    expect(screen.queryByText('Party invite')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Eight letters or numbers, shown as XXXX-XXXX.'),
    ).not.toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: 'Invitation code' });
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('spellcheck', 'false');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.queryByText('This party invite is unavailable.')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: ' abcd - efgh ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSubmitCode).toHaveBeenCalledWith('ABCDEFGH');
    expect(input).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('rejects invalid codes locally and focuses the associated input', () => {
    const onSubmitCode = vi.fn();
    renderPage({ token: null, onSubmitCode });

    const input = screen.getByRole('textbox', { name: 'Invitation code' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
    fireEvent.change(input, { target: { value: 'ABCI-1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSubmitCode).not.toHaveBeenCalled();
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent(
      'Enter the eight-character invitation code using letters and numbers.',
    );
    expect(error).toHaveAttribute('id', 'party-invite-code-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'party-invite-code-error');
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: 'ABCD-EFGH' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('exposes scoped layout hooks for one labelled input area and one shared action row', () => {
    const { container } = renderPage({ token: null });

    const input = screen.getByRole('textbox', { name: 'Invitation code' });
    const form = input.closest('form');
    expect(form).toHaveClass('party-invite-code-form');
    expect(input.closest('.party-invite-code-form__field')).not.toBeNull();
    expect(input.closest('label')).toHaveClass('form-field');

    const actions = container.querySelector('.party-invite-code-form__actions');
    expect(actions).not.toBeNull();
    expect(within(actions as HTMLElement).getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(within(actions as HTMLElement).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

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

  it('shows the code-entry state for a signed-out missing token without requests', () => {
    const inspectInvite = vi.fn();
    const loadCharacters = vi.fn();
    const joinParty = vi.fn();

    renderPage({
      token: null,
      isSignedIn: false,
      inspectInvite,
      loadCharacters,
      joinParty,
    });

    expect(screen.getByRole('heading', { name: 'Join a party' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Invitation code' })).toBeInTheDocument();
    expect(inspectInvite).not.toHaveBeenCalled();
    expect(loadCharacters).not.toHaveBeenCalled();
    expect(joinParty).not.toHaveBeenCalled();
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

  it('uses code inspection and joining without exposing the submitted code', async () => {
    const code = 'ABCDEFGH';
    const inspectInviteByCode = vi.fn().mockResolvedValue(inspection);
    const joinPartyByCode = vi.fn().mockResolvedValue(joinedParty);
    const onJoined = vi.fn();

    renderPage({
      token: undefined,
      credential: { kind: 'code', value: code },
      inspectInviteByCode,
      joinPartyByCode,
      onJoined,
    });

    fireEvent.click(await screen.findByRole('radio', { name: /Branna Shieldhand/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Join party' }));

    expect(inspectInviteByCode).toHaveBeenCalledWith({ code });
    expect(joinPartyByCode).toHaveBeenCalledWith({ code, characterId: 'character-1' });
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith('party-1'));
    expect(document.body).not.toHaveTextContent(code);
  });

  it('ignores a code inspection result after the code inspector is replaced', async () => {
    const oldInspection = deferred<PartyInviteInspectionResponseDTO>();
    const replacementInspection = deferred<PartyInviteInspectionResponseDTO>();
    const oldInspector = vi.fn().mockReturnValue(oldInspection.promise);
    const replacementInspector = vi.fn().mockReturnValue(replacementInspection.promise);
    const code = 'ABCDEFGH';
    const props = defaultProps({
      token: undefined,
      credential: { kind: 'code', value: code },
      inspectInviteByCode: oldInspector,
    });
    const { rerender } = render(<JoinPartyPage {...props} />);

    expect(oldInspector).toHaveBeenCalledWith({ code });
    rerender(<JoinPartyPage {...props} inspectInviteByCode={replacementInspector} />);
    expect(replacementInspector).toHaveBeenCalledWith({ code });

    await act(async () => {
      oldInspection.resolve(inspection);
      await oldInspection.promise;
    });
    expect(screen.getByRole('status')).toHaveTextContent('Checking party invite...');
    expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();

    await act(async () => {
      replacementInspection.resolve({
        party: { id: 'party-2', name: 'The Silver Company' },
        expiresAt: '2026-07-20T10:00:00Z',
      });
      await replacementInspection.promise;
    });
    expect(
      await screen.findByRole('heading', { name: 'Join The Silver Company' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
  });

  it.each(['resolve', 'reject'] as const)(
    'ignores an old code join that %s after the code joiner is replaced',
    async (completion) => {
      const oldJoin = deferred<JoinPartyResponseDTO>();
      const oldJoiner = vi.fn().mockReturnValue(oldJoin.promise);
      const replacementJoiner = vi.fn().mockResolvedValue({
        ...joinedParty,
        partyId: 'party-2',
      });
      const onJoined = vi.fn();
      const code = 'ABCDEFGH';
      const props = defaultProps({
        token: undefined,
        credential: { kind: 'code', value: code },
        joinPartyByCode: oldJoiner,
        onJoined,
      });
      const { rerender } = render(<JoinPartyPage {...props} />);

      fireEvent.click(await screen.findByRole('radio', { name: /Branna Shieldhand/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Join party' }));
      expect(oldJoiner).toHaveBeenCalledWith({ code, characterId: 'character-1' });

      rerender(<JoinPartyPage {...props} joinPartyByCode={replacementJoiner} />);
      await act(async () => {
        if (completion === 'resolve') {
          oldJoin.resolve(joinedParty);
          await oldJoin.promise;
        } else {
          oldJoin.reject(new PartiesApiError('private old failure', 503, 'server_error'));
          await oldJoin.promise.catch(() => undefined);
        }
      });

      expect(onJoined).not.toHaveBeenCalled();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Join The Lantern Guard' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('radio', { name: /Branna Shieldhand/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Join party' }));
      expect(replacementJoiner).toHaveBeenCalledWith({ code, characterId: 'character-1' });
      await waitFor(() => expect(onJoined).toHaveBeenCalledWith('party-2'));
    },
  );

  it('ignores a late token inspection after replacement by a code credential', async () => {
    const oldInspection = deferred<PartyInviteInspectionResponseDTO>();
    const inspectInviteByCode = vi.fn().mockResolvedValue({
      party: { id: 'party-2', name: 'The Silver Company' },
      expiresAt: '2026-07-20T10:00:00Z',
    });
    const props = defaultProps({ inspectInvite: vi.fn().mockReturnValue(oldInspection.promise) });
    const { rerender } = render(
      <JoinPartyPage {...props} credential={{ kind: 'token', value: token }} token={undefined} />,
    );

    rerender(
      <JoinPartyPage
        {...props}
        token={undefined}
        credential={{ kind: 'code', value: 'ABCDEFGH' }}
        inspectInviteByCode={inspectInviteByCode}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'Join The Silver Company' })).toBeInTheDocument();

    oldInspection.resolve(inspection);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Join The Silver Company' })).toBeInTheDocument();
      expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
    });
  });

  it('returns unavailable recovery to an empty focused code input', async () => {
    const onTryAnotherCode = vi.fn();
    const onCancel = vi.fn();
    const props = defaultProps({
      token: null,
      isSignedIn: false,
      showUnavailable: true,
      onTryAnotherCode,
      onCancel,
    });
    const { rerender } = render(<JoinPartyPage {...props} />);

    expect(screen.getByRole('heading', { name: 'Party invite unavailable' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Go home' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try another code' }));
    expect(onTryAnotherCode).toHaveBeenCalledOnce();

    rerender(<JoinPartyPage {...props} showUnavailable={false} />);
    const input = screen.getByRole('textbox', { name: 'Invitation code' });
    expect(input).toHaveValue('');
    await waitFor(() => expect(input).toHaveFocus());
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

  it('shows a privacy-safe saved-character retry without exposing join data', async () => {
    const onRetrySavedCharacterJoin = vi.fn();
    renderPage({
      savedCharacterJoinState: 'error',
      onRetrySavedCharacterJoin,
    });

    expect(
      screen.getByRole('heading', { name: 'Could not join party' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your character is saved. Try joining the party again.',
    );
    expect(document.body).not.toHaveTextContent(token);
    expect(document.body).not.toHaveTextContent('character-1');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetrySavedCharacterJoin).toHaveBeenCalledOnce();
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
    expect(screen.getByRole('button', { name: 'Join party' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Join party' }));
    await waitFor(() => expect(joinParty).toHaveBeenCalledTimes(2));
  });

  it('reports join-time invite unavailability and replaces the form with a safe state', async () => {
    const onInviteUnavailable = vi.fn();
    renderPage({
      joinParty: vi.fn().mockRejectedValue(
        new PartiesApiError('backend detail', 400, 'invite_unavailable'),
      ),
      onInviteUnavailable,
    });

    fireEvent.click(await screen.findByRole('radio', { name: /Branna Shieldhand/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Join party' }));

    expect(
      await screen.findByRole('heading', { name: 'Party invite unavailable' }),
    ).toBeInTheDocument();
    expect(onInviteUnavailable).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Join party' })).not.toBeInTheDocument();
    expect(screen.queryByText('backend detail')).not.toBeInTheDocument();
    expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
  });

  it('ignores a late unavailable join failure for a replaced invite', async () => {
    const oldJoin = deferred<JoinPartyResponseDTO>();
    const onInviteUnavailable = vi.fn();
    const props = defaultProps({
      joinParty: vi.fn().mockReturnValue(oldJoin.promise),
      onInviteUnavailable,
    });
    const { rerender } = render(<JoinPartyPage {...props} />);

    fireEvent.click(await screen.findByRole('radio', { name: /Branna Shieldhand/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Join party' }));
    rerender(
      <JoinPartyPage
        {...props}
        token={'b'.repeat(43)}
        inspectInvite={vi.fn().mockResolvedValue({
          party: { id: 'party-2', name: 'The Silver Company' },
          expiresAt: '2026-07-19T10:00:00Z',
        })}
        joinParty={vi.fn().mockResolvedValue({
          ...joinedParty,
          partyId: 'party-2',
        })}
      />,
    );
    expect(
      await screen.findByRole('heading', { name: 'Join The Silver Company' }),
    ).toBeInTheDocument();

    await act(async () => {
      oldJoin.reject(new PartiesApiError('backend detail', 400, 'invite_unavailable'));
      await oldJoin.promise.catch(() => undefined);
    });

    expect(onInviteUnavailable).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Join The Silver Company' })).toBeInTheDocument();
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

  it.each([
    new PartiesApiError('backend detail', 400, 'invite_unavailable'),
    new PartiesApiError('backend detail', 400),
  ])('reports unavailable inspection failures through the clearing bridge', async (error) => {
    const onInviteUnavailable = vi.fn();
    renderPage({
      inspectInvite: vi.fn().mockRejectedValue(error),
      onInviteUnavailable,
    });

    expect(
      await screen.findByRole('heading', { name: 'Party invite unavailable' }),
    ).toBeInTheDocument();
    expect(onInviteUnavailable).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.queryByText('backend detail')).not.toBeInTheDocument();
    expect(screen.queryByText('The Lantern Guard')).not.toBeInTheDocument();
  });

  it('does not report a late unavailable result for a replaced invite', async () => {
    const oldInspection = deferred<PartyInviteInspectionResponseDTO>();
    const onInviteUnavailable = vi.fn();
    const props = defaultProps({
      inspectInvite: vi.fn().mockReturnValue(oldInspection.promise),
      onInviteUnavailable,
    });
    const { rerender } = render(<JoinPartyPage {...props} />);

    rerender(
      <JoinPartyPage
        {...props}
        token={'b'.repeat(43)}
        inspectInvite={vi.fn().mockResolvedValue({
          party: { id: 'party-2', name: 'The Silver Company' },
          expiresAt: '2026-07-19T10:00:00Z',
        })}
      />,
    );
    expect(
      await screen.findByRole('heading', { name: 'Join The Silver Company' }),
    ).toBeInTheDocument();

    await act(async () => {
      oldInspection.reject(new PartiesApiError('backend detail', 400, 'invite_unavailable'));
      await oldInspection.promise.catch(() => undefined);
    });

    expect(onInviteUnavailable).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Join The Silver Company' })).toBeInTheDocument();
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
  inspectInviteByCode: vi.fn().mockResolvedValue(inspection),
  loadCharacters: vi.fn().mockResolvedValue(characters),
  joinParty: vi.fn().mockResolvedValue(joinedParty),
  joinPartyByCode: vi.fn().mockResolvedValue(joinedParty),
  onSignIn: vi.fn(),
  onCreateCharacter: vi.fn(),
  onJoined: vi.fn(),
  onCancel: vi.fn(),
  onInviteUnavailable: vi.fn(),
  onSubmitCode: vi.fn(),
  onTryAnotherCode: vi.fn(),
  ...overrides,
});

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
};
