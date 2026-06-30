package auth

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type contextKey string

const userContextKey contextKey = "authenticatedUser"

type AuthenticatedUser struct {
	ID                uuid.UUID
	UsernameCanonical string
	Username          string
}

type Authenticator struct {
	repository    *Repository
	sessionConfig SessionConfig
	now           func() time.Time
}

func NewAuthenticator(repository *Repository, sessionConfig SessionConfig) Authenticator {
	return Authenticator{
		repository:    repository,
		sessionConfig: sessionConfig.withDefaults(),
		now:           func() time.Time { return time.Now().UTC() },
	}
}

func (authenticator Authenticator) RequireSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := authenticator.Authenticate(r)
		if errors.Is(err, ErrNotFound) || errors.Is(err, http.ErrNoCookie) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "authentication required"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not authenticate session"})
			return
		}

		next.ServeHTTP(w, r.WithContext(WithAuthenticatedUser(r.Context(), user)))
	})
}

func (authenticator Authenticator) Authenticate(r *http.Request) (AuthenticatedUser, error) {
	if authenticator.repository == nil {
		return AuthenticatedUser{}, ErrNotFound
	}

	cookie, err := r.Cookie(authenticator.sessionConfig.CookieName)
	if err != nil {
		return AuthenticatedUser{}, err
	}

	_, user, err := authenticator.repository.FindActiveSession(r.Context(), TokenHash(cookie.Value), authenticator.now())
	if err != nil {
		return AuthenticatedUser{}, err
	}

	return AuthenticatedUser{
		ID:                user.ID,
		UsernameCanonical: user.UsernameCanonical,
		Username:          user.Username,
	}, nil
}

func WithAuthenticatedUser(ctx context.Context, user AuthenticatedUser) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

func UserFromContext(ctx context.Context) (AuthenticatedUser, bool) {
	user, ok := ctx.Value(userContextKey).(AuthenticatedUser)
	return user, ok
}

func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	user, ok := UserFromContext(ctx)
	if !ok {
		return uuid.Nil, false
	}
	return user.ID, true
}
