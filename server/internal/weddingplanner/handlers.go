// Package weddingplanner implements the Wedding Planner checklist (PRD
// §8.9): a per-Client timeline seeded from a default set of milestones,
// with statuses the Client can toggle by hand. Auto-completion when a
// matching vendor booking is confirmed lands in Fase 6 once bookings exist.
package weddingplanner

import (
	"net/http"
	"slices"
	"strings"
	"time"

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
	DueDate         *string `json:"due_date,omitempty"`
	IsCustom        bool    `json:"is_custom"`
}

func toTaskDTO(t *repository.PlannerTask) taskDTO {
	dto := taskDTO{ID: t.ID, Timeframe: t.Timeframe, Title: t.Title, RelatedCategory: t.RelatedCategory, Status: t.Status, IsCustom: t.IsCustom}
	if t.DueDate != nil {
		formatted := t.DueDate.Format("2006-01-02")
		dto.DueDate = &formatted
	}
	return dto
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

// parseDueDate parses an optional "YYYY-MM-DD" string. An empty string
// clears the due date (returns nil, nil); a malformed one is an error.
func parseDueDate(raw string) (*time.Time, error) {
	if raw == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

type setDueDateRequest struct {
	DueDate string `json:"due_date"`
}

// SetTaskDueDate lets the Client target a date for any task (default or
// custom). Pass due_date: "" to clear it.
func SetTaskDueDate(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		taskID := chi.URLParam(r, "id")

		var req setDueDateRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		dueDate, err := parseDueDate(req.DueDate)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "due_date harus format YYYY-MM-DD")
			return
		}

		found, err := deps.Planner.SetDueDate(r.Context(), claims.UserID, taskID, dueDate)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !found {
			httpx.Error(w, http.StatusNotFound, "task tidak ditemukan")
			return
		}

		httpx.JSON(w, http.StatusOK, map[string]string{"message": "target tanggal diperbarui"})
	}
}

type createTaskRequest struct {
	Title           string  `json:"title"`
	Timeframe       string  `json:"timeframe"`
	DueDate         string  `json:"due_date"`
	RelatedCategory *string `json:"related_category"`
}

// CreateTask lets the Client add their own checklist item alongside the
// seeded defaults (PRD §8.9 covers only the default set).
func CreateTask(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		var req createTaskRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.Title = strings.TrimSpace(req.Title)
		req.Timeframe = strings.TrimSpace(req.Timeframe)
		if req.Title == "" || req.Timeframe == "" {
			httpx.Error(w, http.StatusBadRequest, "judul dan periode wajib diisi")
			return
		}
		dueDate, err := parseDueDate(req.DueDate)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "due_date harus format YYYY-MM-DD")
			return
		}

		t, err := deps.Planner.CreateCustomTask(r.Context(), claims.UserID, req.Timeframe, req.Title, dueDate, req.RelatedCategory)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusCreated, toTaskDTO(t))
	}
}

// DeleteTask removes a Client-authored task. Seeded default tasks can only
// be toggled (UpdateTaskStatus), not deleted.
func DeleteTask(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		taskID := chi.URLParam(r, "id")

		found, err := deps.Planner.DeleteCustomTask(r.Context(), claims.UserID, taskID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !found {
			httpx.Error(w, http.StatusNotFound, "task tidak ditemukan atau bukan task custom")
			return
		}

		httpx.JSON(w, http.StatusOK, map[string]string{"message": "task dihapus"})
	}
}
