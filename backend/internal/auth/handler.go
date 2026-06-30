package auth

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Handler struct {
	repository     *Repository
	authenticator  Authenticator
	passwordConfig PasswordConfig
	sessionConfig  SessionConfig
	now            func() time.Time
}

func NewHandler(repository *Repository, passwordConfig PasswordConfig, sessionConfig SessionConfig) Handler {
	sessionConfig = sessionConfig.withDefaults()
	return Handler{
		repository:     repository,
		authenticator:  NewAuthenticator(repository, sessionConfig),
		passwordConfig: passwordConfig.withDefaults(),
		sessionConfig:  sessionConfig,
		now:            func() time.Time { return time.Now().UTC() },
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

	passwordHash, err := HashPassword(request.Password, handler.passwordConfig)
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
	if errors.Is(err, ErrDuplicateUsername) {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "That username is already taken."})
		return
	}
	if errors.Is(err, ErrDuplicateEmail) {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "That email is already in use."})
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

	if strings.TrimSpace(request.UsernameOrEmail) == "" || request.Password == "" {
		writeInvalidCredentials(w)
		return
	}

	user, err := handler.findUserForSignIn(r, request.UsernameOrEmail)
	if errors.Is(err, ErrNotFound) {
		writeInvalidCredentials(w)
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not sign in"})
		return
	}

	passwordMatches, err := VerifyPassword(request.Password, user.PasswordHash)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not verify credentials"})
		return
	}
	if !passwordMatches {
		writeInvalidCredentials(w)
		return
	}

	if !handler.createSessionCookie(w, r, user) {
		return
	}

	writeJSON(w, http.StatusOK, sessionResponse{User: PublicUserFromUser(user)})
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
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "request body must be valid JSON"})
		return false
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "request body must contain one JSON object"})
		return false
	}
	return true
}

func writeInvalidCredentials(w http.ResponseWriter) {
	writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Username, email, or password is incorrect."})
}

func writeJSON(w http.ResponseWriter, statusCode int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(body)
}
