package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/Inkala/rpg-companion/backend/internal/characters"
	"github.com/Inkala/rpg-companion/backend/internal/config"
	"github.com/Inkala/rpg-companion/backend/internal/server"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	cfg := config.FromEnv()

	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
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

	addr := ":" + cfg.Port
	log.Printf("starting hunin backend on %s in %s mode", addr, cfg.AppEnv)
	if err := http.ListenAndServe(addr, server.New(characterRepository)); err != nil {
		log.Fatal(err)
	}
}
