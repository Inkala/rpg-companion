package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestRegisterRejectsOversizedRequestBody(t *testing.T) {
	handler := NewHandler(&Repository{}, PasswordConfig{}, SessionConfig{})
	request := httptest.NewRequest(http.MethodPost, "/auth/register", strings.NewReader(`{
		"username":"valid-user",
		"email":"valid@example.com",
		"password":"`+strings.Repeat("a", 8192)+`"
	}`))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	handler.Register(recorder, request)

	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusRequestEntityTooLarge, recorder.Code, recorder.Body.String())
	}
}

func TestSignInRejectsOversizedRequestBody(t *testing.T) {
	handler := NewHandler(&Repository{}, PasswordConfig{}, SessionConfig{})
	request := httptest.NewRequest(http.MethodPost, "/auth/sessions", strings.NewReader(`{
		"usernameOrEmail":"",
		"password":"`+strings.Repeat("a", 8192)+`"
	}`))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	handler.SignIn(recorder, request)

	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusRequestEntityTooLarge, recorder.Code, recorder.Body.String())
	}
}

func TestAuthArgonGateCapacityReturnsSameGenericResponseForRegisterAndSignIn(t *testing.T) {
	handler := newArgonGateTestHandler(&fakeHandlerRepository{})
	handler.hashPassword = func(string, PasswordConfig) (string, error) {
		t.Fatal("registration rejection must not perform Argon2 work")
		return "", nil
	}
	handler.verifyPassword = func(string, string) (bool, error) {
		t.Fatal("sign-in rejection must not perform Argon2 work")
		return false, nil
	}
	first, firstOK := handler.argonGate.TryAcquire()
	second, secondOK := handler.argonGate.TryAcquire()
	if !firstOK || !secondOK {
		t.Fatal("expected test to fill both Argon2 gate slots")
	}
	t.Cleanup(first.Release)
	t.Cleanup(second.Release)

	handlerCopy := handler
	tests := []struct {
		name    string
		handler func(http.ResponseWriter, *http.Request)
		path    string
		body    string
	}{
		{
			name:    "registration",
			handler: handler.Register,
			path:    "/auth/register",
			body:    `{"username":"mara","email":"mara@example.com","password":"Valid-password1!"}`,
		},
		{
			name:    "sign-in through handler copy",
			handler: handlerCopy.SignIn,
			path:    "/auth/sessions",
			body:    `{"usernameOrEmail":"mara","password":"Valid-password1!"}`,
		},
		{
			name:    "sign-in with missing identifier",
			handler: handlerCopy.SignIn,
			path:    "/auth/sessions",
			body:    `{"usernameOrEmail":"","password":"Valid-password1!"}`,
		},
	}

	var firstMessage string
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := authHandlerJSONRequest(tt.path, tt.body)

			tt.handler(recorder, request)

			if recorder.Code != http.StatusTooManyRequests {
				t.Fatalf("expected status %d, got %d with body %s", http.StatusTooManyRequests, recorder.Code, recorder.Body.String())
			}
			if got := recorder.Header().Get("Retry-After"); got != "1" {
				t.Fatalf("expected Retry-After 1, got %q", got)
			}
			message := decodeHandlerError(t, recorder)
			if message != "Too many requests. Please try again later." {
				t.Fatalf("expected generic capacity response, got %q", message)
			}
			if firstMessage == "" {
				firstMessage = message
			} else if message != firstMessage {
				t.Fatalf("expected identical registration and sign-in messages, got %q and %q", firstMessage, message)
			}
		})
	}
}

func TestRegisterDuplicateIdentityResponsesAreIdentical(t *testing.T) {
	tests := []struct {
		name        string
		createError error
	}{
		{name: "duplicate username", createError: ErrDuplicateUsername},
		{name: "duplicate email", createError: ErrDuplicateEmail},
	}

	var bodies []string
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &fakeHandlerRepository{createUserError: tt.createError}
			handler := newArgonGateTestHandler(repository)
			handler.hashPassword = func(string, PasswordConfig) (string, error) {
				return "encoded-password-hash", nil
			}
			recorder := httptest.NewRecorder()
			request := authHandlerJSONRequest(
				"/auth/register",
				`{"username":"mara","email":"mara@example.com","password":"Valid-password1!"}`,
			)

			handler.Register(recorder, request)

			if recorder.Code != http.StatusConflict {
				t.Fatalf("expected status %d, got %d with body %s", http.StatusConflict, recorder.Code, recorder.Body.String())
			}
			bodies = append(bodies, recorder.Body.String())
			const expected = "Account could not be created with those details."
			if got := decodeHandlerError(t, recorder); got != expected {
				t.Fatalf("expected generic collision response %q, got %q", expected, got)
			}
		})
	}

	if len(bodies) != 2 || bodies[0] != bodies[1] {
		t.Fatalf("expected duplicate username and email responses to be identical, got %q", bodies)
	}
}

func TestRegisterCreatesUserWithoutSessionCookie(t *testing.T) {
	repository := &fakeHandlerRepository{}
	handler := newArgonGateTestHandler(repository)
	handler.hashPassword = func(string, PasswordConfig) (string, error) {
		return "encoded-password-hash", nil
	}
	recorder := httptest.NewRecorder()
	request := authHandlerJSONRequest(
		"/auth/register",
		`{"username":"Mara","email":"mara@example.com","password":"Valid-password1!"}`,
	)

	handler.Register(recorder, request)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}
	if repository.user.ID == uuid.Nil {
		t.Fatal("expected registration to create a user")
	}
	if repository.createSessionCount != 0 {
		t.Fatalf("expected no session rows to be created, got %d", repository.createSessionCount)
	}
	if got := recorder.Header().Values("Set-Cookie"); len(got) != 0 {
		t.Fatalf("expected no session cookie, got %q", got)
	}
}

func TestSignInUnknownOrInvalidIdentityPerformsOneDummyVerification(t *testing.T) {
	tests := []struct {
		name       string
		identifier string
	}{
		{name: "missing identifier", identifier: ""},
		{name: "malformed identifier", identifier: "not valid!"},
		{name: "unknown username", identifier: "unknown-user"},
		{name: "unknown email", identifier: "unknown@example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newArgonGateTestHandler(&fakeHandlerRepository{})
			verificationCount := 0
			handler.verifyPassword = func(_ string, encodedHash string) (bool, error) {
				verificationCount++
				if encodedHash != handler.dummyPasswordHash {
					t.Fatalf("expected dummy password hash, got %q", encodedHash)
				}
				return false, nil
			}
			recorder := httptest.NewRecorder()
			request := authHandlerJSONRequest(
				"/auth/sessions",
				fmt.Sprintf(`{"usernameOrEmail":%q,"password":"wrong password"}`, tt.identifier),
			)

			handler.SignIn(recorder, request)

			if recorder.Code != http.StatusUnauthorized {
				t.Fatalf("expected status %d, got %d with body %s", http.StatusUnauthorized, recorder.Code, recorder.Body.String())
			}
			if got := decodeHandlerError(t, recorder); got != "Username, email, or password is incorrect." {
				t.Fatalf("expected generic invalid-credentials response, got %q", got)
			}
			if verificationCount != 1 {
				t.Fatalf("expected exactly one dummy verification, got %d", verificationCount)
			}
			assertArgonGateFullyAvailable(t, handler.argonGate)
		})
	}
}

func TestSignInDummyVerificationHoldsSharedArgonGate(t *testing.T) {
	handler := newArgonGateTestHandler(&fakeHandlerRepository{})
	handler.verifyPassword = func(_ string, encodedHash string) (bool, error) {
		if encodedHash != handler.dummyPasswordHash {
			t.Fatalf("expected dummy password hash, got %q", encodedHash)
		}
		remainingPermit, acquired := handler.argonGate.TryAcquire()
		if !acquired {
			t.Fatal("expected one remaining gate permit during dummy verification")
		}
		defer remainingPermit.Release()
		if extraPermit, acquired := handler.argonGate.TryAcquire(); acquired || extraPermit != nil {
			t.Fatal("expected dummy verification to hold one shared gate permit")
		}
		return false, nil
	}
	recorder := httptest.NewRecorder()
	request := authHandlerJSONRequest(
		"/auth/sessions",
		`{"usernameOrEmail":"unknown-user","password":"wrong password"}`,
	)

	handler.SignIn(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusUnauthorized, recorder.Code, recorder.Body.String())
	}
	assertArgonGateFullyAvailable(t, handler.argonGate)
}

func TestSignInKnownIdentityPerformsOneRealVerificationAndNoDummyVerification(t *testing.T) {
	user := testHandlerUser()
	tests := []struct {
		name       string
		identifier string
	}{
		{name: "username", identifier: user.Username},
		{name: "email", identifier: user.EmailCanonical},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newArgonGateTestHandler(&fakeHandlerRepository{user: user})
			realVerificationCount := 0
			dummyVerificationCount := 0
			handler.verifyPassword = func(_ string, encodedHash string) (bool, error) {
				switch encodedHash {
				case user.PasswordHash:
					realVerificationCount++
				case handler.dummyPasswordHash:
					dummyVerificationCount++
				default:
					t.Fatalf("unexpected password hash %q", encodedHash)
				}
				return false, nil
			}
			recorder := httptest.NewRecorder()
			request := authHandlerJSONRequest(
				"/auth/sessions",
				fmt.Sprintf(`{"usernameOrEmail":%q,"password":"wrong password"}`, tt.identifier),
			)

			handler.SignIn(recorder, request)

			if recorder.Code != http.StatusUnauthorized {
				t.Fatalf("expected status %d, got %d with body %s", http.StatusUnauthorized, recorder.Code, recorder.Body.String())
			}
			if realVerificationCount != 1 {
				t.Fatalf("expected exactly one real verification, got %d", realVerificationCount)
			}
			if dummyVerificationCount != 0 {
				t.Fatalf("expected no dummy verification, got %d", dummyVerificationCount)
			}
		})
	}
}

func TestRegisterArgonGateReleasesAfterSuccessAndFailure(t *testing.T) {
	tests := []struct {
		name       string
		hashError  error
		wantStatus int
	}{
		{name: "hash success", wantStatus: http.StatusCreated},
		{name: "hash failure", hashError: errors.New("hash failed"), wantStatus: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newArgonGateTestHandler(&fakeHandlerRepository{})
			handler.hashPassword = func(string, PasswordConfig) (string, error) {
				return "encoded-password-hash", tt.hashError
			}
			recorder := httptest.NewRecorder()
			request := authHandlerJSONRequest(
				"/auth/register",
				`{"username":"mara","email":"mara@example.com","password":"Valid-password1!"}`,
			)

			handler.Register(recorder, request)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d with body %s", tt.wantStatus, recorder.Code, recorder.Body.String())
			}
			assertArgonGateFullyAvailable(t, handler.argonGate)
		})
	}
}

func TestSignInArgonGateReleasesAfterSuccessAndFailure(t *testing.T) {
	tests := []struct {
		name        string
		matches     bool
		verifyError error
		wantStatus  int
	}{
		{name: "verification success", matches: true, wantStatus: http.StatusOK},
		{name: "password mismatch", wantStatus: http.StatusUnauthorized},
		{name: "verification failure", verifyError: errors.New("verification failed"), wantStatus: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &fakeHandlerRepository{user: testHandlerUser()}
			handler := newArgonGateTestHandler(repository)
			handler.verifyPassword = func(string, string) (bool, error) {
				return tt.matches, tt.verifyError
			}
			recorder := httptest.NewRecorder()
			request := authHandlerJSONRequest(
				"/auth/sessions",
				`{"usernameOrEmail":"mara","password":"Valid-password1!"}`,
			)

			handler.SignIn(recorder, request)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d with body %s", tt.wantStatus, recorder.Code, recorder.Body.String())
			}
			assertArgonGateFullyAvailable(t, handler.argonGate)
		})
	}
}

type fakeHandlerRepository struct {
	user               User
	createUserError    error
	createSessionCount int
}

func (repository *fakeHandlerRepository) CreateUser(_ context.Context, user User) (User, error) {
	if repository.createUserError != nil {
		return User{}, repository.createUserError
	}
	repository.user = user
	return user, nil
}

func (repository *fakeHandlerRepository) FindUserByUsername(context.Context, string) (User, error) {
	if repository.user.ID == uuid.Nil {
		return User{}, ErrNotFound
	}
	return repository.user, nil
}

func (repository *fakeHandlerRepository) FindUserByEmail(context.Context, string) (User, error) {
	if repository.user.ID == uuid.Nil {
		return User{}, ErrNotFound
	}
	return repository.user, nil
}

func (repository *fakeHandlerRepository) CreateSession(_ context.Context, session Session) (Session, error) {
	repository.createSessionCount++
	return session, nil
}

func (repository *fakeHandlerRepository) RevokeSession(context.Context, []byte, time.Time) error {
	return nil
}

func newArgonGateTestHandler(repository *fakeHandlerRepository) Handler {
	handler := NewHandler(nil, PasswordConfig{}, SessionConfig{Lifetime: time.Hour})
	handler.repository = repository
	handler.now = func() time.Time { return time.Now().UTC() }
	return handler
}

func testHandlerUser() User {
	now := time.Now().UTC()
	return User{
		ID:                    uuid.New(),
		Username:              "Mara",
		UsernameCanonical:     "mara",
		EmailCanonical:        "mara@example.com",
		PasswordHash:          "encoded-password-hash",
		PasswordHashAlgorithm: PasswordHashAlgorithm,
		CreatedAt:             now,
		UpdatedAt:             now,
	}
}

func authHandlerJSONRequest(path string, body string) *http.Request {
	request := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	return request
}

func decodeHandlerError(t *testing.T, recorder *httptest.ResponseRecorder) string {
	t.Helper()
	var response struct {
		Error string `json:"error"`
	}
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	return response.Error
}

func assertArgonGateFullyAvailable(t *testing.T, gate *ArgonGate) {
	t.Helper()
	first, firstOK := gate.TryAcquire()
	second, secondOK := gate.TryAcquire()
	third, thirdOK := gate.TryAcquire()
	if !firstOK || !secondOK {
		t.Fatal("expected both Argon2 gate slots to be available")
	}
	if thirdOK || third != nil {
		t.Fatal("expected Argon2 gate capacity to remain 2")
	}
	first.Release()
	second.Release()
}
