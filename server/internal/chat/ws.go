package chat

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
)

// MountWS registers the websocket upgrade route on its own — it must NOT
// sit behind the request-timeout middleware the REST routes use (Mount, in
// routes.go), since that would tear down the connection a few seconds in.
// Call this in a separate, timeout-free chi.Router group.
//
// This registers the route directly (not via r.Route("/conversations", ...))
// because chi.Router.Route mounts a sub-router at that prefix, and Mount
// panics if the prefix is already mounted elsewhere in the tree — which
// routes.go's Mount (the REST routes) already does for "/conversations".
func MountWS(r chi.Router, deps *Deps, cfg *config.Config) {
	r.With(auth.RequireAuth(cfg)).Get("/conversations/{id}/ws", ServeWS(deps))
}

// upgrader restricts the handshake to the same front-end origin the REST
// API's CORS policy already allows (see httpserver/router.go) — the default
// zero-value Upgrader accepts any origin, which we don't want here.
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == "" || origin == "http://localhost:3000"
	},
}

// ServeWS upgrades an authenticated, authorized participant's connection so
// they receive message.new / read.updated events for one conversation in
// real time. Clients don't send anything over this socket in this scope —
// sending messages and marking read both stay REST endpoints (SendMessage,
// MarkRead) so they get the same validation/response handling either way.
func ServeWS(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		conv, err := deps.Chat.GetByID(r.Context(), chi.URLParam(r, "id"))
		if err != nil || !canAccess(claims, conv) {
			http.Error(w, "percakapan tidak ditemukan", http.StatusNotFound)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		deps.Hub.Register(conv.ID, conn)
		defer func() {
			deps.Hub.Unregister(conv.ID, conn)
			_ = conn.Close()
		}()

		// Read pump: this connection only needs to detect the client going
		// away (close/error) — it never sends data we act on.
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}
}
