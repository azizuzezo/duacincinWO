package chat

import (
	"sort"
	"testing"
	"time"

	"duacincin/server/internal/repository"
)

func TestMessageStatus(t *testing.T) {
	now := time.Date(2026, 11, 11, 14, 20, 0, 0, time.UTC)
	cases := []struct {
		name string
		m    repository.Message
		want string
	}{
		{"stored only", repository.Message{}, StatusSent},
		{"fetched by the other side", repository.Message{DeliveredAt: &now}, StatusDelivered},
		{"opened by the other side", repository.Message{DeliveredAt: &now, ReadAt: &now}, StatusRead},
		// Read always wins, even if delivery was never recorded on its own.
		{"read without separate delivery", repository.Message{ReadAt: &now}, StatusRead},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := messageStatus(&c.m); got != c.want {
				t.Fatalf("messageStatus() = %q, want %q", got, c.want)
			}
			dto := toMessageDTO(&c.m)
			if dto.Status != c.want {
				t.Fatalf("toMessageDTO().Status = %q, want %q", dto.Status, c.want)
			}
			if (dto.ReadAt != nil) != (c.m.ReadAt != nil) || (dto.DeliveredAt != nil) != (c.m.DeliveredAt != nil) {
				t.Fatalf("timestamps not carried over: %+v", dto)
			}
		})
	}
}

func TestConversationDTOSession(t *testing.T) {
	vendor := "vendor-1"
	open := repository.Conversation{ID: "c1", Type: repository.ConversationTypeVendorChat, ClientID: "client-1", VendorID: &vendor}
	dto := toConversationDTO(&open)
	if dto.ClosedAt != nil || dto.ClosedBy != nil {
		t.Fatalf("open conversation must not carry closed fields: %+v", dto)
	}

	at := time.Date(2026, 11, 11, 7, 5, 0, 0, time.UTC)
	closed := open
	closed.ClosedAt = &at
	closed.ClosedBy = &vendor
	if !closed.Closed() {
		t.Fatal("Closed() = false for a conversation with closed_at")
	}
	dto = toConversationDTO(&closed)
	if dto.ClosedAt == nil || *dto.ClosedAt != "2026-11-11T07:05:00Z" {
		t.Fatalf("closed_at = %v", dto.ClosedAt)
	}
	if dto.ClosedBy == nil || *dto.ClosedBy != vendor {
		t.Fatalf("closed_by = %v", dto.ClosedBy)
	}
}

func TestReceiptsEventsGroupPerConversation(t *testing.T) {
	events := receiptsEvents(StatusDelivered, []repository.ReceiptChange{
		{ConversationID: "a", MessageID: "m1"},
		{ConversationID: "b", MessageID: "m2"},
		{ConversationID: "a", MessageID: "m3"},
	})
	if len(events) != 2 {
		t.Fatalf("want one event per conversation, got %d", len(events))
	}
	a := events["a"]
	if a["type"] != "receipts.updated" || a["status"] != StatusDelivered {
		t.Fatalf("unexpected event %+v", a)
	}
	ids := append([]string(nil), a["message_ids"].([]string)...)
	sort.Strings(ids)
	if len(ids) != 2 || ids[0] != "m1" || ids[1] != "m3" {
		t.Fatalf("conversation a ids = %v", ids)
	}
	if got := events["b"]["message_ids"].([]string); len(got) != 1 || got[0] != "m2" {
		t.Fatalf("conversation b ids = %v", got)
	}
	if len(receiptsEvents(StatusRead, nil)) != 0 {
		t.Fatal("no changes must broadcast nothing")
	}
}
