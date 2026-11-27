package booking

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/payment"
	"duacincin/server/internal/repository"
)

type payResponse struct {
	Provider    string `json:"provider"`
	OrderID     string `json:"order_id"`
	RedirectURL string `json:"redirect_url"`
}

// initiatePayment creates (or reuses) a pending transaction for txType and
// opens a checkout session with the active provider. The Client is always
// sent to redirect_url: the gateway's hosted page, or our sandbox page.
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

	client, err := deps.Users.GetByID(r.Context(), b.ClientID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
		return
	}

	checkout, err := deps.Payments.CreateCheckout(r.Context(), payment.CheckoutRequest{
		OrderID:       tx.ProviderOrderID,
		Amount:        tx.Amount,
		CustomerName:  client.FullName,
		CustomerEmail: client.Email,
		Description:   "DuaCincin " + txType,
		ReturnURL:     deps.WebBaseURL + "/client/bookings/" + b.ID + "?pembayaran=selesai",
	})
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, "gagal membuat sesi pembayaran")
		return
	}
	httpx.JSON(w, http.StatusOK, payResponse{Provider: deps.Payments.Name(), OrderID: tx.ProviderOrderID, RedirectURL: checkout.RedirectURL})
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
// shared by the real webhook and the sandbox checkout so
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

type sandboxOrder struct {
	OrderID   string `json:"order_id"`
	BookingID string `json:"booking_id"`
	Type      string `json:"type"`
	Amount    int64  `json:"amount"`
	Status    string `json:"status"`
}

// sandboxTransaction loads the order for a sandbox checkout, 404 unless the
// sandbox is the active provider and the order belongs to the caller.
func sandboxTransaction(deps *Deps, w http.ResponseWriter, r *http.Request) (*repository.Transaction, bool) {
	if deps.Payments.Name() != payment.ProviderSandbox {
		httpx.Error(w, http.StatusNotFound, "pembayaran tidak ditemukan")
		return nil, false
	}
	claims, _ := auth.ClaimsFromContext(r.Context())
	tx, err := deps.Transactions.GetByOrderID(r.Context(), chi.URLParam(r, "order"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "pembayaran tidak ditemukan")
		return nil, false
	}
	b, err := deps.Bookings.GetByID(r.Context(), tx.BookingID)
	if err != nil || b.ClientID != claims.UserID {
		httpx.Error(w, http.StatusNotFound, "pembayaran tidak ditemukan")
		return nil, false
	}
	return tx, true
}

// SandboxOrder describes the order behind the sandbox checkout page.
func SandboxOrder(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tx, ok := sandboxTransaction(deps, w, r)
		if !ok {
			return
		}
		httpx.JSON(w, http.StatusOK, sandboxOrder{OrderID: tx.ProviderOrderID, BookingID: tx.BookingID, Type: tx.Type, Amount: tx.Amount, Status: tx.Status})
	}
}

// SandboxComplete is the sandbox's "Bayar" button: it settles the order
// through applyPaidTransaction, the same path a real webhook takes.
func SandboxComplete(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tx, ok := sandboxTransaction(deps, w, r)
		if !ok {
			return
		}
		if err := applyPaidTransaction(deps, r, tx); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"booking_id": tx.BookingID})
	}
}

// PaymentWebhook receives gateway notifications. It is public and trusts
// only what the provider's ParseWebhook verifies (signature or token).
func PaymentWebhook(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if chi.URLParam(r, "provider") != deps.Payments.Name() {
			httpx.Error(w, http.StatusNotFound, "provider tidak aktif")
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}

		ev, err := deps.Payments.ParseWebhook(body, r.Header)
		if errors.Is(err, payment.ErrInvalidSignature) {
			httpx.Error(w, http.StatusUnauthorized, "permintaan tidak sah")
			return
		}
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}
		if !ev.Paid {
			httpx.JSON(w, http.StatusOK, map[string]string{"message": "notification acknowledged, no action taken"})
			return
		}

		tx, err := deps.Transactions.GetByOrderID(r.Context(), ev.OrderID)
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "unknown order_id")
			return
		}
		// A correctly signed notification for the wrong amount must not settle the order.
		if ev.Amount != tx.Amount {
			log.Printf("payment webhook: amount mismatch for %s: got %d want %d", ev.OrderID, ev.Amount, tx.Amount)
			httpx.Error(w, http.StatusUnprocessableEntity, "jumlah tidak sesuai")
			return
		}

		if err := applyPaidTransaction(deps, r, tx); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "ok"})
	}
}
