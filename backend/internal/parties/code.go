package parties

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"io"
)

const (
	InviteCodeAlphabet      = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	inviteCodeLength        = 8
	inviteCodeHashDomain    = "party-invite-code:v1:"
	inviteCodeHashByteCount = sha256.Size
)

var ErrInvalidInviteCode = errors.New("invite code is invalid")

type InviteCodeHashKey struct {
	value [inviteCodeHashByteCount]byte
}

func NewInviteCodeHashKey(value [inviteCodeHashByteCount]byte) InviteCodeHashKey {
	return InviteCodeHashKey{value: value}
}

func (InviteCodeHashKey) String() string {
	return "[REDACTED]"
}

func (InviteCodeHashKey) GoString() string {
	return "[REDACTED]"
}

func NewInviteCode() (string, error) {
	return generateInviteCode(rand.Reader)
}

func generateInviteCode(randomSource io.Reader) (string, error) {
	randomBytes := make([]byte, inviteCodeLength)
	if _, err := io.ReadFull(randomSource, randomBytes); err != nil {
		return "", errors.New("could not generate invite code")
	}

	code := make([]byte, inviteCodeLength)
	for index, randomByte := range randomBytes {
		code[index] = InviteCodeAlphabet[int(randomByte)%len(InviteCodeAlphabet)]
	}
	return string(code), nil
}

func NormalizeInviteCode(input string) (string, error) {
	withoutWhitespace := make([]byte, 0, len(input))
	for index := 0; index < len(input); index++ {
		character := input[index]
		if isASCIIWhitespace(character) {
			continue
		}
		withoutWhitespace = append(withoutWhitespace, character)
	}

	if len(withoutWhitespace) == inviteCodeLength+1 {
		if withoutWhitespace[4] != '-' {
			return "", ErrInvalidInviteCode
		}
		withoutWhitespace = append(withoutWhitespace[:4], withoutWhitespace[5:]...)
	}
	if len(withoutWhitespace) != inviteCodeLength {
		return "", ErrInvalidInviteCode
	}

	canonical := make([]byte, inviteCodeLength)
	for index, character := range withoutWhitespace {
		if character >= 'a' && character <= 'z' {
			character -= 'a' - 'A'
		}
		if !isInviteCodeCharacter(character) {
			return "", ErrInvalidInviteCode
		}
		canonical[index] = character
	}

	return string(canonical), nil
}

func FormatInviteCode(input string) (string, error) {
	canonical, err := NormalizeInviteCode(input)
	if err != nil {
		return "", err
	}
	return canonical[:4] + "-" + canonical[4:], nil
}

func InviteCodeHash(key InviteCodeHashKey, input string) ([]byte, error) {
	canonical, err := NormalizeInviteCode(input)
	if err != nil {
		return nil, err
	}

	digest := hmac.New(sha256.New, key.value[:])
	_, _ = digest.Write([]byte(inviteCodeHashDomain))
	_, _ = digest.Write([]byte(canonical))
	return digest.Sum(nil), nil
}

func isASCIIWhitespace(character byte) bool {
	switch character {
	case ' ', '\t', '\n', '\r', '\v', '\f':
		return true
	default:
		return false
	}
}

func isInviteCodeCharacter(character byte) bool {
	for index := 0; index < len(InviteCodeAlphabet); index++ {
		if InviteCodeAlphabet[index] == character {
			return true
		}
	}
	return false
}
