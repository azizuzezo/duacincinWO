package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	ConversationTypeVendorChat   = "vendor_chat"
	ConversationTypeConsultation = "consultation"
)

type Conversation struct {
	ID        string
	Type      string
	ClientID  string
	VendorID  *string
	CreatedAt time.Time
}

type Message struct {
	ID             string
	ConversationID string
	SenderID       string
	Body           string
	Flagged        bool
	CreatedAt      time.Time
}

type ChatRepo struct {
	pool *pgxpool.Pool
}

func NewChatRepo(pool *pgxpool.Pool) *ChatRepo {
	return &ChatRepo{pool: pool}
}

// GetOrCreateVendorChat returns the (client, vendor) conversation, creating
// it if this is their first contact.
func (r *ChatRepo) GetOrCreateVendorChat(ctx context.Context, clientID, vendorID string) (*Conversation, error) {
	row := r.pool.QueryRow(ctx, `
		insert into conversations (type, client_id, vendor_id)
		values ('vendor_chat', $1, $2)
		on conflict (client_id, vendor_id) where type = 'vendor_chat'
		do update set client_id = excluded.client_id
		returning id, type, client_id, vendor_id, created_at
	`, clientID, vendorID)
	return scanConversation(row)
}

// GetOrCreateConsultation returns the client's single ongoing consultation
// conversation with the Wedding Consultant team (PRD §8.11), creating it on
// first contact.
func (r *ChatRepo) GetOrCreateConsultation(ctx context.Context, clientID string) (*Conversation, error) {
	row := r.pool.QueryRow(ctx, `
		insert into conversations (type, client_id, vendor_id)
		values ('consultation', $1, null)
		on conflict (client_id) where type = 'consultation'
		do update set client_id = excluded.client_id
		returning id, type, client_id, vendor_id, created_at
	`, clientID)
	return scanConversation(row)
}

func (r *ChatRepo) GetByID(ctx context.Context, id string) (*Conversation, error) {
	row := r.pool.QueryRow(ctx, `
		select id, type, client_id, vendor_id, created_at from conversations where id = $1
	`, id)
	c, err := scanConversation(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return c, err
}

// ListForClient returns every conversation (vendor_chat + consultation)
// belonging to clientID.
func (r *ChatRepo) ListForClient(ctx context.Context, clientID string) ([]Conversation, error) {
	rows, err := r.pool.Query(ctx, `
		select id, type, client_id, vendor_id, created_at from conversations
		where client_id = $1 order by created_at desc
	`, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectConversations(rows)
}

// ListForVendor returns every vendor_chat conversation belonging to vendorID.
func (r *ChatRepo) ListForVendor(ctx context.Context, vendorID string) ([]Conversation, error) {
	rows, err := r.pool.Query(ctx, `
		select id, type, client_id, vendor_id, created_at from conversations
		where vendor_id = $1 order by created_at desc
	`, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectConversations(rows)
}

// ListConsultations returns every consultation conversation — visible to
// any Wedding Consultant/Admin (shared-inbox model, PRD §8.11).
func (r *ChatRepo) ListConsultations(ctx context.Context) ([]Conversation, error) {
	rows, err := r.pool.Query(ctx, `
		select id, type, client_id, vendor_id, created_at from conversations
		where type = 'consultation' order by created_at desc
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectConversations(rows)
}

func (r *ChatRepo) CreateMessage(ctx context.Context, conversationID, senderID, body string, flagged bool) (*Message, error) {
	row := r.pool.QueryRow(ctx, `
		insert into messages (conversation_id, sender_id, body, flagged)
		values ($1, $2, $3, $4)
		returning id, conversation_id, sender_id, body, flagged, created_at
	`, conversationID, senderID, body, flagged)

	var m Message
	if err := row.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Body, &m.Flagged, &m.CreatedAt); err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *ChatRepo) ListMessages(ctx context.Context, conversationID string) ([]Message, error) {
	rows, err := r.pool.Query(ctx, `
		select id, conversation_id, sender_id, body, flagged, created_at
		from messages where conversation_id = $1 order by created_at asc
	`, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Body, &m.Flagged, &m.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}

func scanConversation(row pgx.Row) (*Conversation, error) {
	var c Conversation
	if err := row.Scan(&c.ID, &c.Type, &c.ClientID, &c.VendorID, &c.CreatedAt); err != nil {
		return nil, err
	}
	return &c, nil
}

func collectConversations(rows pgx.Rows) ([]Conversation, error) {
	var conversations []Conversation
	for rows.Next() {
		var c Conversation
		if err := rows.Scan(&c.ID, &c.Type, &c.ClientID, &c.VendorID, &c.CreatedAt); err != nil {
			return nil, err
		}
		conversations = append(conversations, c)
	}
	return conversations, rows.Err()
}
