package parties

import (
	"errors"
	"strings"
	"testing"
	"unicode/utf8"
)

func TestNormalizePartyNameTrimsWhitespace(t *testing.T) {
	name, err := NormalizePartyName("  The Lantern Keep  ")
	if err != nil {
		t.Fatalf("normalize valid party name: %v", err)
	}
	if name != "The Lantern Keep" {
		t.Fatalf("expected trimmed party name, got %q", name)
	}
}

func TestNormalizePartyNameRequiresOneTo80UnicodeCodePoints(t *testing.T) {
	eightyCodePoints := strings.Repeat("é", 80)
	name, err := NormalizePartyName(eightyCodePoints)
	if err != nil {
		t.Fatalf("normalize 80-code-point party name: %v", err)
	}
	if utf8.RuneCountInString(name) != 80 {
		t.Fatalf("expected 80 code points, got %d", utf8.RuneCountInString(name))
	}

	tests := []struct {
		name  string
		input string
	}{
		{name: "empty", input: ""},
		{name: "whitespace only", input: "   \n\t"},
		{name: "81 Unicode code points", input: strings.Repeat("界", 81)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := NormalizePartyName(tt.input); !errors.Is(err, ErrInvalidPartyName) {
				t.Fatalf("expected ErrInvalidPartyName, got %v", err)
			}
		})
	}
}

func TestNormalizePartyNameRejectsUnicodeControlCharacters(t *testing.T) {
	tests := []struct {
		name  string
		input string
	}{
		{name: "embedded newline", input: "The\nKeep"},
		{name: "embedded tab", input: "The\tKeep"},
		{name: "embedded null", input: "The\x00Keep"},
		{name: "trailing newline", input: "The Keep\n"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := NormalizePartyName(tt.input); !errors.Is(err, ErrInvalidPartyName) {
				t.Fatalf("expected ErrInvalidPartyName, got %v", err)
			}
		})
	}
}

func TestNormalizePartyNameRejectsInvalidUTF8(t *testing.T) {
	if _, err := NormalizePartyName(string([]byte{0xff})); !errors.Is(err, ErrInvalidPartyName) {
		t.Fatalf("expected ErrInvalidPartyName, got %v", err)
	}
}
