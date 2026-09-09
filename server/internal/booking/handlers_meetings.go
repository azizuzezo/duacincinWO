package booking

import (
	"net/http"
	"strings"
	"time"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

type meetingDTO struct {
	ID          string  `json:"id"`
	BookingID   *string `json:"booking_id,omitempty"`
	Type        string  `json:"type"`
	ScheduledAt string  `json:"scheduled_at"`
	MeetingLink string  `json:"meeting_link"`
	Status      string  `json:"status"`
}

func toMeetingDTO(m *repository.Meeting) meetingDTO {
	return meetingDTO{
		ID:          m.ID,
		BookingID:   m.BookingID,
		Type:        m.Type,
		ScheduledAt: m.ScheduledAt.Format(time.RFC3339),
		MeetingLink: m.MeetingLink,
		Status:      m.Status,
	}
}

type createMeetingRequest struct {
	ScheduledAt string `json:"scheduled_at"`
	MeetingLink string `json:"meeting_link"`
}

// CreateTechnicalMeeting schedules the technical meeting a booking needs
// before it can be marked completed (PRD §8.11 step 6). Either participant
// may schedule it.
func CreateTechnicalMeeting(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		b, ok := getAuthorizedBooking(deps, r)
		if !ok {
			httpx.Error(w, http.StatusNotFound, "booking tidak ditemukan")
			return
		}

		var req createMeetingRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		scheduledAt, err := time.Parse(time.RFC3339, req.ScheduledAt)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "scheduled_at harus format ISO 8601 (RFC3339)")
			return
		}

		m, err := deps.Meetings.Create(r.Context(), &b.ID, b.ClientID, repository.MeetingTypeTechnical, scheduledAt, strings.TrimSpace(req.MeetingLink))
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusCreated, toMeetingDTO(m))
	}
}

func ListMeetingsForBooking(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		b, ok := getAuthorizedBooking(deps, r)
		if !ok {
			httpx.Error(w, http.StatusNotFound, "booking tidak ditemukan")
			return
		}

		meetings, err := deps.Meetings.ListForBooking(r.Context(), b.ID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]meetingDTO, 0, len(meetings))
		for _, m := range meetings {
			out = append(out, toMeetingDTO(&m))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

// CreateConsultantMeeting lets a Client schedule a follow-up session with
// the Wedding Consultant team (PRD §8.11 step 4) — the meeting link itself
// is just pasted in (Zoom/Meet), no video integration in MVP.
func CreateConsultantMeeting(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		var req createMeetingRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		scheduledAt, err := time.Parse(time.RFC3339, req.ScheduledAt)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "scheduled_at harus format ISO 8601 (RFC3339)")
			return
		}

		m, err := deps.Meetings.Create(r.Context(), nil, claims.UserID, repository.MeetingTypeConsultant, scheduledAt, strings.TrimSpace(req.MeetingLink))
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusCreated, toMeetingDTO(m))
	}
}

func ListConsultantMeetings(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		meetings, err := deps.Meetings.ListConsultantMeetingsForClient(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]meetingDTO, 0, len(meetings))
		for _, m := range meetings {
			out = append(out, toMeetingDTO(&m))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}
