package whatsapp

import (
	"net/http"

	"duacincin/server/internal/httpx"
)

type inboundRequest struct {
	JID   string `json:"jid"`
	Phone string `json:"phone"`
	Text  string `json:"text"`
}

type inboundResponse struct {
	Reply string `json:"reply"`
}

// Inbound is the webhook the WhatsApp engine calls for every text that
// reaches the official number. WhatsApp is notification only for
// DuaCincin WO: chats happen on the web (each notification links there),
// so nothing sent to the number is stored or answered. The engine sends
// no reply when Reply is empty.
func Inbound(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req inboundRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, inboundResponse{})
	}
}
