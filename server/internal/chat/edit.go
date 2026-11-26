package chat

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

const (
	editWindow    = 15 * time.Minute
	retractWindow = 24 * time.Hour

	msgEditExpired    = "Pesan hanya bisa diedit 15 menit setelah dikirim."
	msgRetractExpired = "Pesan hanya bisa ditarik 24 jam setelah dikirim."
	msgNotSender      = "Hanya pengirim yang bisa mengubah pesan ini."
	msgRetracted      = "Pesan ini sudah ditarik."
	msgNoText         = "Pesan tanpa teks tidak bisa diedit."
)

// withinWindow reports whether a message created at createdAt can still be
// changed at now.
func withinWindow(createdAt, now time.Time, window time.Duration) bool {
	return now.Sub(createdAt) <= window
}

type editMessageRequest struct {
	Body string `json:"body"`
}

// ownMessage loads the conversation and message for an edit or retract and
// checks the caller is a participant and the sender. It writes the error
// response itself and returns ok=false in that case.
func ownMessage(deps *Deps, w http.ResponseWriter, r *http.Request) (*repository.Conversation, *repository.Message, string, bool) {
	claims, _ := auth.ClaimsFromContext(r.Context())
	conv, err := deps.Chat.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil || !canAccess(claims, conv) {
		httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
		return nil, nil, "", false
	}
	msg, err := deps.Chat.GetMessageByID(r.Context(), chi.URLParam(r, "mid"))
	if err != nil || msg.ConversationID != conv.ID {
		httpx.Error(w, http.StatusNotFound, "pesan tidak ditemukan")
		return nil, nil, "", false
	}
	if msg.SenderID != claims.UserID {
		httpx.Error(w, http.StatusForbidden, msgNotSender)
		return nil, nil, "", false
	}
	return conv, msg, claims.UserID, true
}

// EditMessage: PATCH /conversations/{id}/messages/{mid}. Sender only, text
// messages only, within 15 minutes, in an open conversation. The new text
// goes through the same contact-info check as SendMessage.
func EditMessage(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conv, msg, userID, ok := ownMessage(deps, w, r)
		if !ok {
			return
		}
		if msg.Retracted() {
			httpx.Error(w, http.StatusConflict, msgRetracted)
			return
		}
		if conv.Closed() {
			httpx.Error(w, http.StatusConflict, msgSessionClosed)
			return
		}
		if msg.Body == "" {
			httpx.Error(w, http.StatusBadRequest, msgNoText)
			return
		}
		var req editMessageRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}
		req.Body = strings.TrimSpace(req.Body)
		if req.Body == "" {
			httpx.Error(w, http.StatusBadRequest, "pesan tidak boleh kosong")
			return
		}
		now := time.Now()
		if !withinWindow(msg.CreatedAt, now, editWindow) {
			httpx.Error(w, http.StatusForbidden, msgEditExpired)
			return
		}

		flagged := conv.Type != repository.ConversationTypeAdminVendor && ContainsContactInfo(req.Body)
		updated, err := deps.Chat.UpdateMessageBody(r.Context(), msg.ID, userID, req.Body, flagged, now.Add(-editWindow))
		if errors.Is(err, repository.ErrNotFound) {
			// Retracted or expired between the check and the update.
			httpx.Error(w, http.StatusConflict, msgRetracted)
			return
		}
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if flagged && !msg.Flagged && conv.Type == repository.ConversationTypeVendorChat && conv.VendorID != nil {
			_ = deps.Disputes.Create(r.Context(), *conv.VendorID, &updated.ID, "Pesan chat terdeteksi berisi kontak eksternal")
		}

		dto := toMessageDTOWithReply(deps, r.Context(), updated)
		deps.Hub.Broadcast(conv.ID, map[string]any{"type": "message.updated", "message": dto})
		httpx.JSON(w, http.StatusOK, dto)
	}
}

// RetractMessage: DELETE /conversations/{id}/messages/{mid}. Sender only,
// within 24 hours, in an open conversation. The body stays in the database
// for moderation but is never returned. Retracting twice is a no-op.
func RetractMessage(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conv, msg, userID, ok := ownMessage(deps, w, r)
		if !ok {
			return
		}
		if msg.Retracted() {
			httpx.JSON(w, http.StatusOK, toMessageDTOWithReply(deps, r.Context(), msg))
			return
		}
		if conv.Closed() {
			httpx.Error(w, http.StatusConflict, msgSessionClosed)
			return
		}
		if !withinWindow(msg.CreatedAt, time.Now(), retractWindow) {
			httpx.Error(w, http.StatusForbidden, msgRetractExpired)
			return
		}
		updated, err := deps.Chat.RetractMessage(r.Context(), msg.ID, userID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		dto := toMessageDTOWithReply(deps, r.Context(), updated)
		deps.Hub.Broadcast(conv.ID, map[string]any{"type": "message.updated", "message": dto})
		httpx.JSON(w, http.StatusOK, dto)
	}
}
