package server

import (
	"net/http"

	"github.com/Inkala/rpg-companion/backend/internal/auth"
	"github.com/Inkala/rpg-companion/backend/internal/characters"
	"github.com/Inkala/rpg-companion/backend/internal/health"
	"github.com/Inkala/rpg-companion/backend/internal/parties"
)

type Options struct {
	AllowedOrigins []string
	CookieSecure   bool
	PasswordConfig auth.PasswordConfig
	SessionConfig  auth.SessionConfig
}

func New(characterRepository *characters.Repository, partyRepository *parties.Repository, authRepository *auth.Repository, options Options) http.Handler {
	mux := http.NewServeMux()
	characterHandler := characters.NewHandler(characterRepository)
	partyHandler := parties.NewHandler(partyRepository)
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
	mux.Handle("GET /characters", authenticator.RequireSession(http.HandlerFunc(characterHandler.List)))
	mux.Handle("GET /characters/{id}", authenticator.RequireSession(http.HandlerFunc(characterHandler.GetByID)))
	mux.Handle("PATCH /characters/{id}/level-up", authenticator.RequireSession(http.HandlerFunc(characterHandler.LevelUp)))
	mux.Handle("POST /parties", authenticator.RequireSession(http.HandlerFunc(partyHandler.Create)))
	mux.Handle("GET /parties", authenticator.RequireSession(http.HandlerFunc(partyHandler.List)))
	mux.Handle("GET /parties/{partyId}", authenticator.RequireSession(http.HandlerFunc(partyHandler.GetForMember)))
	mux.Handle("POST /parties/{partyId}/invites", authenticator.RequireSession(http.HandlerFunc(partyHandler.CreateOrRegenerateInvite)))
	mux.Handle("POST /party-invites/inspect", authenticator.RequireSession(http.HandlerFunc(partyHandler.InspectInvite)))
	mux.Handle("POST /party-invites/join", authenticator.RequireSession(http.HandlerFunc(partyHandler.Join)))
	mux.Handle("GET /parties/{partyId}/characters/{characterId}", authenticator.RequireSession(http.HandlerFunc(characterHandler.GetByIDForPartyGM)))

	handler := withCORS(mux, options.AllowedOrigins)
	handler = withPrivateResponseNoStore(handler)
	return withSecurityHeaders(handler, options.CookieSecure)
}
