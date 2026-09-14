package guestlist

import (
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/security"
)

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// --- Public RSVP surface (no auth, protected by the token itself) ---

type rsvpInfoDTO struct {
	EventName string  `json:"event_name"`
	EventDate *string `json:"event_date,omitempty"`
	VenueNote string  `json:"venue_note"`
}

// GetRSVPInfo returns the event details a guest sees before responding.
func GetRSVPInfo(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		link, err := deps.Links.GetByToken(r.Context(), chi.URLParam(r, "token"))
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "link RSVP tidak ditemukan")
			return
		}

		dto := rsvpInfoDTO{EventName: link.EventName, VenueNote: link.VenueNote}
		if link.EventDate != nil {
			formatted := link.EventDate.Format("2006-01-02")
			dto.EventDate = &formatted
		}
		httpx.JSON(w, http.StatusOK, dto)
	}
}

type submitRSVPRequest struct {
	Name      string `json:"name"`
	Phone     string `json:"phone"`
	PartySize int    `json:"party_size"`
	Status    string `json:"status"`
	Message   string `json:"message"`
}

const (
	rsvpSubmitLimitPerTokenPerHour = 200
	rsvpSubmitLimitPerIPPer10Min   = 5
)

// SubmitRSVP records a guest's response. Public, but rate-limited by both
// the share token (many guests share one link) and the caller's IP (one
// source shouldn't be able to flood a single link), same dual-key pattern
// as auth.ForgotPassword.
func SubmitRSVP(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := chi.URLParam(r, "token")
		link, err := deps.Links.GetByToken(r.Context(), token)
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "link RSVP tidak ditemukan")
			return
		}

		tokenOK, err := deps.Limiter.Allow(r.Context(), "rsvp-submit:token:"+token, "rsvp_submit", rsvpSubmitLimitPerTokenPerHour, time.Hour)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		ipOK, err := deps.Limiter.Allow(r.Context(), "rsvp-submit:ip:"+clientIP(r), "rsvp_submit", rsvpSubmitLimitPerIPPer10Min, 10*time.Minute)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !tokenOK || !ipOK {
			httpx.Error(w, http.StatusTooManyRequests, "terlalu banyak permintaan, coba lagi nanti")
			return
		}

		var req submitRSVPRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" {
			httpx.Error(w, http.StatusBadRequest, "nama wajib diisi")
			return
		}
		if req.Status != repository.GuestRSVPAttending && req.Status != repository.GuestRSVPNotAttending {
			httpx.Error(w, http.StatusBadRequest, "konfirmasi kehadiran tidak valid")
			return
		}
		if req.PartySize < 1 {
			req.PartySize = 1
		}

		guest, err := deps.Guests.Create(r.Context(), link.ClientID, req.Name, strings.TrimSpace(req.Phone), req.PartySize, req.Status, strings.TrimSpace(req.Message), repository.GuestSourceRSVPForm)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusCreated, toGuestDTO(guest))
	}
}

// --- Authenticated (Client-only) management ---

type guestDTO struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Phone      string `json:"phone"`
	PartySize  int    `json:"party_size"`
	RSVPStatus string `json:"rsvp_status"`
	Message    string `json:"message"`
	Source     string `json:"source"`
	CreatedAt  string `json:"created_at"`
}

func toGuestDTO(g *repository.Guest) guestDTO {
	return guestDTO{
		ID: g.ID, Name: g.Name, Phone: g.Phone, PartySize: g.PartySize,
		RSVPStatus: g.RSVPStatus, Message: g.Message, Source: g.Source,
		CreatedAt: g.CreatedAt.Format(time.RFC3339),
	}
}

func ListGuests(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		guests, err := deps.Guests.ListForClient(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]guestDTO, 0, len(guests))
		for _, g := range guests {
			out = append(out, toGuestDTO(&g))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

type upsertGuestRequest struct {
	Name      string `json:"name"`
	Phone     string `json:"phone"`
	PartySize int    `json:"party_size"`
	Status    string `json:"rsvp_status"`
	Message   string `json:"message"`
}

var validRSVPStatuses = map[string]bool{
	repository.GuestRSVPPending:      true,
	repository.GuestRSVPAttending:    true,
	repository.GuestRSVPNotAttending: true,
}

// CreateGuest lets the Client log a guest they heard from offline (phone,
// WhatsApp) directly, without going through the public RSVP form.
func CreateGuest(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		var req upsertGuestRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" {
			httpx.Error(w, http.StatusBadRequest, "nama wajib diisi")
			return
		}
		if req.Status == "" {
			req.Status = repository.GuestRSVPPending
		}
		if !validRSVPStatuses[req.Status] {
			httpx.Error(w, http.StatusBadRequest, "status RSVP tidak valid")
			return
		}
		if req.PartySize < 1 {
			req.PartySize = 1
		}

		guest, err := deps.Guests.Create(r.Context(), claims.UserID, req.Name, strings.TrimSpace(req.Phone), req.PartySize, req.Status, strings.TrimSpace(req.Message), repository.GuestSourceManual)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusCreated, toGuestDTO(guest))
	}
}

func UpdateGuest(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		id := chi.URLParam(r, "id")

		var req upsertGuestRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" || !validRSVPStatuses[req.Status] {
			httpx.Error(w, http.StatusBadRequest, "data tidak valid")
			return
		}
		if req.PartySize < 1 {
			req.PartySize = 1
		}

		found, err := deps.Guests.Update(r.Context(), claims.UserID, id, req.Name, strings.TrimSpace(req.Phone), req.PartySize, req.Status, strings.TrimSpace(req.Message))
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !found {
			httpx.Error(w, http.StatusNotFound, "tamu tidak ditemukan")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "data tamu diperbarui"})
	}
}

func DeleteGuest(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		found, err := deps.Guests.Delete(r.Context(), claims.UserID, chi.URLParam(r, "id"))
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !found {
			httpx.Error(w, http.StatusNotFound, "tamu tidak ditemukan")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "tamu dihapus"})
	}
}

// --- RSVP link settings (Client-only) ---

type rsvpLinkDTO struct {
	Token     string  `json:"token"`
	EventName string  `json:"event_name"`
	EventDate *string `json:"event_date,omitempty"`
	VenueNote string  `json:"venue_note"`
}

func toRSVPLinkDTO(l *repository.RSVPLink) rsvpLinkDTO {
	dto := rsvpLinkDTO{Token: l.Token, EventName: l.EventName, VenueNote: l.VenueNote}
	if l.EventDate != nil {
		formatted := l.EventDate.Format("2006-01-02")
		dto.EventDate = &formatted
	}
	return dto
}

func GetMyRSVPLink(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		token, err := security.GenerateShareToken()
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		link, err := deps.Links.GetOrCreate(r.Context(), claims.UserID, token)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, toRSVPLinkDTO(link))
	}
}

type updateRSVPLinkRequest struct {
	EventName string  `json:"event_name"`
	EventDate *string `json:"event_date"`
	VenueNote string  `json:"venue_note"`
}

func UpdateRSVPLink(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		var req updateRSVPLinkRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}

		var eventDate *time.Time
		if req.EventDate != nil && *req.EventDate != "" {
			parsed, err := time.Parse("2006-01-02", *req.EventDate)
			if err != nil {
				httpx.Error(w, http.StatusBadRequest, "event_date harus format YYYY-MM-DD")
				return
			}
			eventDate = &parsed
		}

		if err := deps.Links.UpdateSettings(r.Context(), claims.UserID, strings.TrimSpace(req.EventName), eventDate, strings.TrimSpace(req.VenueNote)); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "pengaturan RSVP diperbarui"})
	}
}
