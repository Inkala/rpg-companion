package auth

import (
	"strings"
	"unicode/utf8"
)

const (
	minPasswordLength = 8
	maxPasswordLength = 128
)

func normalizeUsername(username string) (string, string, bool) {
	display := strings.TrimSpace(username)
	if len(display) < 3 || len(display) > 32 {
		return "", "", false
	}
	if !isASCIIUsername(display) {
		return "", "", false
	}

	return strings.ToLower(display), display, true
}

func isASCIIUsername(username string) bool {
	for _, character := range username {
		switch {
		case character >= 'a' && character <= 'z':
		case character >= 'A' && character <= 'Z':
		case character >= '0' && character <= '9':
		case character == '_' || character == '-':
		default:
			return false
		}
	}
	return true
}

func validatePassword(password string) bool {
	passwordLength := utf8.RuneCountInString(password)
	if passwordLength < minPasswordLength || passwordLength > maxPasswordLength {
		return false
	}

	hasUppercase := false
	hasLowercase := false
	hasDigit := false
	hasSpecial := false
	for _, character := range password {
		switch {
		case character >= 'A' && character <= 'Z':
			hasUppercase = true
		case character >= 'a' && character <= 'z':
			hasLowercase = true
		case character >= '0' && character <= '9':
			hasDigit = true
		default:
			hasSpecial = true
		}
	}

	return hasUppercase && hasLowercase && hasDigit && hasSpecial
}

func normalizeEmail(email string) (string, bool) {
	canonical := strings.ToLower(strings.TrimSpace(email))
	if len(canonical) < 3 || len(canonical) > 254 {
		return "", false
	}
	if strings.ContainsAny(canonical, " \t\r\n") {
		return "", false
	}

	at := strings.IndexByte(canonical, '@')
	if at <= 0 || at != strings.LastIndexByte(canonical, '@') || at == len(canonical)-1 {
		return "", false
	}

	domain := canonical[at+1:]
	if strings.HasPrefix(domain, ".") || strings.HasSuffix(domain, ".") || !strings.Contains(domain, ".") {
		return "", false
	}

	return canonical, true
}

func isEmailIdentifier(identifier string) bool {
	return strings.Contains(identifier, "@")
}
