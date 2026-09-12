// Package notifications implements a persisted, per-user notification
// center: booking status changes, chat messages, admin decisions, and
// similar events land here so a user sees them even if they weren't online
// when the event happened (the chat websocket/toast in the Foundation pass
// only covers the "currently online" case).
package notifications

import "duacincin/server/internal/repository"

type Deps struct {
	Notifications *repository.NotificationRepo
}

func NewDeps(notifications *repository.NotificationRepo) *Deps {
	return &Deps{Notifications: notifications}
}
