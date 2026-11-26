package articles

import (
	"regexp"
	"strings"
)

const (
	MinSlug = 3
	MaxSlug = 80
)

var SlugRe = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// DeriveSlug makes a URL slug from a title: lowercase ascii letters and
// digits joined by single hyphens, at most MaxSlug long. Anything else is
// treated as a separator. A title with nothing usable gives "artikel".
func DeriveSlug(title string) string {
	var b strings.Builder
	pendingDash := false
	for _, r := range strings.ToLower(title) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			if pendingDash && b.Len() > 0 {
				b.WriteByte('-')
			}
			pendingDash = false
			b.WriteRune(r)
		} else {
			pendingDash = true
		}
	}
	s := b.String()
	if len(s) > MaxSlug {
		s = strings.TrimRight(s[:MaxSlug], "-")
	}
	if len(s) < MinSlug {
		return "artikel"
	}
	return s
}

// SlugWithSuffix appends -n while keeping the result within MaxSlug.
func SlugWithSuffix(base string, n int) string {
	if n <= 1 {
		return base
	}
	suffix := "-" + itoa(n)
	if len(base)+len(suffix) > MaxSlug {
		base = strings.TrimRight(base[:MaxSlug-len(suffix)], "-")
	}
	return base + suffix
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var d []byte
	for n > 0 {
		d = append([]byte{byte('0' + n%10)}, d...)
		n /= 10
	}
	return string(d)
}
