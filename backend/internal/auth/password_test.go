package auth

import (
	"strings"
	"testing"
)

func TestHashPasswordUsesEncodedArgon2idFormat(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple", testPasswordConfig())
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	if !strings.HasPrefix(hash, "$argon2id$v=19$m=1024,t=1,p=1$") {
		t.Fatalf("unexpected hash format: %s", hash)
	}

	matches, err := VerifyPassword("correct horse battery staple", hash)
	if err != nil {
		t.Fatalf("verify password: %v", err)
	}
	if !matches {
		t.Fatal("expected password to verify")
	}
}

func TestVerifyPasswordRejectsWrongPassword(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple", testPasswordConfig())
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	matches, err := VerifyPassword("wrong password", hash)
	if err != nil {
		t.Fatalf("verify password: %v", err)
	}
	if matches {
		t.Fatal("expected wrong password to be rejected")
	}
}

func TestDummyPasswordHashIsDeterministicAndUsesConfiguredCost(t *testing.T) {
	config := PasswordConfig{
		MemoryKiB:   2048,
		Iterations:  2,
		Parallelism: 2,
		SaltLength:  12,
		KeyLength:   24,
	}

	first := dummyPasswordHash(config)
	second := dummyPasswordHash(config)
	if first != second {
		t.Fatal("expected deterministic dummy password hash")
	}

	parsedConfig, salt, hash, err := decodeArgon2idHash(first)
	if err != nil {
		t.Fatalf("decode dummy password hash: %v", err)
	}
	if parsedConfig != config {
		t.Fatalf("expected configured Argon2 cost %+v, got %+v", config, parsedConfig)
	}
	if len(salt) != int(config.SaltLength) {
		t.Fatalf("expected salt length %d, got %d", config.SaltLength, len(salt))
	}
	if len(hash) != int(config.KeyLength) {
		t.Fatalf("expected key length %d, got %d", config.KeyLength, len(hash))
	}

	matches, err := VerifyPassword(publicDummyPassword, first)
	if err != nil {
		t.Fatalf("verify public dummy password: %v", err)
	}
	if !matches {
		t.Fatal("expected public dummy password to match deterministic dummy hash")
	}
}

func BenchmarkHashPasswordDefault(b *testing.B) {
	config := DefaultPasswordConfig()
	for i := 0; i < b.N; i++ {
		if _, err := HashPassword("benchmark password with realistic length", config); err != nil {
			b.Fatalf("hash password: %v", err)
		}
	}
}

func testPasswordConfig() PasswordConfig {
	return PasswordConfig{
		MemoryKiB:   1024,
		Iterations:  1,
		Parallelism: 1,
		SaltLength:  16,
		KeyLength:   32,
	}
}
