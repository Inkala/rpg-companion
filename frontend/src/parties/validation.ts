export type PartyNameValidationResult =
  | { valid: true; value: string }
  | { valid: false; error: string };

const maximumPartyNameCodePoints = 80;
const unicodeControlCharacter = /\p{Cc}/u;

export const validatePartyName = (name: string): PartyNameValidationResult => {
  if (unicodeControlCharacter.test(name)) {
    return {
      valid: false,
      error: 'Party name cannot contain control characters.',
    };
  }

  const trimmedName = name.trim();

  if (trimmedName === '') {
    return { valid: false, error: 'Enter a party name.' };
  }

  if ([...trimmedName].length > maximumPartyNameCodePoints) {
    return {
      valid: false,
      error: 'Party name must be 80 characters or fewer.',
    };
  }

  return { valid: true, value: trimmedName };
};
