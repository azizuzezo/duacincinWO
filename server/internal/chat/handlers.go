package chat

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/security"
)

type conversationDTO struct {
	ID                 string  `json:"id"`
	Type               string  `json:"type"`
	ClientID           string  `json:"client_id"`
	VendorID           *string `json:"vendor_id,omitempty"`
	VendorBusinessName *string `json:"vendor_business_name,omitempty"`
	ClientName         *string `json:"client_name,omitempty"`
	// ClosedAt/ClosedBy are present only while the session is closed.
	ClosedAt *string `json:"closed_at,omitempty"`
	ClosedBy *string `json:"closed_by,omitempty"`
}

const timeLayout = "2006-01-02T15:04:05Z07:00"

func formatTime(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format(timeLayout)
	return &s
}

func toConversationDTO(c *repository.Conversation) conversationDTO {
	dto := conversationDTO{ID: c.ID, Type: c.Type, ClientID: c.ClientID, VendorID: c.VendorID}
	if c.Closed() {
		dto.ClosedAt = formatTime(c.ClosedAt)
		dto.ClosedBy = c.ClosedBy
	}
	return dto
}

// enrichConversationDTO adds display names so the UI never has to show a
// bare "Chat dengan Vendor" placeholder. vendor_business_name identifies
// the vendor side of a vendor_chat, client_name identifies who a Vendor or
// Wedding Consultant/Admin is talking to. Best-effort: a lookup failure
// just leaves the field empty rather than failing the whole response.
func enrichConversationDTO(deps *Deps, ctx context.Context, c *repository.Conversation) conversationDTO {
	dto := toConversationDTO(c)
	if c.VendorID != nil {
		if profile, err := deps.Vendors.GetByUserID(ctx, *c.VendorID); err == nil {
			dto.VendorBusinessName = &profile.BusinessName
		}
	}
	if user, err := deps.Users.GetByID(ctx, c.ClientID); err == nil {
		dto.ClientName = &user.FullName
	}
	return dto
}

type replyPreviewDTO struct {
	ID       string `json:"id"`
	SenderID string `json:"sender_id"`
	Body     string `json:"body"`
}

type messageDTO struct {
	ID             string           `json:"id"`
	SenderID       string           `json:"sender_id"`
	Body           string           `json:"body"`
	Flagged        bool             `json:"flagged"`
	ReplyTo        *replyPreviewDTO `json:"reply_to,omitempty"`
	AttachmentURL  *string          `json:"attachment_url,omitempty"`
	AttachmentType *string          `json:"attachment_type,omitempty"`
	CreatedAt      string           `json:"created_at"`
	// Status is what the sender's ticks show: "sent" (stored), "delivered"
	// (the other side's app fetched it) or "read" (they opened the thread).
	Status      string  `json:"status"`
	DeliveredAt *string `json:"delivered_at,omitempty"`
	ReadAt      *string `json:"read_at,omitempty"`
}

const (
	StatusSent      = "sent"
	StatusDelivered = "delivered"
	StatusRead      = "read"
)

// messageStatus derives the tick state; read implies delivered.
func messageStatus(m *repository.Message) string {
	switch {
	case m.ReadAt != nil:
		return StatusRead
	case m.DeliveredAt != nil:
		return StatusDelivered
	default:
		return StatusSent
	}
}

func toMessageDTO(m *repository.Message) messageDTO {
	return messageDTO{
		ID: m.ID, SenderID: m.SenderID, Body: m.Body, Flagged: m.Flagged,
		AttachmentURL: m.AttachmentURL, AttachmentType: m.AttachmentType,
		CreatedAt: m.CreatedAt.Format(timeLayout),
		Status:    messageStatus(m), DeliveredAt: formatTime(m.DeliveredAt), ReadAt: formatTime(m.ReadAt),
	}
}

// toMessageDTOWithReply is toMessageDTO plus a best-effort reply preview —
// a lookup failure (deleted message, etc.) just omits reply_to rather than
// failing the whole response.
func toMessageDTOWithReply(deps *Deps, ctx context.Context, m *repository.Message) messageDTO {
	dto := toMessageDTO(m)
	if m.ReplyToMessageID != nil {
		if original, err := deps.Chat.GetMessageByID(ctx, *m.ReplyToMessageID); err == nil {
			dto.ReplyTo = &replyPreviewDTO{ID: original.ID, SenderID: original.SenderID, Body: original.Body}
		}
	}
	return dto
}

// StartVendorChat gets-or-creates the (client, vendor) conversation. Only
// Clients may initiate — Vendors reply, they don't cold-start (PRD §8.4).
func StartVendorChat(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		vendorID := chi.URLParam(r, "vendorID")

		profile, err := deps.Vendors.GetByUserID(r.Context(), vendorID)
		if err != nil || profile.Status != "approved" {
			httpx.Error(w, http.StatusNotFound, "vendor tidak ditemukan")
			return
		}

		conv, err := deps.Chat.GetOrCreateVendorChat(r.Context(), claims.UserID, vendorID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, enrichConversationDTO(deps, r.Context(), conv))
	}
}

// StartConsultation gets-or-creates the Client's single consultation
// conversation with the Wedding Consultant team (PRD §8.11).
func StartConsultation(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		conv, err := deps.Chat.GetOrCreateConsultation(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, enrichConversationDTO(deps, r.Context(), conv))
	}
}

// ListConversations returns the authenticated user's conversations, scoped
// by role: Client sees their own (both types), Vendor sees their vendor_chat
// threads, Admin/Wedding Consultant see every consultation (shared inbox).
func ListConversations(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())

		var (
			convs []repository.Conversation
			err   error
		)
		switch claims.Role {
		case auth.RoleClient:
			convs, err = deps.Chat.ListForClient(r.Context(), claims.UserID)
		case auth.RoleVendor:
			convs, err = deps.Chat.ListForVendor(r.Context(), claims.UserID)
		case auth.RoleAdmin, auth.RoleWeddingConsultant:
			convs, err = deps.Chat.ListConsultations(r.Context())
		}
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		// The inbox loading in the viewer's app means their incoming
		// messages reached them: second grey tick for the senders.
		markDelivered(deps, r.Context(), claims, nil)

		out := make([]conversationDTO, 0, len(convs))
		for _, c := range convs {
			out = append(out, enrichConversationDTO(deps, r.Context(), &c))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

// canAccess reports whether claims identifies a participant of conv, or a
// staff member for a consultation thread (shared inbox model).
func canAccess(claims *security.SessionClaims, conv *repository.Conversation) bool {
	if conv.Type == ConsultationType && (claims.Role == auth.RoleAdmin || claims.Role == auth.RoleWeddingConsultant) {
		return true
	}
	if claims.UserID == conv.ClientID {
		return true
	}
	if conv.VendorID != nil && claims.UserID == *conv.VendorID {
		return true
	}
	return false
}

const ConsultationType = repository.ConversationTypeConsultation

func isStaff(claims *security.SessionClaims) bool {
	return claims.Role == auth.RoleAdmin || claims.Role == auth.RoleWeddingConsultant
}

// markDelivered records that the viewer's app fetched their incoming
// messages (one conversation, or the whole inbox when conversationID is nil)
// and tells open threads over the hub. Best-effort: a failure here must
// never block loading the inbox or the thread.
func markDelivered(deps *Deps, ctx context.Context, claims *security.SessionClaims, conversationID *string) {
	changes, err := deps.Chat.MarkDelivered(ctx, claims.UserID, isStaff(claims), conversationID)
	if err != nil {
		log.Printf("chat: mark delivered: %v", err)
		return
	}
	broadcastReceipts(deps, StatusDelivered, changes)
}

// receiptsEvent is the hub event for status changes, grouped per
// conversation so each open thread only hears about its own messages.
func receiptsEvents(status string, changes []repository.ReceiptChange) map[string]map[string]any {
	byConv := make(map[string][]string)
	for _, c := range changes {
		byConv[c.ConversationID] = append(byConv[c.ConversationID], c.MessageID)
	}
	events := make(map[string]map[string]any, len(byConv))
	for convID, ids := range byConv {
		events[convID] = map[string]any{"type": "receipts.updated", "status": status, "message_ids": ids}
	}
	return events
}

func broadcastReceipts(deps *Deps, status string, changes []repository.ReceiptChange) {
	for convID, event := range receiptsEvents(status, changes) {
		deps.Hub.Broadcast(convID, event)
	}
}

// GetConversation returns one conversation (names + session state). The
// thread polls it so a close/reopen by the other side shows up without a
// websocket.
func GetConversation(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		conv, err := deps.Chat.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || !canAccess(claims, conv) {
			httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
			return
		}
		httpx.JSON(w, http.StatusOK, enrichConversationDTO(deps, r.Context(), conv))
	}
}

func ListMessages(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		conv, err := deps.Chat.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || !canAccess(claims, conv) {
			httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
			return
		}

		// Fetching the thread delivers everything addressed to the viewer.
		markDelivered(deps, r.Context(), claims, &conv.ID)

		messages, err := deps.Chat.ListMessages(r.Context(), conv.ID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		out := make([]messageDTO, 0, len(messages))
		for _, m := range messages {
			out = append(out, toMessageDTOWithReply(deps, r.Context(), &m))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

type sendMessageRequest struct {
	Body             string  `json:"body"`
	ReplyToMessageID *string `json:"reply_to_message_id,omitempty"`
	AttachmentURL    *string `json:"attachment_url,omitempty"`
	AttachmentType   *string `json:"attachment_type,omitempty"`
}

func SendMessage(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		conv, err := deps.Chat.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || !canAccess(claims, conv) {
			httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
			return
		}

		if conv.Closed() {
			httpx.Error(w, http.StatusConflict, msgSessionClosed)
			return
		}

		var req sendMessageRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}
		req.Body = strings.TrimSpace(req.Body)
		if req.Body == "" && req.AttachmentURL == nil {
			httpx.Error(w, http.StatusBadRequest, "pesan tidak boleh kosong")
			return
		}
		if req.ReplyToMessageID != nil {
			original, err := deps.Chat.GetMessageByID(r.Context(), *req.ReplyToMessageID)
			if err != nil || original.ConversationID != conv.ID {
				httpx.Error(w, http.StatusBadRequest, "pesan yang dibalas tidak ditemukan")
				return
			}
		}

		flagged := ContainsContactInfo(req.Body)
		message, err := deps.Chat.CreateMessage(r.Context(), conv.ID, claims.UserID, req.Body, flagged, req.ReplyToMessageID, req.AttachmentURL, req.AttachmentType)
		if errors.Is(err, repository.ErrConversationClosed) {
			httpx.Error(w, http.StatusConflict, msgSessionClosed)
			return
		}
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		// Auto-open a dispute for Admin review (PRD §8.4/§8.6) — only for
		// vendor_chat, since the sanction ladder in §11.1 applies to Vendors;
		// consultation threads have no vendor to flag.
		if flagged && conv.VendorID != nil {
			_ = deps.Disputes.Create(r.Context(), *conv.VendorID, &message.ID, "Pesan chat terdeteksi berisi kontak eksternal")
		}

		dto := toMessageDTOWithReply(deps, r.Context(), message)
		deps.Hub.Broadcast(conv.ID, map[string]any{"type": "message.new", "message": dto})
		notifyOtherParticipant(deps, r.Context(), conv, claims.UserID, req.Body)
		if deps.Notifier != nil {
			deps.Notifier.NotifyNewMessage(r.Context(), conv, claims.UserID, message)
		}

		httpx.JSON(w, http.StatusCreated, dto)
	}
}

// notifyOtherParticipant creates a persisted notification for the vendor_chat
// counterpart of senderID. Consultation threads are a shared staff inbox
// (no single recipient), so those aren't notified this way.
func notifyOtherParticipant(deps *Deps, ctx context.Context, conv *repository.Conversation, senderID, body string) {
	if conv.Type != repository.ConversationTypeVendorChat || conv.VendorID == nil {
		return
	}
	recipientID := conv.ClientID
	if senderID == conv.ClientID {
		recipientID = *conv.VendorID
	}

	preview := body
	if len(preview) > 80 {
		preview = preview[:80] + "…"
	}
	link := "/vendor/messages/" + conv.ID
	if recipientID == conv.ClientID {
		link = "/client/messages/" + conv.ID
	}
	if err := deps.Notifications.Create(ctx, recipientID, "chat.message", "Pesan baru", preview, &link); err != nil {
		log.Printf("notification: %v", err)
	}
}

type markReadRequest struct {
	LastReadMessageID string `json:"last_read_message_id"`
}

// MarkRead records how far the caller has read into a conversation and
// notifies the other participant(s) over the websocket hub so their UI can
// show a read receipt.
func MarkRead(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		conv, err := deps.Chat.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || !canAccess(claims, conv) {
			httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
			return
		}

		var req markReadRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}

		if _, err := uuid.Parse(req.LastReadMessageID); err != nil {
			httpx.Error(w, http.StatusBadRequest, "pesan tidak ditemukan")
			return
		}

		if err := deps.Chat.MarkRead(r.Context(), conv.ID, claims.UserID, req.LastReadMessageID); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		// Per-message status for the sender's blue ticks.
		changes, err := deps.Chat.MarkReadUpTo(r.Context(), conv.ID, claims.UserID, req.LastReadMessageID)
		if err != nil {
			log.Printf("chat: mark read: %v", err)
		}
		broadcastReceipts(deps, StatusRead, changes)

		deps.Hub.Broadcast(conv.ID, map[string]any{
			"type":                 "read.updated",
			"user_id":              claims.UserID,
			"last_read_message_id": req.LastReadMessageID,
		})

		httpx.JSON(w, http.StatusOK, map[string]string{"message": "ditandai sudah dibaca"})
	}
}

// msgSessionClosed is shown to whoever tries to write into a closed session.
const msgSessionClosed = "Sesi chat ini sudah ditutup. Buka kembali sesi untuk melanjutkan obrolan."

// MarkDeliveredNow is called by an open thread that received a message over
// the websocket while the tab was in the background: the message reached
// the app (two grey ticks) but nobody has seen it yet (not blue).
func MarkDeliveredNow(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		conv, err := deps.Chat.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || !canAccess(claims, conv) {
			httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
			return
		}
		markDelivered(deps, r.Context(), claims, &conv.ID)
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "diterima"})
	}
}

// CloseSession ends the chat session. Rule: any participant (the couple,
// the vendor, or anyone on the consultant team for a consultation) may close
// it, and any participant may reopen it. Closing is a pause, never a lock:
// neither side can shut the other out for good, which matters while escrow
// and bookings still depend on this channel. History always stays visible.
func CloseSession(deps *Deps) http.HandlerFunc {
	return setSession(deps, true)
}

// ReopenSession lets messages flow again (same participant rule as close).
func ReopenSession(deps *Deps) http.HandlerFunc {
	return setSession(deps, false)
}

func setSession(deps *Deps, closing bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		conv, err := deps.Chat.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || !canAccess(claims, conv) {
			httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
			return
		}

		var updated *repository.Conversation
		if closing {
			updated, err = deps.Chat.Close(r.Context(), conv.ID, claims.UserID)
		} else {
			updated, err = deps.Chat.Reopen(r.Context(), conv.ID)
		}
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		dto := enrichConversationDTO(deps, r.Context(), updated)
		deps.Hub.Broadcast(conv.ID, map[string]any{"type": "conversation.updated", "conversation": dto})
		httpx.JSON(w, http.StatusOK, dto)
	}
}
