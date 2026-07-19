import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PartyInviteDTO } from './apiTypes';
import { PartyInvitePanel } from './PartyInvitePanel';

const firstToken = 'a'.repeat(43);
const secondToken = 'b'.repeat(43);

const firstInvite: PartyInviteDTO = {
  token: firstToken,
  code: 'ABCD-EFGH',
  createdAt: '2026-07-12T10:00:00Z',
  expiresAt: '2026-07-19T10:00:00Z',
};

const secondInvite: PartyInviteDTO = {
  token: secondToken,
  code: 'JKLM-NPQR',
  createdAt: '2026-07-13T10:00:00Z',
  expiresAt: '2026-07-20T10:00:00Z',
};

describe('PartyInvitePanel', () => {
  it('exposes no invite generation control to a Player', () => {
    const createInvite = vi.fn();

    const { container } = renderPanel({ currentUserRole: 'player', createInvite });

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /invite/i })).not.toBeInTheDocument();
    expect(createInvite).not.toHaveBeenCalled();
  });

  it('generates one invite, prevents duplicates, and builds the required fragment URL', async () => {
    const pendingInvite = deferred<PartyInviteDTO>();
    const createInvite = vi.fn().mockReturnValue(pendingInvite.promise);
    const buildInviteURL = vi.fn((path: string) => `https://hunin.test${path}`);

    renderPanel({ createInvite, buildInviteURL });
    const generateButton = screen.getByRole('button', { name: 'Generate invitation' });
    fireEvent.click(generateButton);
    fireEvent.click(generateButton);

    expect(screen.getByRole('status')).toHaveTextContent('Creating invitation...');
    expect(screen.getByRole('button', { name: 'Generating invitation...' })).toBeDisabled();
    expect(createInvite).toHaveBeenCalledOnce();
    expect(createInvite).toHaveBeenCalledWith('party-1');

    await act(async () => {
      pendingInvite.resolve(firstInvite);
      await pendingInvite.promise;
    });

    expect(buildInviteURL).toHaveBeenCalledWith(`/parties/join#${firstToken}`);
    const inviteInput = screen.getByLabelText('Shareable invite URL');
    expect(inviteInput).toHaveValue(`https://hunin.test/parties/join#${firstToken}`);
    const expiration = screen.getByText(/Expires/).querySelector('time');
    expect(expiration).toHaveAttribute('dateTime', firstInvite.expiresAt);

    const inviteUrl = new URL(String((inviteInput as HTMLInputElement).value));
    expect(inviteUrl.pathname).toBe('/parties/join');
    expect(inviteUrl.search).toBe('');
    expect(inviteUrl.hash).toBe(`#${firstToken}`);
  });

  it('provides an accessible scoped layout for the read-only invite URL and controls', async () => {
    await renderGeneratedInvite();

    const panel = screen.getByRole('region', { name: 'Invite players' });
    expect(panel).toHaveClass('party-invite-panel');

    const inviteInput = screen.getByLabelText('Shareable invite URL');
    expect(inviteInput).toHaveClass('party-invite-panel__url');
    expect(inviteInput).toHaveAttribute('readonly');
    expect(inviteInput.closest('label')).toHaveClass('party-invite-panel__field');

    expect(within(panel).getByText('ABCD-EFGH')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Copy invitation link' })).toBeInTheDocument();
    expect(
      within(panel).getByRole('button', { name: 'Regenerate invitation' }),
    ).toBeInTheDocument();
  });

  it('copies code and link separately with fixed feedback that omits credentials', async () => {
    const copyText = vi.fn().mockResolvedValue(undefined);
    await renderGeneratedInvite({ copyText });

    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Invitation code copied.'));
    expect(copyText).toHaveBeenLastCalledWith('ABCD-EFGH');
    expect(screen.getByRole('status')).not.toHaveTextContent('ABCD-EFGH');

    fireEvent.click(screen.getByRole('button', { name: 'Copy invitation link' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Invitation link copied.'));
    expect(copyText).toHaveBeenLastCalledWith(`https://hunin.test/parties/join#${firstToken}`);
    expect(screen.getByRole('status')).not.toHaveTextContent(firstToken);
  });

  it('shows a safe recoverable generation error and retries', async () => {
    const createInvite = vi
      .fn()
      .mockRejectedValueOnce(new Error(`backend leaked ${firstToken}`))
      .mockResolvedValueOnce(firstInvite);

    renderPanel({ createInvite });
    fireEvent.click(screen.getByRole('button', { name: 'Generate invitation' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not create an invitation. Please try again.');
    expect(alert).not.toHaveTextContent(firstToken);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText('Shareable invite URL')).toHaveValue(
      `https://hunin.test/parties/join#${firstToken}`,
    );
    expect(createInvite).toHaveBeenCalledTimes(2);
  });

  it('copies the displayed invite URL and announces success', async () => {
    const copyText = vi.fn().mockResolvedValue(undefined);
    await renderGeneratedInvite({ copyText });

    fireEvent.click(screen.getByRole('button', { name: 'Copy invitation link' }));

    await waitFor(() => {
      expect(copyText).toHaveBeenCalledWith(`https://hunin.test/parties/join#${firstToken}`);
      expect(screen.getByRole('status')).toHaveTextContent('Invitation link copied.');
    });
  });

  it('announces copy failure without exposing rejected error details', async () => {
    const copyText = vi.fn().mockRejectedValue(new Error(`clipboard leaked ${firstToken}`));
    await renderGeneratedInvite({ copyText });

    fireEvent.click(screen.getByRole('button', { name: 'Copy invitation link' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Could not copy the invitation link. Copy it manually instead.',
    );
    expect(alert).not.toHaveTextContent('clipboard leaked');
  });

  it('regenerates, hides the previous URL while pending, and replaces it on success', async () => {
    const regeneration = deferred<PartyInviteDTO>();
    const createInvite = vi
      .fn()
      .mockResolvedValueOnce(firstInvite)
      .mockReturnValueOnce(regeneration.promise);
    await renderGeneratedInvite({ createInvite });

    expect(
      screen.getByText('Regenerating invalidates the previous code and link.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate invitation' }));

    expect(screen.queryByDisplayValue(/parties\/join/)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Creating invitation...');

    await act(async () => {
      regeneration.resolve(secondInvite);
      await regeneration.promise;
    });

    expect(screen.getByLabelText('Shareable invite URL')).toHaveValue(
      `https://hunin.test/parties/join#${secondToken}`,
    );
    expect(screen.queryByDisplayValue(`https://hunin.test/parties/join#${firstToken}`)).not.toBeInTheDocument();
  });

  it('invalidates pending code-copy feedback when regeneration starts', async () => {
    const pendingCopy = deferred<void>();
    const regeneration = deferred<PartyInviteDTO>();
    const createInvite = vi
      .fn()
      .mockResolvedValueOnce(firstInvite)
      .mockReturnValueOnce(regeneration.promise);
    await renderGeneratedInvite({
      createInvite,
      copyText: vi.fn().mockReturnValue(pendingCopy.promise),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate invitation' }));
    await act(async () => {
      pendingCopy.resolve(undefined);
      await pendingCopy.promise;
    });

    expect(screen.queryByText('Invitation code copied.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Could not copy the invitation code/)).not.toBeInTheDocument();

    await act(async () => {
      regeneration.resolve(secondInvite);
      await regeneration.promise;
    });
    expect(screen.getByText(secondInvite.code)).toBeInTheDocument();
    expect(screen.queryByText('Invitation code copied.')).not.toBeInTheDocument();
  });

  it('ignores old link-copy feedback after replacement credentials load', async () => {
    const pendingCopy = deferred<void>();
    const createInvite = vi
      .fn()
      .mockResolvedValueOnce(firstInvite)
      .mockResolvedValueOnce(secondInvite);
    await renderGeneratedInvite({
      createInvite,
      copyText: vi.fn().mockReturnValue(pendingCopy.promise),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy invitation link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate invitation' }));
    expect(await screen.findByText(secondInvite.code)).toBeInTheDocument();

    await act(async () => {
      pendingCopy.resolve(undefined);
      await pendingCopy.promise;
    });

    expect(screen.getByLabelText('Shareable invite URL')).toHaveValue(
      `https://hunin.test/parties/join#${secondToken}`,
    );
    expect(screen.queryByText('Invitation link copied.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Could not copy the invitation link/)).not.toBeInTheDocument();
  });

  it('does not recover one-time credentials after remount', async () => {
    const props = defaultProps();
    const { unmount } = render(<PartyInvitePanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate invitation' }));
    expect(await screen.findByText('ABCD-EFGH')).toBeInTheDocument();

    unmount();
    render(<PartyInvitePanel {...props} />);

    expect(screen.queryByText('ABCD-EFGH')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Shareable invite URL')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy invitation link' })).not.toBeInTheDocument();
    expect(screen.getByText(/shown only once and cannot be recovered/i)).toBeInTheDocument();
  });

  it('does not restore old credentials after regeneration fails', async () => {
    const createInvite = vi
      .fn()
      .mockResolvedValueOnce(firstInvite)
      .mockRejectedValueOnce(new Error(`private ${firstToken}`));
    await renderGeneratedInvite({ createInvite });

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate invitation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not create an invitation. Please try again.',
    );
    expect(document.body).not.toHaveTextContent(firstToken);
    expect(document.body).not.toHaveTextContent('ABCD-EFGH');
    expect(screen.queryByRole('button', { name: 'Copy code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy invitation link' })).not.toBeInTheDocument();
  });

  it.each(['partyId', 'role', 'creator', 'builder'] as const)(
    'immediately hides stale invite data when %s changes',
    async (changedProperty) => {
      const props = defaultProps();
      const { rerender } = render(<PartyInvitePanel {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Generate invitation' }));
      expect(await screen.findByLabelText('Shareable invite URL')).toBeInTheDocument();

      const changedProps = {
        ...props,
        ...(changedProperty === 'partyId' ? { partyId: 'party-2' } : {}),
        ...(changedProperty === 'role' ? { currentUserRole: 'player' as const } : {}),
        ...(changedProperty === 'creator' ? { createInvite: vi.fn().mockResolvedValue(secondInvite) } : {}),
        ...(changedProperty === 'builder' ? { buildInviteURL: vi.fn((path: string) => `https://new.test${path}`) } : {}),
      };
      rerender(<PartyInvitePanel {...changedProps} />);

      expect(screen.queryByLabelText('Shareable invite URL')).not.toBeInTheDocument();
      expect(document.body).not.toHaveTextContent(firstToken);
    },
  );

  it('ignores late generation after the Party changes', async () => {
    const pendingInvite = deferred<PartyInviteDTO>();
    const createInvite = vi.fn().mockReturnValue(pendingInvite.promise);
    const buildInviteURL = vi.fn((path: string) => `https://hunin.test${path}`);
    const props = defaultProps({ createInvite, buildInviteURL });
    const { rerender } = render(<PartyInvitePanel {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate invitation' }));
    rerender(<PartyInvitePanel {...props} partyId="party-2" />);
    pendingInvite.resolve(firstInvite);

    await waitFor(() => {
      expect(screen.queryByLabelText('Shareable invite URL')).not.toBeInTheDocument();
      expect(buildInviteURL).not.toHaveBeenCalled();
    });
  });

  it('ignores late copy results after the URL builder changes', async () => {
    const pendingCopy = deferred<void>();
    const copyText = vi.fn().mockReturnValue(pendingCopy.promise);
    const props = defaultProps({ copyText });
    const { rerender } = render(<PartyInvitePanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate invitation' }));
    await screen.findByLabelText('Shareable invite URL');
    fireEvent.click(screen.getByRole('button', { name: 'Copy invitation link' }));

    rerender(
      <PartyInvitePanel
        {...props}
        buildInviteURL={vi.fn((path: string) => `https://new.test${path}`)}
      />,
    );
    pendingCopy.resolve(undefined);

    await waitFor(() => {
      expect(screen.queryByText('Invitation link copied.')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Shareable invite URL')).not.toBeInTheDocument();
    });
  });

  it('ignores late generation after unmounting', async () => {
    const pendingInvite = deferred<PartyInviteDTO>();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderPanel({ createInvite: vi.fn().mockReturnValue(pendingInvite.promise) });
    fireEvent.click(screen.getByRole('button', { name: 'Generate invitation' }));

    unmount();
    pendingInvite.resolve(firstInvite);

    await waitFor(() => {
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
    consoleErrorSpy.mockRestore();
  });

  it('ignores late copy results after unmounting', async () => {
    const pendingCopy = deferred<void>();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = await renderGeneratedInvite({
      copyText: vi.fn().mockReturnValue(pendingCopy.promise),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copy invitation link' }));

    unmount();
    pendingCopy.resolve(undefined);

    await waitFor(() => {
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
    consoleErrorSpy.mockRestore();
  });
});

const renderPanel = (overrides: Partial<Parameters<typeof PartyInvitePanel>[0]> = {}) => {
  return render(<PartyInvitePanel {...defaultProps(overrides)} />);
};

const renderGeneratedInvite = async (
  overrides: Partial<Parameters<typeof PartyInvitePanel>[0]> = {},
) => {
  const result = renderPanel(overrides);
  fireEvent.click(screen.getByRole('button', { name: 'Generate invitation' }));
  await screen.findByLabelText('Shareable invite URL');
  return result;
};

const defaultProps = (
  overrides: Partial<Parameters<typeof PartyInvitePanel>[0]> = {},
): Parameters<typeof PartyInvitePanel>[0] => ({
  partyId: 'party-1',
  currentUserRole: 'gm',
  createInvite: vi.fn().mockResolvedValue(firstInvite),
  buildInviteURL: vi.fn((path: string) => `https://hunin.test${path}`),
  copyText: vi.fn().mockResolvedValue(undefined),
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
