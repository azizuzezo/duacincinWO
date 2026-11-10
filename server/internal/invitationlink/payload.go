package invitationlink

import (
	"crypto/rand"
	"encoding/base64"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

// MaxGuests caps how many guests ride in one token (keeps the link a sane size).
const MaxGuests = 1000

type Event struct {
	Date    string `json:"date"`
	Time    string `json:"time"`
	Venue   string `json:"venue"`
	Address string `json:"address"`
	City    string `json:"city"`
}

type Guest struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

// Payload is the signed handoff body (field names are the shared contract).
type Payload struct {
	V          int     `json:"v"`
	WOClientID string  `json:"wo_client_id"`
	Email      string  `json:"email"`
	FullName   string  `json:"full_name"`
	Bride      string  `json:"bride"`
	Groom      string  `json:"groom"`
	Event      Event   `json:"event"`
	Guests     []Guest `json:"guests"`
	Iat        int64   `json:"iat"`
	Exp        int64   `json:"exp"`
	Nonce      string  `json:"nonce"`
}

// Project is what the WO knows about the couple's wedding, read from the
// existing repositories. Identity (ClientID, Email) always comes from the
// server-side session and users table, never from the request body.
type Project struct {
	ClientID  string
	Email     string
	FullName  string
	Bride     string // optional, typed on /client/undangan (WO has no partner names)
	Groom     string
	EventDate *time.Time
	Venue     string
	Guests    []Guest
}

// clean trims, turns control characters into spaces and caps the length in runes.
func clean(s string, max int) string {
	s = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return ' '
		}
		return r
	}, s)
	s = strings.Join(strings.Fields(s), " ")
	if utf8.RuneCountInString(s) > max {
		s = string([]rune(s)[:max])
	}
	return s
}

func digits(s string, max int) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
			if b.Len() >= max {
				break
			}
		}
	}
	return b.String()
}

// NewNonce returns 24 random bytes as base64url (32 chars).
func NewNonce() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// BuildPayload turns a Project into the signed payload. Pure: the clock and
// the nonce are passed in so tests are deterministic.
func BuildPayload(p Project, now time.Time, nonce string) Payload {
	out := Payload{
		V:          1,
		WOClientID: p.ClientID,
		Email:      strings.ToLower(strings.TrimSpace(p.Email)),
		FullName:   clean(p.FullName, 120),
		Bride:      clean(p.Bride, 120),
		Groom:      clean(p.Groom, 120),
		Event:      Event{Venue: clean(p.Venue, 160)},
		Guests:     make([]Guest, 0, min(len(p.Guests), MaxGuests)),
		Iat:        now.Unix(),
		Exp:        now.Add(TokenTTL).Unix(),
		Nonce:      nonce,
	}
	if p.EventDate != nil {
		out.Event.Date = p.EventDate.Format("2006-01-02")
	}
	seen := map[string]bool{}
	for _, g := range p.Guests {
		if len(out.Guests) >= MaxGuests {
			break
		}
		name := clean(g.Name, 100)
		if name == "" {
			continue
		}
		phone := digits(g.Phone, 16)
		key := strings.ToLower(name) + "|" + phone
		if seen[key] {
			continue
		}
		seen[key] = true
		out.Guests = append(out.Guests, Guest{Name: name, Phone: phone})
	}
	return out
}

// HandoffURL is where the couple's browser goes: the token rides in the
// fragment, so it never reaches server logs or Referer headers.
func HandoffURL(baseURL, token string) string {
	return strings.TrimRight(baseURL, "/") + "/wo/masuk#t=" + token
}
