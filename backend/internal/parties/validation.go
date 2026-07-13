package parties

import (
	"errors"
	"strings"
	"unicode"
	"unicode/utf8"
)

const maxPartyNameLength = 80

var ErrInvalidPartyName = errors.New("party name is invalid")

func NormalizePartyName(value string) (string, error) {
	if !utf8.ValidString(value) {
		return "", ErrInvalidPartyName
	}
	for _, character := range value {
		if unicode.IsControl(character) {
			return "", ErrInvalidPartyName
		}
	}

	name := strings.TrimSpace(value)
	length := utf8.RuneCountInString(name)
	if length < 1 || length > maxPartyNameLength {
		return "", ErrInvalidPartyName
	}

	return name, nil
}
