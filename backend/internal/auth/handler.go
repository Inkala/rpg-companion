package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Inkala/rpg-companion/backend/internal/httpjson"
	"github.com/google/uuid"
)

const (
	authRequestBodyLimit       int64 = 8192
	globalLoginLimit                 = 30
	globalLoginWindow                = time.Minute
	identifierFailureLimit           = 10
	identifierFailureWindow          = 10 * time.Minute
	globalLoginLimiterKey            = "login-global"
	identifierFailureKeyPrefix       = "login-identifier-failure:"
)

type handlerRepository interface {
	CreateUser(context.Context, User) (User, error)
	FindUserByUsername(context.Context, string) (User, error)
	FindUserByEmail(context.Context, string) (User, error)
	CreateSession(context.Context, Session) (Session, error)
	RevokeSession(context.Context, []byte, time.Time) error
}

type Handler struct {
	repository        handlerRepository
	authenticator     Authenticator
	passwordConfig    PasswordConfig
	sessionConfig     SessionConfig
	argonGate         *ArgonGate
	loginLimiter      *SlidingWindowLimiter
	dummyPasswordHash string
	hashPassword      func(string, PasswordConfig) (string, error)
	verifyPassword    func(string, string) (bool, error)
	now               func() time.Time
}

func NewHandler(repository *Repository, passwordConfig PasswordConfig, sessionConfig SessionConfig) Handler {
	sessionConfig = sessionConfig.withDefaults()
	passwordConfig = passwordConfig.withDefaults()
	clock := func() time.Time { return time.Now().UTC() }
	var handlerStore handlerRepository
	if repository != nil {
		handlerStore = repository
	}
	return Handler{
		repository:        handlerStore,
		authenticator:     NewAuthenticator(repository, sessionConfig),
		passwordConfig:    passwordConfig,
		sessionConfig:     sessionConfig,
		argonGate:         NewArgonGate(2),
		loginLimiter:      NewSlidingWindowLimiter(clock),
		dummyPasswordHash: dummyPasswordHash(passwordConfig),
		hashPassword:      HashPassword,
		verifyPassword:    VerifyPassword,
		now:               clock,
	}
}

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type signInRequest struct {
	UsernameOrEmail string `json:"usernameOrEmail"`
	Password        string `json:"password"`
}

func (handler Handler) Register(w http.ResponseWriter, r *http.Request) {
	if handler.repository == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "authentication persistence is not configured"})
		return
	}

	var request registerRequest
	if !decodeJSON(w, r, &request) {
		return
	}

	usernameCanonical, username, validUsername := normalizeUsername(request.Username)
	if !validUsername {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Username must be 3-32 characters and use only English letters, numbers, underscores, or hyphens."})
		return
	}

	emailCanonical, validEmail := normalizeEmail(request.Email)
	if !validEmail {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Enter a valid email address."})
		return
	}

	if !validatePassword(request.Password) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Use 8–128 characters with an uppercase letter, lowercase letter, number, and special character."})
		return
	}

	release, acquired := handler.argonGate.TryAcquire()
	if !acquired {
		writeArgonCapacityExceeded(w)
		return
	}
	defer release.Release()

	passwordHash, err := handler.hashPassword(request.Password, handler.passwordConfig)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create account"})
		return
	}

	now := handler.now()
	user := User{
		ID:                    uuid.New(),
		Username:              username,
		UsernameCanonical:     usernameCanonical,
		EmailCanonical:        emailCanonical,
		PasswordHash:          passwordHash,
		PasswordHashAlgorithm: PasswordHashAlgorithm,
		CreatedAt:             now,
		UpdatedAt:             now,
	}

	created, err := handler.repository.CreateUser(r.Context(), user)
	if errors.Is(err, ErrDuplicateUsername) || errors.Is(err, ErrDuplicateEmail) {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "Account could not be created with those details."})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create account"})
		return
	}

	if !handler.createSessionCookie(w, r, created) {
		return
	}

	writeJSON(w, http.StatusCreated, sessionResponse{User: PublicUserFromUser(created)})
}

func (handler Handler) SignIn(w http.ResponseWriter, r *http.Request) {
	if handler.repository == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "authentication persistence is not configured"})
		return
	}

	var request signInRequest
	if !decodeJSON(w, r, &request) {
		return
	}
	globalResult := handler.loginLimiter.Allow(globalLoginLimiterKey, globalLoginLimit, globalLoginWindow)
	if !globalResult.Allowed {
		writeLoginThrottleExceeded(w, globalResult.RetryAfter, globalLoginWindow)
		return
	}
	identifierFailureKey := loginIdentifierFailureKey(request.UsernameOrEmail)
	identifierResult := handler.loginLimiter.Check(
		identifierFailureKey,
		identifierFailureLimit,
		identifierFailureWindow,
	)
	if !identifierResult.Allowed {
		writeLoginThrottleExceeded(w, identifierResult.RetryAfter, identifierFailureWindow)
		return
	}

	release, acquired := handler.argonGate.TryAcquire()
	if !acquired {
		writeArgonCapacityExceeded(w)
		return
	}
	defer release.Release()

	user, err := handler.findUserForSignIn(r, request.UsernameOrEmail)
	if errors.Is(err, ErrNotFound) {
		_, verificationErr := handler.verifyPassword(request.Password, handler.dummyPasswordHash)
		if verificationErr == nil && !handler.recordInvalidLoginFailure(w, identifierFailureKey) {
			return
		}
		writeInvalidCredentials(w)
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not sign in"})
		return
	}

	passwordMatches, err := handler.verifyPassword(request.Password, user.PasswordHash)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not verify credentials"})
		return
	}
	if !passwordMatches {
		if !handler.recordInvalidLoginFailure(w, identifierFailureKey) {
			return
		}
		writeInvalidCredentials(w)
		return
	}

	if !handler.createSessionCookie(w, r, user) {
		return
	}
	handler.loginLimiter.Reset(identifierFailureKey)

	writeJSON(w, http.StatusOK, sessionResponse{User: PublicUserFromUser(user)})
}

func (handler Handler) recordInvalidLoginFailure(w http.ResponseWriter, identifierFailureKey string) bool {
	result := handler.loginLimiter.Allow(
		identifierFailureKey,
		identifierFailureLimit,
		identifierFailureWindow,
	)
	if !result.Allowed {
		writeLoginThrottleExceeded(w, result.RetryAfter, identifierFailureWindow)
		return false
	}
	return true
}

func loginIdentifierFailureKey(identifier string) string {
	canonical := canonicalLoginIdentifier(identifier)
	digest := sha256.Sum256([]byte(canonical))
	return identifierFailureKeyPrefix + hex.EncodeToString(digest[:])
}

func canonicalLoginIdentifier(identifier string) string {
	trimmed := strings.TrimSpace(identifier)
	if isEmailIdentifier(trimmed) {
		if canonical, valid := normalizeEmail(trimmed); valid {
			return "email:" + canonical
		}
	} else if canonical, _, valid := normalizeUsername(trimmed); valid {
		return "username:" + canonical
	}
	return "invalid:" + strings.ToLower(trimmed)
}

func (handler Handler) CurrentSession(w http.ResponseWriter, r *http.Request) {
	user, err := handler.authenticator.Authenticate(r)
	if errors.Is(err, ErrNotFound) || errors.Is(err, http.ErrNoCookie) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "authentication required"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not authenticate session"})
		return
	}

	writeJSON(w, http.StatusOK, sessionResponse{
		User: PublicUser{
			ID:                user.ID.String(),
			UsernameCanonical: user.UsernameCanonical,
			Username:          user.Username,
		},
	})
}

func (handler Handler) findUserForSignIn(r *http.Request, usernameOrEmail string) (User, error) {
	identifier := strings.TrimSpace(usernameOrEmail)
	if isEmailIdentifier(identifier) {
		emailCanonical, validEmail := normalizeEmail(identifier)
		if !validEmail {
			return User{}, ErrNotFound
		}
		return handler.repository.FindUserByEmail(r.Context(), emailCanonical)
	}

	usernameCanonical, _, validUsername := normalizeUsername(identifier)
	if !validUsername {
		return User{}, ErrNotFound
	}
	return handler.repository.FindUserByUsername(r.Context(), usernameCanonical)
}

func (handler Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(handler.sessionConfig.CookieName)
	if err == nil && handler.repository != nil {
		_ = handler.repository.RevokeSession(r.Context(), TokenHash(cookie.Value), handler.now())
	}

	http.SetCookie(w, ClearSessionCookie(handler.sessionConfig))
	w.WriteHeader(http.StatusNoContent)
}

func (handler Handler) createSessionCookie(w http.ResponseWriter, r *http.Request, user User) bool {
	token, err := NewSessionToken()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create session"})
		return false
	}

	now := handler.now()
	session := Session{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: TokenHash(token),
		CreatedAt: now,
		ExpiresAt: now.Add(handler.sessionConfig.Lifetime),
	}

	created, err := handler.repository.CreateSession(r.Context(), session)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create session"})
		return false
	}

	http.SetCookie(w, SessionCookie(token, created.ExpiresAt, handler.sessionConfig))
	return true
}

func decodeJSON(w http.ResponseWriter, r *http.Request, destination any) bool {
	err := httpjson.Decode(w, r, destination, authRequestBodyLimit)
	if errors.Is(err, httpjson.ErrUnsupportedMediaType) {
		writeJSON(w, http.StatusUnsupportedMediaType, map[string]string{"error": "Content-Type must be application/json"})
		return false
	}
	if errors.Is(err, httpjson.ErrRequestBodyTooLarge) {
		writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "request body is too large"})
		return false
	}
	if errors.Is(err, httpjson.ErrMultipleJSONValues) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "request body must contain one JSON object"})
		return false
	}
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "request body must be valid JSON"})
		return false
	}
	return true
}

func writeInvalidCredentials(w http.ResponseWriter) {
	writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Username, email, or password is incorrect."})
}

func writeArgonCapacityExceeded(w http.ResponseWriter) {
	writeLoginThrottleExceeded(w, time.Second, time.Second)
}

func writeLoginThrottleExceeded(w http.ResponseWriter, retryAfter time.Duration, window time.Duration) {
	w.Header().Set("Retry-After", strconv.FormatInt(retryAfterSeconds(retryAfter, window), 10))
	writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "Too many requests. Please try again later."})
}

func retryAfterSeconds(retryAfter time.Duration, window time.Duration) int64 {
	maximum := int64((window + time.Second - 1) / time.Second)
	seconds := int64((retryAfter + time.Second - 1) / time.Second)
	if seconds < 1 {
		return 1
	}
	if seconds > maximum {
		return maximum
	}
	return seconds
}

func writeJSON(w http.ResponseWriter, statusCode int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(body)
}
