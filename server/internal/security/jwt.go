package security

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// SessionTTL is how long an issued session token stays valid.
// Not specified numerically in the PRD — chosen as a reasonable MVP default.
const SessionTTL = 7 * 24 * time.Hour

// ResetTicketTTL is how long a password-reset ticket (issued after OTP
// verification) stays valid before it must be exchanged for a new password.
const ResetTicketTTL = 10 * time.Minute

var ErrInvalidToken = errors.New("invalid or expired token")

// SessionClaims identifies an authenticated user in the session cookie.
type SessionClaims struct {
	UserID string `json:"uid"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// ResetClaims identifies a user allowed to set a new password, scoped to
// the OTP verification that produced it.
type ResetClaims struct {
	UserID string `json:"uid"`
	Scope  string `json:"scope"`
	jwt.RegisteredClaims
}

const resetScope = "password_reset"

func IssueSessionToken(secret, userID, role string) (string, error) {
	claims := SessionClaims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(SessionTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func ParseSessionToken(secret, tokenString string) (*SessionClaims, error) {
	claims := &SessionClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

func IssuePasswordResetTicket(secret, userID string) (string, error) {
	claims := ResetClaims{
		UserID: userID,
		Scope:  resetScope,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ResetTicketTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func ParsePasswordResetTicket(secret, tokenString string) (*ResetClaims, error) {
	claims := &ResetClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid || claims.Scope != resetScope {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
