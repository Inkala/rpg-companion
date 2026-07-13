import { describe, expect, it, vi } from 'vitest';
import { captureAndScrubInviteFragment } from './inviteFragment';

const validToken = `${'a'.repeat(41)}_-`;

describe('captureAndScrubInviteFragment', () => {
  it('returns one valid unpadded base64url token and immediately scrubs the fragment', () => {
    const context = fragmentContext(`#${validToken}`);

    expect(captureAndScrubInviteFragment(context)).toBe(validToken);
    expect(context.history.replaceState).toHaveBeenCalledOnce();
    expect(context.history.replaceState).toHaveBeenCalledWith(
      context.history.state,
      '',
      '/parties/join',
    );
  });

  it('returns null for an empty fragment and still replaces the fragment-free URL', () => {
    const context = fragmentContext('');

    expect(captureAndScrubInviteFragment(context)).toBeNull();
    expect(context.history.replaceState).toHaveBeenCalledWith(
      context.history.state,
      '',
      '/parties/join',
    );
  });

  it.each([
    '#not-an-invite',
    `#invite=${validToken}`,
    `#${validToken}&unexpected=true`,
    validToken,
    '#%61%62%63',
  ])('scrubs malformed or unexpected fragment %s', (hash) => {
    const context = fragmentContext(hash);

    expect(captureAndScrubInviteFragment(context)).toBeNull();
    expect(context.history.replaceState).toHaveBeenCalledWith(
      context.history.state,
      '',
      '/parties/join',
    );
  });

  it('rejects and scrubs a padded token', () => {
    const context = fragmentContext(`#${validToken}=`);

    expect(captureAndScrubInviteFragment(context)).toBeNull();
    expect(context.history.replaceState).toHaveBeenCalledOnce();
  });

  it.each([42, 44])('rejects and scrubs a token with %i characters', (length) => {
    const context = fragmentContext(`#${'a'.repeat(length)}`);

    expect(captureAndScrubInviteFragment(context)).toBeNull();
    expect(context.history.replaceState).toHaveBeenCalledOnce();
  });

  it('preserves the current pathname', () => {
    const context = fragmentContext(`#${validToken}`, {
      pathname: '/nested/party/invite',
    });

    captureAndScrubInviteFragment(context);

    expect(context.history.replaceState).toHaveBeenCalledWith(
      context.history.state,
      '',
      '/nested/party/invite',
    );
  });

  it('preserves the current query string', () => {
    const context = fragmentContext(`#${validToken}`, {
      search: '?returnTo=party&source=shared',
    });

    captureAndScrubInviteFragment(context);

    expect(context.history.replaceState).toHaveBeenCalledWith(
      context.history.state,
      '',
      '/parties/join?returnTo=party&source=shared',
    );
  });

  it('never includes the token in the replacement URL', () => {
    const context = fragmentContext(`#${validToken}`, {
      pathname: '/parties/join',
      search: '?source=shared',
    });

    captureAndScrubInviteFragment(context);

    const replacementUrl = context.history.replaceState.mock.calls[0][2];
    expect(replacementUrl).toBe('/parties/join?source=shared');
    expect(String(replacementUrl)).not.toContain(validToken);
  });
});

const fragmentContext = (
  hash: string,
  overrides: Partial<{ pathname: string; search: string }> = {},
) => {
  return {
    location: {
      hash,
      pathname: overrides.pathname ?? '/parties/join',
      search: overrides.search ?? '',
    },
    history: {
      state: { preserved: true },
      replaceState: vi.fn(),
    },
  };
};
