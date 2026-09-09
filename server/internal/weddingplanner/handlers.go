// Package weddingplanner implements the Wedding Planner checklist (PRD
// §8.9): a per-Client timeline seeded from a default set of milestones,
// with statuses the Client can toggle by hand. Auto-completion when a
// matching vendor booking is confirmed lands in Fase 6 once bookings exist.
package weddingplanner

import (
	"net/http"
	"slices"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type Deps struct {
	Planner *repository.WeddingPlannerRepo
}

func NewDeps(planner *repository.WeddingPlannerRepo) *Deps {
	return &Deps{Planner: planner}
}

type taskDTO struct {
	ID              string  `json:"id"`
	Timeframe       string  `json:"timeframe"`
	Title           string  `json:"title"`
	RelatedCategory *string `json:"related_category,omitempty"`
	Status          string  `json:"status"`
}

func toTaskDTO(t *repository.PlannerTask) taskDTO {
	return taskDTO{ID: t.ID, Timeframe: t.Timeframe, Title: t.Title, RelatedCategory: t.RelatedCategory, Status: t.Status}
}

func ListTasks(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		tasks, err := deps.Planner.ListForClient(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		out := make([]taskDTO, 0, len(tasks))
		for _, t := range tasks {
			out = append(out, toTaskDTO(&t))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

var validStatuses = []string{repository.TaskStatusTodo, repository.TaskStatusInProgress, repository.TaskStatusDone}

type updateStatusRequest struct {
	Status string `json:"status"`
}

func UpdateTaskStatus(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		taskID := chi.URLParam(r, "id")

		var req updateStatusRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil || !slices.Contains(validStatuses, req.Status) {
			httpx.Error(w, http.StatusBadRequest, "status tidak valid")
			return
		}

		found, err := deps.Planner.SetStatus(r.Context(), claims.UserID, taskID, req.Status)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !found {
			httpx.Error(w, http.StatusNotFound, "task tidak ditemukan")
			return
		}

		httpx.JSON(w, http.StatusOK, map[string]string{"message": "status diperbarui"})
	}
}
