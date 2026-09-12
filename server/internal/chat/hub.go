package chat

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
)

// Hub fans out chat events (new message, read receipt) to every connection
// currently open on a conversation. In-memory and single-process: if the
// API is ever scaled to multiple instances, broadcasting across them needs
// Postgres LISTEN/NOTIFY or a Redis pub/sub layer in front of this, which is
// out of scope for now.
type Hub struct {
	mu    sync.Mutex
	conns map[string]map[*websocket.Conn]bool
}

func NewHub() *Hub {
	return &Hub{conns: make(map[string]map[*websocket.Conn]bool)}
}

func (h *Hub) Register(conversationID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.conns[conversationID] == nil {
		h.conns[conversationID] = make(map[*websocket.Conn]bool)
	}
	h.conns[conversationID][conn] = true
}

func (h *Hub) Unregister(conversationID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.conns[conversationID], conn)
	if len(h.conns[conversationID]) == 0 {
		delete(h.conns, conversationID)
	}
}

// Broadcast sends event as JSON to every connection open on conversationID.
// A connection that fails to write is dropped and closed; the client's own
// reconnect/fallback logic (see ChatThread.tsx) handles recovery.
func (h *Hub) Broadcast(conversationID string, event any) {
	payload, err := json.Marshal(event)
	if err != nil {
		return
	}

	h.mu.Lock()
	targets := make([]*websocket.Conn, 0, len(h.conns[conversationID]))
	for conn := range h.conns[conversationID] {
		targets = append(targets, conn)
	}
	h.mu.Unlock()

	for _, conn := range targets {
		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			h.Unregister(conversationID, conn)
			_ = conn.Close()
		}
	}
}
