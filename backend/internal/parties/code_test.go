package parties

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"errors"
	"strings"
	"testing"
)

func TestNormalizeInviteCodeAcceptsApprovedRepresentations(t *testing.T) {
	tests := []struct {
		name  string
		input string
	}{
		{name: "canonical", input: "ABCD2345"},
		{name: "lowercase", input: "abcd2345"},
		{name: "display hyphen", input: "ABCD-2345"},
		{name: "ASCII whitespace", input: " \t a b c d - 2 3 4 5\r\n\v\f"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			code, err := NormalizeInviteCode(tt.input)
			if err != nil {
				t.Fatalf("normalize approved invite code: %v", err)
			}
			if code != "ABCD2345" {
				t.Fatalf("expected canonical code ABCD2345, got %q", code)
			}
		})
	}
}

func TestNormalizeInviteCodeRejectsUnexpectedInputWithoutExposure(t *testing.T) {
	tests := []struct {
		name  string
		input string
	}{
		{name: "empty"},
		{name: "short", input: "ABCD234"},
		{name: "long", input: "ABCD23456"},
		{name: "excluded I", input: "ABCI2345"},
		{name: "excluded O", input: "ABCO2345"},
		{name: "excluded zero", input: "ABCD2305"},
		{name: "excluded one", input: "ABCD2315"},
		{name: "misplaced hyphen", input: "ABC-D2345"},
		{name: "repeated hyphen", input: "ABCD--2345"},
		{name: "other punctuation", input: "ABCD_2345"},
		{name: "non-ASCII whitespace", input: "ABCD\u00a02345"},
		{name: "Unicode full-width lookalike", input: "ＡBCD2345"},
		{name: "Unicode Cyrillic lookalike", input: "АBCD2345"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NormalizeInviteCode(tt.input)
			if !errors.Is(err, ErrInvalidInviteCode) {
				t.Fatalf("expected ErrInvalidInviteCode, got %v", err)
			}
			if tt.input != "" && strings.Contains(err.Error(), tt.input) {
				t.Fatal("invite code validation error exposed the submitted code")
			}
		})
	}
}

func TestFormatInviteCodeUsesApprovedDisplay(t *testing.T) {
	formatted, err := FormatInviteCode("abcd2345")
	if err != nil {
		t.Fatalf("format invite code: %v", err)
	}
	if formatted != "ABCD-2345" {
		t.Fatalf("expected ABCD-2345, got %q", formatted)
	}
}

func TestGenerateInviteCodeMapsCryptographicBytesWithoutBias(t *testing.T) {
	code, err := generateInviteCode(bytes.NewReader([]byte{0, 1, 2, 3, 4, 5, 6, 7}))
	if err != nil {
		t.Fatalf("generate deterministic invite code: %v", err)
	}
	if code != "ABCDEFGH" {
		t.Fatalf("expected alphabet mapping ABCDEFGH, got %q", code)
	}
}

func TestNewInviteCodeProducesEightUnambiguousCharacters(t *testing.T) {
	seen := make(map[string]struct{})
	for range 64 {
		code, err := NewInviteCode()
		if err != nil {
			t.Fatalf("generate invite code: %v", err)
		}
		if len(code) != 8 {
			t.Fatalf("expected eight characters, got %q", code)
		}
		for _, character := range code {
			if !strings.ContainsRune(InviteCodeAlphabet, character) {
				t.Fatalf("generated code %q contains character outside approved alphabet", code)
			}
		}
		seen[code] = struct{}{}
	}
	if len(seen) == 1 {
		t.Fatal("cryptographic generator repeated the same code for every sample")
	}
}

func TestGenerateInviteCodeFailsClosedWhenRandomSourceFails(t *testing.T) {
	privateError := errors.New("private-random-source-marker")
	_, err := generateInviteCode(failingInviteCodeReader{err: privateError})
	if err == nil {
		t.Fatal("expected random-source failure")
	}
	if errors.Is(err, privateError) || strings.Contains(err.Error(), privateError.Error()) {
		t.Fatal("invite code generation error exposed internal random-source detail")
	}
}

func TestInviteCodeHashUsesDomainSeparatedHMACSHA256(t *testing.T) {
	keyBytes := [32]byte{}
	for index := range keyBytes {
		keyBytes[index] = byte(index + 1)
	}
	key := NewInviteCodeHashKey(keyBytes)

	hash, err := InviteCodeHash(key, "abcd-2345")
	if err != nil {
		t.Fatalf("hash invite code: %v", err)
	}

	expectedMAC := hmac.New(sha256.New, keyBytes[:])
	_, _ = expectedMAC.Write([]byte("party-invite-code:v1:ABCD2345"))
	if !hmac.Equal(hash, expectedMAC.Sum(nil)) {
		t.Fatal("invite code hash does not match the approved domain-separated HMAC")
	}
	if bytes.Equal(hash, []byte("ABCD2345")) {
		t.Fatal("invite code hash exposed the canonical credential")
	}
}

type failingInviteCodeReader struct {
	err error
}

func (reader failingInviteCodeReader) Read([]byte) (int, error) {
	return 0, reader.err
}
