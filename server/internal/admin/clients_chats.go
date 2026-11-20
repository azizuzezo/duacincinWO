package admin

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/waphone"
)

// Admin read-only views: registered clients, and client-vendor chats.
// Opening a chat is recorded in the audit log (chat.view, at most once per
// admin per chat per day) so reading private conversations stays traceable.

const (
	pageSize         = 30
	auditChatView    = "chat.view"
	chatViewLogEvery = 24 * time.Hour
	timeFmt          = time.RFC3339
)

func pageOffset(r *http.Request) (int, int) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	return page, (page - 1) * pageSize
}

func queryParam(r *http.Request) string {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len([]rune(q)) > 80 {
		q = string([]rune(q)[:80])
	}
	return q
}

func uuidParam(r *http.Request, name string) string {
	v := strings.TrimSpace(r.URL.Query().Get(name))
	if len(v) != 36 {
		return ""
	}
	return v
}

type clientRowDTO struct {
	ID             string `json:"id"`
	FullName       string `json:"full_name"`
	Email          string `json:"email"`
	AccountStatus  string `json:"account_status"`
	CreatedAt      string `json:"created_at"`
	WhatsApp       string `json:"whatsapp"`
	WhatsAppStatus string `json:"whatsapp_status"` // verified | pending | none
	Conversations  int    `json:"conversations"`
	Bookings       int    `json:"bookings"`
}

// listClients: GET /admin/clients?q=&page=
func listClients(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		page, offset := pageOffset(r)
		rows, total, err := deps.Users.AdminListClients(r.Context(), queryParam(r), pageSize, offset)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		items := make([]clientRowDTO, 0, len(rows))
		for _, c := range rows {
			dto := clientRowDTO{
				ID: c.ID, FullName: c.FullName, Email: c.Email, AccountStatus: c.AccountStatus,
				CreatedAt: c.CreatedAt.Format(timeFmt), Conversations: c.Conversations, Bookings: c.Bookings,
				WhatsAppStatus: "none",
			}
			switch {
			case c.WAPhone != nil:
				dto.WhatsApp, dto.WhatsAppStatus = waphone.Display(*c.WAPhone), "verified"
			case c.WAPending != nil:
				dto.WhatsApp, dto.WhatsAppStatus = waphone.Display(*c.WAPending), "pending"
			}
			items = append(items, dto)
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"items": items, "total": total, "page": page, "page_size": pageSize})
	}
}

type chatRowDTO struct {
	ID          string  `json:"id"`
	ClientID    string  `json:"client_id"`
	ClientName  string  `json:"client_name"`
	ClientEmail string  `json:"client_email"`
	VendorID    string  `json:"vendor_id"`
	VendorName  string  `json:"vendor_name"`
	CreatedAt   string  `json:"created_at"`
	ClosedAt    *string `json:"closed_at,omitempty"`
	Messages    int     `json:"messages"`
	Flagged     int     `json:"flagged"`
	LastBody    string  `json:"last_body"`
	LastType    string  `json:"last_type,omitempty"`
	LastAt      *string `json:"last_at,omitempty"`
	LastFrom    string  `json:"last_from,omitempty"` // client | vendor
}

func fmtPtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format(timeFmt)
	return &s
}

// listChats: GET /admin/chats?q=&client_id=&vendor_id=&page=
func listChats(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		page, offset := pageOffset(r)
		rows, total, err := deps.Chat.AdminListVendorChats(r.Context(), queryParam(r), uuidParam(r, "client_id"), uuidParam(r, "vendor_id"), pageSize, offset)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		items := make([]chatRowDTO, 0, len(rows))
		for _, c := range rows {
			dto := chatRowDTO{
				ID: c.ID, ClientID: c.ClientID, ClientName: c.ClientName, ClientEmail: c.ClientEmail,
				VendorID: c.VendorID, VendorName: c.VendorName, CreatedAt: c.CreatedAt.Format(timeFmt),
				ClosedAt: fmtPtr(c.ClosedAt), Messages: c.Messages, Flagged: c.Flagged, LastAt: fmtPtr(c.LastAt),
			}
			if c.LastBody != nil {
				dto.LastBody = *c.LastBody
			}
			if c.LastType != nil {
				dto.LastType = *c.LastType
			}
			if c.LastSender != nil {
				dto.LastFrom = "client"
				if *c.LastSender == c.VendorID {
					dto.LastFrom = "vendor"
				}
			}
			items = append(items, dto)
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"items": items, "total": total, "page": page, "page_size": pageSize})
	}
}

type chatMessageDTO struct {
	ID             string  `json:"id"`
	From           string  `json:"from"` // client | vendor | other
	Body           string  `json:"body"`
	Flagged        bool    `json:"flagged"`
	AttachmentURL  *string `json:"attachment_url,omitempty"`
	AttachmentType *string `json:"attachment_type,omitempty"`
	ReplyToBody    *string `json:"reply_to_body,omitempty"`
	CreatedAt      string  `json:"created_at"`
	ReadAt         *string `json:"read_at,omitempty"`
}

// chatDetail: GET /admin/chats/{id}. Read-only: it marks nothing as
// delivered or read, so the two sides' ticks are untouched.
func chatDetail(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		conv, err := deps.Chat.GetByID(ctx, chi.URLParam(r, "id"))
		if err != nil || conv.Type != repository.ConversationTypeVendorChat || conv.VendorID == nil {
			httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
			return
		}
		msgs, err := deps.Chat.ListMessages(ctx, conv.ID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		clientName, clientEmail, vendorName := "", "", ""
		if u, err := deps.Users.GetByID(ctx, conv.ClientID); err == nil {
			clientName, clientEmail = u.FullName, u.Email
		}
		if p, err := deps.Vendors.GetByUserID(ctx, *conv.VendorID); err == nil {
			vendorName = p.BusinessName
		} else if u, err := deps.Users.GetByID(ctx, *conv.VendorID); err == nil {
			vendorName = u.FullName
		}

		byID := make(map[string]string, len(msgs))
		for _, m := range msgs {
			byID[m.ID] = m.Body
		}
		out := make([]chatMessageDTO, 0, len(msgs))
		for _, m := range msgs {
			from := "other"
			switch m.SenderID {
			case conv.ClientID:
				from = "client"
			case *conv.VendorID:
				from = "vendor"
			}
			dto := chatMessageDTO{
				ID: m.ID, From: from, Body: m.Body, Flagged: m.Flagged,
				AttachmentURL: m.AttachmentURL, AttachmentType: m.AttachmentType,
				CreatedAt: m.CreatedAt.Format(timeFmt), ReadAt: fmtPtr(m.ReadAt),
			}
			if m.ReplyToMessageID != nil {
				if b, ok := byID[*m.ReplyToMessageID]; ok {
					dto.ReplyToBody = &b
				}
			}
			out = append(out, dto)
		}

		if claims, ok := auth.ClaimsFromContext(ctx); ok {
			if seen, err := deps.AuditLog.LoggedSince(ctx, claims.UserID, auditChatView, conv.ID, chatViewLogEvery); err == nil && !seen {
				logAction(deps, r, auditChatView, "conversation", conv.ID, map[string]any{"client_name": clientName, "vendor_name": vendorName})
			}
		}

		httpx.JSON(w, http.StatusOK, map[string]any{
			"conversation": map[string]any{
				"id": conv.ID, "created_at": conv.CreatedAt.Format(timeFmt), "closed_at": fmtPtr(conv.ClosedAt),
				"client": map[string]string{"id": conv.ClientID, "name": clientName, "email": clientEmail},
				"vendor": map[string]string{"id": *conv.VendorID, "name": vendorName},
			},
			"messages": out,
		})
	}
}
