package auth

import (
	"strings"
	"testing"
)

func TestNormalizeUsername(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		wantCanonical string
		wantDisplay   string
		wantValid     bool
	}{
		{
			name:          "trims and canonicalizes",
			input:         "  Mara-Scout_1  ",
			wantCanonical: "mara-scout_1",
			wantDisplay:   "Mara-Scout_1",
			wantValid:     true,
		},
		{
			name:      "too short",
			input:     "ma",
			wantValid: false,
		},
		{
			name:      "too long",
			input:     strings.Repeat("a", 33),
			wantValid: false,
		},
		{
			name:      "non ASCII",
			input:     "mára",
			wantValid: false,
		},
		{
			name:      "spaces inside",
			input:     "mara scout",
			wantValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			canonical, display, valid := normalizeUsername(tt.input)

			if valid != tt.wantValid {
				t.Fatalf("expected valid %t, got %t", tt.wantValid, valid)
			}
			if canonical != tt.wantCanonical {
				t.Fatalf("expected canonical %q, got %q", tt.wantCanonical, canonical)
			}
			if display != tt.wantDisplay {
				t.Fatalf("expected display %q, got %q", tt.wantDisplay, display)
			}
		})
	}
}

func TestNormalizeEmail(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		wantEmail string
		wantValid bool
	}{
		{
			name:      "trims and canonicalizes",
			input:     "  Mara@Example.COM  ",
			wantEmail: "mara@example.com",
			wantValid: true,
		},
		{
			name:      "missing at",
			input:     "mara.example.com",
			wantValid: false,
		},
		{
			name:      "multiple at signs",
			input:     "mara@@example.com",
			wantValid: false,
		},
		{
			name:      "missing domain dot",
			input:     "mara@example",
			wantValid: false,
		},
		{
			name:      "domain starts with dot",
			input:     "mara@.example.com",
			wantValid: false,
		},
		{
			name:      "domain ends with dot",
			input:     "mara@example.com.",
			wantValid: false,
		},
		{
			name:      "contains whitespace",
			input:     "mara @example.com",
			wantValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			email, valid := normalizeEmail(tt.input)

			if valid != tt.wantValid {
				t.Fatalf("expected valid %t, got %t", tt.wantValid, valid)
			}
			if email != tt.wantEmail {
				t.Fatalf("expected email %q, got %q", tt.wantEmail, email)
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name      string
		password  string
		wantValid bool
	}{
		{
			name:      "valid password",
			password:  "Correct1!",
			wantValid: true,
		},
		{
			name:      "too short",
			password:  "Aa1!",
			wantValid: false,
		},
		{
			name:      "too long",
			password:  "Aa1!" + strings.Repeat("x", 125),
			wantValid: false,
		},
		{
			name:      "missing uppercase",
			password:  "lowercase1!",
			wantValid: false,
		},
		{
			name:      "missing lowercase",
			password:  "UPPERCASE1!",
			wantValid: false,
		},
		{
			name:      "missing digit",
			password:  "NoNumber!",
			wantValid: false,
		},
		{
			name:      "missing special",
			password:  "NoSpecial1",
			wantValid: false,
		},
		{
			name:      "unicode special counts as one character",
			password:  "ValidPass1ñ",
			wantValid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := validatePassword(tt.password); got != tt.wantValid {
				t.Fatalf("expected valid %t, got %t", tt.wantValid, got)
			}
		})
	}
}

func TestIsEmailIdentifier(t *testing.T) {
	tests := []struct {
		identifier string
		want       bool
	}{
		{identifier: "mara", want: false},
		{identifier: "mara@example.com", want: true},
		{identifier: "not-an-email@", want: true},
	}

	for _, tt := range tests {
		t.Run(tt.identifier, func(t *testing.T) {
			if got := isEmailIdentifier(tt.identifier); got != tt.want {
				t.Fatalf("expected %t, got %t", tt.want, got)
			}
		})
	}
}
