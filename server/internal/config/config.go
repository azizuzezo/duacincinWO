package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all environment-derived settings for the API server.
type Config struct {
	Port           string
	DatabasePooler string
	AppEnv         string
}

// Load reads environment variables, falling back to a local .env file
// (checked at "../.env" and ".env") for local development. In deployed
// environments the real env vars are expected to be set directly.
func Load() (*Config, error) {
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		DatabasePooler: os.Getenv("DATABASE_POOLER"),
		AppEnv:         getEnv("APP_ENV", "development"),
	}

	if cfg.DatabasePooler == "" {
		return nil, fmt.Errorf("DATABASE_POOLER is not set")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
