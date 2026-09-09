package security

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"math/big"
)

// OTPLength is the number of digits in a one-time password (PRD §8.2).
const OTPLength = 6

// GenerateOTP returns a random numeric code, e.g. "042317".
func GenerateOTP() (string, error) {
	max := big.NewInt(1000000) // 10^6
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("generate otp: %w", err)
	}
	return fmt.Sprintf("%0*d", OTPLength, n.Int64()), nil
}

// HashOTP produces a deterministic HMAC-SHA256 of the code so the raw
// code is never stored at rest.
func HashOTP(secret, code string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(code))
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifyOTP compares code against the stored hash in constant time.
func VerifyOTP(secret, code, hash string) bool {
	want, err := hex.DecodeString(hash)
	if err != nil {
		return false
	}
	got, err := hex.DecodeString(HashOTP(secret, code))
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare(got, want) == 1
}
