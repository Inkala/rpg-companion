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
