package server

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/Inkala/rpg-companion/backend/internal/auth"
	"github.com/Inkala/rpg-companion/backend/internal/characters"
	"github.com/Inkala/rpg-companion/backend/internal/parties"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/lib/pq"
)

const localOrigin = "http://localhost:5173"
const passwordPolicyMessage = "Use 8–128 characters with an uppercase letter, lowercase letter, number, and special character."

func TestAuthSessionFlow(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	authRepository := auth.NewRepository(pool)
	handler := newTestServer(pool)

	registerRecorder := httptest.NewRecorder()
	registerRequest := jsonRequest(http.MethodPost, "/auth/register", `{
		"username": "Mara",
		"email": "mara@example.com",
		"password": "Correct-horse-battery-staple1"
	}`)
	handler.ServeHTTP(registerRecorder, registerRequest)

	if registerRecorder.Code != http.StatusCreated {
		t.Fatalf("expected register status %d, got %d with body %s", http.StatusCreated, registerRecorder.Code, registerRecorder.Body.String())
	}
	assertNoStore(t, registerRecorder)
	assertCredentialCORS(t, registerRecorder)
	if got := registerRecorder.Header().Values("Set-Cookie"); len(got) != 0 {
		t.Fatalf("expected registration not to set a session cookie, got %q", got)
	}
	var sessionRowsAfterRegistration int
	if err := pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM user_sessions`).Scan(&sessionRowsAfterRegistration); err != nil {
		t.Fatalf("count sessions after registration: %v", err)
	}
	if sessionRowsAfterRegistration != 0 {
		t.Fatalf("expected registration to create no session rows, got %d", sessionRowsAfterRegistration)
	}

	var registered authResponse
	decodeResponse(t, registerRecorder, &registered)
	if registered.User.UsernameCanonical != "mara" {
		t.Fatalf("expected canonical username, got %q", registered.User.UsernameCanonical)
	}
	if registered.User.Username != "Mara" {
		t.Fatalf("expected display username, got %q", registered.User.Username)
	}

	duplicateRecorder := httptest.NewRecorder()
	duplicateRequest := jsonRequest(http.MethodPost, "/auth/register", `{
		"username": "mARA",
		"email": "mara-alt@example.com",
		"password": "Correct-horse-battery-staple1"
	}`)
	handler.ServeHTTP(duplicateRecorder, duplicateRequest)
	if duplicateRecorder.Code != http.StatusConflict {
		t.Fatalf("expected duplicate status %d, got %d with body %s", http.StatusConflict, duplicateRecorder.Code, duplicateRecorder.Body.String())
	}
	assertErrorResponse(t, duplicateRecorder, "Account could not be created with those details.")

	duplicateEmailRecorder := httptest.NewRecorder()
	duplicateEmailRequest := jsonRequest(http.MethodPost, "/auth/register", `{
		"username": "mara-alt",
		"email": "MARA@example.com",
		"password": "Correct-horse-battery-staple1"
	}`)
	handler.ServeHTTP(duplicateEmailRecorder, duplicateEmailRequest)
	if duplicateEmailRecorder.Code != http.StatusConflict {
		t.Fatalf("expected duplicate email status %d, got %d with body %s", http.StatusConflict, duplicateEmailRecorder.Code, duplicateEmailRecorder.Body.String())
	}
	assertErrorResponse(t, duplicateEmailRecorder, "Account could not be created with those details.")

	invalidUsernameRecorder := httptest.NewRecorder()
	invalidUsernameRequest := jsonRequest(http.MethodPost, "/auth/register", `{
		"username": "má",
		"email": "valid@example.com",
		"password": "Correct-horse-battery-staple1"
	}`)
	handler.ServeHTTP(invalidUsernameRecorder, invalidUsernameRequest)
	if invalidUsernameRecorder.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid username status %d, got %d with body %s", http.StatusBadRequest, invalidUsernameRecorder.Code, invalidUsernameRecorder.Body.String())
	}
	assertErrorResponse(t, invalidUsernameRecorder, "Username must be 3-32 characters and use only English letters, numbers, underscores, or hyphens.")

	invalidEmailRecorder := httptest.NewRecorder()
	invalidEmailRequest := jsonRequest(http.MethodPost, "/auth/register", `{
		"username": "valid-user",
		"email": "not-an-email",
		"password": "Correct-horse-battery-staple1"
	}`)
	handler.ServeHTTP(invalidEmailRecorder, invalidEmailRequest)
	if invalidEmailRecorder.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid email status %d, got %d with body %s", http.StatusBadRequest, invalidEmailRecorder.Code, invalidEmailRecorder.Body.String())
	}
	assertErrorResponse(t, invalidEmailRecorder, "Enter a valid email address.")

	invalidLoginRecorder := httptest.NewRecorder()
	invalidLoginRequest := jsonRequest(http.MethodPost, "/auth/sessions", `{
		"usernameOrEmail": "mARA",
		"password": "wrong password"
	}`)
	handler.ServeHTTP(invalidLoginRecorder, invalidLoginRequest)
	if invalidLoginRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected invalid login status %d, got %d with body %s", http.StatusUnauthorized, invalidLoginRecorder.Code, invalidLoginRecorder.Body.String())
	}
	assertErrorResponse(t, invalidLoginRecorder, "Username, email, or password is incorrect.")

	anonymousCurrentRecorder := httptest.NewRecorder()
	anonymousCurrentRequest := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
	handler.ServeHTTP(anonymousCurrentRecorder, anonymousCurrentRequest)
	if anonymousCurrentRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected anonymous current session status %d, got %d with body %s", http.StatusUnauthorized, anonymousCurrentRecorder.Code, anonymousCurrentRecorder.Body.String())
	}

	usernameLoginRecorder := httptest.NewRecorder()
	usernameLoginRequest := jsonRequest(http.MethodPost, "/auth/sessions", `{
		"usernameOrEmail": "mARA",
		"password": "Correct-horse-battery-staple1"
	}`)
	handler.ServeHTTP(usernameLoginRecorder, usernameLoginRequest)
	if usernameLoginRecorder.Code != http.StatusOK {
		t.Fatalf("expected username login status %d, got %d with body %s", http.StatusOK, usernameLoginRecorder.Code, usernameLoginRecorder.Body.String())
	}
	assertNoStore(t, usernameLoginRecorder)
	sessionCookie := requireSessionCookie(t, usernameLoginRecorder)
	if !sessionCookie.HttpOnly {
		t.Fatal("expected session cookie to be HttpOnly")
	}
	if sessionCookie.Secure {
		t.Fatal("expected local development session cookie to be non-Secure")
	}

	emailLoginRecorder := httptest.NewRecorder()
	emailLoginRequest := jsonRequest(http.MethodPost, "/auth/sessions", `{
		"usernameOrEmail": "MARA@example.com",
		"password": "Correct-horse-battery-staple1"
	}`)
	handler.ServeHTTP(emailLoginRecorder, emailLoginRequest)
	if emailLoginRecorder.Code != http.StatusOK {
		t.Fatalf("expected email login status %d, got %d with body %s", http.StatusOK, emailLoginRecorder.Code, emailLoginRecorder.Body.String())
	}

	currentRecorder := httptest.NewRecorder()
	currentRequest := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
	currentRequest.AddCookie(sessionCookie)
	handler.ServeHTTP(currentRecorder, currentRequest)
	if currentRecorder.Code != http.StatusOK {
		t.Fatalf("expected current session status %d, got %d with body %s", http.StatusOK, currentRecorder.Code, currentRecorder.Body.String())
	}
	assertNoStore(t, currentRecorder)

	expiredToken := "expired-session-token"
	_, err := authRepository.CreateSession(context.Background(), auth.Session{
		ID:        uuid.New(),
		UserID:    uuid.MustParse(registered.User.ID),
		TokenHash: auth.TokenHash(expiredToken),
		CreatedAt: time.Now().UTC().Add(-2 * time.Hour),
		ExpiresAt: time.Now().UTC().Add(-time.Hour),
	})
	if err != nil {
		t.Fatalf("create expired session: %v", err)
	}
	expiredRecorder := httptest.NewRecorder()
	expiredRequest := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
	expiredRequest.AddCookie(&http.Cookie{Name: auth.SessionCookieName, Value: expiredToken})
	handler.ServeHTTP(expiredRecorder, expiredRequest)
	if expiredRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected expired session status %d, got %d with body %s", http.StatusUnauthorized, expiredRecorder.Code, expiredRecorder.Body.String())
	}

	logoutRecorder := httptest.NewRecorder()
	logoutRequest := httptest.NewRequest(http.MethodDelete, "/auth/session", nil)
	logoutRequest.Header.Set("Origin", localOrigin)
	logoutRequest.AddCookie(sessionCookie)
	handler.ServeHTTP(logoutRecorder, logoutRequest)
	if logoutRecorder.Code != http.StatusNoContent {
		t.Fatalf("expected logout status %d, got %d with body %s", http.StatusNoContent, logoutRecorder.Code, logoutRecorder.Body.String())
	}
	assertNoStore(t, logoutRecorder)

	revokedRecorder := httptest.NewRecorder()
	revokedRequest := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
	revokedRequest.AddCookie(sessionCookie)
	handler.ServeHTTP(revokedRecorder, revokedRequest)
	if revokedRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected revoked session status %d, got %d with body %s", http.StatusUnauthorized, revokedRecorder.Code, revokedRecorder.Body.String())
	}
}

func TestRegistrationPasswordPolicy(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := newTestServer(pool)

	tests := []struct {
		name       string
		password   string
		wantStatus int
	}{
		{
			name:       "shorter than 8 characters",
			password:   "Aa1!",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "longer than 128 characters",
			password:   "Aa1!" + strings.Repeat("x", 125),
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing uppercase letter",
			password:   "lowercase1!",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing lowercase letter",
			password:   "UPPERCASE1!",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing number",
			password:   "NoNumber!",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing special character",
			password:   "NoSpecial1",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid compliant password",
			password:   "Compliant1!",
			wantStatus: http.StatusCreated,
		},
	}

	for index, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := jsonRequest(http.MethodPost, "/auth/register", registrationJSON(
				"policy-user-"+string(rune('a'+index)),
				"policy-user-"+string(rune('a'+index))+"@example.com",
				tt.password,
			))
			handler.ServeHTTP(recorder, request)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d with body %s", tt.wantStatus, recorder.Code, recorder.Body.String())
			}
			if tt.wantStatus == http.StatusBadRequest {
				assertErrorResponse(t, recorder, passwordPolicyMessage)
			}
		})
	}
}

func TestProductionSignInSessionCookieIsSecure(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := New(
		characters.NewRepository(pool),
		parties.NewRepository(pool),
		auth.NewRepository(pool),
		Options{
			AllowedOrigins: []string{localOrigin},
			CookieSecure:   true,
			PasswordConfig: testPasswordConfig(),
		},
	)

	recorder := httptest.NewRecorder()
	request := jsonRequest(http.MethodPost, "/auth/register", `{
		"username": "secure-user",
		"email": "secure-user@example.com",
		"password": "Correct-horse-battery-staple1"
	}`)
	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected register status %d, got %d with body %s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Values("Set-Cookie"); len(got) != 0 {
		t.Fatalf("expected registration not to set a session cookie, got %q", got)
	}

	loginRecorder := httptest.NewRecorder()
	loginRequest := jsonRequest(http.MethodPost, "/auth/sessions", `{
		"usernameOrEmail": "secure-user",
		"password": "Correct-horse-battery-staple1"
	}`)
	handler.ServeHTTP(loginRecorder, loginRequest)

	if loginRecorder.Code != http.StatusOK {
		t.Fatalf("expected login status %d, got %d with body %s", http.StatusOK, loginRecorder.Code, loginRecorder.Body.String())
	}

	sessionCookie := requireSessionCookie(t, loginRecorder)
	if !sessionCookie.HttpOnly {
		t.Fatal("expected production session cookie to be HttpOnly")
	}
	if !sessionCookie.Secure {
		t.Fatal("expected production session cookie to be Secure")
	}
}

func TestSessionStoresOnlyTokenHash(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := newTestServer(pool)

	recorder := httptest.NewRecorder()
	request := jsonRequest(http.MethodPost, "/auth/register", `{
		"username": "hash-user",
		"email": "hash-user@example.com",
		"password": "Correct-horse-battery-staple1"
	}`)
	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected register status %d, got %d with body %s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	loginRecorder := httptest.NewRecorder()
	loginRequest := jsonRequest(http.MethodPost, "/auth/sessions", `{
		"usernameOrEmail": "hash-user",
		"password": "Correct-horse-battery-staple1"
	}`)
	handler.ServeHTTP(loginRecorder, loginRequest)
	if loginRecorder.Code != http.StatusOK {
		t.Fatalf("expected login status %d, got %d with body %s", http.StatusOK, loginRecorder.Code, loginRecorder.Body.String())
	}

	sessionCookie := requireSessionCookie(t, loginRecorder)
	var storedTokenHash []byte
	err := pool.QueryRow(context.Background(), `
SELECT token_hash
FROM user_sessions
WHERE revoked_at IS NULL`).Scan(&storedTokenHash)
	if err != nil {
		t.Fatalf("load stored token hash: %v", err)
	}

	rawTokenBytes := []byte(sessionCookie.Value)
	if bytes.Equal(storedTokenHash, rawTokenBytes) {
		t.Fatal("stored session token must not equal the raw cookie token")
	}

	expectedHash := sha256.Sum256(rawTokenBytes)
	if !bytes.Equal(storedTokenHash, expectedHash[:]) {
		t.Fatal("stored session token hash does not match SHA-256(cookie token)")
	}
}

func TestCharacterOwnershipThroughAuthenticatedServer(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := newTestServer(pool)

	userACookie, userA := registerTestUser(t, handler, "mara")
	userBCookie, _ := registerTestUser(t, handler, "other-user")

	unauthenticatedRecorder := httptest.NewRecorder()
	unauthenticatedRequest := jsonRequest(http.MethodPost, "/characters", validCharacterJSON())
	handler.ServeHTTP(unauthenticatedRecorder, unauthenticatedRequest)
	if unauthenticatedRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthenticated create status %d, got %d with body %s", http.StatusUnauthorized, unauthenticatedRecorder.Code, unauthenticatedRecorder.Body.String())
	}

	unauthenticatedListRecorder := httptest.NewRecorder()
	unauthenticatedListRequest := httptest.NewRequest(http.MethodGet, "/characters", nil)
	handler.ServeHTTP(unauthenticatedListRecorder, unauthenticatedListRequest)
	if unauthenticatedListRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthenticated list status %d, got %d with body %s", http.StatusUnauthorized, unauthenticatedListRecorder.Code, unauthenticatedListRecorder.Body.String())
	}

	ownerRecorder := httptest.NewRecorder()
	ownerRequest := jsonRequest(http.MethodPost, "/characters", validCharacterJSON())
	ownerRequest.AddCookie(userACookie)
	handler.ServeHTTP(ownerRecorder, ownerRequest)
	if ownerRecorder.Code != http.StatusCreated {
		t.Fatalf("expected character create status %d, got %d with body %s", http.StatusCreated, ownerRecorder.Code, ownerRecorder.Body.String())
	}
	assertNoStore(t, ownerRecorder)

	var created characterResponse
	decodeResponse(t, ownerRecorder, &created)
	if created.OwnerSubjectID == nil || *created.OwnerSubjectID != userA.User.ID {
		t.Fatalf("expected ownerSubjectId %q, got %v", userA.User.ID, created.OwnerSubjectID)
	}

	ownerListRecorder := httptest.NewRecorder()
	ownerListRequest := httptest.NewRequest(http.MethodGet, "/characters", nil)
	ownerListRequest.AddCookie(userACookie)
	handler.ServeHTTP(ownerListRecorder, ownerListRequest)
	if ownerListRecorder.Code != http.StatusOK {
		t.Fatalf("expected owner list status %d, got %d with body %s", http.StatusOK, ownerListRecorder.Code, ownerListRecorder.Body.String())
	}
	assertNoStore(t, ownerListRecorder)
	var ownerList characterListResponse
	decodeResponse(t, ownerListRecorder, &ownerList)
	if len(ownerList.Characters) != 1 {
		t.Fatalf("expected one owned character in list, got %d", len(ownerList.Characters))
	}
	if ownerList.Characters[0].ID != created.ID {
		t.Fatalf("expected listed character %q, got %q", created.ID, ownerList.Characters[0].ID)
	}

	rejectedOwnerRecorder := httptest.NewRecorder()
	rejectedOwnerRequest := jsonRequest(http.MethodPost, "/characters", characterJSONWithOwner())
	rejectedOwnerRequest.AddCookie(userACookie)
	handler.ServeHTTP(rejectedOwnerRecorder, rejectedOwnerRequest)
	if rejectedOwnerRecorder.Code != http.StatusBadRequest {
		t.Fatalf("expected client owner status %d, got %d with body %s", http.StatusBadRequest, rejectedOwnerRecorder.Code, rejectedOwnerRecorder.Body.String())
	}

	ownerGetRecorder := httptest.NewRecorder()
	ownerGetRequest := httptest.NewRequest(http.MethodGet, "/characters/"+created.ID, nil)
	ownerGetRequest.AddCookie(userACookie)
	handler.ServeHTTP(ownerGetRecorder, ownerGetRequest)
	if ownerGetRecorder.Code != http.StatusOK {
		t.Fatalf("expected owner get status %d, got %d with body %s", http.StatusOK, ownerGetRecorder.Code, ownerGetRecorder.Body.String())
	}
	assertNoStore(t, ownerGetRecorder)

	otherGetRecorder := httptest.NewRecorder()
	otherGetRequest := httptest.NewRequest(http.MethodGet, "/characters/"+created.ID, nil)
	otherGetRequest.AddCookie(userBCookie)
	handler.ServeHTTP(otherGetRecorder, otherGetRequest)
	if otherGetRecorder.Code != http.StatusNotFound {
		t.Fatalf("expected other user get status %d, got %d with body %s", http.StatusNotFound, otherGetRecorder.Code, otherGetRecorder.Body.String())
	}
}

func TestCORSAndOriginChecks(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := newTestServer(pool)

	preflightRecorder := httptest.NewRecorder()
	preflightRequest := httptest.NewRequest(http.MethodOptions, "/auth/register", nil)
	preflightRequest.Header.Set("Origin", localOrigin)
	preflightRequest.Header.Set("Access-Control-Request-Method", "POST")
	handler.ServeHTTP(preflightRecorder, preflightRequest)
	if preflightRecorder.Code != http.StatusNoContent {
		t.Fatalf("expected preflight status %d, got %d", http.StatusNoContent, preflightRecorder.Code)
	}
	assertCredentialCORS(t, preflightRecorder)

	disallowedRecorder := httptest.NewRecorder()
	disallowedRequest := jsonRequest(http.MethodPost, "/auth/register", `{
		"username": "mARA",
		"email": "mara@example.com",
		"password": "Correct-horse-battery-staple1"
	}`)
	disallowedRequest.Header.Set("Origin", "https://evil.example")
	handler.ServeHTTP(disallowedRecorder, disallowedRequest)
	if disallowedRecorder.Code != http.StatusForbidden {
		t.Fatalf("expected disallowed origin status %d, got %d", http.StatusForbidden, disallowedRecorder.Code)
	}

	missingOriginRecorder := httptest.NewRecorder()
	missingOriginRequest := httptest.NewRequest(http.MethodDelete, "/auth/session", nil)
	missingOriginRequest.AddCookie(&http.Cookie{Name: auth.SessionCookieName, Value: "session-token"})
	handler.ServeHTTP(missingOriginRecorder, missingOriginRequest)
	if missingOriginRecorder.Code != http.StatusForbidden {
		t.Fatalf("expected missing origin status %d, got %d", http.StatusForbidden, missingOriginRecorder.Code)
	}
}

func TestAPISecurityHeadersApplyToSuccessAndErrorResponses(t *testing.T) {
	handler := New(nil, nil, nil, Options{AllowedOrigins: []string{localOrigin}})
	tests := []struct {
		name    string
		request *http.Request
	}{
		{
			name:    "health success",
			request: httptest.NewRequest(http.MethodGet, "/healthz", nil),
		},
		{
			name: "CORS error",
			request: func() *http.Request {
				request := httptest.NewRequest(http.MethodPost, "/auth/register", strings.NewReader(`{}`))
				request.Header.Set("Content-Type", "application/json")
				request.Header.Set("Origin", "https://evil.example")
				return request
			}(),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, tt.request)

			assertSecurityHeaders(t, recorder)
		})
	}
}

func TestPartyRoutesRequireSessionAndSetNoStore(t *testing.T) {
	handler := New(nil, nil, nil, Options{AllowedOrigins: []string{localOrigin}})
	partyID := "00000000-0000-0000-0000-000000000001"
	characterID := "00000000-0000-0000-0000-000000000002"
	tests := []struct {
		name   string
		method string
		path   string
	}{
		{name: "create", method: http.MethodPost, path: "/parties"},
		{name: "list", method: http.MethodGet, path: "/parties"},
		{name: "detail", method: http.MethodGet, path: "/parties/" + partyID},
		{name: "create or regenerate invite", method: http.MethodPost, path: "/parties/" + partyID + "/invites"},
		{name: "inspect invite", method: http.MethodPost, path: "/party-invites/inspect"},
		{name: "join", method: http.MethodPost, path: "/party-invites/join"},
		{name: "GM character reference", method: http.MethodGet, path: "/parties/" + partyID + "/characters/" + characterID},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(tt.method, tt.path, nil)
			if tt.method == http.MethodPost {
				request.Header.Set("Origin", localOrigin)
			}

			handler.ServeHTTP(recorder, request)

			if recorder.Code != http.StatusUnauthorized {
				t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, recorder.Code)
			}
			assertNoStore(t, recorder)
		})
	}
}

func TestPartyPathsSetNoStoreForAllResponseStatuses(t *testing.T) {
	statuses := []int{
		http.StatusOK,
		http.StatusBadRequest,
		http.StatusUnauthorized,
		http.StatusForbidden,
		http.StatusNotFound,
		http.StatusConflict,
		http.StatusTooManyRequests,
		http.StatusInternalServerError,
		http.StatusMethodNotAllowed,
	}
	paths := []string{
		"/parties",
		"/parties/00000000-0000-0000-0000-000000000001",
		"/parties/00000000-0000-0000-0000-000000000001/invites",
		"/party-invites/inspect",
		"/party-invites/join",
	}

	for _, path := range paths {
		for _, status := range statuses {
			t.Run(path+"/"+http.StatusText(status), func(t *testing.T) {
				handler := withPrivateResponseNoStore(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
					w.WriteHeader(status)
				}))
				recorder := httptest.NewRecorder()

				handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, path, nil))

				if recorder.Code != status {
					t.Fatalf("expected status %d, got %d", status, recorder.Code)
				}
				assertNoStore(t, recorder)
			})
		}
	}
}

func TestPartyCORSRejectionKeepsNoStoreAndSecurityHeaders(t *testing.T) {
	handler := New(nil, nil, nil, Options{AllowedOrigins: []string{localOrigin}})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/party-invites/join", nil)
	request.Header.Set("Origin", "https://evil.example")

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d", http.StatusForbidden, recorder.Code)
	}
	assertNoStore(t, recorder)
	assertSecurityHeaders(t, recorder)
}

func TestUnsupportedPartyMethodsDoNotReachHandlers(t *testing.T) {
	handler := New(nil, nil, nil, Options{})
	partyID := "00000000-0000-0000-0000-000000000001"
	characterID := "00000000-0000-0000-0000-000000000002"
	paths := []string{
		"/parties",
		"/parties/" + partyID,
		"/parties/" + partyID + "/invites",
		"/party-invites/inspect",
		"/party-invites/join",
		"/parties/" + partyID + "/characters/" + characterID,
	}
	methods := []string{http.MethodPut, http.MethodPatch, http.MethodDelete}

	for _, path := range paths {
		for _, method := range methods {
			t.Run(method+" "+path, func(t *testing.T) {
				recorder := httptest.NewRecorder()
				request := httptest.NewRequest(method, path, nil)

				handler.ServeHTTP(recorder, request)

				if recorder.Code != http.StatusMethodNotAllowed {
					t.Fatalf("expected status %d, got %d", http.StatusMethodNotAllowed, recorder.Code)
				}
				assertNoStore(t, recorder)
			})
		}
	}
}

func TestUnsupportedPartyMethodsDoNotMutatePersistence(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := newTestServer(pool)
	sessionCookie, _ := registerTestUser(t, handler, "party-method-user")
	tests := []struct {
		method string
		path   string
		body   string
	}{
		{method: http.MethodPut, path: "/parties", body: `{"name":"Never created"}`},
		{method: http.MethodPatch, path: "/parties", body: `{"name":"Never created"}`},
		{method: http.MethodDelete, path: "/parties"},
	}

	for _, tt := range tests {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
		request.Header.Set("Origin", localOrigin)
		if tt.body != "" {
			request.Header.Set("Content-Type", "application/json")
		}
		request.AddCookie(sessionCookie)

		handler.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusMethodNotAllowed {
			t.Fatalf("expected status %d, got %d", http.StatusMethodNotAllowed, recorder.Code)
		}
		assertNoStore(t, recorder)
	}

	for _, table := range []string{"parties", "party_memberships", "party_invites"} {
		var count int
		if err := pool.QueryRow(context.Background(), "SELECT count(*) FROM "+table).Scan(&count); err != nil {
			t.Fatalf("count %s: %v", table, err)
		}
		if count != 0 {
			t.Fatalf("expected %s to remain empty, got %d rows", table, count)
		}
	}
}

func TestPartyMVPAuthenticatedServerFlow(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := newTestServer(pool)
	var serverLogs bytes.Buffer
	previousLogWriter := log.Writer()
	log.SetOutput(&serverLogs)
	t.Cleanup(func() { log.SetOutput(previousLogWriter) })
	gmCookie, gmAccount := registerTestUser(t, handler, "party-flow-gm")
	playerCookie, playerAccount := registerTestUser(t, handler, "party-flow-player")
	createdCharacter, expectedReferencePayload := createServerCharacter(t, handler, playerCookie)

	createResponse := performServerJSONRequest(t, handler, gmCookie, http.MethodPost, "/parties", map[string]any{
		"name": "  Moon Keep  ",
	})
	requireServerStatus(t, createResponse, http.StatusCreated)
	assertExactServerJSONFields(t, createResponse, "id", "name", "role")
	var createdParty partySummaryHTTPResponse
	decodeServerJSON(t, createResponse, &createdParty)
	if createdParty.Name != "Moon Keep" || createdParty.Role != parties.RoleGM {
		t.Fatal("Party creation did not return the normalized GM summary")
	}

	var membershipCount int
	var gmRole string
	var gmCharacterID *string
	if err := pool.QueryRow(context.Background(), `
SELECT count(*), min(role), min(character_id::text)
FROM party_memberships
WHERE party_id = $1::uuid`, createdParty.ID).Scan(&membershipCount, &gmRole, &gmCharacterID); err != nil {
		t.Fatalf("load creating membership: %v", err)
	}
	if membershipCount != 1 || gmRole != parties.RoleGM || gmCharacterID != nil {
		t.Fatal("Party creation did not persist exactly one character-free GM membership")
	}

	gmListResponse := performServerJSONRequest(t, handler, gmCookie, http.MethodGet, "/parties", nil)
	requireServerStatus(t, gmListResponse, http.StatusOK)
	var gmList partyListHTTPResponse
	decodeServerJSON(t, gmListResponse, &gmList)
	if len(gmList.Parties) != 1 || gmList.Parties[0] != createdParty {
		t.Fatal("GM Party list did not contain the created Party summary")
	}

	initialDetailResponse := performServerJSONRequest(t, handler, gmCookie, http.MethodGet, "/parties/"+createdParty.ID, nil)
	requireServerStatus(t, initialDetailResponse, http.StatusOK)
	var initialDetail partyDetailHTTPResponse
	decodeServerJSON(t, initialDetailResponse, &initialDetail)
	if initialDetail.Role != parties.RoleGM || len(initialDetail.Members) != 1 || initialDetail.Members[0].Character != nil {
		t.Fatal("initial Party detail did not contain only the character-free GM roster entry")
	}

	playerListResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodGet, "/parties", nil)
	requireServerStatus(t, playerListResponse, http.StatusOK)
	var playerList partyListHTTPResponse
	decodeServerJSON(t, playerListResponse, &playerList)
	if len(playerList.Parties) != 0 {
		t.Fatal("nonmember Party list was not empty before joining")
	}

	nonmemberDetailResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodGet, "/parties/"+createdParty.ID, nil)
	assertServerPartyError(t, nonmemberDetailResponse, http.StatusNotFound, "not_found", "party not found")
	unknownDetailResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodGet, "/parties/"+uuid.New().String(), nil)
	assertServerPartyError(t, unknownDetailResponse, http.StatusNotFound, "not_found", "party not found")
	if !bytes.Equal(nonmemberDetailResponse.Body.Bytes(), unknownDetailResponse.Body.Bytes()) {
		t.Fatal("unknown and nonmember Party detail responses were distinguishable")
	}

	firstInviteResponse := createServerInvite(t, handler, gmCookie, createdParty.ID)
	firstInvite := decodeServerInvite(t, firstInviteResponse)
	expectedHash := sha256.Sum256([]byte(firstInvite.Token))
	var storedHash []byte
	if err := pool.QueryRow(context.Background(), `
SELECT token_hash
FROM party_invites
WHERE party_id = $1::uuid AND revoked_at IS NULL`, createdParty.ID).Scan(&storedHash); err != nil {
		t.Fatalf("load stored invite hash: %v", err)
	}
	if !bytes.Equal(storedHash, expectedHash[:]) || bytes.Equal(storedHash, []byte(firstInvite.Token)) {
		t.Fatal("PostgreSQL did not store only the expected invite credential hash")
	}

	signedOutInspection := performServerJSONRequest(t, handler, nil, http.MethodPost, "/party-invites/inspect", map[string]any{
		"token": firstInvite.Token,
	})
	requireServerStatus(t, signedOutInspection, http.StatusUnauthorized)
	assertServerResponseExcludes(t, signedOutInspection, firstInvite.Token, createdParty.ID, createdParty.Name)

	playerInspection := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/party-invites/inspect", map[string]any{
		"token": firstInvite.Token,
	})
	requireServerStatus(t, playerInspection, http.StatusOK)
	assertInviteInspectionPrivacy(t, playerInspection)
	var inspected inviteInspectionHTTPResponse
	decodeServerJSON(t, playerInspection, &inspected)
	if inspected.Party.ID != createdParty.ID || inspected.Party.Name != createdParty.Name {
		t.Fatal("authenticated invite inspection returned the wrong Party summary")
	}
	assertServerResponseExcludes(t, playerInspection, firstInvite.Token)

	replacementInviteResponse := createServerInvite(t, handler, gmCookie, createdParty.ID)
	replacementInvite := decodeServerInvite(t, replacementInviteResponse)
	if replacementInvite.Token == firstInvite.Token {
		t.Fatal("invite regeneration reused the prior credential")
	}
	var activeInviteCount int
	if err := pool.QueryRow(context.Background(), `
SELECT count(*)
FROM party_invites
WHERE party_id = $1::uuid AND revoked_at IS NULL`, createdParty.ID).Scan(&activeInviteCount); err != nil {
		t.Fatalf("count active invites: %v", err)
	}
	if activeInviteCount != 1 {
		t.Fatalf("expected one active invite after regeneration, got %d", activeInviteCount)
	}
	assertInviteCredentialsNotStoredRaw(t, pool, firstInvite.Token, replacementInvite.Token)

	replacedInspection := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/party-invites/inspect", map[string]any{
		"token": firstInvite.Token,
	})
	assertServerPartyError(t, replacedInspection, http.StatusBadRequest, "invite_unavailable", "invite unavailable")
	unknownCredential := newTestInviteCredential(t)
	unknownInspection := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/party-invites/inspect", map[string]any{
		"token": unknownCredential,
	})
	assertServerPartyError(t, unknownInspection, http.StatusBadRequest, "invite_unavailable", "invite unavailable")
	if !bytes.Equal(replacedInspection.Body.Bytes(), unknownInspection.Body.Bytes()) {
		t.Fatal("replaced and unknown invite responses were distinguishable")
	}
	replacementInspection := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/party-invites/inspect", map[string]any{
		"token": replacementInvite.Token,
	})
	requireServerStatus(t, replacementInspection, http.StatusOK)
	assertInviteInspectionPrivacy(t, replacementInspection)
	assertServerResponseExcludes(t, replacementInspection, firstInvite.Token, replacementInvite.Token)

	joinResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/party-invites/join", map[string]any{
		"token":       replacementInvite.Token,
		"characterId": createdCharacter.ID,
	})
	requireServerStatus(t, joinResponse, http.StatusCreated)
	assertExactServerJSONFields(t, joinResponse, "partyId", "membershipId", "role", "characterId", "joinedAt")
	var joined joinHTTPResponse
	decodeServerJSON(t, joinResponse, &joined)
	if joined.PartyID != createdParty.ID || joined.Role != parties.RolePlayer || joined.CharacterID != createdCharacter.ID {
		t.Fatal("new Party join returned the wrong frozen membership DTO")
	}
	assertServerResponseExcludes(t, joinResponse, firstInvite.Token, replacementInvite.Token, gmAccount.User.ID, playerAccount.User.ID)

	replayResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/party-invites/join", map[string]any{
		"token":       replacementInvite.Token,
		"characterId": createdCharacter.ID,
	})
	requireServerStatus(t, replayResponse, http.StatusOK)
	var replayed joinHTTPResponse
	decodeServerJSON(t, replayResponse, &replayed)
	if replayed != joined {
		t.Fatal("identical Party join replay did not return the same canonical public membership DTO")
	}
	assertServerResponseExcludes(t, replayResponse, firstInvite.Token, replacementInvite.Token, gmAccount.User.ID, playerAccount.User.ID)

	gmDetailResponse := performServerJSONRequest(t, handler, gmCookie, http.MethodGet, "/parties/"+createdParty.ID, nil)
	playerDetailResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodGet, "/parties/"+createdParty.ID, nil)
	for _, response := range []*httptest.ResponseRecorder{gmDetailResponse, playerDetailResponse} {
		requireServerStatus(t, response, http.StatusOK)
		assertRosterResponsePrivacy(t, response)
		assertServerResponseExcludes(
			t,
			response,
			gmAccount.User.ID,
			playerAccount.User.ID,
			"party-flow-gm@example.com",
			"party-flow-player@example.com",
			firstInvite.Token,
			replacementInvite.Token,
			"referencePayload",
			"ownerSubjectId",
			"tokenHash",
		)
	}
	var gmDetail partyDetailHTTPResponse
	var playerDetail partyDetailHTTPResponse
	decodeServerJSON(t, gmDetailResponse, &gmDetail)
	decodeServerJSON(t, playerDetailResponse, &playerDetail)
	if gmDetail.Role != parties.RoleGM || playerDetail.Role != parties.RolePlayer || !reflect.DeepEqual(gmDetail.Members, playerDetail.Members) {
		t.Fatal("GM and Player did not receive the same basic roster with their own requester roles")
	}
	if len(gmDetail.Members) != 2 || gmDetail.Members[0].Role != parties.RoleGM || gmDetail.Members[0].Character != nil ||
		gmDetail.Members[1].Role != parties.RolePlayer || gmDetail.Members[1].Character == nil || gmDetail.Members[1].Character.ID != createdCharacter.ID {
		t.Fatal("Party roster did not contain the ordered GM and linked Player identity")
	}
	if gmDetail.Members[0].Username != "party-flow-gm" || gmDetail.Members[1].Username != "party-flow-player" {
		t.Fatal("Party roster did not return the approved member usernames")
	}

	gmCharacterResponse := performServerJSONRequest(t, handler, gmCookie, http.MethodGet, "/parties/"+createdParty.ID+"/characters/"+createdCharacter.ID, nil)
	requireServerStatus(t, gmCharacterResponse, http.StatusOK)
	assertExactServerJSONFields(
		t,
		gmCharacterResponse,
		"id",
		"ownerSubjectId",
		"name",
		"className",
		"subclassName",
		"level",
		"ancestry",
		"background",
		"abilityScores",
		"hitPoints",
		"armorClass",
		"speedFt",
		"referencePayload",
		"createdAt",
		"updatedAt",
	)
	var partyCharacter partyCharacterHTTPResponse
	decodeServerJSON(t, gmCharacterResponse, &partyCharacter)
	if partyCharacter.OwnerSubjectID != nil {
		t.Fatal("Party Character response exposed ownerSubjectId")
	}
	if partyCharacter.ID != createdCharacter.ID || partyCharacter.Name != "Mara Vale" || partyCharacter.ClassName != "Ranger" ||
		partyCharacter.Level != 3 || partyCharacter.Ancestry != "Human" || partyCharacter.Background != "Outlander" ||
		partyCharacter.ArmorClass != 14 || partyCharacter.SpeedFt != 30 {
		t.Fatal("Party Character response omitted or changed complete Character core data")
	}
	var actualReferencePayload any
	if err := json.Unmarshal(partyCharacter.ReferencePayload, &actualReferencePayload); err != nil {
		t.Fatalf("decode Party Character reference payload: %v", err)
	}
	if !reflect.DeepEqual(actualReferencePayload, expectedReferencePayload) {
		t.Fatal("Party Character response did not preserve the complete stored CharacterSheetV1 payload")
	}

	playerPartyCharacterResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodGet, "/parties/"+createdParty.ID+"/characters/"+createdCharacter.ID, nil)
	assertServerCharacterError(t, playerPartyCharacterResponse, http.StatusNotFound, "character not found")

	playerOwnerResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodGet, "/characters/"+createdCharacter.ID, nil)
	requireServerStatus(t, playerOwnerResponse, http.StatusOK)
	assertNoStore(t, playerOwnerResponse)
	gmOwnerResponse := performServerJSONRequest(t, handler, gmCookie, http.MethodGet, "/characters/"+createdCharacter.ID, nil)
	assertServerCharacterError(t, gmOwnerResponse, http.StatusNotFound, "character not found")
	assertNoStore(t, gmOwnerResponse)
	if strings.Contains(serverLogs.String(), firstInvite.Token) || strings.Contains(serverLogs.String(), replacementInvite.Token) {
		t.Fatal("server logs exposed an invite credential")
	}
}

func TestPartyServerAuthorizationAndConflictMatrix(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := newTestServer(pool)
	gmACookie, _ := registerTestUser(t, handler, "matrix-gm-a")
	gmBCookie, _ := registerTestUser(t, handler, "matrix-gm-b")
	playerCookie, _ := registerTestUser(t, handler, "matrix-player")
	otherCookie, _ := registerTestUser(t, handler, "matrix-other")
	playerCharacter, _ := createServerCharacter(t, handler, playerCookie)
	playerUnlinkedCharacter, _ := createServerCharacter(t, handler, playerCookie)
	foreignCharacter, _ := createServerCharacter(t, handler, otherCookie)
	partyA := createServerParty(t, handler, gmACookie, "Party A")
	partyB := createServerParty(t, handler, gmBCookie, "Party B")
	inviteA := decodeServerInvite(t, createServerInvite(t, handler, gmACookie, partyA.ID))
	inviteB := decodeServerInvite(t, createServerInvite(t, handler, gmBCookie, partyB.ID))

	malformedPartyResponse := performServerJSONRequest(t, handler, gmACookie, http.MethodGet, "/parties/not-a-uuid", nil)
	assertServerPartyError(t, malformedPartyResponse, http.StatusBadRequest, "validation_error", "party request is invalid")
	malformedCharacterResponse := performServerJSONRequest(t, handler, gmACookie, http.MethodGet, "/parties/"+partyA.ID+"/characters/not-a-uuid", nil)
	assertServerCharacterError(t, malformedCharacterResponse, http.StatusBadRequest, "character id must be a valid UUID")

	playerInviteResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/parties/"+partyA.ID+"/invites", nil)
	assertServerPartyError(t, playerInviteResponse, http.StatusNotFound, "not_found", "party not found")

	foreignGMInviteResponse := performServerJSONRequest(t, handler, gmBCookie, http.MethodPost, "/parties/"+partyA.ID+"/invites", nil)
	assertServerPartyError(t, foreignGMInviteResponse, http.StatusNotFound, "not_found", "party not found")

	foreignJoinResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/party-invites/join", map[string]any{
		"token":       inviteA.Token,
		"characterId": foreignCharacter.ID,
	})
	assertServerPartyError(t, foreignJoinResponse, http.StatusNotFound, "not_found", "party not found")
	unknownJoinResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/party-invites/join", map[string]any{
		"token":       inviteA.Token,
		"characterId": uuid.New().String(),
	})
	assertServerPartyError(t, unknownJoinResponse, http.StatusNotFound, "not_found", "party not found")
	if !bytes.Equal(foreignJoinResponse.Body.Bytes(), unknownJoinResponse.Body.Bytes()) {
		t.Fatal("foreign and unknown Character joins returned distinguishable responses")
	}
	assertPartyMembershipCount(t, pool, partyA.ID, 1)

	createdJoinResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/party-invites/join", map[string]any{
		"token":       inviteA.Token,
		"characterId": playerCharacter.ID,
	})
	requireServerStatus(t, createdJoinResponse, http.StatusCreated)
	visiblePlayerInviteResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/parties/"+partyA.ID+"/invites", nil)
	assertServerPartyError(t, visiblePlayerInviteResponse, http.StatusForbidden, "forbidden", "forbidden")

	differentJoinResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/party-invites/join", map[string]any{
		"token":       inviteA.Token,
		"characterId": playerUnlinkedCharacter.ID,
	})
	assertServerPartyError(t, differentJoinResponse, http.StatusConflict, "already_member", "already a party member")

	linkedElsewhereResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodPost, "/party-invites/join", map[string]any{
		"token":       inviteB.Token,
		"characterId": playerCharacter.ID,
	})
	assertServerPartyError(t, linkedElsewhereResponse, http.StatusConflict, "character_already_linked", "character already linked")
	assertPartyMembershipCount(t, pool, partyB.ID, 1)

	crossPartyCharacterResponse := performServerJSONRequest(t, handler, gmBCookie, http.MethodGet, "/parties/"+partyA.ID+"/characters/"+playerCharacter.ID, nil)
	assertServerCharacterError(t, crossPartyCharacterResponse, http.StatusNotFound, "character not found")
	playerPartyCharacterResponse := performServerJSONRequest(t, handler, playerCookie, http.MethodGet, "/parties/"+partyA.ID+"/characters/"+playerCharacter.ID, nil)
	assertServerCharacterError(t, playerPartyCharacterResponse, http.StatusNotFound, "character not found")
	unlinkedCharacterResponse := performServerJSONRequest(t, handler, gmACookie, http.MethodGet, "/parties/"+partyA.ID+"/characters/"+playerUnlinkedCharacter.ID, nil)
	assertServerCharacterError(t, unlinkedCharacterResponse, http.StatusNotFound, "character not found")
	if !bytes.Equal(crossPartyCharacterResponse.Body.Bytes(), playerPartyCharacterResponse.Body.Bytes()) ||
		!bytes.Equal(crossPartyCharacterResponse.Body.Bytes(), unlinkedCharacterResponse.Body.Bytes()) {
		t.Fatal("Party Character authorization failures returned distinguishable responses")
	}

	otherOwnerResponse := performServerJSONRequest(t, handler, otherCookie, http.MethodGet, "/characters/"+playerCharacter.ID, nil)
	assertServerCharacterError(t, otherOwnerResponse, http.StatusNotFound, "character not found")
	assertNoStore(t, otherOwnerResponse)

	if _, err := pool.Exec(context.Background(), `
UPDATE characters
SET reference_payload = jsonb_set(reference_payload, '{schemaVersion}', '"CharacterSheetV2"'::jsonb)
WHERE id = $1::uuid`, playerCharacter.ID); err != nil {
		t.Fatalf("store unsupported Character payload: %v", err)
	}
	unsafePayloadResponse := performServerJSONRequest(t, handler, gmACookie, http.MethodGet, "/parties/"+partyA.ID+"/characters/"+playerCharacter.ID, nil)
	assertServerCharacterError(t, unsafePayloadResponse, http.StatusInternalServerError, "could not load character")
	assertServerResponseExcludes(t, unsafePayloadResponse, "CharacterSheetV2")

	for _, response := range []*httptest.ResponseRecorder{
		foreignJoinResponse,
		unknownJoinResponse,
		differentJoinResponse,
		linkedElsewhereResponse,
		crossPartyCharacterResponse,
		playerPartyCharacterResponse,
		unlinkedCharacterResponse,
	} {
		assertServerResponseExcludes(t, response, inviteA.Token, inviteB.Token)
	}
}

func TestPartyInviteUnavailableStatesThroughServer(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := newTestServer(pool)
	gmCookie, gmAccount := registerTestUser(t, handler, "invite-state-gm")
	partyWithReplacement := createServerParty(t, handler, gmCookie, "Replacement Party")
	firstInvite := decodeServerInvite(t, createServerInvite(t, handler, gmCookie, partyWithReplacement.ID))
	replacementInvite := decodeServerInvite(t, createServerInvite(t, handler, gmCookie, partyWithReplacement.ID))
	partyWithStoredStates := createServerParty(t, handler, gmCookie, "Stored State Party")
	revokedCredential := newTestInviteCredential(t)
	expiredCredential := newTestInviteCredential(t)
	unknownCredential := newTestInviteCredential(t)
	gmID := uuid.MustParse(gmAccount.User.ID)
	now := time.Now().UTC()
	insertTestInvite(t, pool, partyWithStoredStates.ID, gmID, revokedCredential, now.Add(-2*time.Hour), now.Add(7*24*time.Hour), now.Add(-time.Hour))
	insertTestInvite(t, pool, partyWithStoredStates.ID, gmID, expiredCredential, now.Add(-8*24*time.Hour), now.Add(-time.Hour), time.Time{})

	var membershipsBefore int
	if err := pool.QueryRow(context.Background(), `SELECT count(*) FROM party_memberships`).Scan(&membershipsBefore); err != nil {
		t.Fatalf("count memberships before invite inspection: %v", err)
	}

	states := []struct {
		name       string
		credential string
	}{
		{name: "malformed", credential: "malformed"},
		{name: "unknown", credential: unknownCredential},
		{name: "expired", credential: expiredCredential},
		{name: "revoked", credential: revokedCredential},
		{name: "replaced", credential: firstInvite.Token},
	}
	var firstErrorBody []byte
	for _, state := range states {
		t.Run(state.name, func(t *testing.T) {
			response := performServerJSONRequest(t, handler, gmCookie, http.MethodPost, "/party-invites/inspect", map[string]any{
				"token": state.credential,
			})
			assertServerPartyError(t, response, http.StatusBadRequest, "invite_unavailable", "invite unavailable")
			assertServerResponseExcludes(t, response, state.credential)
			if firstErrorBody == nil {
				firstErrorBody = append([]byte(nil), response.Body.Bytes()...)
			} else if !bytes.Equal(firstErrorBody, response.Body.Bytes()) {
				t.Fatal("unavailable invite states returned distinguishable responses")
			}
		})
	}

	replacementResponse := performServerJSONRequest(t, handler, gmCookie, http.MethodPost, "/party-invites/inspect", map[string]any{
		"token": replacementInvite.Token,
	})
	requireServerStatus(t, replacementResponse, http.StatusOK)
	assertInviteInspectionPrivacy(t, replacementResponse)
	assertServerResponseExcludes(t, replacementResponse, firstInvite.Token, replacementInvite.Token)

	var membershipsAfter int
	if err := pool.QueryRow(context.Background(), `SELECT count(*) FROM party_memberships`).Scan(&membershipsAfter); err != nil {
		t.Fatalf("count memberships after invite inspection: %v", err)
	}
	if membershipsAfter != membershipsBefore {
		t.Fatal("unavailable invite inspection mutated Party memberships")
	}
	assertPartyActiveInviteCount(t, pool, partyWithReplacement.ID, 1)
}

func TestPartyJoinThrottleThroughAuthenticatedServer(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := newTestServer(pool)
	firstCookie, firstAccount := registerTestUser(t, handler, "throttle-user-one")
	secondCookie, secondAccount := registerTestUser(t, handler, "throttle-user-two")
	unknownCredential := newTestInviteCredential(t)
	validCharacterID := uuid.New().String()

	for attempt := 0; attempt < 5; attempt++ {
		malformedResponse := performServerRawJSONRequest(t, handler, firstCookie, http.MethodPost, "/party-invites/join", `{"token":`)
		assertServerPartyError(t, malformedResponse, http.StatusBadRequest, "validation_error", "party request is invalid")
		invalidCharacterResponse := performServerJSONRequest(t, handler, firstCookie, http.MethodPost, "/party-invites/join", map[string]any{
			"token":       unknownCredential,
			"characterId": "not-a-uuid",
		})
		assertServerPartyError(t, invalidCharacterResponse, http.StatusBadRequest, "validation_error", "party request is invalid")
	}

	for attempt := 1; attempt <= 10; attempt++ {
		response := performServerJSONRequest(t, handler, firstCookie, http.MethodPost, "/party-invites/join", map[string]any{
			"token":       unknownCredential,
			"characterId": validCharacterID,
		})
		assertServerPartyError(t, response, http.StatusBadRequest, "invite_unavailable", "invite unavailable")
		assertServerResponseExcludes(t, response, unknownCredential, firstAccount.User.ID)
	}

	throttledResponse := performServerJSONRequest(t, handler, firstCookie, http.MethodPost, "/party-invites/join", map[string]any{
		"token":       unknownCredential,
		"characterId": validCharacterID,
	})
	assertServerPartyError(t, throttledResponse, http.StatusTooManyRequests, "rate_limited", "rate limit exceeded")
	retryAfter, err := strconv.Atoi(throttledResponse.Header().Get("Retry-After"))
	if err != nil || retryAfter < 1 || retryAfter > 60 {
		t.Fatal("Party join throttle returned an invalid bounded Retry-After value")
	}
	assertServerResponseExcludes(t, throttledResponse, unknownCredential, firstAccount.User.ID)

	independentUserResponse := performServerJSONRequest(t, handler, secondCookie, http.MethodPost, "/party-invites/join", map[string]any{
		"token":       unknownCredential,
		"characterId": validCharacterID,
	})
	assertServerPartyError(t, independentUserResponse, http.StatusBadRequest, "invite_unavailable", "invite unavailable")
	assertServerResponseExcludes(t, independentUserResponse, unknownCredential, firstAccount.User.ID, secondAccount.User.ID)
}

func TestPartyServerDatabaseFailuresRemainGeneric(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := newTestServer(pool)
	requesterCookie, _ := registerTestUser(t, handler, "database-failure-user")
	if _, err := pool.Exec(context.Background(), `ALTER TABLE party_memberships RENAME TO party_memberships_unavailable`); err != nil {
		t.Fatalf("make Party persistence unavailable: %v", err)
	}

	response := performServerJSONRequest(t, handler, requesterCookie, http.MethodGet, "/parties", nil)
	assertServerPartyError(t, response, http.StatusInternalServerError, "server_error", "server error")
	assertServerResponseExcludes(t, response, "party_memberships", "does not exist", "SQLSTATE")
}

func TestStrictTransportSecurityOnlyWhenCookiesAreSecure(t *testing.T) {
	tests := []struct {
		name         string
		cookieSecure bool
		wantHeader   string
	}{
		{name: "local", cookieSecure: false, wantHeader: ""},
		{name: "production", cookieSecure: true, wantHeader: "max-age=31536000"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := New(nil, nil, nil, Options{CookieSecure: tt.cookieSecure})
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, "/healthz", nil)

			handler.ServeHTTP(recorder, request)

			if got := recorder.Header().Get("Strict-Transport-Security"); got != tt.wantHeader {
				t.Fatalf("expected Strict-Transport-Security %q, got %q", tt.wantHeader, got)
			}
		})
	}
}

func TestPrivateRoutesSetNoStoreOnSuccessAndErrors(t *testing.T) {
	handler := New(nil, nil, nil, Options{AllowedOrigins: []string{localOrigin}})
	tests := []struct {
		name       string
		method     string
		path       string
		body       string
		origin     string
		wantStatus int
	}{
		{name: "registration error", method: http.MethodPost, path: "/auth/register", body: `{}`, origin: localOrigin, wantStatus: http.StatusServiceUnavailable},
		{name: "login error", method: http.MethodPost, path: "/auth/sessions", body: `{}`, origin: localOrigin, wantStatus: http.StatusServiceUnavailable},
		{name: "current session unauthorized", method: http.MethodGet, path: "/auth/session", wantStatus: http.StatusUnauthorized},
		{name: "logout success", method: http.MethodDelete, path: "/auth/session", wantStatus: http.StatusNoContent},
		{name: "character create unauthorized", method: http.MethodPost, path: "/characters", body: `{}`, origin: localOrigin, wantStatus: http.StatusUnauthorized},
		{name: "character list unauthorized", method: http.MethodGet, path: "/characters", wantStatus: http.StatusUnauthorized},
		{name: "character detail unauthorized", method: http.MethodGet, path: "/characters/00000000-0000-0000-0000-000000000001", wantStatus: http.StatusUnauthorized},
		{name: "CORS rejection", method: http.MethodPost, path: "/auth/register", body: `{}`, origin: "https://evil.example", wantStatus: http.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			if tt.body != "" {
				request.Header.Set("Content-Type", "application/json")
			}
			if tt.origin != "" {
				request.Header.Set("Origin", tt.origin)
			}

			handler.ServeHTTP(recorder, request)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d with body %s", tt.wantStatus, recorder.Code, recorder.Body.String())
			}
			assertNoStore(t, recorder)
		})
	}
}

func TestHealthResponseDoesNotSetNoStore(t *testing.T) {
	handler := New(nil, nil, nil, Options{})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)

	handler.ServeHTTP(recorder, request)

	if got := recorder.Header().Get("Cache-Control"); got != "" {
		t.Fatalf("expected health response without Cache-Control, got %q", got)
	}
}

type partySummaryHTTPResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
}

type partyListHTTPResponse struct {
	Parties []partySummaryHTTPResponse `json:"parties"`
}

type partyDetailHTTPResponse struct {
	ID      string                    `json:"id"`
	Name    string                    `json:"name"`
	Role    string                    `json:"role"`
	Members []partyMemberHTTPResponse `json:"members"`
}

type partyMemberHTTPResponse struct {
	Username  string                            `json:"username"`
	Role      string                            `json:"role"`
	Character *partyMemberCharacterHTTPResponse `json:"character"`
}

type partyMemberCharacterHTTPResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type partyInviteHTTPResponse struct {
	Token     string `json:"token"`
	CreatedAt string `json:"createdAt"`
	ExpiresAt string `json:"expiresAt"`
}

type inviteInspectionHTTPResponse struct {
	Party struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"party"`
	ExpiresAt string `json:"expiresAt"`
}

type joinHTTPResponse struct {
	PartyID      string `json:"partyId"`
	MembershipID string `json:"membershipId"`
	Role         string `json:"role"`
	CharacterID  string `json:"characterId"`
	JoinedAt     string `json:"joinedAt"`
}

type partyCharacterHTTPResponse struct {
	ID               string          `json:"id"`
	OwnerSubjectID   *string         `json:"ownerSubjectId"`
	Name             string          `json:"name"`
	ClassName        string          `json:"className"`
	SubclassName     *string         `json:"subclassName"`
	Level            int             `json:"level"`
	Ancestry         string          `json:"ancestry"`
	Background       string          `json:"background"`
	AbilityScores    map[string]int  `json:"abilityScores"`
	HitPoints        map[string]int  `json:"hitPoints"`
	ArmorClass       int             `json:"armorClass"`
	SpeedFt          int             `json:"speedFt"`
	ReferencePayload json.RawMessage `json:"referencePayload"`
	CreatedAt        string          `json:"createdAt"`
	UpdatedAt        string          `json:"updatedAt"`
}

type partyHTTPError struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

func performServerJSONRequest(
	t *testing.T,
	handler http.Handler,
	cookie *http.Cookie,
	method string,
	path string,
	payload any,
) *httptest.ResponseRecorder {
	t.Helper()

	var body []byte
	if payload != nil {
		var err error
		body, err = json.Marshal(payload)
		if err != nil {
			t.Fatalf("encode server request: %v", err)
		}
		if document, ok := payload.(map[string]any); ok {
			if credential, ok := document["token"].(string); ok && credential != "" &&
				(strings.Contains(path, credential) || strings.Contains(httptest.NewRequest(method, path, nil).URL.RawQuery, credential)) {
				t.Fatal("invite credential entered an HTTP path or query")
			}
		}
	}

	return performServerRawRequest(t, handler, cookie, method, path, body, payload != nil)
}

func performServerRawJSONRequest(
	t *testing.T,
	handler http.Handler,
	cookie *http.Cookie,
	method string,
	path string,
	body string,
) *httptest.ResponseRecorder {
	t.Helper()
	return performServerRawRequest(t, handler, cookie, method, path, []byte(body), true)
}

func performServerRawRequest(
	t *testing.T,
	handler http.Handler,
	cookie *http.Cookie,
	method string,
	path string,
	body []byte,
	hasJSONBody bool,
) *httptest.ResponseRecorder {
	t.Helper()

	request := httptest.NewRequest(method, path, bytes.NewReader(body))
	if hasJSONBody {
		request.Header.Set("Content-Type", "application/json")
	}
	if isUnsafeMethod(method) {
		request.Header.Set("Origin", localOrigin)
	}
	if cookie != nil {
		request.AddCookie(cookie)
	}
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	assertNoStore(t, recorder)
	return recorder
}

func createServerCharacter(t *testing.T, handler http.Handler, cookie *http.Cookie) (partyCharacterHTTPResponse, any) {
	t.Helper()
	response := performServerRawJSONRequest(t, handler, cookie, http.MethodPost, "/characters", validCharacterJSON())
	requireServerStatus(t, response, http.StatusCreated)
	var created partyCharacterHTTPResponse
	decodeServerJSON(t, response, &created)
	if _, err := uuid.Parse(created.ID); err != nil {
		t.Fatal("created Character response did not contain a valid ID")
	}

	var requestDocument map[string]any
	if err := json.Unmarshal([]byte(validCharacterJSON()), &requestDocument); err != nil {
		t.Fatalf("decode valid Character fixture: %v", err)
	}
	return created, requestDocument["referencePayload"]
}

func createServerParty(t *testing.T, handler http.Handler, cookie *http.Cookie, name string) partySummaryHTTPResponse {
	t.Helper()
	response := performServerJSONRequest(t, handler, cookie, http.MethodPost, "/parties", map[string]any{"name": name})
	requireServerStatus(t, response, http.StatusCreated)
	assertExactServerJSONFields(t, response, "id", "name", "role")
	var party partySummaryHTTPResponse
	decodeServerJSON(t, response, &party)
	return party
}

func createServerInvite(t *testing.T, handler http.Handler, cookie *http.Cookie, partyID string) *httptest.ResponseRecorder {
	t.Helper()
	response := performServerJSONRequest(t, handler, cookie, http.MethodPost, "/parties/"+partyID+"/invites", nil)
	requireServerStatus(t, response, http.StatusCreated)
	assertExactServerJSONFields(t, response, "token", "createdAt", "expiresAt")
	return response
}

func decodeServerInvite(t *testing.T, response *httptest.ResponseRecorder) partyInviteHTTPResponse {
	t.Helper()
	var invite partyInviteHTTPResponse
	decodeServerJSON(t, response, &invite)
	if _, err := parties.InviteTokenHash(invite.Token); err != nil {
		t.Fatal("invite creation response did not contain a valid credential")
	}
	if !strings.Contains(response.Body.String(), invite.Token) {
		t.Fatal("invite creation response omitted its one-time credential")
	}
	return invite
}

func newTestInviteCredential(t *testing.T) string {
	t.Helper()
	credential, err := parties.NewInviteToken()
	if err != nil {
		t.Fatalf("generate test invite credential: %v", err)
	}
	return credential
}

func insertTestInvite(
	t *testing.T,
	pool *pgxpool.Pool,
	partyID string,
	creatorID uuid.UUID,
	credential string,
	createdAt time.Time,
	expiresAt time.Time,
	revokedAt time.Time,
) {
	t.Helper()
	tokenHash, err := parties.InviteTokenHash(credential)
	if err != nil {
		t.Fatal("test invite credential was invalid")
	}
	var revokedValue any
	if !revokedAt.IsZero() {
		revokedValue = revokedAt
	}
	if _, err := pool.Exec(context.Background(), `
INSERT INTO party_invites (
  id, party_id, created_by_user_id, token_hash, created_at, expires_at, revoked_at
) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7)`,
		uuid.New().String(), partyID, creatorID.String(), tokenHash, createdAt, expiresAt, revokedValue,
	); err != nil {
		t.Fatalf("insert test invite state: %v", err)
	}
}

func assertPartyMembershipCount(t *testing.T, pool *pgxpool.Pool, partyID string, expected int) {
	t.Helper()
	var count int
	if err := pool.QueryRow(context.Background(), `
SELECT count(*)
FROM party_memberships
WHERE party_id = $1::uuid`, partyID).Scan(&count); err != nil {
		t.Fatalf("count Party memberships: %v", err)
	}
	if count != expected {
		t.Fatalf("expected %d Party memberships, got %d", expected, count)
	}
}

func assertPartyActiveInviteCount(t *testing.T, pool *pgxpool.Pool, partyID string, expected int) {
	t.Helper()
	var count int
	if err := pool.QueryRow(context.Background(), `
SELECT count(*)
FROM party_invites
WHERE party_id = $1::uuid AND revoked_at IS NULL`, partyID).Scan(&count); err != nil {
		t.Fatalf("count active Party invites: %v", err)
	}
	if count != expected {
		t.Fatalf("expected %d active Party invites, got %d", expected, count)
	}
}

func assertInviteCredentialsNotStoredRaw(t *testing.T, pool *pgxpool.Pool, credentials ...string) {
	t.Helper()
	rows, err := pool.Query(context.Background(), `SELECT token_hash FROM party_invites`)
	if err != nil {
		t.Fatalf("load persisted invite hashes: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		var stored []byte
		if err := rows.Scan(&stored); err != nil {
			t.Fatalf("scan persisted invite hash: %v", err)
		}
		if len(stored) != sha256.Size {
			t.Fatal("persisted invite hash did not contain exactly 32 bytes")
		}
		for _, credential := range credentials {
			if bytes.Equal(stored, []byte(credential)) {
				t.Fatal("PostgreSQL retained a raw invite credential")
			}
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("read persisted invite hashes: %v", err)
	}
}

func assertRosterResponsePrivacy(t *testing.T, response *httptest.ResponseRecorder) {
	t.Helper()
	var document map[string]any
	decodeServerJSON(t, response, &document)
	assertExactJSONMapFields(t, document, "id", "name", "role", "members")
	members, ok := document["members"].([]any)
	if !ok {
		t.Fatal("Party roster response did not contain a members array")
	}
	for _, value := range members {
		member, ok := value.(map[string]any)
		if !ok {
			t.Fatal("Party roster member was not an object")
		}
		assertExactJSONMapFields(t, member, "username", "role", "character")
		if member["character"] == nil {
			continue
		}
		character, ok := member["character"].(map[string]any)
		if !ok {
			t.Fatal("Party roster character was not an object")
		}
		assertExactJSONMapFields(t, character, "id", "name")
	}
}

func assertInviteInspectionPrivacy(t *testing.T, response *httptest.ResponseRecorder) {
	t.Helper()
	var document map[string]any
	decodeServerJSON(t, response, &document)
	assertExactJSONMapFields(t, document, "party", "expiresAt")
	party, ok := document["party"].(map[string]any)
	if !ok {
		t.Fatal("invite inspection Party summary was not an object")
	}
	assertExactJSONMapFields(t, party, "id", "name")
}

func assertExactServerJSONFields(t *testing.T, response *httptest.ResponseRecorder, expected ...string) {
	t.Helper()
	var document map[string]any
	decodeServerJSON(t, response, &document)
	assertExactJSONMapFields(t, document, expected...)
}

func assertExactJSONMapFields(t *testing.T, document map[string]any, expected ...string) {
	t.Helper()
	if len(document) != len(expected) {
		t.Fatal("JSON response contained an unexpected field count")
	}
	for _, field := range expected {
		if _, ok := document[field]; !ok {
			t.Fatalf("JSON response omitted required field %q", field)
		}
	}
}

func requireServerStatus(t *testing.T, response *httptest.ResponseRecorder, expected int) {
	t.Helper()
	if response.Code != expected {
		t.Fatalf("expected status %d, got %d", expected, response.Code)
	}
}

func assertServerPartyError(t *testing.T, response *httptest.ResponseRecorder, status int, code string, message string) {
	t.Helper()
	requireServerStatus(t, response, status)
	var actual partyHTTPError
	decodeServerJSON(t, response, &actual)
	if actual.Code != code || actual.Error != message {
		t.Fatal("Party endpoint returned an unexpected public error")
	}
}

func assertServerCharacterError(t *testing.T, response *httptest.ResponseRecorder, status int, message string) {
	t.Helper()
	requireServerStatus(t, response, status)
	var actual struct {
		Error string `json:"error"`
	}
	decodeServerJSON(t, response, &actual)
	if actual.Error != message {
		t.Fatal("Character endpoint returned an unexpected public error")
	}
}

func assertServerResponseExcludes(t *testing.T, response *httptest.ResponseRecorder, forbidden ...string) {
	t.Helper()
	for _, value := range forbidden {
		if value != "" && strings.Contains(response.Body.String(), value) {
			t.Fatal("public response exposed a forbidden value")
		}
	}
}

func decodeServerJSON(t *testing.T, response *httptest.ResponseRecorder, destination any) {
	t.Helper()
	if err := json.Unmarshal(response.Body.Bytes(), destination); err != nil {
		t.Fatalf("decode server response: %v", err)
	}
}

func newTestServer(pool *pgxpool.Pool) http.Handler {
	return New(
		characters.NewRepository(pool),
		parties.NewRepository(pool),
		auth.NewRepository(pool),
		Options{
			AllowedOrigins: []string{localOrigin},
			PasswordConfig: testPasswordConfig(),
		},
	)
}

func testPasswordConfig() auth.PasswordConfig {
	return auth.PasswordConfig{
		MemoryKiB:   1024,
		Iterations:  1,
		Parallelism: 1,
		SaltLength:  16,
		KeyLength:   32,
	}
}

func registerTestUser(t *testing.T, handler http.Handler, username string) (*http.Cookie, authResponse) {
	t.Helper()

	recorder := httptest.NewRecorder()
	request := jsonRequest(http.MethodPost, "/auth/register", registrationJSON(username, username+"@example.com", "Correct-horse-battery-staple1"))
	handler.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("register %s: expected status %d, got %d with body %s", username, http.StatusCreated, recorder.Code, recorder.Body.String())
	}

	var response authResponse
	decodeResponse(t, recorder, &response)

	loginRecorder := httptest.NewRecorder()
	loginRequest := jsonRequest(http.MethodPost, "/auth/sessions", signInJSON(username, "Correct-horse-battery-staple1"))
	handler.ServeHTTP(loginRecorder, loginRequest)
	if loginRecorder.Code != http.StatusOK {
		t.Fatalf("sign in %s: expected status %d, got %d with body %s", username, http.StatusOK, loginRecorder.Code, loginRecorder.Body.String())
	}

	return requireSessionCookie(t, loginRecorder), response
}

func registrationJSON(username string, email string, password string) string {
	body, err := json.Marshal(map[string]string{
		"username": username,
		"email":    email,
		"password": password,
	})
	if err != nil {
		panic(err)
	}
	return string(body)
}

func signInJSON(usernameOrEmail string, password string) string {
	body, err := json.Marshal(map[string]string{
		"usernameOrEmail": usernameOrEmail,
		"password":        password,
	})
	if err != nil {
		panic(err)
	}
	return string(body)
}

func jsonRequest(method string, path string, body string) *http.Request {
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Origin", localOrigin)
	return request
}

func requireSessionCookie(t *testing.T, recorder *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()

	for _, cookie := range recorder.Result().Cookies() {
		if cookie.Name == auth.SessionCookieName {
			return cookie
		}
	}
	t.Fatalf("expected %s cookie in %v", auth.SessionCookieName, recorder.Result().Cookies())
	return nil
}

func assertCredentialCORS(t *testing.T, recorder *httptest.ResponseRecorder) {
	t.Helper()

	if recorder.Header().Get("Access-Control-Allow-Origin") != localOrigin {
		t.Fatalf("expected local allowed origin, got %q", recorder.Header().Get("Access-Control-Allow-Origin"))
	}
	if recorder.Header().Get("Access-Control-Allow-Origin") == "*" {
		t.Fatal("credentialed CORS must not use wildcard origin")
	}
	if recorder.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Fatalf("expected credentialed CORS, got %q", recorder.Header().Get("Access-Control-Allow-Credentials"))
	}
}

func assertSecurityHeaders(t *testing.T, recorder *httptest.ResponseRecorder) {
	t.Helper()

	want := map[string]string{
		"X-Content-Type-Options":  "nosniff",
		"Referrer-Policy":         "no-referrer",
		"X-Frame-Options":         "DENY",
		"Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
		"Permissions-Policy":      "camera=(), microphone=(), geolocation=()",
	}
	for name, value := range want {
		if got := recorder.Header().Get(name); got != value {
			t.Errorf("expected %s %q, got %q", name, value, got)
		}
	}
}

func assertNoStore(t *testing.T, recorder *httptest.ResponseRecorder) {
	t.Helper()

	if got := recorder.Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("expected Cache-Control no-store, got %q", got)
	}
}

func decodeResponse(t *testing.T, recorder *httptest.ResponseRecorder, destination any) {
	t.Helper()

	if err := json.NewDecoder(recorder.Body).Decode(destination); err != nil {
		t.Fatalf("decode response: %v", err)
	}
}

func assertErrorResponse(t *testing.T, recorder *httptest.ResponseRecorder, want string) {
	t.Helper()

	var response struct {
		Error string `json:"error"`
	}
	decodeResponse(t, recorder, &response)
	if response.Error != want {
		t.Fatalf("expected error %q, got %q", want, response.Error)
	}
}

type authResponse struct {
	User struct {
		ID                string `json:"id"`
		UsernameCanonical string `json:"usernameCanonical"`
		Username          string `json:"username"`
	} `json:"user"`
}

type characterResponse struct {
	ID             string  `json:"id"`
	OwnerSubjectID *string `json:"ownerSubjectId"`
}

type characterListResponse struct {
	Characters []struct {
		ID string `json:"id"`
	} `json:"characters"`
}

func validCharacterJSON() string {
	return `{
		"ownerSubjectId": null,
		"name": "Mara Vale",
		"className": "Ranger",
		"subclassName": "Hunter",
		"level": 3,
		"ancestry": "Human",
		"background": "Outlander",
		"abilityScores": {
			"strength": 10,
			"dexterity": 16,
			"constitution": 14,
			"intelligence": 10,
			"wisdom": 14,
			"charisma": 8
		},
		"hitPoints": {
			"current": 26,
			"max": 26
		},
		"armorClass": 14,
		"speedFt": 30,
		"referencePayload": {
			"schemaVersion": "CharacterSheetV1",
			"ruleset": {"system":"dnd5e","version":"2014","sourceStatus":"audited-sample"},
			"identity": {"name":"Mara Vale","ancestry":"Human","background":"Outlander","classes":[{"name":"Ranger","level":3,"subclass":"Hunter"}]},
			"summary": {"displayLine":"Human Ranger - Level 3","landingConcept":"A steady wilderness scout.","featuredAbilities":[],"referenceSections":[]},
			"abilities": {"scores":{"strength":10,"dexterity":16,"constitution":14,"intelligence":10,"wisdom":14,"charisma":8}},
			"combat": {"hitPoints":{"current":26,"max":26,"temporary":0},"armorClass":{"value":14},"initiative":3,"speed":[{"type":"walk","feet":30}],"proficiencyBonus":2,"passivePerception":{},"concentration":null},
			"proficiencies": {"savingThrows":{"values":[]},"skills":[],"weapons":{"values":[]},"armor":{"values":[]},"tools":{"values":[]},"languages":{"values":[]}},
			"actions": [{"id":"longbow","name":"Longbow","kind":"attack","section":"actions","actionType":"Action","summary":"Reliable ranged attack.","meta":[]}],
			"features": [{"id":"colossus-slayer","name":"Colossus Slayer","category":"Hunter feature","source":{"rulesVersion":"2014","status":"confirmed"},"tags":[],"summary":"Add damage after hitting a wounded enemy.","includeInReference":true}],
			"spellcasting": null,
			"equipment": {"armor":{"values":[]},"weapons":[],"packsAndGear":{"values":[]},"tools":{"values":[]},"languages":{"values":[]},"currency":null},
			"personality": {"traits":[],"ideals":[],"bonds":[],"flaws":[],"notes":[]},
			"audit": {"source":"Manual character sheet","needsConfirmation":[],"rulesVersionWarnings":[],"deferredCorrections":[]}
		}
	}`
}

func characterJSONWithOwner() string {
	return `{
		"ownerSubjectId": "00000000-0000-0000-0000-000000000001",
		"name": "Mara Vale",
		"className": "Ranger",
		"subclassName": "Hunter",
		"level": 3,
		"ancestry": "Human",
		"background": "Outlander",
		"abilityScores": {
			"strength": 10,
			"dexterity": 16,
			"constitution": 14,
			"intelligence": 10,
			"wisdom": 14,
			"charisma": 8
		},
		"hitPoints": {
			"current": 26,
			"max": 26
		},
		"armorClass": 14,
		"speedFt": 30,
		"referencePayload": {"actions": []}
	}`
}

func setupIntegrationDatabase(t *testing.T) *pgxpool.Pool {
	t.Helper()

	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not set; set it to a disposable PostgreSQL test database to run persistence integration tests")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	t.Cleanup(cancel)

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	t.Cleanup(pool.Close)

	if err := resetTestDatabase(ctx, pool); err != nil {
		t.Fatalf("reset test database: %v", err)
	}

	if err := runMigrations(databaseURL); err != nil {
		t.Fatalf("run migrations: %v", err)
	}

	return pool
}

func resetTestDatabase(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, "DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
	return err
}

func runMigrations(databaseURL string) error {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return err
	}

	migrationsPath, err := findMigrationsPath()
	if err != nil {
		return err
	}

	migrator, err := migrate.NewWithDatabaseInstance("file://"+migrationsPath, "postgres", driver)
	if err != nil {
		return err
	}
	defer migrator.Close()

	if err := migrator.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}
	return nil
}

func findMigrationsPath() (string, error) {
	workingDirectory, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for current := workingDirectory; ; current = filepath.Dir(current) {
		candidate := filepath.Join(current, "migrations")
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate, nil
		}

		parent := filepath.Dir(current)
		if parent == current {
			return "", os.ErrNotExist
		}
	}
}
