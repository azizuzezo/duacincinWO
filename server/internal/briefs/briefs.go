// Package briefs holds the "brief" a couple sends to vendors: one structured
// description of what they need (Kirana fills it in from the conversation,
// the couple confirms it) and the message vendors read. The text is always
// built here from the fields, never taken from the client, so every vendor
// gets the same tidy message and the chat contact filter has nothing to catch.
package briefs

import (
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"
)

// CategoryLabels maps the vendor_category enum to the name shown to people.
var CategoryLabels = map[string]string{
	"venue":               "Venue",
	"catering":            "Catering",
	"decor":               "Dekorasi",
	"mua_attire":          "MUA & Attire",
	"photo_video":         "Foto & Video",
	"entertainment":       "Entertainment",
	"invitation_souvenir": "Undangan & Souvenir",
	"hantaran":            "Hantaran & Seserahan",
	"mc":                  "MC",
	"content_creator":     "Wedding Content Creator",
	"wedding_car":         "Mobil Pengantin",
	"wedding_cake":        "Kue Pengantin",
}

const (
	// MaxVendors is how many vendors one brief may go to.
	MaxVendors = 5
	// MaxPerDay is how many briefs one client may send per day.
	MaxPerDay = 10

	maxShort = 80
	maxNotes = 500
)

// Brief is what the couple needs from one kind of vendor.
type Brief struct {
	Category  string `json:"category"`
	City      string `json:"city"`
	EventDate string `json:"event_date"`
	Guests    int    `json:"guests"`
	Style     string `json:"style"`
	BudgetMax int64  `json:"budget_max"`
	Notes     string `json:"notes"`
}

// Normalize trims the free text, drops impossible numbers and checks the
// category. It returns an error fit to show the user.
func (b *Brief) Normalize() error {
	if _, ok := CategoryLabels[b.Category]; !ok {
		return errors.New("kategori vendor tidak valid")
	}
	b.City = clip(b.City, maxShort)
	b.EventDate = clip(b.EventDate, maxShort)
	b.Style = clip(b.Style, maxShort)
	b.Notes = clip(b.Notes, maxNotes)
	if b.Guests < 0 || b.Guests > 100000 {
		b.Guests = 0
	}
	if b.BudgetMax < 0 {
		b.BudgetMax = 0
	}
	return nil
}

// FreeText is every field the person typed freely, for the contact filter.
func (b Brief) FreeText() string {
	return strings.Join([]string{b.City, b.EventDate, b.Style, b.Notes}, "\n")
}

// Message is the text a vendor receives as the first chat message.
func (b Brief) Message() string {
	label := CategoryLabels[b.Category]
	var s strings.Builder
	fmt.Fprintf(&s, "Halo, saya sedang mencari %s untuk pernikahan kami lewat DuaCincin. Ini kebutuhan kami:\n", label)
	line := func(k, v string) {
		if v != "" {
			fmt.Fprintf(&s, "\n- %s: %s", k, v)
		}
	}
	line("Kota", b.City)
	line("Tanggal acara", b.EventDate)
	if b.Guests > 0 {
		line("Jumlah tamu", fmt.Sprint(b.Guests))
	}
	line("Gaya atau adat", b.Style)
	if b.BudgetMax > 0 {
		line("Budget "+label, "sampai "+Rupiah(b.BudgetMax))
	}
	line("Catatan", b.Notes)
	s.WriteString("\n\nBoleh dibantu info ketersediaan di tanggal tersebut, paket yang cocok, dan harganya? Terima kasih.")
	return s.String()
}

// Rupiah formats n as "Rp1.500.000".
func Rupiah(n int64) string {
	s := fmt.Sprint(n)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte('.')
		}
		b.WriteRune(c)
	}
	return "Rp" + b.String()
}

func clip(s string, max int) string {
	s = strings.Join(strings.Fields(s), " ")
	if utf8.RuneCountInString(s) > max {
		r := []rune(s)
		s = strings.TrimSpace(string(r[:max]))
	}
	return s
}
