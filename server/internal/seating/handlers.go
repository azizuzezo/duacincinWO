package seating

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type seatedGuestDTO struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	PartySize int    `json:"party_size"`
}

type tableDTO struct {
	ID       string           `json:"id"`
	Name     string           `json:"name"`
	Capacity int              `json:"capacity"`
	Guests   []seatedGuestDTO `json:"guests"`
}

type boardDTO struct {
	Tables     []tableDTO       `json:"tables"`
	Unassigned []seatedGuestDTO `json:"unassigned"`
}

// GetBoard assembles the whole seating board in one response: every table
// with its seated guests, plus every guest not yet assigned anywhere.
// Composed in Go from three independent lists (tables, assignments,
// guests) rather than a single SQL join, matching the existing app-wide
// pattern of light per-repo queries over heavier joins for small datasets.
func GetBoard(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		tables, err := deps.Tables.ListForClient(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		assignments, err := deps.Assignments.ListForClient(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		guests, err := deps.Guests.ListForClient(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		guestByID := make(map[string]repository.Guest, len(guests))
		for _, g := range guests {
			guestByID[g.ID] = g
		}
		tableIDForGuest := make(map[string]string, len(assignments))
		for _, a := range assignments {
			tableIDForGuest[a.GuestID] = a.TableID
		}

		out := boardDTO{Tables: make([]tableDTO, 0, len(tables))}
		for _, t := range tables {
			out.Tables = append(out.Tables, tableDTO{ID: t.ID, Name: t.Name, Capacity: t.Capacity, Guests: []seatedGuestDTO{}})
		}
		tableIndex := make(map[string]int, len(out.Tables))
		for i, t := range out.Tables {
			tableIndex[t.ID] = i
		}

		for _, g := range guests {
			dto := seatedGuestDTO{ID: g.ID, Name: g.Name, PartySize: g.PartySize}
			if tableID, seated := tableIDForGuest[g.ID]; seated {
				if idx, ok := tableIndex[tableID]; ok {
					out.Tables[idx].Guests = append(out.Tables[idx].Guests, dto)
					continue
				}
			}
			out.Unassigned = append(out.Unassigned, dto)
		}

		httpx.JSON(w, http.StatusOK, out)
	}
}

type upsertTableRequest struct {
	Name     string `json:"name"`
	Capacity int    `json:"capacity"`
}

func CreateTable(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		var req upsertTableRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" {
			httpx.Error(w, http.StatusBadRequest, "nama meja wajib diisi")
			return
		}
		if req.Capacity < 1 {
			req.Capacity = 8
		}

		t, err := deps.Tables.Create(r.Context(), claims.UserID, req.Name, req.Capacity)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusCreated, tableDTO{ID: t.ID, Name: t.Name, Capacity: t.Capacity, Guests: []seatedGuestDTO{}})
	}
}

func UpdateTable(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		id := chi.URLParam(r, "id")

		var req upsertTableRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" || req.Capacity < 1 {
			httpx.Error(w, http.StatusBadRequest, "data tidak valid")
			return
		}

		found, err := deps.Tables.Update(r.Context(), claims.UserID, id, req.Name, req.Capacity)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !found {
			httpx.Error(w, http.StatusNotFound, "meja tidak ditemukan")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "meja diperbarui"})
	}
}

func DeleteTable(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		found, err := deps.Tables.Delete(r.Context(), claims.UserID, chi.URLParam(r, "id"))
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !found {
			httpx.Error(w, http.StatusNotFound, "meja tidak ditemukan")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "meja dihapus"})
	}
}

type assignRequest struct {
	GuestID string `json:"guest_id"`
	TableID string `json:"table_id"`
}

// AssignGuest seats a guest at a table, verifying both belong to the
// authenticated Client (IDOR guard on two foreign resources).
func AssignGuest(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		var req assignRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil || req.GuestID == "" || req.TableID == "" {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}

		guest, err := deps.Guests.GetByID(r.Context(), req.GuestID)
		if err != nil || guest.ClientID != claims.UserID {
			httpx.Error(w, http.StatusNotFound, "tamu tidak ditemukan")
			return
		}
		table, err := deps.Tables.GetByID(r.Context(), req.TableID)
		if err != nil || table.ClientID != claims.UserID {
			httpx.Error(w, http.StatusNotFound, "meja tidak ditemukan")
			return
		}

		if err := deps.Assignments.Assign(r.Context(), req.TableID, req.GuestID); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "tamu ditempatkan"})
	}
}

// UnassignGuest removes guestID from whatever table it's at, verifying
// ownership first.
func UnassignGuest(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		guestID := chi.URLParam(r, "guestId")

		guest, err := deps.Guests.GetByID(r.Context(), guestID)
		if err != nil || guest.ClientID != claims.UserID {
			httpx.Error(w, http.StatusNotFound, "tamu tidak ditemukan")
			return
		}

		if err := deps.Assignments.Unassign(r.Context(), guestID); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "tamu dikeluarkan dari meja"})
	}
}
