package chat

import "regexp"

// contactInfoPatterns flags likely attempts to move a conversation off
// DuaCincin (PRD §8.4) — phone numbers, emails, and external links/handles.
// Deliberately a heuristic: messages are still delivered, just flagged for
// Admin review (§8.6), never blocked outright.
var contactInfoPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?:\+62|62|0)8[0-9]{8,12}`),                                 // ID mobile numbers
	regexp.MustCompile(`[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}`),          // email
	regexp.MustCompile(`(?i)https?://\S+|www\.\S+`),                                 // URLs
	regexp.MustCompile(`(?i)wa\.me|t\.me|bit\.ly|instagram\.com|@[A-Za-z0-9_]{4,}`), // common handles/shorteners
}

// ContainsContactInfo reports whether body looks like it's sharing external
// contact details.
func ContainsContactInfo(body string) bool {
	for _, p := range contactInfoPatterns {
		if p.MatchString(body) {
			return true
		}
	}
	return false
}
