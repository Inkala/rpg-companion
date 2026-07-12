import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PartyInviteDTO } from './apiTypes';
import { PartyInvitePanel } from './PartyInvitePanel';

const firstToken = 'a'.repeat(43);
const secondToken = 'b'.repeat(43);

const firstInvite: PartyInviteDTO = {
  token: firstToken,
  createdAt: '2026-07-12T10:00:00Z',
  expiresAt: '2026-07-19T10:00:00Z',
};

const secondInvite: PartyInviteDTO = {
  token: secondToken,
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
    const generateButton = screen.getByRole('button', { name: 'Generate invite link' });
    fireEvent.click(generateButton);
    fireEvent.click(generateButton);

    expect(screen.getByRole('status')).toHaveTextContent('Creating invite link...');
    expect(screen.getByRole('button', { name: 'Generating invite link...' })).toBeDisabled();
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

  it('shows a safe recoverable generation error and retries', async () => {
    const createInvite = vi
      .fn()
      .mockRejectedValueOnce(new Error(`backend leaked ${firstToken}`))
      .mockResolvedValueOnce(firstInvite);

    renderPanel({ createInvite });
    fireEvent.click(screen.getByRole('button', { name: 'Generate invite link' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not create an invite link. Please try again.');
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

    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));

    await waitFor(() => {
      expect(copyText).toHaveBeenCalledWith(`https://hunin.test/parties/join#${firstToken}`);
      expect(screen.getByRole('status')).toHaveTextContent('Invite link copied.');
    });
  });

  it('announces copy failure without exposing rejected error details', async () => {
    const copyText = vi.fn().mockRejectedValue(new Error(`clipboard leaked ${firstToken}`));
    await renderGeneratedInvite({ copyText });

    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not copy the invite link. Copy it manually instead.');
    expect(alert).not.toHaveTextContent('clipboard leaked');
  });

  it('regenerates, hides the previous URL while pending, and replaces it on success', async () => {
    const regeneration = deferred<PartyInviteDTO>();
    const createInvite = vi
      .fn()
      .mockResolvedValueOnce(firstInvite)
      .mockReturnValueOnce(regeneration.promise);
    await renderGeneratedInvite({ createInvite });

    expect(screen.getByText('Regenerating invalidates the previous link.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate invite link' }));

    expect(screen.queryByDisplayValue(/parties\/join/)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Creating invite link...');

    await act(async () => {
      regeneration.resolve(secondInvite);
      await regeneration.promise;
    });

    expect(screen.getByLabelText('Shareable invite URL')).toHaveValue(
      `https://hunin.test/parties/join#${secondToken}`,
    );
    expect(screen.queryByDisplayValue(`https://hunin.test/parties/join#${firstToken}`)).not.toBeInTheDocument();
  });

  it.each(['partyId', 'role', 'creator', 'builder'] as const)(
    'immediately hides stale invite data when %s changes',
    async (changedProperty) => {
      const props = defaultProps();
      const { rerender } = render(<PartyInvitePanel {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Generate invite link' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Generate invite link' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Generate invite link' }));
    await screen.findByLabelText('Shareable invite URL');
    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));

    rerender(
      <PartyInvitePanel
        {...props}
        buildInviteURL={vi.fn((path: string) => `https://new.test${path}`)}
      />,
    );
    pendingCopy.resolve(undefined);

    await waitFor(() => {
      expect(screen.queryByText('Invite link copied.')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Shareable invite URL')).not.toBeInTheDocument();
    });
  });

  it('ignores late generation after unmounting', async () => {
    const pendingInvite = deferred<PartyInviteDTO>();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderPanel({ createInvite: vi.fn().mockReturnValue(pendingInvite.promise) });
    fireEvent.click(screen.getByRole('button', { name: 'Generate invite link' }));

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
    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));

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
  fireEvent.click(screen.getByRole('button', { name: 'Generate invite link' }));
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
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};
