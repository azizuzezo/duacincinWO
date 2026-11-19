package admin

import (
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/httpx"
	"duacincin/server/internal/wilayah"
)

type setCitiesRequest struct {
	Cities []string `json:"cities"`
	Reason string   `json:"reason"`
}

// setVendorCities is the Admin's emergency edit of a vendor's service area
// (kabupaten/kota), for when the vendor cannot fix it themselves. Same
// rules as the vendor's own profile form (wilayah.NormalizeCities). A
// reason is required; old and new lists plus the reason go to the audit
// log, and the vendor is told what changed and why.
func setVendorCities(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		var req setCitiesRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}
		reason := strings.TrimSpace(req.Reason)
		if n := utf8.RuneCountInString(reason); n < 5 || n > 300 {
			httpx.Error(w, http.StatusBadRequest, "tulis alasan perubahan (5 sampai 300 karakter)")
			return
		}
		cities, msg := wilayah.NormalizeCities(req.Cities)
		if msg != "" {
			httpx.Error(w, http.StatusBadRequest, msg)
			return
		}
		profile, err := deps.Vendors.GetByUserID(r.Context(), id)
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "vendor tidak ditemukan")
			return
		}
		before := profile.Cities
		if before == nil {
			before = []string{}
		}
		if err := deps.Vendors.SetCities(r.Context(), id, cities); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		logAction(deps, r, "vendor.set_cities", "vendor", id, map[string]any{"from": before, "to": cities, "reason": reason})
		link := "/vendor/profile"
		notify(deps, r.Context(), id, "vendor_cities_changed", "Lokasi layananmu diperbarui admin",
			"Kabupaten/kota layananmu sekarang: "+strings.Join(cities, ", ")+". Alasan: "+reason, &link)
		httpx.JSON(w, http.StatusOK, map[string]any{"cities": cities})
	}
}
