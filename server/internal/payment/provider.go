// Package payment is the seam between the booking flow and a payment
// gateway (PRD §8.5/§8.11). The booking code only knows Provider; Midtrans,
// Xendit or the built-in sandbox each implement it, so switching gateway is
// one new adapter plus PAYMENT_PROVIDER, with no change to the lifecycle.
//
// Escrow model: the Client pays into DuaCincin's own gateway account, and
// disbursement to the Vendor (minus commission) is a separate Admin step.
package payment

import (
	"context"
	"errors"
	"net/http"
)

// Provider names accepted by PAYMENT_PROVIDER.
const (
	ProviderSandbox  = "sandbox"
	ProviderMidtrans = "midtrans"
)

// ErrInvalidSignature means a webhook did not carry a valid signature or
// callback token. Handlers answer 401 and never touch the transaction.
var ErrInvalidSignature = errors.New("payment: invalid webhook signature")

// CheckoutRequest is everything a gateway needs to open a payment session.
type CheckoutRequest struct {
	OrderID       string // unique per attempt, also the key webhooks come back with
	Amount        int64  // whole rupiah
	CustomerName  string
	CustomerEmail string
	Description   string
	// ReturnURL is where the gateway sends the Client afterwards (web app).
	ReturnURL string
}

// Checkout is the hosted payment page to send the Client to.
type Checkout struct {
	RedirectURL string
}

// WebhookEvent is a gateway notification normalised to what the booking
// flow needs. Paid is true only for a final, successful, non-fraud payment.
type WebhookEvent struct {
	OrderID string
	Amount  int64
	Paid    bool
}

type Provider interface {
	Name() string
	CreateCheckout(ctx context.Context, req CheckoutRequest) (*Checkout, error)
	// ParseWebhook verifies and decodes a notification. It returns
	// ErrInvalidSignature for forged or unsigned requests.
	ParseWebhook(body []byte, header http.Header) (*WebhookEvent, error)
}

// New picks the gateway. An empty name means sandbox unless Midtrans keys
// are present, which keeps existing deployments behaving as before.
func New(name, midtransServerKey string, midtransProduction bool, webBaseURL string) (Provider, error) {
	if name == "" {
		name = ProviderSandbox
		if midtransServerKey != "" {
			name = ProviderMidtrans
		}
	}
	switch name {
	case ProviderSandbox:
		return NewSandbox(webBaseURL), nil
	case ProviderMidtrans:
		if midtransServerKey == "" {
			return nil, errors.New("PAYMENT_PROVIDER=midtrans needs MIDTRANS_SERVER_KEY")
		}
		return NewMidtrans(midtransServerKey, midtransProduction), nil
	}
	return nil, errors.New("unknown PAYMENT_PROVIDER " + name + " (use sandbox or midtrans)")
}
