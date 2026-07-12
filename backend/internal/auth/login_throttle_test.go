package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestLoginGlobalLimitRejects31stAttemptAndRecoversAfterMinute(t *testing.T) {
	clock := newLimiterTestClock()
	repository := &loginThrottleRepository{}
	handler := newLoginThrottleTestHandler(clock, repository)
	var verifications atomic.Int64
	handler.verifyPassword = func(_ string, encodedHash string) (bool, error) {
		if encodedHash != handler.dummyPasswordHash {
			t.Fatalf("expected dummy hash, got %q", encodedHash)
		}
		verifications.Add(1)
		return false, nil
	}

	for attempt := 1; attempt <= 30; attempt++ {
		response := performLoginThrottleRequest(handler, fmt.Sprintf("unknown-%02d", attempt))
		assertLoginThrottleStatus(t, response, http.StatusUnauthorized)
	}

	handlerCopy := handler
	rejected := performLoginThrottleRequest(handlerCopy, "unknown-31")
	assertLoginThrottleResponse(t, rejected, time.Minute)
	if got := verifications.Load(); got != 30 {
		t.Fatalf("expected no Argon2 work on the 31st attempt, got %d verifications", got)
	}
	if got := repository.findCalls.Load(); got != 30 {
		t.Fatalf("expected no lookup on the 31st attempt, got %d lookups", got)
	}

	clock.Advance(time.Minute)
	recovered := performLoginThrottleRequest(handlerCopy, "unknown-32")
	assertLoginThrottleStatus(t, recovered, http.StatusUnauthorized)
	if got := verifications.Load(); got != 31 {
		t.Fatalf("expected verification after global recovery, got %d", got)
	}
}

func TestLoginIdentifierLimitRejects11thFailureBeforeLookupAndArgon(t *testing.T) {
	clock := newLimiterTestClock()
	repository := &loginThrottleRepository{}
	handler := newLoginThrottleTestHandler(clock, repository)
	var verifications atomic.Int64
	handler.verifyPassword = func(_ string, encodedHash string) (bool, error) {
		if encodedHash != handler.dummyPasswordHash {
			t.Fatalf("expected dummy hash, got %q", encodedHash)
		}
		verifications.Add(1)
		return false, nil
	}

	for attempt := 1; attempt <= 10; attempt++ {
		response := performLoginThrottleRequest(handler, "unknown-user")
		assertLoginThrottleStatus(t, response, http.StatusUnauthorized)
	}

	rejected := performLoginThrottleRequest(handler, "unknown-user")
	assertLoginThrottleResponse(t, rejected, 10*time.Minute)
	if got := repository.findCalls.Load(); got != 10 {
		t.Fatalf("expected rejection before the 11th lookup, got %d lookups", got)
	}
	if got := verifications.Load(); got != 10 {
		t.Fatalf("expected rejection before the 11th verification, got %d", got)
	}

	clock.Advance(8*time.Minute + 59*time.Second + 100*time.Millisecond)
	rounded := performLoginThrottleRequest(handler, "unknown-user")
	assertLoginThrottleResponse(t, rounded, 61*time.Second)
	if got := verifications.Load(); got != 10 {
		t.Fatalf("expected rounded Retry-After rejection before Argon2, got %d verifications", got)
	}

	clock.Advance(60 * time.Second)
	clamped := performLoginThrottleRequest(handler, "unknown-user")
	assertLoginThrottleResponse(t, clamped, time.Second)
	if got := verifications.Load(); got != 10 {
		t.Fatalf("expected clamped Retry-After rejection before Argon2, got %d verifications", got)
	}

	clock.Advance(900 * time.Millisecond)
	recovered := performLoginThrottleRequest(handler, "unknown-user")
	assertLoginThrottleStatus(t, recovered, http.StatusUnauthorized)
	if got := verifications.Load(); got != 11 {
		t.Fatalf("expected identifier recovery at the window, got %d verifications", got)
	}
}

func TestLoginCanonicalIdentifiersShareHashedBucketsWithoutRawValues(t *testing.T) {
	tests := []struct {
		name      string
		variants  []string
		canonical string
	}{
		{
			name:      "username",
			variants:  []string{"  MARA  ", "mara"},
			canonical: "mara",
		},
		{
			name:      "email",
			variants:  []string{"  MARA@EXAMPLE.COM  ", "mara@example.com"},
			canonical: "mara@example.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clock := newLimiterTestClock()
			handler := newLoginThrottleTestHandler(clock, &loginThrottleRepository{})
			handler.verifyPassword = func(string, string) (bool, error) { return false, nil }

			for attempt := 0; attempt < 10; attempt++ {
				response := performLoginThrottleRequest(handler, tt.variants[attempt%len(tt.variants)])
				assertLoginThrottleStatus(t, response, http.StatusUnauthorized)
			}
			rejected := performLoginThrottleRequest(handler, tt.variants[0])
			assertLoginThrottleStatus(t, rejected, http.StatusTooManyRequests)

			expectedKey := loginIdentifierFailureKey(tt.variants[0])
			handler.loginLimiter.mu.Lock()
			_, expectedKeyExists := handler.loginLimiter.buckets[expectedKey]
			keys := make([]string, 0, len(handler.loginLimiter.buckets))
			for key := range handler.loginLimiter.buckets {
				keys = append(keys, key)
			}
			handler.loginLimiter.mu.Unlock()
			if !expectedKeyExists {
				t.Fatalf("expected hashed identifier bucket %q", expectedKey)
			}
			digest := strings.TrimPrefix(expectedKey, identifierFailureKeyPrefix)
			if len(digest) != sha256.Size*2 {
				t.Fatalf("expected SHA-256 hex key, got %q", expectedKey)
			}
			if _, err := hex.DecodeString(digest); err != nil {
				t.Fatalf("expected hexadecimal SHA-256 key: %v", err)
			}
			for _, key := range keys {
				if strings.Contains(strings.ToLower(key), tt.canonical) {
					t.Fatalf("limiter key exposes raw identifier %q", key)
				}
			}
		})
	}
}

func TestLoginDifferentIdentifiersHaveIndependentFailureBuckets(t *testing.T) {
	clock := newLimiterTestClock()
	handler := newLoginThrottleTestHandler(clock, &loginThrottleRepository{})
	handler.verifyPassword = func(string, string) (bool, error) { return false, nil }

	for attempt := 0; attempt < 10; attempt++ {
		assertLoginThrottleStatus(t, performLoginThrottleRequest(handler, "mara"), http.StatusUnauthorized)
	}
	assertLoginThrottleStatus(t, performLoginThrottleRequest(handler, "alea"), http.StatusUnauthorized)
	assertLoginThrottleStatus(t, performLoginThrottleRequest(handler, "mara"), http.StatusTooManyRequests)
}

func TestSuccessfulLoginClearsIdentifierFailuresAcrossHandlerCopies(t *testing.T) {
	clock := newLimiterTestClock()
	repository := &loginThrottleRepository{user: testHandlerUser()}
	handler := newLoginThrottleTestHandler(clock, repository)
	var passwordMatches atomic.Bool
	handler.verifyPassword = func(_ string, encodedHash string) (bool, error) {
		if encodedHash != repository.user.PasswordHash {
			t.Fatalf("expected real password hash, got %q", encodedHash)
		}
		return passwordMatches.Load(), nil
	}

	for attempt := 0; attempt < 3; attempt++ {
		assertLoginThrottleStatus(t, performLoginThrottleRequest(handler, "MARA"), http.StatusUnauthorized)
	}
	passwordMatches.Store(true)
	handlerCopy := handler
	assertLoginThrottleStatus(t, performLoginThrottleRequest(handlerCopy, "  mara  "), http.StatusOK)

	passwordMatches.Store(false)
	assertLoginThrottleStatus(t, performLoginThrottleRequest(handler, "mara"), http.StatusUnauthorized)
	key := loginIdentifierFailureKey("mara")
	handler.loginLimiter.mu.Lock()
	eventCount := len(handler.loginLimiter.buckets[key].events)
	handler.loginLimiter.mu.Unlock()
	if eventCount != 1 {
		t.Fatalf("expected one failure after successful reset, got %d", eventCount)
	}
}

func TestLoginInternalFailuresDoNotCountAsCredentialFailures(t *testing.T) {
	t.Run("repository failure", func(t *testing.T) {
		clock := newLimiterTestClock()
		repository := &loginThrottleRepository{findError: errors.New("database unavailable")}
		handler := newLoginThrottleTestHandler(clock, repository)
		var verifications atomic.Int64
		handler.verifyPassword = func(string, string) (bool, error) {
			verifications.Add(1)
			return false, nil
		}

		for attempt := 0; attempt < 10; attempt++ {
			assertLoginThrottleStatus(t, performLoginThrottleRequest(handler, "mara"), http.StatusInternalServerError)
		}
		repository.findError = nil
		assertLoginThrottleStatus(t, performLoginThrottleRequest(handler, "mara"), http.StatusUnauthorized)
		if got := verifications.Load(); got != 1 {
			t.Fatalf("expected only the invalid-credential request to verify, got %d", got)
		}
	})

	t.Run("verification failure", func(t *testing.T) {
		clock := newLimiterTestClock()
		repository := &loginThrottleRepository{user: testHandlerUser()}
		handler := newLoginThrottleTestHandler(clock, repository)
		var returnError atomic.Bool
		returnError.Store(true)
		handler.verifyPassword = func(string, string) (bool, error) {
			if returnError.Load() {
				return false, errors.New("verification unavailable")
			}
			return false, nil
		}

		for attempt := 0; attempt < 10; attempt++ {
			assertLoginThrottleStatus(t, performLoginThrottleRequest(handler, "mara"), http.StatusInternalServerError)
		}
		returnError.Store(false)
		assertLoginThrottleStatus(t, performLoginThrottleRequest(handler, "mara"), http.StatusUnauthorized)
	})

	t.Run("dummy verification failure", func(t *testing.T) {
		clock := newLimiterTestClock()
		handler := newLoginThrottleTestHandler(clock, &loginThrottleRepository{})
		var returnError atomic.Bool
		returnError.Store(true)
		handler.verifyPassword = func(string, string) (bool, error) {
			if returnError.Load() {
				return false, errors.New("dummy verification unavailable")
			}
			return false, nil
		}

		for attempt := 0; attempt < 10; attempt++ {
			assertLoginThrottleStatus(t, performLoginThrottleRequest(handler, "unknown-user"), http.StatusUnauthorized)
		}
		returnError.Store(false)
		assertLoginThrottleStatus(t, performLoginThrottleRequest(handler, "unknown-user"), http.StatusUnauthorized)
	})
}

func TestLoginRetryAfterRoundsUpAndClampsToApplicableWindow(t *testing.T) {
	tests := []struct {
		name      string
		remaining time.Duration
		window    time.Duration
		want      int64
	}{
		{name: "zero clamps to one", remaining: 0, window: time.Minute, want: 1},
		{name: "subsecond clamps to one", remaining: time.Millisecond, window: time.Minute, want: 1},
		{name: "fractional second rounds up", remaining: 60*time.Second + time.Millisecond, window: 10 * time.Minute, want: 61},
		{name: "over window clamps to window", remaining: 11 * time.Minute, window: 10 * time.Minute, want: 600},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := retryAfterSeconds(tt.remaining, tt.window); got != tt.want {
				t.Fatalf("expected %d seconds, got %d", tt.want, got)
			}
		})
	}
}

func TestMalformedJSONDoesNotConsumeGlobalLoginAttempts(t *testing.T) {
	clock := newLimiterTestClock()
	handler := newLoginThrottleTestHandler(clock, &loginThrottleRepository{})
	handler.verifyPassword = func(string, string) (bool, error) { return false, nil }

	for attempt := 0; attempt < 31; attempt++ {
		request := authHandlerJSONRequest("/auth/sessions", `{`)
		response := httptest.NewRecorder()
		handler.SignIn(response, request)
		assertLoginThrottleStatus(t, response, http.StatusBadRequest)
	}
	assertLoginThrottleStatus(t, performLoginThrottleRequest(handler, "unknown-user"), http.StatusUnauthorized)
}

type loginThrottleRepository struct {
	user      User
	findError error
	findCalls atomic.Int64
}

func (repository *loginThrottleRepository) CreateUser(context.Context, User) (User, error) {
	return User{}, errors.New("unexpected CreateUser call")
}

func (repository *loginThrottleRepository) FindUserByUsername(_ context.Context, canonical string) (User, error) {
	repository.findCalls.Add(1)
	if repository.findError != nil {
		return User{}, repository.findError
	}
	if repository.user.ID == uuid.Nil || repository.user.UsernameCanonical != canonical {
		return User{}, ErrNotFound
	}
	return repository.user, nil
}

func (repository *loginThrottleRepository) FindUserByEmail(_ context.Context, canonical string) (User, error) {
	repository.findCalls.Add(1)
	if repository.findError != nil {
		return User{}, repository.findError
	}
	if repository.user.ID == uuid.Nil || repository.user.EmailCanonical != canonical {
		return User{}, ErrNotFound
	}
	return repository.user, nil
}

func (repository *loginThrottleRepository) CreateSession(_ context.Context, session Session) (Session, error) {
	return session, nil
}

func (repository *loginThrottleRepository) RevokeSession(context.Context, []byte, time.Time) error {
	return nil
}

func newLoginThrottleTestHandler(clock *limiterTestClock, repository *loginThrottleRepository) Handler {
	handler := NewHandler(nil, testPasswordConfig(), SessionConfig{Lifetime: time.Hour})
	handler.repository = repository
	handler.now = clock.Now
	handler.loginLimiter = NewSlidingWindowLimiter(clock.Now)
	return handler
}

func performLoginThrottleRequest(handler Handler, identifier string) *httptest.ResponseRecorder {
	request := authHandlerJSONRequest(
		"/auth/sessions",
		fmt.Sprintf(`{"usernameOrEmail":%q,"password":"wrong password"}`, identifier),
	)
	response := httptest.NewRecorder()
	handler.SignIn(response, request)
	return response
}

func assertLoginThrottleStatus(t *testing.T, response *httptest.ResponseRecorder, expected int) {
	t.Helper()
	if response.Code != expected {
		t.Fatalf("expected status %d, got %d with body %s", expected, response.Code, response.Body.String())
	}
}

func assertLoginThrottleResponse(t *testing.T, response *httptest.ResponseRecorder, retryAfter time.Duration) {
	t.Helper()
	assertLoginThrottleStatus(t, response, http.StatusTooManyRequests)
	expectedRetryAfter := fmt.Sprintf("%.0f", retryAfter.Seconds())
	if got := response.Header().Get("Retry-After"); got != expectedRetryAfter {
		t.Fatalf("expected Retry-After %q, got %q", expectedRetryAfter, got)
	}
	if got := decodeHandlerError(t, response); got != "Too many requests. Please try again later." {
		t.Fatalf("expected generic throttle response, got %q", got)
	}
}
