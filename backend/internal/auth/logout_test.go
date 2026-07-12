package auth

import (
	"bytes"
	"context"
	"encoding/hex"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestLogoutWithoutSessionCookieReturnsNoContentAndClearsCookie(t *testing.T) {
	config := logoutTestSessionConfig()
	handler := NewHandler(nil, testPasswordConfig(), config)
	request := httptest.NewRequest(http.MethodDelete, "/auth/session", nil)
	response := httptest.NewRecorder()

	handler.Logout(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusNoContent, response.Code, response.Body.String())
	}
	assertClearingSessionCookie(t, response, config)
}

func TestLogoutSuccessfulOrUnknownRevocationReturnsNoContentAndClearsCookie(t *testing.T) {
	tests := []struct {
		name string
	}{
		{name: "active session"},
		{name: "already revoked or unknown session"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := logoutTestSessionConfig()
			repository := &logoutRepository{}
			handler := NewHandler(nil, testPasswordConfig(), config)
			handler.repository = repository
			handler.now = func() time.Time { return time.Date(2026, 7, 12, 12, 0, 0, 0, time.UTC) }
			request := logoutRequest(config.CookieName)
			response := httptest.NewRecorder()

			handler.Logout(response, request)

			if response.Code != http.StatusNoContent {
				t.Fatalf("expected status %d, got %d with body %s", http.StatusNoContent, response.Code, response.Body.String())
			}
			if repository.revokeCalls != 1 {
				t.Fatalf("expected one revocation attempt, got %d", repository.revokeCalls)
			}
			if !bytes.Equal(repository.tokenHash, TokenHash(logoutTestToken)) {
				t.Fatal("expected repository to receive the session token hash")
			}
			assertClearingSessionCookie(t, response, config)
		})
	}
}

func TestLogoutRevocationFailureReturnsSafeServiceUnavailableAndRetainsCookie(t *testing.T) {
	config := logoutTestSessionConfig()
	repository := &logoutRepository{revokeError: errors.New("database unavailable")}
	handler := NewHandler(nil, testPasswordConfig(), config)
	handler.repository = repository
	request := logoutRequest(config.CookieName)
	response := httptest.NewRecorder()

	handler.Logout(response, request)

	assertLogoutFailure(t, response)
	if repository.revokeCalls != 1 {
		t.Fatalf("expected one revocation attempt, got %d", repository.revokeCalls)
	}
}

func TestLogoutWithCookieAndUnavailablePersistenceFailsSafelyAndRetainsCookie(t *testing.T) {
	config := logoutTestSessionConfig()
	handler := NewHandler(nil, testPasswordConfig(), config)
	request := logoutRequest(config.CookieName)
	response := httptest.NewRecorder()

	handler.Logout(response, request)

	assertLogoutFailure(t, response)
}

type logoutRepository struct {
	revokeError error
	revokeCalls int
	tokenHash   []byte
}

func (repository *logoutRepository) CreateUser(context.Context, User) (User, error) {
	return User{}, errors.New("unexpected CreateUser call")
}

func (repository *logoutRepository) FindUserByUsername(context.Context, string) (User, error) {
	return User{}, errors.New("unexpected FindUserByUsername call")
}

func (repository *logoutRepository) FindUserByEmail(context.Context, string) (User, error) {
	return User{}, errors.New("unexpected FindUserByEmail call")
}

func (repository *logoutRepository) CreateSession(context.Context, Session) (Session, error) {
	return Session{}, errors.New("unexpected CreateSession call")
}

func (repository *logoutRepository) RevokeSession(_ context.Context, tokenHash []byte, _ time.Time) error {
	repository.revokeCalls++
	repository.tokenHash = append([]byte(nil), tokenHash...)
	return repository.revokeError
}

func logoutRequest(cookieName string) *http.Request {
	request := httptest.NewRequest(http.MethodDelete, "/auth/session", nil)
	request.AddCookie(&http.Cookie{Name: cookieName, Value: logoutTestToken})
	return request
}

func assertLogoutFailure(t *testing.T, response *httptest.ResponseRecorder) {
	t.Helper()
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusServiceUnavailable, response.Code, response.Body.String())
	}
	const expectedBody = `{"error":"could not sign out; please try again"}` + "\n"
	if response.Body.String() != expectedBody {
		t.Fatalf("expected safe response %q, got %q", expectedBody, response.Body.String())
	}
	if got := response.Header().Values("Set-Cookie"); len(got) != 0 {
		t.Fatalf("expected session cookie to be retained, got %d replacement cookies", len(got))
	}
	responseText := response.Body.String() + response.Header().Get("Set-Cookie")
	if strings.Contains(responseText, logoutTestToken) {
		t.Fatal("response exposed the session token")
	}
	if strings.Contains(responseText, hex.EncodeToString(TokenHash(logoutTestToken))) {
		t.Fatal("response exposed the session token hash")
	}
}

func assertClearingSessionCookie(t *testing.T, response *httptest.ResponseRecorder, config SessionConfig) {
	t.Helper()
	cookies := response.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("expected one clearing cookie, got %d", len(cookies))
	}
	cookie := cookies[0]
	if cookie.Name != config.CookieName || cookie.Value != "" || cookie.Path != "/" || cookie.MaxAge != -1 {
		t.Fatal("clearing cookie did not preserve the expected name, empty value, path, and expiry")
	}
	if !cookie.Expires.Equal(time.Unix(0, 0)) {
		t.Fatal("clearing cookie did not preserve the expired timestamp")
	}
	if !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != config.SameSite {
		t.Fatal("clearing cookie did not preserve HttpOnly, Secure, and SameSite attributes")
	}
	responseText := response.Body.String() + response.Header().Get("Set-Cookie")
	if strings.Contains(responseText, logoutTestToken) {
		t.Fatal("response exposed the session token")
	}
	if strings.Contains(responseText, hex.EncodeToString(TokenHash(logoutTestToken))) {
		t.Fatal("response exposed the session token hash")
	}
}

func logoutTestSessionConfig() SessionConfig {
	return SessionConfig{
		CookieName: "custom_session",
		Lifetime:   time.Hour,
		Secure:     true,
		SameSite:   http.SameSiteStrictMode,
	}
}

const logoutTestToken = "deterministic-public-test-session-token"
