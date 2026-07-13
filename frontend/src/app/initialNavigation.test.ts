import { describe, expect, it, vi } from 'vitest';
import { prepareInitialNavigation } from './initialNavigation';

const validToken = `${'a'.repeat(41)}_-`;

describe('prepareInitialNavigation', () => {
  it('captures a valid join token once and immediately scrubs it', () => {
    const context = navigationContext('/parties/join', `#${validToken}`);

    expect(prepareInitialNavigation(context)).toEqual({
      route: { name: 'join-party' },
      inviteToken: validToken,
    });
    expect(context.history.replaceState).toHaveBeenCalledOnce();
    expect(context.history.replaceState).toHaveBeenCalledWith(
      context.history.state,
      '',
      '/parties/join',
    );
  });

  it('preserves the pathname, query, and existing history state while scrubbing', () => {
    const state = { navigationId: 7, nested: { preserved: true } };
    const context = navigationContext('/parties/join', `#${validToken}`, {
      search: '?source=shared&mode=compact',
      state,
    });

    prepareInitialNavigation(context);

    expect(context.history.replaceState).toHaveBeenCalledWith(
      state,
      '',
      '/parties/join?source=shared&mode=compact',
    );
  });

  it.each(['', '#not-an-invite', `#invite=${validToken}`, `#${validToken}&extra=true`])(
    'scrubs invalid or unexpected fragment %s and returns no token',
    (hash) => {
      const context = navigationContext('/parties/join', hash);

      expect(prepareInitialNavigation(context)).toEqual({
        route: { name: 'join-party' },
        inviteToken: null,
      });
      expect(context.history.replaceState).toHaveBeenCalledOnce();
      expect(context.history.replaceState).toHaveBeenCalledWith(
        context.history.state,
        '',
        '/parties/join',
      );
    },
  );

  it('discards a valid invite token captured on a non-join route', () => {
    const context = navigationContext('/parties/party-123', `#${validToken}`);

    expect(prepareInitialNavigation(context)).toEqual({
      route: { name: 'party', partyId: 'party-123' },
      inviteToken: null,
    });
    expect(context.history.replaceState).toHaveBeenCalledOnce();
    expect(context.history.replaceState).toHaveBeenCalledWith(
      context.history.state,
      '',
      '/parties/party-123',
    );
  });

  it('never writes a replacement URL containing the token', () => {
    const context = navigationContext('/parties/join', `#${validToken}`, {
      search: '?source=shared',
    });

    prepareInitialNavigation(context);

    const replacementUrl = context.history.replaceState.mock.calls[0][2];
    expect(replacementUrl).toBe('/parties/join?source=shared');
    expect(String(replacementUrl)).not.toContain(validToken);
    expect(String(replacementUrl)).not.toContain('#');
  });

  it('does not throw for malformed route encodings or fragments', () => {
    const context = navigationContext('/parties/%E0%A4%A', '#%E0%A4%A');

    expect(() => prepareInitialNavigation(context)).not.toThrow();
    expect(context.history.replaceState).toHaveBeenCalledOnce();

    const validFragmentContext = navigationContext('/parties/%', `#${validToken}`);
    expect(prepareInitialNavigation(validFragmentContext)).toEqual({
      route: { name: 'not-found' },
      inviteToken: null,
    });
    expect(validFragmentContext.history.replaceState).toHaveBeenCalledOnce();
  });
});

const navigationContext = (
  pathname: string,
  hash: string,
  overrides: Partial<{ search: string; state: unknown }> = {},
) => {
  return {
    location: {
      hash,
      pathname,
      search: overrides.search ?? '',
    },
    history: {
      state: overrides.state ?? { preserved: true },
      replaceState: vi.fn(),
    },
  };
};
