package chat

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/security"
)

type conversationDTO struct {
	ID       string  `json:"id"`
	Type     string  `json:"type"`
	ClientID string  `json:"client_id"`
	VendorID *string `json:"vendor_id,omitempty"`
}

func toConversationDTO(c *repository.Conversation) conversationDTO {
	return conversationDTO{ID: c.ID, Type: c.Type, ClientID: c.ClientID, VendorID: c.VendorID}
}

type messageDTO struct {
	ID        string `json:"id"`
	SenderID  string `json:"sender_id"`
	Body      string `json:"body"`
	Flagged   bool   `json:"flagged"`
	CreatedAt string `json:"created_at"`
}

func toMessageDTO(m *repository.Message) messageDTO {
	return messageDTO{ID: m.ID, SenderID: m.SenderID, Body: m.Body, Flagged: m.Flagged, CreatedAt: m.CreatedAt.Format("2006-01-02T15:04:05Z07:00")}
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
		httpx.JSON(w, http.StatusOK, toConversationDTO(conv))
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
		httpx.JSON(w, http.StatusOK, toConversationDTO(conv))
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

		out := make([]conversationDTO, 0, len(convs))
		for _, c := range convs {
			out = append(out, toConversationDTO(&c))
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

func ListMessages(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		conv, err := deps.Chat.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || !canAccess(claims, conv) {
			httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
			return
		}

		messages, err := deps.Chat.ListMessages(r.Context(), conv.ID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		out := make([]messageDTO, 0, len(messages))
		for _, m := range messages {
			out = append(out, toMessageDTO(&m))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

type sendMessageRequest struct {
	Body string `json:"body"`
}

func SendMessage(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		conv, err := deps.Chat.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || !canAccess(claims, conv) {
			httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
			return
		}

		var req sendMessageRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		req.Body = strings.TrimSpace(req.Body)
		if req.Body == "" {
			httpx.Error(w, http.StatusBadRequest, "pesan tidak boleh kosong")
			return
		}

		flagged := ContainsContactInfo(req.Body)
		message, err := deps.Chat.CreateMessage(r.Context(), conv.ID, claims.UserID, req.Body, flagged)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusCreated, toMessageDTO(message))
	}
}
