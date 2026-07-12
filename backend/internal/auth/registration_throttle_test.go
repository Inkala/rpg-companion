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
)

func TestRegistrationGlobalLimitRejects11thValidSubmissionAndRecovers(t *testing.T) {
	clock := newLimiterTestClock()
	repository := &registrationThrottleRepository{}
	handler, hashCalls := newRegistrationThrottleTestHandler(clock, repository)

	for attempt := 1; attempt <= 10; attempt++ {
		response := performRegistrationThrottleRequest(
			handler,
			fmt.Sprintf("user-%02d", attempt),
			fmt.Sprintf("user-%02d@example.com", attempt),
			validRegistrationPassword,
		)
		assertRegistrationStatus(t, response, http.StatusCreated)
	}

	handlerCopy := handler
	rejected := performRegistrationThrottleRequest(
		handlerCopy,
		"user-11",
		"user-11@example.com",
		validRegistrationPassword,
	)
	assertRegistrationThrottleResponse(t, rejected, time.Minute)
	if got := hashCalls.Load(); got != 10 {
		t.Fatalf("expected no password hashing on the 11th submission, got %d", got)
	}
	if got := repository.createCalls.Load(); got != 10 {
		t.Fatalf("expected no repository call on the 11th submission, got %d", got)
	}

	clock.Advance(time.Minute)
	recovered := performRegistrationThrottleRequest(
		handlerCopy,
		"user-12",
		"user-12@example.com",
		validRegistrationPassword,
	)
	assertRegistrationStatus(t, recovered, http.StatusCreated)
}

func TestRegistrationCanonicalIdentityLimitsAndIndependentIdentities(t *testing.T) {
	tests := []struct {
		name             string
		usernameFor      func(int) string
		emailFor         func(int) string
		independentUser  string
		independentEmail string
		expectedKey      func() string
		rawCanonical     string
	}{
		{
			name: "username",
			usernameFor: func(attempt int) string {
				if attempt%2 == 0 {
					return "  MARA  "
				}
				return "mara"
			},
			emailFor: func(attempt int) string {
				return fmt.Sprintf("mara-%d@example.com", attempt)
			},
			independentUser:  "alea",
			independentEmail: "alea@example.com",
			expectedKey: func() string {
				return registrationUsernameKey("mara")
			},
			rawCanonical: "mara",
		},
		{
			name: "email",
			usernameFor: func(attempt int) string {
				return fmt.Sprintf("mara-%d", attempt)
			},
			emailFor: func(attempt int) string {
				if attempt%2 == 0 {
					return "  MARA@EXAMPLE.COM  "
				}
				return "mara@example.com"
			},
			independentUser:  "alea",
			independentEmail: "alea@other.example",
			expectedKey: func() string {
				return registrationEmailKey("mara@example.com")
			},
			rawCanonical: "mara@example.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clock := newLimiterTestClock()
			repository := &registrationThrottleRepository{}
			handler, hashCalls := newRegistrationThrottleTestHandler(clock, repository)

			for attempt := 1; attempt <= 5; attempt++ {
				response := performRegistrationThrottleRequest(
					handler,
					tt.usernameFor(attempt),
					tt.emailFor(attempt),
					validRegistrationPassword,
				)
				assertRegistrationStatus(t, response, http.StatusCreated)
			}

			handlerCopy := handler
			rejected := performRegistrationThrottleRequest(
				handlerCopy,
				tt.usernameFor(6),
				tt.emailFor(6),
				validRegistrationPassword,
			)
			assertRegistrationThrottleResponse(t, rejected, time.Hour)
			if got := hashCalls.Load(); got != 5 {
				t.Fatalf("expected identity rejection before hashing, got %d hashes", got)
			}
			if got := repository.createCalls.Load(); got != 5 {
				t.Fatalf("expected identity rejection before persistence, got %d calls", got)
			}

			independent := performRegistrationThrottleRequest(
				handler,
				tt.independentUser,
				tt.independentEmail,
				validRegistrationPassword,
			)
			assertRegistrationStatus(t, independent, http.StatusCreated)

			expectedKey := tt.expectedKey()
			handler.authLimiter.mu.Lock()
			_, expectedKeyExists := handler.authLimiter.buckets[expectedKey]
			keys := make([]string, 0, len(handler.authLimiter.buckets))
			for key := range handler.authLimiter.buckets {
				keys = append(keys, key)
			}
			handler.authLimiter.mu.Unlock()
			if !expectedKeyExists {
				t.Fatalf("expected canonical hashed bucket %q", expectedKey)
			}
			digest := strings.TrimPrefix(expectedKey, registrationIdentityKeyPrefix(tt.name))
			if len(digest) != sha256.Size*2 {
				t.Fatalf("expected SHA-256 key, got %q", expectedKey)
			}
			if _, err := hex.DecodeString(digest); err != nil {
				t.Fatalf("expected hexadecimal SHA-256 key: %v", err)
			}
			for _, key := range keys {
				if strings.Contains(strings.ToLower(key), tt.rawCanonical) {
					t.Fatalf("limiter key exposes raw identity %q", key)
				}
				if strings.Contains(key, validRegistrationPassword) {
					t.Fatalf("limiter key exposes raw password %q", key)
				}
			}

			clock.Advance(time.Hour)
			recovered := performRegistrationThrottleRequest(
				handlerCopy,
				tt.usernameFor(7),
				tt.emailFor(7),
				validRegistrationPassword,
			)
			assertRegistrationStatus(t, recovered, http.StatusCreated)
		})
	}
}

func TestInvalidRegistrationFormsDoNotConsumeThrottleBuckets(t *testing.T) {
	clock := newLimiterTestClock()
	repository := &registrationThrottleRepository{}
	handler, hashCalls := newRegistrationThrottleTestHandler(clock, repository)
	invalidForms := []struct {
		username string
		email    string
		password string
	}{
		{username: "x", email: "valid@example.com", password: validRegistrationPassword},
		{username: "valid-user", email: "invalid", password: validRegistrationPassword},
		{username: "valid-user", email: "valid@example.com", password: "weak"},
	}

	for attempt := 0; attempt < 12; attempt++ {
		form := invalidForms[attempt%len(invalidForms)]
		response := performRegistrationThrottleRequest(handler, form.username, form.email, form.password)
		assertRegistrationStatus(t, response, http.StatusBadRequest)
	}
	if got := hashCalls.Load(); got != 0 {
		t.Fatalf("expected invalid forms not to hash passwords, got %d", got)
	}
	if got := repository.createCalls.Load(); got != 0 {
		t.Fatalf("expected invalid forms not to reach persistence, got %d", got)
	}
	handler.authLimiter.mu.Lock()
	bucketCount := len(handler.authLimiter.buckets)
	handler.authLimiter.mu.Unlock()
	if bucketCount != 0 {
		t.Fatalf("expected invalid forms not to create limiter buckets, got %d", bucketCount)
	}

	valid := performRegistrationThrottleRequest(
		handler,
		"valid-user",
		"valid@example.com",
		validRegistrationPassword,
	)
	assertRegistrationStatus(t, valid, http.StatusCreated)
	if got := hashCalls.Load(); got != 1 {
		t.Fatalf("expected first valid form to be hashed, got %d", got)
	}
}

func TestRegistrationCollisionsAndRepositoryFailuresConsumeIdentityBuckets(t *testing.T) {
	tests := []struct {
		name        string
		createError error
		wantStatus  int
	}{
		{name: "collision", createError: ErrDuplicateUsername, wantStatus: http.StatusConflict},
		{name: "repository failure", createError: errors.New("database unavailable"), wantStatus: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clock := newLimiterTestClock()
			repository := &registrationThrottleRepository{createError: tt.createError}
			handler, hashCalls := newRegistrationThrottleTestHandler(clock, repository)

			for attempt := 1; attempt <= 5; attempt++ {
				response := performRegistrationThrottleRequest(
					handler,
					"mara",
					fmt.Sprintf("mara-%d@example.com", attempt),
					validRegistrationPassword,
				)
				assertRegistrationStatus(t, response, tt.wantStatus)
			}

			rejected := performRegistrationThrottleRequest(
				handler,
				"mara",
				"mara-6@example.com",
				validRegistrationPassword,
			)
			assertRegistrationThrottleResponse(t, rejected, time.Hour)
			if got := hashCalls.Load(); got != 5 {
				t.Fatalf("expected five hashes before rejection, got %d", got)
			}
			if got := repository.createCalls.Load(); got != 5 {
				t.Fatalf("expected five persistence attempts before rejection, got %d", got)
			}
		})
	}
}

type registrationThrottleRepository struct {
	createError error
	createCalls atomic.Int64
}

func (repository *registrationThrottleRepository) CreateUser(_ context.Context, user User) (User, error) {
	repository.createCalls.Add(1)
	if repository.createError != nil {
		return User{}, repository.createError
	}
	return user, nil
}

func (repository *registrationThrottleRepository) FindUserByUsername(context.Context, string) (User, error) {
	return User{}, errors.New("unexpected FindUserByUsername call")
}

func (repository *registrationThrottleRepository) FindUserByEmail(context.Context, string) (User, error) {
	return User{}, errors.New("unexpected FindUserByEmail call")
}

func (repository *registrationThrottleRepository) CreateSession(_ context.Context, session Session) (Session, error) {
	return session, nil
}

func (repository *registrationThrottleRepository) RevokeSession(context.Context, []byte, time.Time) error {
	return nil
}

func newRegistrationThrottleTestHandler(
	clock *limiterTestClock,
	repository *registrationThrottleRepository,
) (Handler, *atomic.Int64) {
	handler := NewHandler(nil, testPasswordConfig(), SessionConfig{Lifetime: time.Hour})
	handler.repository = repository
	handler.now = clock.Now
	handler.authLimiter = NewSlidingWindowLimiter(clock.Now)
	hashCalls := &atomic.Int64{}
	handler.hashPassword = func(string, PasswordConfig) (string, error) {
		hashCalls.Add(1)
		return "encoded-password-hash", nil
	}
	return handler, hashCalls
}

func performRegistrationThrottleRequest(
	handler Handler,
	username string,
	email string,
	password string,
) *httptest.ResponseRecorder {
	body := fmt.Sprintf(`{"username":%q,"email":%q,"password":%q}`, username, email, password)
	request := authHandlerJSONRequest("/auth/register", body)
	response := httptest.NewRecorder()
	handler.Register(response, request)
	return response
}

func assertRegistrationStatus(t *testing.T, response *httptest.ResponseRecorder, expected int) {
	t.Helper()
	if response.Code != expected {
		t.Fatalf("expected status %d, got %d with body %s", expected, response.Code, response.Body.String())
	}
}

func assertRegistrationThrottleResponse(
	t *testing.T,
	response *httptest.ResponseRecorder,
	retryAfter time.Duration,
) {
	t.Helper()
	assertRegistrationStatus(t, response, http.StatusTooManyRequests)
	if got := response.Header().Get("Retry-After"); got != fmt.Sprintf("%.0f", retryAfter.Seconds()) {
		t.Fatalf("expected Retry-After %s, got %q", retryAfter, got)
	}
	if got := decodeHandlerError(t, response); got != "Too many requests. Please try again later." {
		t.Fatalf("expected generic throttle response, got %q", got)
	}
}

func registrationIdentityKeyPrefix(identityType string) string {
	if identityType == "username" {
		return registrationUsernameKeyPrefix
	}
	return registrationEmailKeyPrefix
}

const validRegistrationPassword = "Valid-password1!"
