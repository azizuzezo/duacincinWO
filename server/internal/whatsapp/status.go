package whatsapp

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"

	"duacincin/server/internal/httpx"
)

// adminStatusDTO is the WhatsApp card on the admin dashboard.
type adminStatusDTO struct {
	// Official: "connected", "disconnected", "unknown" (engine unreachable)
	// or "not_configured" (WA_RELAY_URL empty).
	Official        string `json:"official"`
	OfficialTail    string `json:"official_tail"`
	ManageURL       string `json:"manage_url"`
	ClientsVerified int    `json:"clients_verified"`
	ClientsMissing  int    `json:"clients_missing"`
	VendorsVerified int    `json:"vendors_verified"`
	VendorsMissing  int    `json:"vendors_missing"`
}

// AdminStatus: GET /whatsapp/admin/status
func AdminStatus(d *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cov, err := d.Links.Coverage(r.Context())
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := adminStatusDTO{
			ManageURL:       d.waAdminURL(),
			ClientsVerified: cov.ClientsVerified, ClientsMissing: cov.ClientsMissing,
			VendorsVerified: cov.VendorsVerified, VendorsMissing: cov.VendorsMissing,
		}
		out.Official, out.OfficialTail = d.officialStatus(r.Context())
		httpx.JSON(w, http.StatusOK, out)
	}
}

// officialStatus asks the invitation product (which owns the official
// number's session) whether that number is linked.
func (d *Deps) officialStatus(ctx context.Context) (string, string) {
	if d.Cfg.WARelayURL == "" {
		return "not_configured", ""
	}
	u, err := url.Parse(d.Cfg.WARelayURL)
	if err != nil {
		return "unknown", ""
	}
	q := u.Query()
	q.Set("action", "relay_status")
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return "unknown", ""
	}
	req.Header.Set("X-Bot-Secret", d.Cfg.WhatsAppBotSecret)
	resp, err := relayClient.Do(req)
	if err != nil {
		return "unknown", ""
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 8*1024))
	var body struct {
		Linked    bool   `json:"linked"`
		PhoneTail string `json:"phone_tail"`
	}
	if resp.StatusCode != http.StatusOK || json.Unmarshal(raw, &body) != nil {
		return "unknown", ""
	}
	if body.Linked {
		return "connected", body.PhoneTail
	}
	return "disconnected", body.PhoneTail
}

// waAdminURL is the invitation admin panel where the official number is
// (re)linked: WA_ADMIN_URL, else the relay's origin + /admin.
func (d *Deps) waAdminURL() string {
	if d.Cfg.WAAdminURL != "" {
		return d.Cfg.WAAdminURL
	}
	if u, err := url.Parse(d.Cfg.WARelayURL); err == nil && u.Host != "" {
		return u.Scheme + "://" + u.Host + "/admin"
	}
	return strings.TrimRight(d.Cfg.InvitationBaseURL, "/") + "/admin"
}
