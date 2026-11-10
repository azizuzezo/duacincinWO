// Package googleauth implements "Masuk dengan Google" (POST /auth/google).
// The browser gets a Google ID token from Google Identity Services and sends
// it here; the token is verified server-side before anyone is signed in. The
// Google OAuth client ID is shared with DuaCincin Invitation.
package googleauth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Identity is what a verified Google ID token tells us.
type Identity struct {
	Subject string
	Email   string
	Name    string
}

// Verifier turns a Google credential into a verified identity.
type Verifier interface {
	Verify(ctx context.Context, credential string) (*Identity, error)
}

var ErrInvalidToken = errors.New("google: invalid id token")

const tokenInfoURL = "https://oauth2.googleapis.com/tokeninfo"

// clockSkew tolerates small clock differences between Google and this server.
const clockSkew = 60 * time.Second

var googleIssuers = map[string]bool{"accounts.google.com": true, "https://accounts.google.com": true}

// TokenInfoVerifier verifies ID tokens with Google's tokeninfo endpoint,
// which checks the signature; this type then checks audience, issuer,
// expiry, issue time and the verified email itself.
type TokenInfoVerifier struct {
	ClientID string
	Endpoint string
	HTTP     *http.Client
	Now      func() time.Time
}

func NewTokenInfoVerifier(clientID string) *TokenInfoVerifier {
	return &TokenInfoVerifier{
		ClientID: clientID,
		Endpoint: tokenInfoURL,
		HTTP:     &http.Client{Timeout: 8 * time.Second},
		Now:      time.Now,
	}
}

// tokenInfo fields come back as strings from the tokeninfo endpoint.
type tokenInfo struct {
	Aud           string `json:"aud"`
	Iss           string `json:"iss"`
	Sub           string `json:"sub"`
	Exp           string `json:"exp"`
	Iat           string `json:"iat"`
	Email         string `json:"email"`
	EmailVerified any    `json:"email_verified"`
	Name          string `json:"name"`
}

func (v *TokenInfoVerifier) Verify(ctx context.Context, credential string) (*Identity, error) {
	credential = strings.TrimSpace(credential)
	if v.ClientID == "" || credential == "" || len(credential) > 4096 {
		return nil, ErrInvalidToken
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.Endpoint+"?id_token="+url.QueryEscape(credential), nil)
	if err != nil {
		return nil, err
	}
	res, err := v.HTTP.Do(req)
	if err != nil {
		return nil, fmt.Errorf("google: tokeninfo unreachable: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		// Google answers 400 for a bad, forged or expired token.
		return nil, ErrInvalidToken
	}
	var info tokenInfo
	if err := json.NewDecoder(http.MaxBytesReader(nil, res.Body, 64<<10)).Decode(&info); err != nil {
		return nil, ErrInvalidToken
	}
	return checkClaims(info, v.ClientID, v.Now())
}

// checkClaims is the pure part of verification, shared by tests.
func checkClaims(info tokenInfo, clientID string, now time.Time) (*Identity, error) {
	if clientID == "" || info.Aud != clientID || !googleIssuers[info.Iss] || info.Sub == "" {
		return nil, ErrInvalidToken
	}
	exp, err := strconv.ParseInt(info.Exp, 10, 64)
	if err != nil || now.After(time.Unix(exp, 0).Add(clockSkew)) {
		return nil, ErrInvalidToken
	}
	if info.Iat != "" {
		iat, err := strconv.ParseInt(info.Iat, 10, 64)
		if err != nil || time.Unix(iat, 0).After(now.Add(clockSkew)) {
			return nil, ErrInvalidToken
		}
	}
	verified := false
	switch v := info.EmailVerified.(type) {
	case bool:
		verified = v
	case string:
		verified = v == "true"
	}
	email := strings.ToLower(strings.TrimSpace(info.Email))
	if !verified || email == "" {
		return nil, ErrInvalidToken
	}
	return &Identity{Subject: info.Sub, Email: email, Name: strings.TrimSpace(info.Name)}, nil
}
