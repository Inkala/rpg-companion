package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
)

type PasswordConfig struct {
	MemoryKiB   uint32
	Iterations  uint32
	Parallelism uint8
	SaltLength  uint32
	KeyLength   uint32
}

func DefaultPasswordConfig() PasswordConfig {
	return PasswordConfig{
		MemoryKiB:   64 * 1024,
		Iterations:  3,
		Parallelism: 1,
		SaltLength:  16,
		KeyLength:   32,
	}
}

func (config PasswordConfig) withDefaults() PasswordConfig {
	defaults := DefaultPasswordConfig()
	if config.MemoryKiB == 0 {
		config.MemoryKiB = defaults.MemoryKiB
	}
	if config.Iterations == 0 {
		config.Iterations = defaults.Iterations
	}
	if config.Parallelism == 0 {
		config.Parallelism = defaults.Parallelism
	}
	if config.SaltLength == 0 {
		config.SaltLength = defaults.SaltLength
	}
	if config.KeyLength == 0 {
		config.KeyLength = defaults.KeyLength
	}
	return config
}

func HashPassword(password string, config PasswordConfig) (string, error) {
	config = config.withDefaults()

	salt := make([]byte, config.SaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	hash := argon2.IDKey([]byte(password), salt, config.Iterations, config.MemoryKiB, config.Parallelism, config.KeyLength)
	encodedSalt := base64.RawStdEncoding.EncodeToString(salt)
	encodedHash := base64.RawStdEncoding.EncodeToString(hash)

	return fmt.Sprintf(
		"$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s",
		config.MemoryKiB,
		config.Iterations,
		config.Parallelism,
		encodedSalt,
		encodedHash,
	), nil
}

func VerifyPassword(password string, encodedHash string) (bool, error) {
	config, salt, expectedHash, err := decodeArgon2idHash(encodedHash)
	if err != nil {
		return false, err
	}

	actualHash := argon2.IDKey([]byte(password), salt, config.Iterations, config.MemoryKiB, config.Parallelism, config.KeyLength)
	if len(actualHash) != len(expectedHash) {
		return false, nil
	}

	return subtle.ConstantTimeCompare(actualHash, expectedHash) == 1, nil
}

func decodeArgon2idHash(encodedHash string) (PasswordConfig, []byte, []byte, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 || parts[0] != "" || parts[1] != "argon2id" || parts[2] != "v=19" {
		return PasswordConfig{}, nil, nil, errors.New("password hash format is invalid")
	}

	config, err := parseParameterSegment(parts[3])
	if err != nil {
		return PasswordConfig{}, nil, nil, err
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return PasswordConfig{}, nil, nil, err
	}
	hash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return PasswordConfig{}, nil, nil, err
	}
	config.SaltLength = uint32(len(salt))
	config.KeyLength = uint32(len(hash))

	return config, salt, hash, nil
}

func parseParameterSegment(segment string) (PasswordConfig, error) {
	values := map[string]string{}
	for _, parameter := range strings.Split(segment, ",") {
		key, value, found := strings.Cut(parameter, "=")
		if !found {
			return PasswordConfig{}, errors.New("password hash parameters are invalid")
		}
		values[key] = value
	}

	memory, err := parseUint32(values["m"])
	if err != nil {
		return PasswordConfig{}, err
	}
	iterations, err := parseUint32(values["t"])
	if err != nil {
		return PasswordConfig{}, err
	}
	parallelism, err := parseUint8(values["p"])
	if err != nil {
		return PasswordConfig{}, err
	}

	return PasswordConfig{
		MemoryKiB:   memory,
		Iterations:  iterations,
		Parallelism: parallelism,
	}, nil
}

func parseUint32(value string) (uint32, error) {
	parsed, err := strconv.ParseUint(value, 10, 32)
	return uint32(parsed), err
}

func parseUint8(value string) (uint8, error) {
	parsed, err := strconv.ParseUint(value, 10, 8)
	return uint8(parsed), err
}
