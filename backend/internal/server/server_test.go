package server

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Inkala/rpg-companion/backend/internal/auth"
	"github.com/Inkala/rpg-companion/backend/internal/characters"
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
	assertCredentialCORS(t, registerRecorder)
	sessionCookie := requireSessionCookie(t, registerRecorder)
	if !sessionCookie.HttpOnly {
		t.Fatal("expected session cookie to be HttpOnly")
	}
	if sessionCookie.Secure {
		t.Fatal("expected local development session cookie to be non-Secure")
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
	assertErrorResponse(t, duplicateRecorder, "That username is already taken.")

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
	assertErrorResponse(t, duplicateEmailRecorder, "That email is already in use.")

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

	usernameLoginRecorder := httptest.NewRecorder()
	usernameLoginRequest := jsonRequest(http.MethodPost, "/auth/sessions", `{
		"usernameOrEmail": "mARA",
		"password": "Correct-horse-battery-staple1"
	}`)
	handler.ServeHTTP(usernameLoginRecorder, usernameLoginRequest)
	if usernameLoginRecorder.Code != http.StatusOK {
		t.Fatalf("expected username login status %d, got %d with body %s", http.StatusOK, usernameLoginRecorder.Code, usernameLoginRecorder.Body.String())
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

func TestProductionSessionCookieIsSecure(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := New(
		characters.NewRepository(pool),
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

	sessionCookie := requireSessionCookie(t, recorder)
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

	sessionCookie := requireSessionCookie(t, recorder)
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

	ownerRecorder := httptest.NewRecorder()
	ownerRequest := jsonRequest(http.MethodPost, "/characters", validCharacterJSON())
	ownerRequest.AddCookie(userACookie)
	handler.ServeHTTP(ownerRecorder, ownerRequest)
	if ownerRecorder.Code != http.StatusCreated {
		t.Fatalf("expected character create status %d, got %d with body %s", http.StatusCreated, ownerRecorder.Code, ownerRecorder.Body.String())
	}

	var created characterResponse
	decodeResponse(t, ownerRecorder, &created)
	if created.OwnerSubjectID == nil || *created.OwnerSubjectID != userA.User.ID {
		t.Fatalf("expected ownerSubjectId %q, got %v", userA.User.ID, created.OwnerSubjectID)
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

func newTestServer(pool *pgxpool.Pool) http.Handler {
	return New(
		characters.NewRepository(pool),
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
	return requireSessionCookie(t, recorder), response
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
			"actions": [{"name":"Longbow"}],
			"features": [{"name":"Colossus Slayer"}],
			"spells": [{"name":"Hunter's Mark"}]
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
