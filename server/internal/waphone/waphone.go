// Package waphone normalises Indonesian WhatsApp numbers to the digits-only
// 628... form used across DuaCincin (accounts, relay, admin views).
package waphone

import "strings"

// Normalize accepts 0812..., 812..., 62812... or +62 812-... (spaces,
// dashes, dots and brackets allowed) and returns 62812... .
func Normalize(raw string) (string, bool) {
	var b strings.Builder
	for i, r := range strings.TrimSpace(raw) {
		switch {
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '+' && i == 0, r == ' ', r == '-', r == '.', r == '(', r == ')':
		default:
			return "", false
		}
	}
	d := b.String()
	switch {
	case strings.HasPrefix(d, "62"):
	case strings.HasPrefix(d, "0"):
		d = "62" + d[1:]
	case strings.HasPrefix(d, "8"):
		d = "62" + d
	default:
		return "", false
	}
	if !strings.HasPrefix(d, "628") || len(d) < 10 || len(d) > 14 {
		return "", false
	}
	return d, true
}

// Display formats 6281234567890 as +62 812-3456-7890 for people to read.
func Display(d string) string {
	if !strings.HasPrefix(d, "62") || len(d) < 10 {
		return d
	}
	rest := d[2:]
	out := "+62 " + rest[:3]
	rest = rest[3:]
	for len(rest) > 4 {
		out += "-" + rest[:4]
		rest = rest[4:]
	}
	if rest != "" {
		out += "-" + rest
	}
	return out
}
