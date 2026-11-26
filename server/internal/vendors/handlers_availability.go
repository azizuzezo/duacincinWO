package vendors

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

const (
	dateLayout            = "2006-01-02"
	maxAvailabilityDays   = 400
	maxBlockedDatesPerPut = 62
)

type availabilityDayDTO struct {
	Date   string `json:"date"`
	Reason string `json:"reason"`
}

type availabilityResponse struct {
	Dates []availabilityDayDTO `json:"dates"`
}

func toAvailabilityResponse(days []repository.AvailabilityDay) availabilityResponse {
	out := make([]availabilityDayDTO, 0, len(days))
	for _, d := range days {
		out = append(out, availabilityDayDTO{Date: d.Day.Format(dateLayout), Reason: d.Reason})
	}
	return availabilityResponse{Dates: out}
}

// parseDay reads a strict YYYY-MM-DD calendar date.
func parseDay(raw string) (time.Time, bool) {
	d, err := time.Parse(dateLayout, raw)
	if err != nil || len(raw) != len(dateLayout) {
		return time.Time{}, false
	}
	return d, true
}

// parseAvailabilityRange reads the from/to query values. from defaults to
// today and to defaults to from plus the maximum span. The range is
// inclusive and capped at maxAvailabilityDays days. The error is the
// user-facing message.
func parseAvailabilityRange(fromRaw, toRaw string, today time.Time) (from, to time.Time, msg string) {
	from = today
	if fromRaw != "" {
		var ok bool
		if from, ok = parseDay(fromRaw); !ok {
			return from, to, "tanggal awal tidak valid, gunakan format YYYY-MM-DD"
		}
	}
	to = from.AddDate(0, 0, maxAvailabilityDays-1)
	if toRaw != "" {
		var ok bool
		if to, ok = parseDay(toRaw); !ok {
			return from, to, "tanggal akhir tidak valid, gunakan format YYYY-MM-DD"
		}
	}
	if to.Before(from) {
		return from, to, "tanggal akhir tidak boleh sebelum tanggal awal"
	}
	if int(to.Sub(from).Hours()/24)+1 > maxAvailabilityDays {
		return from, to, "rentang tanggal maksimal 400 hari"
	}
	return from, to, ""
}

// parseBlockDates validates the dates of a block/unblock request: 1 to 62
// real dates, none in the past, duplicates collapsed. The error is the
// user-facing message.
func parseBlockDates(raw []string, today time.Time) ([]time.Time, string) {
	if len(raw) == 0 {
		return nil, "pilih minimal satu tanggal"
	}
	if len(raw) > maxBlockedDatesPerPut {
		return nil, "maksimal 62 tanggal sekali kirim"
	}
	seen := make(map[time.Time]bool, len(raw))
	out := make([]time.Time, 0, len(raw))
	for _, s := range raw {
		d, ok := parseDay(s)
		if !ok {
			return nil, "tanggal tidak valid, gunakan format YYYY-MM-DD"
		}
		if d.Before(today) {
			return nil, "tanggal yang sudah lewat tidak bisa diubah"
		}
		if !seen[d] {
			seen[d] = true
			out = append(out, d)
		}
	}
	return out, ""
}

func respondAvailability(w http.ResponseWriter, r *http.Request, deps *Deps, vendorID string, from, to time.Time) {
	days, err := deps.Availability.ListUnavailable(r.Context(), vendorID, from, to)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
		return
	}
	httpx.JSON(w, http.StatusOK, toAvailabilityResponse(days))
}

// PublicAvailability lists a vendor's unavailable days, visible like the
// public profile (approved vendors only). It never says who booked.
func PublicAvailability(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		profile, err := deps.Vendors.GetByUserID(r.Context(), id)
		if err != nil || profile.Status != "approved" {
			httpx.Error(w, http.StatusNotFound, "vendor tidak ditemukan")
			return
		}
		from, to, msg := parseAvailabilityRange(r.URL.Query().Get("from"), r.URL.Query().Get("to"), repository.TodayJakarta(time.Now()))
		if msg != "" {
			httpx.Error(w, http.StatusBadRequest, msg)
			return
		}
		respondAvailability(w, r, deps, id, from, to)
	}
}

// MyAvailability is the same payload for the signed-in vendor.
func MyAvailability(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		from, to, msg := parseAvailabilityRange(r.URL.Query().Get("from"), r.URL.Query().Get("to"), repository.TodayJakarta(time.Now()))
		if msg != "" {
			httpx.Error(w, http.StatusBadRequest, msg)
			return
		}
		respondAvailability(w, r, deps, claims.UserID, from, to)
	}
}

type setBlockedRequest struct {
	Dates   []string `json:"dates"`
	Blocked bool     `json:"blocked"`
}

// SetBlockedDates blocks or reopens days for the signed-in vendor.
func SetBlockedDates(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		var req setBlockedRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}
		today := repository.TodayJakarta(time.Now())
		days, msg := parseBlockDates(req.Dates, today)
		if msg != "" {
			httpx.Error(w, http.StatusBadRequest, msg)
			return
		}

		if err := deps.Availability.SetBlocked(r.Context(), claims.UserID, days, req.Blocked); err != nil {
			if errors.Is(err, repository.ErrDateBooked) {
				httpx.Error(w, http.StatusConflict, "tanggal itu sudah terkunci oleh booking, tidak bisa ditutup manual")
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		// Return the span covering the given dates, or the next 400 days
		// when that span would be longer than the allowed range.
		from, to := days[0], days[0]
		for _, d := range days {
			if d.Before(from) {
				from = d
			}
			if d.After(to) {
				to = d
			}
		}
		if int(to.Sub(from).Hours()/24)+1 > maxAvailabilityDays {
			from, to = today, today.AddDate(0, 0, maxAvailabilityDays-1)
		}
		respondAvailability(w, r, deps, claims.UserID, from, to)
	}
}
