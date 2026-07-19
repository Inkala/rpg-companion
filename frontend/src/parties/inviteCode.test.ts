import { describe, expect, it } from 'vitest';
import { normalizeInviteCode } from './inviteCode';

describe('normalizeInviteCode', () => {
  it.each([
    ['abcd-efgh', 'ABCDEFGH'],
    [' abcd efgh ', 'ABCDEFGH'],
    ['ABCD\t-\nEFGH', 'ABCDEFGH'],
    ['abcdefgh', 'ABCDEFGH'],
  ])('normalizes %j to the canonical code', (input, expected) => {
    expect(normalizeInviteCode(input)).toEqual({ ok: true, value: expected });
  });

  it.each([
    'ABC',
    'ABCD-EFGH-J',
    'ABCD_EFGH',
    'ABCD--EFGH',
    'ABCI-EFGH',
    'ABCO-EFGH',
    'ABC0-EFGH',
    'ABC1-EFGH',
    'ＡBCD-EFGH',
  ])('rejects malformed or ambiguous input %j', (input) => {
    expect(normalizeInviteCode(input)).toEqual({
      ok: false,
      error: 'Enter the eight-character invitation code using letters and numbers.',
    });
  });
});
