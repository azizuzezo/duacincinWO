package httpserver

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"duacincin/server/internal/admin"
	"duacincin/server/internal/auth"
	"duacincin/server/internal/budget"
	"duacincin/server/internal/chat"
	"duacincin/server/internal/config"
	"duacincin/server/internal/vendors"
)

// Deps bundles every feature's dependencies for NewRouter.
type Deps struct {
	Auth    *auth.Deps
	Vendors *vendors.Deps
	Admin   *admin.Deps
	Chat    *chat.Deps
	Budget  *budget.Deps
}

// NewRouter builds the root chi router for the DuaCincin API.
func NewRouter(pool *pgxpool.Pool, cfg *config.Config, deps Deps) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(15 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/healthz", healthHandler(pool))

	r.Route("/api/v1", func(r chi.Router) {
		auth.Mount(r, deps.Auth)
		vendors.Mount(r, deps.Vendors, cfg)
		admin.Mount(r, deps.Admin, cfg)
		chat.Mount(r, deps.Chat, cfg)
		budget.Mount(r, deps.Budget, cfg)
		// Feature routes (inspirasi, ...) are mounted here in later phases.
	})

	return r
}

func healthHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()

		status := "ok"
		code := http.StatusOK

		if err := pool.Ping(ctx); err != nil {
			status = "db_unreachable"
			code = http.StatusServiceUnavailable
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(code)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status":  status,
			"service": "duacincin-api",
		})
	}
}
