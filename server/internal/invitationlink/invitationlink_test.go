package invitationlink

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"duacincin/server/internal/repository"
)

var testSecret = []byte("0123456789abcdef0123456789abcdef-test-only")

func samplePayload(now time.Time) Payload {
	date := time.Date(2027, 5, 9, 0, 0, 0, 0, time.UTC)
	return BuildPayload(Project{
		ClientID:  "7d3f2c1a-0000-4000-8000-000000000001",
		Email:     "  Sari.Andi@Example.com ",
		FullName:  "Sari Lestari",
		Bride:     "Sari\tLestari",
		Groom:     "Andi Pratama",
		EventDate: &date,
		Venue:     "Gedung Sasana Kriya",
		Guests: []Guest{
			{Name: "Budi", Phone: "+62 812-1111"},
			{Name: "  budi ", Phone: "62812 1111"}, // duplicate after cleaning
			{Name: "", Phone: "0813"},              // no name: skipped
			{Name: "Citra", Phone: ""},
		},
	}, now, "nonce_abcdefghijklmnop")
}

func TestBuildPayload(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	p := samplePayload(now)
	if p.V != 1 || p.Email != "sari.andi@example.com" || p.Bride != "Sari Lestari" {
		t.Fatalf("unexpected identity fields: %+v", p)
	}
	if p.Event.Date != "2027-05-09" || p.Event.Venue != "Gedung Sasana Kriya" {
		t.Fatalf("event = %+v", p.Event)
	}
	if p.Exp-p.Iat != int64(TokenTTL/time.Second) || p.Iat != now.Unix() {
		t.Fatalf("iat/exp = %d/%d", p.Iat, p.Exp)
	}
	want := []Guest{{Name: "Budi", Phone: "628121111"}, {Name: "Citra", Phone: ""}}
	if fmt.Sprint(p.Guests) != fmt.Sprint(want) {
		t.Fatalf("guests = %+v, want %+v", p.Guests, want)
	}
}

func TestBuildPayloadLimits(t *testing.T) {
	var guests []Guest
	for i := 0; i < MaxGuests+50; i++ {
		guests = append(guests, Guest{Name: fmt.Sprintf("Tamu %d", i)})
	}
	p := BuildPayload(Project{ClientID: "c", Email: "a@b.id", FullName: strings.Repeat("é", 300), Guests: guests}, time.Now(), "n")
	if len(p.Guests) != MaxGuests {
		t.Fatalf("guests = %d, want %d", len(p.Guests), MaxGuests)
	}
	if n := len([]rune(p.FullName)); n != 120 {
		t.Fatalf("full_name runes = %d", n)
	}
	empty := BuildPayload(Project{ClientID: "c", Email: "a@b.id"}, time.Now(), "n")
	raw, _ := json.Marshal(empty)
	if !strings.Contains(string(raw), `"guests":[]`) {
		t.Fatalf("guests must be [] not null: %s", raw)
	}
}

func TestSignVerifyRoundTrip(t *testing.T) {
	now := time.Now()
	tok, err := SignToken(testSecret, samplePayload(now))
	if err != nil {
		t.Fatal(err)
	}
	p, err := VerifyToken(testSecret, tok, now)
	if err != nil {
		t.Fatal(err)
	}
	if p.Groom != "Andi Pratama" || len(p.Guests) != 2 {
		t.Fatalf("payload = %+v", p)
	}
}

func TestVerifyRejects(t *testing.T) {
	now := time.Now()
	tok, _ := SignToken(testSecret, samplePayload(now))
	body, sig, _ := strings.Cut(tok, ".")

	forged := samplePayload(now)
	forged.Email = "victim@example.com"
	raw, _ := json.Marshal(forged)
	forgedBody := base64.RawURLEncoding.EncodeToString(raw)

	other, _ := SignToken([]byte(strings.Repeat("x", 40)), samplePayload(now))

	cases := []struct {
		name  string
		token string
		at    time.Time
		want  error
	}{
		{"tampered payload", forgedBody + "." + sig, now, ErrBadSignature},
		{"other secret", other, now, ErrBadSignature},
		{"truncated sig", body + "." + sig[:len(sig)-4], now, ErrBadSignature},
		{"no dot", body, now, ErrMalformed},
		{"two dots", body + "." + sig + ".x", now, ErrMalformed},
		{"expired", tok, now.Add(TokenTTL + time.Minute), ErrExpired},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if _, err := VerifyToken(testSecret, c.token, c.at); !errors.Is(err, c.want) {
				t.Fatalf("err = %v, want %v", err, c.want)
			}
		})
	}
	if _, err := SignToken([]byte("short"), samplePayload(now)); !errors.Is(err, ErrBadSecret) {
		t.Fatalf("short secret accepted: %v", err)
	}
}

func TestStatusQuery(t *testing.T) {
	v := StatusQuery(testSecret, "abc-1", " A+B c@X.id", time.Unix(1_700_000_000, 0))
	if v.Get("email") != "a+b c@x.id" || v.Get("ts") != "1700000000" {
		t.Fatalf("query = %v", v)
	}
	// The signature covers the canonical Encode() of everything but sig.
	c := url.Values{"client": {"abc-1"}, "email": {"a+b c@x.id"}, "ts": {"1700000000"}}
	if c.Encode() != "client=abc-1&email=a%2Bb+c%40x.id&ts=1700000000" {
		t.Fatalf("canonical = %s", c.Encode())
	}
	if v.Get("sig") != SignQuery(testSecret, c) {
		t.Fatal("sig mismatch")
	}
	c.Set("client", "abc-2")
	if v.Get("sig") == SignQuery(testSecret, c) {
		t.Fatal("sig must change with the client id")
	}
}

func TestHandoffURL(t *testing.T) {
	if got := HandoffURL("https://invitation.duacincin.id/", "abc.def"); got != "https://invitation.duacincin.id/wo/masuk#t=abc.def" {
		t.Fatal(got)
	}
}

func TestChooseEventDate(t *testing.T) {
	today := time.Date(2026, 11, 11, 15, 0, 0, 0, time.UTC)
	d := func(m, day int) time.Time { return time.Date(2027, time.Month(m), day, 0, 0, 0, 0, time.UTC) }
	bookings := []repository.Booking{
		{EventDate: d(6, 1), Status: repository.BookingStatusConfirmed},
		{EventDate: d(5, 9), Status: repository.BookingStatusCancelled},
		{EventDate: d(5, 20), Status: repository.BookingStatusDPPaid},
		{EventDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC), Status: repository.BookingStatusCompleted},
	}
	if got := chooseEventDate(nil, bookings, today); got == nil || !got.Equal(d(5, 20)) {
		t.Fatalf("got %v", got)
	}
	rsvp := d(7, 7)
	if got := chooseEventDate(&rsvp, bookings, today); !got.Equal(rsvp) {
		t.Fatalf("rsvp date must win, got %v", got)
	}
	if got := chooseEventDate(nil, nil, today); got != nil {
		t.Fatalf("got %v", got)
	}
}

// Cross-language contract (driven by scripts/wo-contract-check.sh in the
// invitation-link scratch tooling): with WO_CONTRACT_SECRET and WO_CONTRACT_OUT
// set, writes a Go-signed token + status query for the JavaScript verifier;
// with WO_CONTRACT_JS_TOKEN set, verifies a JavaScript-signed token here.
func TestContractVector(t *testing.T) {
	secret := os.Getenv("WO_CONTRACT_SECRET")
	if secret == "" {
		t.Skip("set WO_CONTRACT_SECRET to run the cross-language contract check")
	}
	now := time.Now()
	if out := os.Getenv("WO_CONTRACT_OUT"); out != "" {
		p := samplePayload(now)
		tok, err := SignToken([]byte(secret), p)
		if err != nil {
			t.Fatal(err)
		}
		q := StatusQuery([]byte(secret), p.WOClientID, p.Email, now)
		raw, _ := json.Marshal(map[string]any{"token": tok, "query": q.Encode(), "payload": p})
		if err := os.WriteFile(out, raw, 0o600); err != nil {
			t.Fatal(err)
		}
	}
	if js := os.Getenv("WO_CONTRACT_JS_TOKEN"); js != "" {
		p, err := VerifyToken([]byte(secret), js, now)
		if err != nil {
			t.Fatalf("Go could not verify the JavaScript token: %v", err)
		}
		if p.Email != "js@example.com" || p.Bride != "Ayu" {
			t.Fatalf("payload = %+v", p)
		}
		bad := js[:len(js)-3] + "AAA"
		if _, err := VerifyToken([]byte(secret), bad, now); err == nil {
			t.Fatal("tampered JavaScript token accepted")
		}
	}
}
