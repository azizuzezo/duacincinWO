package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all environment-derived settings for the API server.
type Config struct {
	Port           string
	DatabasePooler string
	AppEnv         string

	JWTSecret     string
	OTPHMACSecret string

	ResendAPIKey    string
	ResendFromEmail string

	PublicAssetBaseURL string
}

// Load reads environment variables, falling back to a local .env file
// (checked at "../.env" and ".env") for local development. In deployed
// environments the real env vars are expected to be set directly.
func Load() (*Config, error) {
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	cfg := &Config{
		Port:               getEnv("PORT", "8080"),
		DatabasePooler:     os.Getenv("DATABASE_POOLER"),
		AppEnv:             getEnv("APP_ENV", "development"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		OTPHMACSecret:      os.Getenv("OTP_HMAC_SECRET"),
		ResendAPIKey:       os.Getenv("RESEND_API_KEY"),
		ResendFromEmail:    getEnv("RESEND_FROM_EMAIL", "DuaCincin <onboarding@resend.dev>"),
		PublicAssetBaseURL: os.Getenv("PUBLIC_ASSET_BASE_URL"),
	}

	if cfg.DatabasePooler == "" {
		return nil, fmt.Errorf("DATABASE_POOLER is not set")
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is not set")
	}
	if cfg.OTPHMACSecret == "" {
		// Falls back to JWTSecret so a single generated secret is enough
		// to get a dev environment running; use a distinct value in production.
		cfg.OTPHMACSecret = cfg.JWTSecret
	}
	if cfg.ResendAPIKey == "" {
		log.Println("warning: RESEND_API_KEY is not set — OTP codes will be logged to the server console instead of emailed")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
