package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"time"
)

const SessionCookieName = "hunin_session"

type SessionConfig struct {
	CookieName string
	Lifetime   time.Duration
	Secure     bool
	SameSite   http.SameSite
}

func DefaultSessionConfig() SessionConfig {
	return SessionConfig{
		CookieName: SessionCookieName,
		Lifetime:   7 * 24 * time.Hour,
		Secure:     false,
		SameSite:   http.SameSiteLaxMode,
	}
}

func (config SessionConfig) withDefaults() SessionConfig {
	defaults := DefaultSessionConfig()
	if config.CookieName == "" {
		config.CookieName = defaults.CookieName
	}
	if config.Lifetime == 0 {
		config.Lifetime = defaults.Lifetime
	}
	if config.SameSite == 0 {
		config.SameSite = defaults.SameSite
	}
	return config
}

func NewSessionToken() (string, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(tokenBytes), nil
}

func TokenHash(token string) []byte {
	hash := sha256.Sum256([]byte(token))
	return hash[:]
}

func SessionCookie(token string, expiresAt time.Time, config SessionConfig) *http.Cookie {
	config = config.withDefaults()
	return &http.Cookie{
		Name:     config.CookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
		HttpOnly: true,
		Secure:   config.Secure,
		SameSite: config.SameSite,
	}
}

func ClearSessionCookie(config SessionConfig) *http.Cookie {
	config = config.withDefaults()
	return &http.Cookie{
		Name:     config.CookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   config.Secure,
		SameSite: config.SameSite,
	}
}
