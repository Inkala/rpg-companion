export const passwordPolicyMessage =
  'Use 8–128 characters with an uppercase letter, lowercase letter, number, and special character.';

export const usernamePolicyMessage =
  'Username must be 3–32 characters and use only English letters, numbers, underscores, or hyphens.';

export const emailPolicyMessage = 'Enter a valid email address.';

export const validateRegistrationUsername = (username: string) => {
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 32) {
    return usernamePolicyMessage;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return usernamePolicyMessage;
  }
  return null;
};

export const validateRegistrationEmail = (email: string) => {
  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 254) {
    return emailPolicyMessage;
  }
  if (/\s/.test(trimmed)) {
    return emailPolicyMessage;
  }
  const at = trimmed.indexOf('@');
  if (at <= 0 || at !== trimmed.lastIndexOf('@') || at === trimmed.length - 1) {
    return emailPolicyMessage;
  }
  const domain = trimmed.slice(at + 1);
  if (domain.startsWith('.') || domain.endsWith('.') || !domain.includes('.')) {
    return emailPolicyMessage;
  }
  return null;
};

export const validateRegistrationPassword = (password: string) => {
  const characters = Array.from(password);
  if (characters.length < 8 || characters.length > 128) {
    return passwordPolicyMessage;
  }

  let hasUppercase = false;
  let hasLowercase = false;
  let hasDigit = false;
  let hasSpecial = false;
  for (const character of characters) {
    if (character >= 'A' && character <= 'Z') {
      hasUppercase = true;
    } else if (character >= 'a' && character <= 'z') {
      hasLowercase = true;
    } else if (character >= '0' && character <= '9') {
      hasDigit = true;
    } else {
      hasSpecial = true;
    }
  }

  return hasUppercase && hasLowercase && hasDigit && hasSpecial ? null : passwordPolicyMessage;
};
