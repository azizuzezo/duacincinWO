package auth

import (
	"net/http"
	"time"

	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

const (
	dateLayout           = "2006-01-02"
	maxWeddingYearsAhead = 5
)

type weddingDateRequest struct {
	WeddingDate string `json:"wedding_date"`
}

// parseWeddingDate validates the PUT body value. An empty string clears the
// date (nil, no error). Otherwise it must be a real YYYY-MM-DD date, not
// before today and not more than five years ahead. The error is the
// user-facing message.
func parseWeddingDate(raw string, today time.Time) (*time.Time, string) {
	if raw == "" {
		return nil, ""
	}
	d, err := time.Parse(dateLayout, raw)
	if err != nil || len(raw) != len(dateLayout) {
		return nil, "tanggal pernikahan tidak valid, gunakan format YYYY-MM-DD"
	}
	if d.Before(today) {
		return nil, "tanggal pernikahan tidak boleh sudah lewat"
	}
	if d.After(today.AddDate(maxWeddingYearsAhead, 0, 0)) {
		return nil, "tanggal pernikahan maksimal 5 tahun dari sekarang"
	}
	return &d, ""
}

func formatWeddingDate(d *time.Time) string {
	if d == nil {
		return ""
	}
	return d.Format(dateLayout)
}

// SetWeddingDate stores or clears the signed-in couple's wedding date.
func SetWeddingDate(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := ClaimsFromContext(r.Context())

		var req weddingDateRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}

		date, msg := parseWeddingDate(req.WeddingDate, repository.TodayJakarta(time.Now()))
		if msg != "" {
			httpx.Error(w, http.StatusBadRequest, msg)
			return
		}

		if err := deps.Users.SetWeddingDate(r.Context(), claims.UserID, date); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"wedding_date": formatWeddingDate(date)})
	}
}
