package payment

import (
	"crypto/sha512"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"testing"
)

func midtransBody(orderID, status, gross, txStatus, fraud, key string) []byte {
	return []byte(fmt.Sprintf(`{"order_id":%q,"status_code":%q,"gross_amount":%q,"signature_key":%q,"transaction_status":%q,"fraud_status":%q}`,
		orderID, status, gross, key, txStatus, fraud))
}

func sign(orderID, status, gross, serverKey string) string {
	sum := sha512.Sum512([]byte(orderID + status + gross + serverKey))
	return hex.EncodeToString(sum[:])
}

func TestMidtransWebhook(t *testing.T) {
	m := NewMidtrans("SB-key", false)
	good := sign("o1", "200", "150000.00", "SB-key")

	ev, err := m.ParseWebhook(midtransBody("o1", "200", "150000.00", "settlement", "", good), nil)
	if err != nil || !ev.Paid || ev.Amount != 150000 || ev.OrderID != "o1" {
		t.Fatalf("settlement: %+v %v", ev, err)
	}
	if ev, _ := m.ParseWebhook(midtransBody("o1", "200", "150000.00", "capture", "challenge", good), nil); ev.Paid {
		t.Fatal("challenged capture must not count as paid")
	}
	if ev, _ := m.ParseWebhook(midtransBody("o1", "200", "150000.00", "pending", "", good), nil); ev.Paid {
		t.Fatal("pending must not count as paid")
	}
	if _, err := m.ParseWebhook(midtransBody("o1", "200", "150000.00", "settlement", "", "forged"), nil); !errors.Is(err, ErrInvalidSignature) {
		t.Fatalf("forged signature: %v", err)
	}
}

func TestSelection(t *testing.T) {
	cases := []struct{ name, key, want string }{
		{"", "", ProviderSandbox},
		{"", "k", ProviderMidtrans},
		{"sandbox", "k", ProviderSandbox},
		{"midtrans", "k", ProviderMidtrans},
	}
	for _, c := range cases {
		p, err := New(c.name, c.key, false, "https://web")
		if err != nil || p.Name() != c.want {
			t.Errorf("New(%q,%q) = %v, %v; want %s", c.name, c.key, p, err, c.want)
		}
	}
	if _, err := New("midtrans", "", false, ""); err == nil {
		t.Error("midtrans without key must fail")
	}
	if _, err := New("xendit", "", false, ""); err == nil {
		t.Error("unknown provider must fail")
	}
}

func TestSandboxCheckoutURL(t *testing.T) {
	c, _ := NewSandbox("https://web").CreateCheckout(nil, CheckoutRequest{OrderID: "dc-1 a"})
	if !strings.HasPrefix(c.RedirectURL, "https://web/pembayaran/sandbox?order=dc-1") {
		t.Fatal(c.RedirectURL)
	}
	if _, err := NewSandbox("").ParseWebhook(nil, nil); err == nil {
		t.Fatal("sandbox must reject webhooks")
	}
}
