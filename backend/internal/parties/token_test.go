package parties

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"strings"
	"testing"
)

func TestNewInviteTokenProducesValidURLSafeToken(t *testing.T) {
	token, err := NewInviteToken()
	if err != nil {
		t.Fatalf("generate invite token: %v", err)
	}

	if len(token) != 43 {
		t.Fatalf("expected a 43-character invite token, got length %d", len(token))
	}
	if strings.ContainsAny(token, "+/=") {
		t.Fatal("expected an unpadded URL-safe invite token")
	}

	decoded, err := DecodeInviteToken(token)
	if err != nil {
		t.Fatalf("decode generated invite token: %v", err)
	}
	if len(decoded) != 32 {
		t.Fatalf("expected 32 decoded bytes, got %d", len(decoded))
	}
}

func TestDecodeInviteTokenRequiresExactly32Bytes(t *testing.T) {
	valid := base64.RawURLEncoding.EncodeToString(bytes.Repeat([]byte{0x5a}, 32))

	tests := []struct {
		name  string
		token string
	}{
		{name: "empty", token: ""},
		{name: "invalid alphabet", token: strings.Repeat("a", 42) + "+"},
		{name: "padded", token: valid + "="},
		{name: "31 decoded bytes", token: base64.RawURLEncoding.EncodeToString(bytes.Repeat([]byte{0x5a}, 31))},
		{name: "33 decoded bytes", token: base64.RawURLEncoding.EncodeToString(bytes.Repeat([]byte{0x5a}, 33))},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := DecodeInviteToken(tt.token); err == nil {
				t.Fatal("expected invite token validation to fail")
			}
		})
	}
}

func TestInviteTokenHashUsesSHA256ForValidToken(t *testing.T) {
	rawBytes := bytes.Repeat([]byte{0x3c}, 32)
	token := base64.RawURLEncoding.EncodeToString(rawBytes)

	hash, err := InviteTokenHash(token)
	if err != nil {
		t.Fatalf("hash valid invite token: %v", err)
	}

	expected := sha256.Sum256([]byte(token))
	if !bytes.Equal(hash, expected[:]) {
		t.Fatal("invite token hash does not match SHA-256")
	}
}

func TestInviteTokenErrorsDoNotExposeRawToken(t *testing.T) {
	rawToken := "private-invite-token-value"

	_, err := InviteTokenHash(rawToken)
	if err == nil {
		t.Fatal("expected invalid invite token to be rejected")
	}
	if strings.Contains(err.Error(), rawToken) {
		t.Fatal("invite token validation error exposed the raw token")
	}
}
