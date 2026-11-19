package aiassist

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/security"
)

// Who is chatting: a device id kept in an HttpOnly cookie (only its hash is
// stored), plus the logged-in user when there is a valid session cookie.
// History is never looked up by IP (shared by strangers on one network).

const (
	deviceCookie  = "dc_kirana"
	deviceTTL     = 180 * 24 * time.Hour
	historyForUI  = 40
	historyForLLM = maxHistory
)

type visitor struct {
	deviceHash string // "" when the browser sent no device cookie
	userID     string // "" when not logged in
}

func hashDevice(raw string) string {
	sum := sha256.Sum256([]byte("kirana:" + raw))
	return hex.EncodeToString(sum[:])
}

// identify reads the visitor; with create=true it also issues a device
// cookie to a browser that has none (call before writing the body).
func (d *Deps) identify(w http.ResponseWriter, r *http.Request, create bool) visitor {
	var v visitor
	if c, err := r.Cookie(auth.SessionCookieName); err == nil {
		if claims, err := security.ParseSessionToken(d.Cfg.JWTSecret, c.Value); err == nil {
			v.userID = claims.UserID
		}
	}
	if c, err := r.Cookie(deviceCookie); err == nil && len(c.Value) >= 32 && len(c.Value) <= 64 {
		v.deviceHash = hashDevice(c.Value)
	} else if create {
		buf := make([]byte, 32)
		_, _ = rand.Read(buf)
		raw := base64.RawURLEncoding.EncodeToString(buf)
		http.SetCookie(w, &http.Cookie{
			Name:     deviceCookie,
			Value:    raw,
			Path:     "/api/v1/ai",
			HttpOnly: true,
			Secure:   d.Cfg.AppEnv == "production",
			SameSite: http.SameSiteLaxMode,
			MaxAge:   int(deviceTTL.Seconds()),
		})
		v.deviceHash = hashDevice(raw)
	}
	return v
}

// session finds the visitor's conversation; with create=true it makes one.
func (d *Deps) session(ctx context.Context, v visitor, create bool) (string, error) {
	var (
		id  string
		err error
	)
	switch {
	case v.userID != "":
		id, err = d.Chats.SessionForUser(ctx, v.userID, v.deviceHash)
	case v.deviceHash != "":
		id, err = d.Chats.SessionForDevice(ctx, v.deviceHash)
	}
	if err != nil || id != "" || !create {
		return id, err
	}
	if v.userID != "" {
		return d.Chats.CreateSession(ctx, "", v.userID)
	}
	if v.deviceHash == "" {
		return "", nil
	}
	return d.Chats.CreateSession(ctx, v.deviceHash, "")
}

// uiTurn is the history shape the landing renders (web useAsk.ts Turn).
type uiTurn struct {
	ID    string          `json:"id"`
	Role  string          `json:"role"`
	Text  string          `json:"text,omitempty"`
	Parts json.RawMessage `json:"parts,omitempty"`
	Steps json.RawMessage `json:"steps,omitempty"`
	State string          `json:"state,omitempty"`
	Error string          `json:"error,omitempty"`
}

// History returns the visitor's conversation (empty for a new visitor).
func History(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "private, no-store")
		v := deps.identify(w, r, false)
		out := []uiTurn{}
		id, err := deps.session(r.Context(), v, false)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "riwayat tidak bisa dimuat")
			return
		}
		if id != "" {
			turns, err := deps.Chats.RecentTurns(r.Context(), id, historyForUI)
			if err != nil {
				httpx.Error(w, http.StatusInternalServerError, "riwayat tidak bisa dimuat")
				return
			}
			for _, t := range turns {
				u := uiTurn{ID: "h" + itoa(t.ID), Role: t.Role}
				if t.Role == "user" {
					u.Text = t.Content
				} else {
					u.Parts, u.Steps, u.State, u.Error = nonNullJSON(t.Parts, "[]"), nonNullJSON(t.Steps, "[]"), t.State, t.Error
				}
				out = append(out, u)
			}
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"turns": out})
	}
}

// ClearHistory empties the visitor's conversation ("Mulai baru").
func ClearHistory(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		v := deps.identify(w, r, false)
		id, err := deps.session(r.Context(), v, false)
		if err == nil && id != "" {
			err = deps.Chats.ClearTurns(r.Context(), id)
		}
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "riwayat tidak bisa dihapus")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

// modelHistory turns stored turns into chat messages for the model.
// Failed replies are left out; consecutive user turns stay (the model copes).
func modelHistory(turns []repository.AIChatTurn) []chatMessage {
	out := make([]chatMessage, 0, len(turns))
	for _, t := range turns {
		if t.State == "error" || strings.TrimSpace(t.Content) == "" {
			continue
		}
		out = append(out, chatMessage{Role: t.Role, Content: t.Content})
	}
	return out
}

func nonNullJSON(b json.RawMessage, fallback string) json.RawMessage {
	if len(b) == 0 || string(b) == "null" {
		return json.RawMessage(fallback)
	}
	return b
}

func itoa(n int64) string {
	b, _ := json.Marshal(n)
	return string(b)
}
