package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/Inkala/rpg-companion/backend/internal/auth"
	"github.com/Inkala/rpg-companion/backend/internal/characters"
	"github.com/Inkala/rpg-companion/backend/internal/config"
	"github.com/Inkala/rpg-companion/backend/internal/parties"
	"github.com/Inkala/rpg-companion/backend/internal/server"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	cfg, err := config.FromEnv()
	if err != nil {
		log.Fatal("configuration invalid")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatal(err)
	}

	characterRepository := characters.NewRepository(pool)
	partyRepository := parties.NewRepository(
		pool,
		parties.NewInviteCodeHashKey(cfg.InviteCodeHashKey.Bytes()),
	)
	authRepository := auth.NewRepository(pool)
	serverOptions := server.Options{
		AllowedOrigins: cfg.AllowedOrigins,
		CookieSecure:   cfg.CookieSecure,
	}

	addr := ":" + cfg.Port
	httpServer := newHTTPServer(addr, server.New(characterRepository, partyRepository, authRepository, serverOptions))
	log.Printf("starting hunin backend on %s in %s mode", addr, cfg.AppEnv)
	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func newHTTPServer(addr string, handler http.Handler) *http.Server {
	return &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    32 * 1024,
	}
}
