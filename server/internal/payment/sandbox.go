package payment

import (
	"context"
	"errors"
	"net/http"
	"net/url"
)

// Sandbox is a fake gateway for development and staging: checkout is a page
// on our own web app where the Client picks a method and "pays". Completion
// goes through an authenticated API call (booking.SandboxComplete) into the
// same code path a real webhook uses, so the whole flow is exercised with no
// merchant account.
type Sandbox struct {
	webBaseURL string
}

func NewSandbox(webBaseURL string) *Sandbox { return &Sandbox{webBaseURL: webBaseURL} }

func (s *Sandbox) Name() string { return ProviderSandbox }

func (s *Sandbox) CreateCheckout(_ context.Context, req CheckoutRequest) (*Checkout, error) {
	return &Checkout{RedirectURL: s.webBaseURL + "/pembayaran/sandbox?order=" + url.QueryEscape(req.OrderID)}, nil
}

// ParseWebhook always fails: the sandbox has no inbound webhook, so nobody
// can mark a payment paid by posting to /webhooks/payments/sandbox.
func (s *Sandbox) ParseWebhook([]byte, http.Header) (*WebhookEvent, error) {
	return nil, errors.New("sandbox has no webhook")
}
