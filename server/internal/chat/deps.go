// Package chat implements in-app messaging between Client<->Vendor and
// Client<->Wedding Consultant (PRD §8.4/§8.11) — deliberately the only
// channel available, since exposing vendor contact info would defeat the
// anti-circumvention model (PRD §1/§8.6).
package chat

import (
	"duacincin/server/internal/repository"
	"duacincin/server/internal/storage"
)

// AttachmentBucket holds images shared in chat (see UploadAttachment).
const AttachmentBucket = "chat-attachments"

type Deps struct {
	Chat          *repository.ChatRepo
	Vendors       *repository.VendorRepo
	Disputes      *repository.DisputeRepo
	Users         *repository.UserRepo
	Hub           *Hub
	Notifications *repository.NotificationRepo
	Storage       *storage.Client
}

func NewDeps(chatRepo *repository.ChatRepo, vendors *repository.VendorRepo, disputes *repository.DisputeRepo, users *repository.UserRepo, hub *Hub, notifications *repository.NotificationRepo, storageClient *storage.Client) *Deps {
	return &Deps{Chat: chatRepo, Vendors: vendors, Disputes: disputes, Users: users, Hub: hub, Notifications: notifications, Storage: storageClient}
}
