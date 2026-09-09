// Package payment wraps the Midtrans Snap API for escrow-style DP/pelunasan
// payments (PRD §8.5/§8.11): Client pays into DuaCincin's own Midtrans
// account (not split directly to the Vendor) — disbursement to the Vendor,
// minus commission, is a separate Admin-triggered step (internal/booking).
//
// When MIDTRANS_SERVER_KEY is not set, Configured() is false and callers
// fall back to a dev-simulation endpoint instead of calling Midtrans — the
// same pattern used for Resend (PRD §8.2) so the whole booking lifecycle
// can be built and tested before a real merchant account exists.
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
	"time"
)

type Client struct {
	serverKey    string
	isProduction bool
	httpClient   *http.Client
}

func NewClient(serverKey string, isProduction bool) *Client {
	return &Client{
		serverKey:    serverKey,
		isProduction: isProduction,
		httpClient:   &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c.serverKey != ""
}

func (c *Client) baseURL() string {
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
}

type snapResponse struct {
	Token       string `json:"token"`
	RedirectURL string `json:"redirect_url"`
}

// CreateTransaction opens a Snap checkout session and returns the hosted
// payment page URL the frontend should redirect the Client to.
func (c *Client) CreateTransaction(ctx context.Context, orderID string, amount int64, customerName, customerEmail string) (redirectURL string, err error) {
	if !c.Configured() {
		return "", fmt.Errorf("midtrans is not configured")
	}

	var body snapRequest
	body.TransactionDetails.OrderID = orderID
	body.TransactionDetails.GrossAmount = amount
	body.CustomerDetails.FirstName = customerName
	body.CustomerDetails.Email = customerEmail

	payload, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL()+"/snap/v1/transactions", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(c.serverKey+":")))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("call midtrans: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("midtrans responded with status %d", resp.StatusCode)
	}

	var out snapResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	return out.RedirectURL, nil
}

// VerifySignature checks a Midtrans notification's signature_key field:
// SHA512(order_id + status_code + gross_amount + server_key).
func VerifySignature(orderID, statusCode, grossAmount, serverKey, signatureKey string) bool {
	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + serverKey))
	return hex.EncodeToString(sum[:]) == signatureKey
}
