import { describe, expect, it } from 'vitest';
import { validatePartyName } from './validation';

describe('validatePartyName', () => {
  it('trims surrounding whitespace', () => {
    expect(validatePartyName('  The Lantern Guard  ')).toEqual({
      valid: true,
      value: 'The Lantern Guard',
    });
  });

  it('rejects an empty name after trimming', () => {
    expect(validatePartyName('   ')).toEqual({
      valid: false,
      error: 'Enter a party name.',
    });
  });

  it('accepts names from 1 to 80 Unicode code points', () => {
    expect(validatePartyName('A')).toEqual({ valid: true, value: 'A' });

    const eightyCodePoints = `${'a'.repeat(79)}🐉`;
    expect(validatePartyName(eightyCodePoints)).toEqual({
      valid: true,
      value: eightyCodePoints,
    });
  });

  it('rejects names longer than 80 Unicode code points', () => {
    const eightyOneCodePoints = `${'a'.repeat(80)}🐉`;

    expect(validatePartyName(eightyOneCodePoints)).toEqual({
      valid: false,
      error: 'Party name must be 80 characters or fewer.',
    });
  });

  it('counts Unicode code points instead of UTF-16 code units', () => {
    const eightyEmoji = '🐉'.repeat(80);

    expect(eightyEmoji.length).toBe(160);
    expect(validatePartyName(eightyEmoji)).toEqual({
      valid: true,
      value: eightyEmoji,
    });
  });

  it('rejects Unicode control characters', () => {
    expect(validatePartyName('Lantern\u0000Guard')).toEqual({
      valid: false,
      error: 'Party name cannot contain control characters.',
    });
    expect(validatePartyName('Lantern\nGuard')).toEqual({
      valid: false,
      error: 'Party name cannot contain control characters.',
    });
  });

  it('rejects a trailing newline before trimming', () => {
    expect(validatePartyName('Lantern Guard\n')).toEqual({
      valid: false,
      error: 'Party name cannot contain control characters.',
    });
  });

  it('rejects a trailing tab before trimming', () => {
    expect(validatePartyName('Lantern Guard\t')).toEqual({
      valid: false,
      error: 'Party name cannot contain control characters.',
    });
  });
});
