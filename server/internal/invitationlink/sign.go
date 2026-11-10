// Package invitationlink connects a Client's WO wedding project to DuaCincin
// Invitation (invitation.duacincin.id), so the couple gets a digital
// invitation prefilled from WO without retyping.
//
// Contract, shared with the invitation app (api/_lib/wo-link.js there):
//
//	handoff token = base64url(JSON payload) + "." + base64url(HMAC-SHA256(secret, <base64url payload>))
//	                payload {v:1, wo_client_id, email, full_name, bride, groom,
//	                         event:{date,time,venue,address,city}, guests:[{name,phone}],
//	                         iat, exp (iat+10 min), nonce}
//	                opened as INVITATION_BASE_URL + "/wo/masuk#t=<token>"
//	status query  = GET INVITATION_BASE_URL/api/wo-status?client=&email=&ts=&sig=
//	                sig = base64url(HMAC-SHA256(secret, url.Values{client,email,ts}.Encode()))
//
// The secret (WO_LINK_SECRET) is server-only and never logged or sent to the browser.
package invitationlink

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/url"
	"strings"
	"time"
)

// MinSecretLen is the shortest WO_LINK_SECRET accepted (both apps refuse shorter ones).
const MinSecretLen = 32

// TokenTTL is how long a handoff link stays valid.
const TokenTTL = 10 * time.Minute

var b64 = base64.RawURLEncoding

var (
	ErrBadSecret    = errors.New("invitationlink: secret too short")
	ErrMalformed    = errors.New("invitationlink: malformed token")
	ErrBadSignature = errors.New("invitationlink: bad signature")
	ErrExpired      = errors.New("invitationlink: token expired")
)

func mac(secret []byte, msg string) []byte {
	h := hmac.New(sha256.New, secret)
	h.Write([]byte(msg))
	return h.Sum(nil)
}

// SignToken serialises p and signs it.
func SignToken(secret []byte, p Payload) (string, error) {
	if len(secret) < MinSecretLen {
		return "", ErrBadSecret
	}
	raw, err := json.Marshal(p)
	if err != nil {
		return "", err
	}
	body := b64.EncodeToString(raw)
	return body + "." + b64.EncodeToString(mac(secret, body)), nil
}

// VerifyToken checks the signature (constant time) and the time window. The
// invitation app does the same in JavaScript; this copy backs the tests.
func VerifyToken(secret []byte, token string, now time.Time) (*Payload, error) {
	if len(secret) < MinSecretLen {
		return nil, ErrBadSecret
	}
	body, sig, ok := strings.Cut(token, ".")
	if !ok || body == "" || sig == "" || strings.Contains(sig, ".") {
		return nil, ErrMalformed
	}
	got, err := b64.DecodeString(sig)
	if err != nil {
		return nil, ErrMalformed
	}
	if !hmac.Equal(got, mac(secret, body)) {
		return nil, ErrBadSignature
	}
	raw, err := b64.DecodeString(body)
	if err != nil {
		return nil, ErrMalformed
	}
	var p Payload
	if err := json.Unmarshal(raw, &p); err != nil {
		return nil, ErrMalformed
	}
	if p.Exp < now.Unix() {
		return nil, ErrExpired
	}
	return &p, nil
}

// SignQuery returns the base64url HMAC over the canonical form of v (sorted,
// QueryEscape'd, exactly url.Values.Encode()) without any "sig" key.
func SignQuery(secret []byte, v url.Values) string {
	c := url.Values{}
	for k, vals := range v {
		if k != "sig" {
			c[k] = vals
		}
	}
	return b64.EncodeToString(mac(secret, c.Encode()))
}
