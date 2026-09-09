package main

import (
	"context"
	"log"
	"net/http"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
	"duacincin/server/internal/db"
	"duacincin/server/internal/email"
	"duacincin/server/internal/httpserver"
	"duacincin/server/internal/ratelimit"
	"duacincin/server/internal/repository"
	"duacincin/server/migrations"
)

func main() {
	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	if err := migrations.Run(cfg.DatabasePooler); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	pool, err := db.New(ctx, cfg.DatabasePooler)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	authDeps := auth.NewDeps(
		repository.NewUserRepo(pool),
		repository.NewOTPRepo(pool),
		ratelimit.New(pool),
		email.NewClient(cfg.ResendAPIKey, cfg.ResendFromEmail),
		cfg,
	)

	router := httpserver.NewRouter(pool, authDeps)

	addr := ":" + cfg.Port
	log.Printf("duacincin-api listening on %s (env=%s)", addr, cfg.AppEnv)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("server: %v", err)
	}
}
