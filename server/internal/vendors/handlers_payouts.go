package vendors

import (
	"net/http"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
)

type payoutDTO struct {
	BookingID        string `json:"booking_id"`
	GrossAmount      int64  `json:"gross_amount"`
	CommissionAmount int64  `json:"commission_amount"`
	NetAmount        int64  `json:"net_amount"`
	Status           string `json:"status"`
}

// ListMyPayouts is read-only: it shows the Vendor what they earned and
// whether it has been disbursed. Disbursement itself stays entirely an
// Admin-side action (server/internal/admin).
func ListMyPayouts(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		items, err := deps.Disbursements.ListForVendor(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		out := make([]payoutDTO, 0, len(items))
		for _, d := range items {
			out = append(out, payoutDTO{BookingID: d.BookingID, GrossAmount: d.GrossAmount, CommissionAmount: d.CommissionAmount, NetAmount: d.NetAmount, Status: d.Status})
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}
