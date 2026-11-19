package aiassist

import "github.com/go-chi/chi/v5"

// Mount registers Kirana's public routes. No auth required: it is for
// visitors without an account (identified by a device cookie, session.go);
// a logged-in visitor's history follows their account. Limits live in Chat.
func Mount(r chi.Router, deps *Deps) {
	r.Get("/ai/status", Status(deps))
	r.Post("/ai/chat", Chat(deps))
	r.Get("/ai/history", History(deps))
	r.Delete("/ai/history", ClearHistory(deps))
}
