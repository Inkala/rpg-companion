export type InviteCredential =
  | { kind: 'token'; value: string }
  | { kind: 'code'; value: string };

type InviteCodeResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

const inviteCodeAlphabet = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
const inviteCodeError =
  'Enter the eight-character invitation code using letters and numbers.';

export const normalizeInviteCode = (input: string): InviteCodeResult => {
  if (!Array.from(input).every((character) => character.charCodeAt(0) <= 0x7f)) {
    return { ok: false, error: inviteCodeError };
  }

  const compact = input.replace(/[\t\n\v\f\r ]/g, '').toUpperCase();
  const canonical =
    compact.length === 9 && compact[4] === '-'
      ? `${compact.slice(0, 4)}${compact.slice(5)}`
      : compact;

  if (!inviteCodeAlphabet.test(canonical)) {
    return { ok: false, error: inviteCodeError };
  }

  return { ok: true, value: canonical };
};

export const inviteCredentialsMatch = (
  left: InviteCredential | null,
  right: InviteCredential | null,
) => {
  return left?.kind === right?.kind && left?.value === right?.value;
};
