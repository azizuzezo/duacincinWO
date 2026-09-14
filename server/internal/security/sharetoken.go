package security

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

// ShareTokenBytes gives ~32 chars of URL-safe base64, 192 bits of entropy,
// unguessable enough to be the sole protection on a capability URL (a
// wedding's public RSVP link), stored as a plain indexed lookup key rather
// than hashed like a password/OTP: it isn't compared against user input,
// it's the request's own identifier.
const ShareTokenBytes = 24

// GenerateShareToken returns a random URL-safe token for capability links
// (e.g. /rsvp/{token}) that don't require a login.
func GenerateShareToken() (string, error) {
	buf := make([]byte, ShareTokenBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate share token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
