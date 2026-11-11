package app_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	handler "duacincin/server/api"
	"duacincin/server/migrations"
)

// The Vercel handler keeps per-instance state (like a real instance), so
// these two tests must run in separate processes:
//
//	go test ./app -run TestVercelHandlerInitError
//	DUACINCIN_TEST_DATABASE_URL=postgres://... go test ./app -run TestVercelHandlerRoutes
//
// TestVercelHandlerRoutes is skipped unless DUACINCIN_TEST_DATABASE_URL
// points at a throwaway local database (it applies migrations to it).
// Never point it at a shared or production database.

func TestVercelHandlerInitError(t *testing.T) {
	if os.Getenv("DUACINCIN_TEST_DATABASE_URL") != "" {
		t.Skip("route test mode")
	}
	// Present-but-empty env wins over any .env file godotenv would load.
	t.Setenv("DATABASE_POOLER", "")
	t.Setenv("JWT_SECRET", "")

	rec := httptest.NewRecorder()
	handler.Handler(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Fatalf("content-type = %q", ct)
	}
	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body["error"] == "" {
		t.Fatalf("body = %q, want JSON error", rec.Body.String())
	}
}

func TestVercelHandlerRoutes(t *testing.T) {
	dsn := os.Getenv("DUACINCIN_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set DUACINCIN_TEST_DATABASE_URL to a throwaway local database")
	}
	if err := migrations.Run(dsn); err != nil {
		t.Fatalf("migrations: %v", err)
	}
	t.Setenv("DATABASE_POOLER", dsn)
	t.Setenv("JWT_SECRET", "local-test-secret-local-test-secret")
	t.Setenv("SUPABASE_URL", "")
	t.Setenv("SUPABASE_SERVICE_ROLE_KEY", "")
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://www.duacincin.id")

	cases := []struct {
		method, path string
		want         int
	}{
		{http.MethodGet, "/healthz", http.StatusOK},
		{http.MethodGet, "/api/v1/vendors", http.StatusOK},
		{http.MethodGet, "/api/v1/auth/me", http.StatusUnauthorized},
		{http.MethodGet, "/api/v1/does-not-exist", http.StatusNotFound},
	}
	for _, c := range cases {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(c.method, c.path, nil)
		req.Header.Set("Origin", "https://www.duacincin.id")
		handler.Handler(rec, req)
		if rec.Code != c.want {
			t.Errorf("%s %s = %d, want %d (body %q)", c.method, c.path, rec.Code, c.want, rec.Body.String())
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://www.duacincin.id" {
			t.Errorf("%s: Access-Control-Allow-Origin = %q", c.path, got)
		}
	}
}
