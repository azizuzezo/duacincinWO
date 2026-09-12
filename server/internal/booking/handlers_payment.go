package booking

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/payment"
	"duacincin/server/internal/repository"
)

type payResponse struct {
	DevMode     bool   `json:"dev_mode"`
	RedirectURL string `json:"redirect_url,omitempty"`
}

// initiatePayment creates (or reuses) a pending transaction for txType and
// either opens a real Midtrans Snap session or, when Midtrans isn't
// configured, tells the frontend to fall back to the dev-simulation button.
func initiatePayment(deps *Deps, w http.ResponseWriter, r *http.Request, b *repository.Booking, txType string, amount int64) {
	tx, err := deps.Transactions.GetLatestPending(r.Context(), b.ID, txType)
	if err == repository.ErrNotFound {
		orderID := fmt.Sprintf("dc-%s-%s-%s", b.ID[:8], txType, uuid.NewString()[:8])
		tx, err = deps.Transactions.Create(r.Context(), b.ID, txType, amount, orderID)
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
		return
	}

	if !deps.Midtrans.Configured() {
		httpx.JSON(w, http.StatusOK, payResponse{DevMode: true})
		return
	}

	client, err := deps.Users.GetByID(r.Context(), b.ClientID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
		return
	}

	redirectURL, err := deps.Midtrans.CreateTransaction(r.Context(), tx.ProviderOrderID, tx.Amount, client.FullName, client.Email)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, "gagal membuat sesi pembayaran")
		return
	}
	httpx.JSON(w, http.StatusOK, payResponse{RedirectURL: redirectURL})
}

// PayDP starts the DP payment for a confirmed booking (PRD §8.11 step 3).
func PayDP(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		b, err := deps.Bookings.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || claims.UserID != b.ClientID {
			httpx.Error(w, http.StatusNotFound, "booking tidak ditemukan")
			return
		}
		if b.Status != repository.BookingStatusConfirmed {
			httpx.Error(w, http.StatusConflict, "booking belum dikonfirmasi vendor")
			return
		}
		initiatePayment(deps, w, r, b, repository.TransactionTypeDP, b.DPAmount)
	}
}

// PayFull starts the pelunasan payment for a DP-paid booking (PRD §8.11 step 5).
func PayFull(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		b, err := deps.Bookings.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || claims.UserID != b.ClientID {
			httpx.Error(w, http.StatusNotFound, "booking tidak ditemukan")
			return
		}
		if b.Status != repository.BookingStatusDPPaid {
			httpx.Error(w, http.StatusConflict, "DP belum dibayar")
			return
		}
		initiatePayment(deps, w, r, b, repository.TransactionTypeFull, b.AgreedPrice-b.DPAmount)
	}
}

// applyPaidTransaction marks tx paid and advances its booking's status —
// shared by the real Midtrans webhook and the dev-simulation endpoint so
// both paths behave identically.
func applyPaidTransaction(deps *Deps, r *http.Request, tx *repository.Transaction) error {
	if tx.Status == repository.TransactionStatusPaid {
		return nil // already processed — webhooks can be delivered more than once
	}
	if err := deps.Transactions.MarkPaid(r.Context(), tx.ID); err != nil {
		return err
	}

	from, to := repository.BookingStatusConfirmed, repository.BookingStatusDPPaid
	title := "DP diterima"
	if tx.Type == repository.TransactionTypeFull {
		from, to = repository.BookingStatusDPPaid, repository.BookingStatusFullPaid
		title = "Pelunasan diterima"
	}
	if _, err := deps.Bookings.UpdateStatus(r.Context(), tx.BookingID, from, to); err != nil {
		return err
	}

	if b, err := deps.Bookings.GetByID(r.Context(), tx.BookingID); err == nil {
		notify(deps, r.Context(), b.VendorID, "booking.payment_received", title, "Client sudah membayar, cek detail booking.", "/vendor/bookings/"+b.ID)
	}
	return nil
}

// DevSimulatePayment lets a Client mark their own pending transaction as
// paid without a real Midtrans account — only available while Midtrans
// isn't configured (dev/staging), so the whole booking lifecycle can be
// exercised end-to-end before real merchant credentials exist.
func DevSimulatePayment(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if deps.Midtrans.Configured() {
			httpx.Error(w, http.StatusForbidden, "simulasi hanya tersedia saat Midtrans belum dikonfigurasi")
			return
		}

		claims, _ := auth.ClaimsFromContext(r.Context())
		b, err := deps.Bookings.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || claims.UserID != b.ClientID {
			httpx.Error(w, http.StatusNotFound, "booking tidak ditemukan")
			return
		}

		var req struct {
			Type string `json:"type"`
		}
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}

		tx, err := deps.Transactions.GetLatestPending(r.Context(), b.ID, req.Type)
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "tidak ada pembayaran pending untuk tipe ini")
			return
		}

		if err := applyPaidTransaction(deps, r, tx); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusOK, map[string]string{"message": "pembayaran disimulasikan berhasil"})
	}
}

type midtransNotification struct {
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status"`
}

// MidtransWebhook receives payment notifications (public endpoint,
// authenticated via Midtrans's signature scheme instead of a session).
func MidtransWebhook(deps *Deps, serverKey string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid body")
			return
		}

		var n midtransNotification
		if err := json.Unmarshal(body, &n); err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid body")
			return
		}

		if !payment.VerifySignature(n.OrderID, n.StatusCode, n.GrossAmount, serverKey, n.SignatureKey) {
			httpx.Error(w, http.StatusUnauthorized, "invalid signature")
			return
		}

		paidStatuses := map[string]bool{"settlement": true, "capture": true}
		if !paidStatuses[n.TransactionStatus] || (n.TransactionStatus == "capture" && n.FraudStatus != "accept") {
			httpx.JSON(w, http.StatusOK, map[string]string{"message": "notification acknowledged, no action taken"})
			return
		}

		tx, err := deps.Transactions.GetByOrderID(r.Context(), n.OrderID)
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "unknown order_id")
			return
		}

		if err := applyPaidTransaction(deps, r, tx); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan")
			return
		}

		httpx.JSON(w, http.StatusOK, map[string]string{"message": "ok"})
	}
}
