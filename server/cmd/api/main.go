package main

import (
	"context"
	"log"
	"net/http"

	"duacincin/server/internal/admin"
	"duacincin/server/internal/auth"
	"duacincin/server/internal/chat"
	"duacincin/server/internal/config"
	"duacincin/server/internal/db"
	"duacincin/server/internal/email"
	"duacincin/server/internal/httpserver"
	"duacincin/server/internal/ratelimit"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/storage"
	"duacincin/server/internal/vendors"
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

	storageClient := storage.NewClient(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)
	if storageClient.Configured() {
		if err := storageClient.EnsureBucket(ctx, vendors.PortfolioBucket, true); err != nil {
			log.Printf("warning: could not ensure storage bucket %q: %v", vendors.PortfolioBucket, err)
		}
	}

	vendorRepo := repository.NewVendorRepo(pool)
	chatRepo := repository.NewChatRepo(pool)

	deps := httpserver.Deps{
		Auth: auth.NewDeps(
			repository.NewUserRepo(pool),
			repository.NewOTPRepo(pool),
			ratelimit.New(pool),
			email.NewClient(cfg.ResendAPIKey, cfg.ResendFromEmail),
			cfg,
		),
		Vendors: vendors.NewDeps(vendorRepo, storageClient),
		Admin:   admin.NewDeps(vendorRepo),
		Chat:    chat.NewDeps(chatRepo, vendorRepo),
	}

	router := httpserver.NewRouter(pool, cfg, deps)

	addr := ":" + cfg.Port
	log.Printf("duacincin-api listening on %s (env=%s)", addr, cfg.AppEnv)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("server: %v", err)
	}
}
