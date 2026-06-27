package main

import (
	"log"
	"net/http"

	"github.com/Inkala/rpg-companion/backend/internal/config"
	"github.com/Inkala/rpg-companion/backend/internal/health"
)

func main() {
	cfg := config.FromEnv()

	mux := http.NewServeMux()
	mux.Handle("/healthz", health.Handler())

	addr := ":" + cfg.Port
	log.Printf("starting hunin backend on %s in %s mode", addr, cfg.AppEnv)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
