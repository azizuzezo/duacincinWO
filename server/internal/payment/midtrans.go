package payment

import (
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// Midtrans adapts the Midtrans Snap API to Provider.
type Midtrans struct {
	serverKey    string
	isProduction bool
	httpClient   *http.Client
}

func NewMidtrans(serverKey string, isProduction bool) *Midtrans {
	return &Midtrans{
		serverKey:    serverKey,
		isProduction: isProduction,
		httpClient:   &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *Midtrans) Name() string { return ProviderMidtrans }

func (c *Midtrans) baseURL() string {
	if c.isProduction {
		return "https://app.midtrans.com"
	}
	return "https://app.sandbox.midtrans.com"
}

type snapRequest struct {
	TransactionDetails struct {
		OrderID     string `json:"order_id"`
		GrossAmount int64  `json:"gross_amount"`
	} `json:"transaction_details"`
	CustomerDetails struct {
		FirstName string `json:"first_name"`
		Email     string `json:"email"`
	} `json:"customer_details"`
	Callbacks struct {
		Finish string `json:"finish,omitempty"`
	} `json:"callbacks"`
}

type snapResponse struct {
	Token       string `json:"token"`
	RedirectURL string `json:"redirect_url"`
}

// CreateCheckout opens a Snap session and returns the hosted payment page.
func (c *Midtrans) CreateCheckout(ctx context.Context, r CheckoutRequest) (*Checkout, error) {
	var body snapRequest
	body.TransactionDetails.OrderID = r.OrderID
	body.TransactionDetails.GrossAmount = r.Amount
	body.CustomerDetails.FirstName = r.CustomerName
	body.CustomerDetails.Email = r.CustomerEmail
	body.Callbacks.Finish = r.ReturnURL

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL()+"/snap/v1/transactions", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(c.serverKey+":")))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call midtrans: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("midtrans responded with status %d", resp.StatusCode)
	}

	var out snapResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &Checkout{RedirectURL: out.RedirectURL}, nil
}

type midtransNotification struct {
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status"`
}

// ParseWebhook verifies the notification signature and normalises it.
func (c *Midtrans) ParseWebhook(body []byte, _ http.Header) (*WebhookEvent, error) {
	var n midtransNotification
	if err := json.Unmarshal(body, &n); err != nil {
		return nil, fmt.Errorf("decode midtrans notification: %w", err)
	}
	if !VerifySignature(n.OrderID, n.StatusCode, n.GrossAmount, c.serverKey, n.SignatureKey) {
		return nil, ErrInvalidSignature
	}
	// gross_amount arrives as "150000.00".
	amount, _ := strconv.ParseFloat(n.GrossAmount, 64)
	paid := n.TransactionStatus == "settlement" || (n.TransactionStatus == "capture" && n.FraudStatus == "accept")
	return &WebhookEvent{OrderID: n.OrderID, Amount: int64(amount), Paid: paid}, nil
}

// VerifySignature checks a Midtrans notification's signature_key field:
// SHA512(order_id + status_code + gross_amount + server_key).
func VerifySignature(orderID, statusCode, grossAmount, serverKey, signatureKey string) bool {
	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + serverKey))
	return hex.EncodeToString(sum[:]) == signatureKey
}
