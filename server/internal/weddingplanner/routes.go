package weddingplanner

import (
	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// Mount registers /wedding-planner routes onto r, restricted to Clients.
func Mount(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Route("/wedding-planner", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Use(auth.RequireRole(auth.RoleClient))

		r.Get("/tasks", ListTasks(deps))
		r.Patch("/tasks/{id}", UpdateTaskStatus(deps))
	})
}
