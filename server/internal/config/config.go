package config

import (
	"fmt"
	"log"
	"os"
	"strings"

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

	SupabaseURL            string
	SupabaseServiceRoleKey string

	MidtransServerKey    string
	MidtransClientKey    string
	MidtransIsProduction bool

	// WhatsAppBotSecret authenticates requests between this API and the
	// whatsapp-bot/ relay process in both directions (see internal/whatsapp).
	WhatsAppBotSecret      string
	WhatsAppBotCallbackURL string

	// DuaCincin Invitation link (internal/invitationlink). WOLinkSecret is
	// shared with the invitation app (same WO_LINK_SECRET there) and is
	// server-only: never sent to the browser or logged.
	InvitationBaseURL string
	// AllowedOrigins: browser origins allowed by CORS (CORS_ALLOWED_ORIGINS, comma separated).
	AllowedOrigins []string
	WOLinkSecret   string

	// GoogleClientID is the Google OAuth web client ID used to check the
	// audience of "Masuk dengan Google" ID tokens (internal/googleauth).
	// Same client as DuaCincin Invitation. Public value, but read from env.
	GoogleClientID string
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
		AllowedOrigins:     allowedOrigins(os.Getenv("CORS_ALLOWED_ORIGINS")),
		ResendAPIKey:       os.Getenv("RESEND_API_KEY"),
		ResendFromEmail:    getEnv("RESEND_FROM_EMAIL", "DuaCincin <onboarding@resend.dev>"),
		PublicAssetBaseURL: os.Getenv("PUBLIC_ASSET_BASE_URL"),

		SupabaseURL:            os.Getenv("SUPABASE_URL"),
		SupabaseServiceRoleKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),

		MidtransServerKey:    os.Getenv("MIDTRANS_SERVER_KEY"),
		MidtransClientKey:    os.Getenv("MIDTRANS_CLIENT_KEY"),
		MidtransIsProduction: os.Getenv("MIDTRANS_IS_PRODUCTION") == "true",

		WhatsAppBotSecret:      os.Getenv("WHATSAPP_BOT_SECRET"),
		WhatsAppBotCallbackURL: os.Getenv("WHATSAPP_BOT_CALLBACK_URL"),

		InvitationBaseURL: strings.TrimRight(getEnv("INVITATION_BASE_URL", "https://invitation.duacincin.id"), "/"),
		WOLinkSecret:      os.Getenv("WO_LINK_SECRET"),

		GoogleClientID: strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID")),
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
	if cfg.SupabaseURL == "" || cfg.SupabaseServiceRoleKey == "" {
		log.Println("warning: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — portfolio image upload will be unavailable")
	}
	if cfg.MidtransServerKey == "" {
		log.Println("warning: MIDTRANS_SERVER_KEY is not set — payments run in dev-simulation mode instead of calling Midtrans")
	}
	if len(cfg.WOLinkSecret) < 32 {
		log.Println("warning: WO_LINK_SECRET is not set (min 32 chars) — the DuaCincin Invitation link is disabled")
	}
	if cfg.GoogleClientID == "" {
		log.Println("warning: GOOGLE_CLIENT_ID is not set — \"Masuk dengan Google\" is disabled")
	}
	if cfg.WhatsAppBotSecret == "" {
		log.Println("warning: WHATSAPP_BOT_SECRET is not set — the WhatsApp relay webhook will reject every request")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// allowedOrigins returns the CORS allow-list: the comma-separated CORS_ALLOWED_ORIGINS
// when set, otherwise local dev plus the production WO domains.
func allowedOrigins(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return []string{
			"http://localhost:3000",
			"https://duacincin.id",
			"https://www.duacincin.id",
			"https://duacincin-wo.vercel.app",
		}
	}
	var out []string
	for _, o := range strings.Split(raw, ",") {
		if o = strings.TrimRight(strings.TrimSpace(o), "/"); o != "" {
			out = append(out, o)
		}
	}
	return out
}
