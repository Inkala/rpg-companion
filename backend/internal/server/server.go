package server

import (
	"net/http"

	"github.com/Inkala/rpg-companion/backend/internal/characters"
	"github.com/Inkala/rpg-companion/backend/internal/health"
)

func New(characterRepository *characters.Repository) http.Handler {
	mux := http.NewServeMux()
	characterHandler := characters.NewHandler(characterRepository)

	mux.Handle("/healthz", health.Handler())
	mux.HandleFunc("POST /characters", characterHandler.Create)
	mux.HandleFunc("GET /characters/{id}", characterHandler.GetByID)

	return mux
}
