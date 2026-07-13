package parties

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
)

const inviteTokenByteLength = 32

var ErrInvalidInviteToken = errors.New("invite token is invalid")

func NewInviteToken() (string, error) {
	tokenBytes := make([]byte, inviteTokenByteLength)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", errors.New("could not generate invite token")
	}

	return base64.RawURLEncoding.EncodeToString(tokenBytes), nil
}

func DecodeInviteToken(token string) ([]byte, error) {
	if len(token) != base64.RawURLEncoding.EncodedLen(inviteTokenByteLength) {
		return nil, ErrInvalidInviteToken
	}

	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil || len(decoded) != inviteTokenByteLength {
		return nil, ErrInvalidInviteToken
	}
	if base64.RawURLEncoding.EncodeToString(decoded) != token {
		return nil, ErrInvalidInviteToken
	}

	return decoded, nil
}

func InviteTokenHash(token string) ([]byte, error) {
	if _, err := DecodeInviteToken(token); err != nil {
		return nil, err
	}

	hash := sha256.Sum256([]byte(token))
	return hash[:], nil
}
