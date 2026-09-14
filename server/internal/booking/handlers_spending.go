package booking

import (
	"net/http"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
)

// SpentByCategory backs the Budget Planner / Wedding Planner "terpakai vs
// alokasi" view: how much the Client has agreed to pay per vendor
// category so far.
func SpentByCategory(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		spent, err := deps.Bookings.SumAgreedPriceByCategory(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, spent)
	}
}
