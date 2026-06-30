package server

import (
	"net/http"

	"github.com/Inkala/rpg-companion/backend/internal/auth"
	"github.com/Inkala/rpg-companion/backend/internal/characters"
	"github.com/Inkala/rpg-companion/backend/internal/health"
)

type Options struct {
	AllowedOrigins []string
	CookieSecure   bool
	PasswordConfig auth.PasswordConfig
	SessionConfig  auth.SessionConfig
}

func New(characterRepository *characters.Repository, authRepository *auth.Repository, options Options) http.Handler {
	mux := http.NewServeMux()
	characterHandler := characters.NewHandler(characterRepository)
	sessionConfig := options.SessionConfig
	sessionConfig.Secure = options.CookieSecure
	authHandler := auth.NewHandler(authRepository, options.PasswordConfig, sessionConfig)
	authenticator := auth.NewAuthenticator(authRepository, sessionConfig)

	mux.Handle("/healthz", health.Handler())
	mux.HandleFunc("POST /auth/register", authHandler.Register)
	mux.HandleFunc("POST /auth/sessions", authHandler.SignIn)
	mux.HandleFunc("GET /auth/session", authHandler.CurrentSession)
	mux.HandleFunc("DELETE /auth/session", authHandler.Logout)
	mux.Handle("POST /characters", authenticator.RequireSession(http.HandlerFunc(characterHandler.Create)))
	mux.Handle("GET /characters/{id}", authenticator.RequireSession(http.HandlerFunc(characterHandler.GetByID)))

	return withCORS(mux, options.AllowedOrigins)
}
