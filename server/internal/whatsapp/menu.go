package whatsapp

import (
	"encoding/json"
	"fmt"
	"strings"
)

// menuKind values for pendingMenu.Kind.
const (
	menuKindCategory     = "category"
	menuKindVendor       = "vendor"
	menuKindConversation = "conversation"
)

type menuOption struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type pendingMenu struct {
	Kind    string       `json:"kind"`
	Options []menuOption `json:"options"`
}

func parsePendingMenu(raw *string) (*pendingMenu, error) {
	if raw == nil {
		return nil, nil
	}
	var m pendingMenu
	if err := json.Unmarshal([]byte(*raw), &m); err != nil {
		return nil, err
	}
	return &m, nil
}

func renderMenu(prompt string, options []menuOption) string {
	var b strings.Builder
	b.WriteString(prompt)
	for i, o := range options {
		fmt.Fprintf(&b, "\n%d. %s", i+1, o.Label)
	}
	b.WriteString("\n\nBalas dengan angka, atau ketik 'menu' kapan saja untuk mulai ulang.")
	return b.String()
}

func looksLikeEmail(s string) bool {
	s = strings.TrimSpace(s)
	return strings.Count(s, "@") == 1 && strings.Contains(s, ".") && !strings.ContainsAny(s, " \t\n")
}

// formatRupiah renders v with thousands separators the way Indonesian
// currency is usually written (e.g. 1500000 -> "1.500.000").
func formatRupiah(v int64) string {
	s := fmt.Sprintf("%d", v)
	n := len(s)
	if n <= 3 {
		return s
	}
	var parts []string
	for n > 3 {
		parts = append([]string{s[n-3:]}, parts...)
		s = s[:n-3]
		n = len(s)
	}
	parts = append([]string{s}, parts...)
	return strings.Join(parts, ".")
}

// categoryOptions mirrors the vendor_category enum / vendors.ValidCategories
// with Indonesian labels for the WhatsApp menu.
func categoryOptions() []menuOption {
	return []menuOption{
		{Label: "Venue", Value: "venue"},
		{Label: "Catering", Value: "catering"},
		{Label: "Dekorasi", Value: "decor"},
		{Label: "MUA & Busana", Value: "mua_attire"},
		{Label: "Foto & Video", Value: "photo_video"},
		{Label: "Hiburan", Value: "entertainment"},
		{Label: "Undangan & Souvenir", Value: "invitation_souvenir"},
	}
}
