package invitationlink

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/ratelimit"
	"duacincin/server/internal/repository"
)

type Deps struct {
	Users    *repository.UserRepo
	Guests   *repository.GuestRepo
	Links    *repository.RSVPLinkRepo
	Bookings *repository.BookingRepo
	Limiter  *ratelimit.Limiter
	Cfg      *config.Config
	HTTP     *http.Client
}

func NewDeps(users *repository.UserRepo, guests *repository.GuestRepo, links *repository.RSVPLinkRepo, bookings *repository.BookingRepo, limiter *ratelimit.Limiter, cfg *config.Config) *Deps {
	return &Deps{
		Users: users, Guests: guests, Links: links, Bookings: bookings, Limiter: limiter, Cfg: cfg,
		HTTP: &http.Client{Timeout: 6 * time.Second},
	}
}

const (
	msgNotReady = "Fitur undangan digital belum aktif. Coba lagi nanti."
	msgFailed   = "Terjadi kesalahan, coba lagi."
	msgTooMany  = "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi."

	handoffLimitPerHour = 30
	statusLimitPer10Min = 120
)

func (d *Deps) ready() bool {
	return d.Cfg != nil && len(d.Cfg.WOLinkSecret) >= MinSecretLen && d.Cfg.InvitationBaseURL != ""
}

func (d *Deps) allow(r *http.Request, w http.ResponseWriter, key, action string, limit int, window time.Duration) bool {
	if d.Limiter == nil {
		return true
	}
	ok, err := d.Limiter.Allow(r.Context(), key, action, limit, window)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, msgFailed)
		return false
	}
	if !ok {
		httpx.Error(w, http.StatusTooManyRequests, msgTooMany)
		return false
	}
	return true
}

// chooseEventDate prefers the date the couple set for RSVP, then the earliest
// upcoming date among their active bookings.
func chooseEventDate(rsvpDate *time.Time, bookings []repository.Booking, today time.Time) *time.Time {
	if rsvpDate != nil {
		return rsvpDate
	}
	var best *time.Time
	day := today.Truncate(24 * time.Hour)
	for i := range bookings {
		b := bookings[i]
		switch b.Status {
		case repository.BookingStatusCancelled, "refunded":
			continue
		}
		if b.EventDate.Before(day) {
			continue
		}
		if best == nil || b.EventDate.Before(*best) {
			d := b.EventDate
			best = &d
		}
	}
	return best
}

// loadProject reads everything from the existing repositories. Identity comes
// from the session (clientID) and the users table only.
func (d *Deps) loadProject(ctx context.Context, clientID string) (*Project, error) {
	user, err := d.Users.GetByID(ctx, clientID)
	if err != nil {
		return nil, err
	}
	p := &Project{ClientID: user.ID, Email: user.Email, FullName: user.FullName}

	var rsvpDate *time.Time
	if link, err := d.Links.GetForClient(ctx, clientID); err == nil {
		rsvpDate = link.EventDate
		p.Venue = link.VenueNote
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	bookings, err := d.Bookings.ListForClient(ctx, clientID)
	if err != nil {
		return nil, err
	}
	p.EventDate = chooseEventDate(rsvpDate, bookings, time.Now())

	guests, err := d.Guests.ListForClient(ctx, clientID)
	if err != nil {
		return nil, err
	}
	for _, g := range guests {
		p.Guests = append(p.Guests, Guest{Name: g.Name, Phone: g.Phone})
	}
	return p, nil
}

type handoffRequest struct {
	Bride string `json:"bride"`
	Groom string `json:"groom"`
}

type handoffResponse struct {
	URL       string `json:"url"`
	ExpiresAt string `json:"expires_at"`
	Guests    int    `json:"guests"`
}

// Handoff builds and signs the couple's project and returns the one-time
// link to DuaCincin Invitation. Calling it again re-sends the guest list
// (the invitation side skips duplicates), so it doubles as "sync guests".
func Handoff(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !deps.ready() {
			httpx.Error(w, http.StatusServiceUnavailable, msgNotReady)
			return
		}
		claims, _ := auth.ClaimsFromContext(r.Context())

		var req handoffRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil && !errors.Is(err, io.EOF) {
			httpx.Error(w, http.StatusBadRequest, "data tidak valid")
			return
		}
		if !deps.allow(r, w, "invitation-handoff:"+claims.UserID, "invitation_handoff", handoffLimitPerHour, time.Hour) {
			return
		}

		project, err := deps.loadProject(r.Context(), claims.UserID)
		if err != nil {
			log.Printf("invitationlink: load project failed: %v", err)
			httpx.Error(w, http.StatusInternalServerError, msgFailed)
			return
		}
		project.Bride, project.Groom = req.Bride, req.Groom

		nonce, err := NewNonce()
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, msgFailed)
			return
		}
		payload := BuildPayload(*project, time.Now(), nonce)
		token, err := SignToken([]byte(deps.Cfg.WOLinkSecret), payload)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, msgFailed)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		httpx.JSON(w, http.StatusOK, handoffResponse{
			URL:       HandoffURL(deps.Cfg.InvitationBaseURL, token),
			ExpiresAt: time.Unix(payload.Exp, 0).UTC().Format(time.RFC3339),
			Guests:    len(payload.Guests),
		})
	}
}

type rsvpCounts struct {
	Hadir int `json:"hadir"`
	Tidak int `json:"tidak"`
	Ragu  int `json:"ragu"`
}

// StatusResponse is what /client/undangan reads.
type StatusResponse struct {
	Linked      bool       `json:"linked"`
	Slug        string     `json:"slug,omitempty"`
	URL         string     `json:"url,omitempty"`
	PackageType string     `json:"package_type,omitempty"`
	Guests      int        `json:"guests"`
	RSVP        rsvpCounts `json:"rsvp"`
	EditorURL   string     `json:"editor_url"`
}

type remoteStatus struct {
	Success     bool       `json:"success"`
	Linked      bool       `json:"linked"`
	Slug        string     `json:"slug"`
	URL         string     `json:"url"`
	PackageType string     `json:"packageType"`
	Guests      int        `json:"guests"`
	RSVP        rsvpCounts `json:"rsvp"`
}

// StatusQuery builds the signed query string for /api/wo-status.
func StatusQuery(secret []byte, clientID, email string, now time.Time) url.Values {
	v := url.Values{}
	v.Set("client", clientID)
	v.Set("email", strings.ToLower(strings.TrimSpace(email)))
	v.Set("ts", strconv.FormatInt(now.Unix(), 10))
	v.Set("sig", SignQuery(secret, v))
	return v
}

// Status asks DuaCincin Invitation (server to server, signed) whether this
// client's project is linked, and returns counts only.
func Status(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !deps.ready() {
			httpx.Error(w, http.StatusServiceUnavailable, msgNotReady)
			return
		}
		claims, _ := auth.ClaimsFromContext(r.Context())
		if !deps.allow(r, w, "invitation-status:"+claims.UserID, "invitation_status", statusLimitPer10Min, 10*time.Minute) {
			return
		}
		user, err := deps.Users.GetByID(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, msgFailed)
			return
		}

		base := strings.TrimRight(deps.Cfg.InvitationBaseURL, "/")
		q := StatusQuery([]byte(deps.Cfg.WOLinkSecret), user.ID, user.Email, time.Now())
		ctx, cancel := context.WithTimeout(r.Context(), 6*time.Second)
		defer cancel()
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/api/wo-status?"+q.Encode(), nil)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, msgFailed)
			return
		}
		req.Header.Set("Accept", "application/json")
		res, err := deps.HTTP.Do(req)
		if err != nil {
			// url.Error would print the signed URL; log only the cause.
			var uerr *url.Error
			if errors.As(err, &uerr) {
				err = uerr.Err
			}
			log.Printf("invitationlink: status request failed: %v", err)
			httpx.Error(w, http.StatusBadGateway, "Status undangan belum bisa dimuat. Coba lagi sebentar lagi.")
			return
		}
		defer res.Body.Close()
		var remote remoteStatus
		if err := json.NewDecoder(io.LimitReader(res.Body, 64<<10)).Decode(&remote); err != nil || res.StatusCode != http.StatusOK || !remote.Success {
			log.Printf("invitationlink: status response %d", res.StatusCode)
			httpx.Error(w, http.StatusBadGateway, "Status undangan belum bisa dimuat. Coba lagi sebentar lagi.")
			return
		}

		out := StatusResponse{Linked: remote.Linked, EditorURL: base + "/dashboard"}
		if remote.Linked {
			out.Slug = remote.Slug
			out.PackageType = remote.PackageType
			out.Guests = remote.Guests
			out.RSVP = remote.RSVP
			// Only links on the invitation site itself are passed on.
			if strings.HasPrefix(remote.URL, base+"/v/") {
				out.URL = remote.URL
			}
		}
		w.Header().Set("Cache-Control", "no-store")
		httpx.JSON(w, http.StatusOK, out)
	}
}

type syncResponse struct {
	GuestsAdded int `json:"guests_added"`
	Guests      int `json:"guests"`
}

type remoteHandoff struct {
	Success     bool   `json:"success"`
	Code        string `json:"code"`
	GuestsAdded int    `json:"guestsAdded"`
}

// SyncGuests re-sends the project (guest list) server to server, using the
// same signed one-time token the browser handoff uses, so the couple does not
// have to open the invitation site. Idempotent: the invitation side skips
// guests it already has (name + phone). Only works once the project is linked.
func SyncGuests(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !deps.ready() {
			httpx.Error(w, http.StatusServiceUnavailable, msgNotReady)
			return
		}
		claims, _ := auth.ClaimsFromContext(r.Context())
		if !deps.allow(r, w, "invitation-handoff:"+claims.UserID, "invitation_handoff", handoffLimitPerHour, time.Hour) {
			return
		}
		project, err := deps.loadProject(r.Context(), claims.UserID)
		if err != nil {
			log.Printf("invitationlink: load project failed: %v", err)
			httpx.Error(w, http.StatusInternalServerError, msgFailed)
			return
		}
		nonce, err := NewNonce()
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, msgFailed)
			return
		}
		payload := BuildPayload(*project, time.Now(), nonce)
		token, err := SignToken([]byte(deps.Cfg.WOLinkSecret), payload)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, msgFailed)
			return
		}
		body, _ := json.Marshal(map[string]string{"token": token})

		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()
		base := strings.TrimRight(deps.Cfg.InvitationBaseURL, "/")
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/api/wo-handoff", strings.NewReader(string(body)))
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, msgFailed)
			return
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		res, err := deps.HTTP.Do(req)
		if err != nil {
			var uerr *url.Error
			if errors.As(err, &uerr) {
				err = uerr.Err
			}
			log.Printf("invitationlink: sync request failed: %v", err)
			httpx.Error(w, http.StatusBadGateway, "Daftar tamu belum bisa dikirim. Coba lagi sebentar lagi.")
			return
		}
		defer res.Body.Close()
		var remote remoteHandoff
		_ = json.NewDecoder(io.LimitReader(res.Body, 64<<10)).Decode(&remote)
		switch {
		case remote.Success:
			httpx.JSON(w, http.StatusOK, syncResponse{GuestsAdded: remote.GuestsAdded, Guests: len(payload.Guests)})
		case remote.Code == "account_exists":
			httpx.Error(w, http.StatusConflict, "Undangan belum terhubung. Tekan \"Buat undangan digital\" dulu.")
		default:
			log.Printf("invitationlink: sync response %d %s", res.StatusCode, remote.Code)
			httpx.Error(w, http.StatusBadGateway, "Daftar tamu belum bisa dikirim. Coba lagi sebentar lagi.")
		}
	}
}
