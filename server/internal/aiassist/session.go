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
	"unicode"

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
		var profile any
		id, err := deps.session(r.Context(), v, false)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "riwayat tidak bisa dimuat")
			return
		}
		if id != "" {
			if vis, err := deps.Chats.Visitor(r.Context(), id); err == nil && vis.Name != "" {
				profile = map[string]any{"name": vis.Name, "age": vis.Age}
			}
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
		httpx.JSON(w, http.StatusOK, map[string]any{"turns": out, "profile": profile})
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

type profileBody struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}

// cleanName keeps a short, plain first name: letters, spaces, apostrophes
// and dots, at most 40 characters, words capitalised ("siti" -> "Siti").
func cleanName(raw string) string {
	var b strings.Builder
	for _, r := range strings.TrimSpace(raw) {
		if unicode.IsLetter(r) || r == ' ' || r == '\'' || r == '.' || r == '-' {
			b.WriteRune(r)
		}
	}
	words := strings.Fields(b.String())
	for i, w := range words {
		rs := []rune(strings.ToLower(w))
		rs[0] = unicode.ToUpper(rs[0])
		words[i] = string(rs)
	}
	name := strings.Join(words, " ")
	if r := []rune(name); len(r) > 40 {
		name = strings.TrimSpace(string(r[:40]))
	}
	return name
}

// SaveProfile stores the name (and optional age) a visitor gave Kirana.
func SaveProfile(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body profileBody
		if err := httpx.DecodeJSON(w, r, &body); err != nil {
			httpx.Error(w, http.StatusBadRequest, "permintaan tidak valid")
			return
		}
		name := cleanName(body.Name)
		if name == "" {
			httpx.Error(w, http.StatusBadRequest, "nama belum diisi")
			return
		}
		if body.Age != 0 && (body.Age < 15 || body.Age > 99) {
			httpx.Error(w, http.StatusBadRequest, "umur harus antara 15 dan 99")
			return
		}
		v := deps.identify(w, r, true)
		id, err := deps.session(r.Context(), v, true)
		if err == nil && id != "" {
			err = deps.Chats.SetVisitor(r.Context(), id, repository.AIVisitor{Name: name, Age: body.Age})
		}
		if err != nil || id == "" {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"name": name, "age": body.Age})
	}
}
