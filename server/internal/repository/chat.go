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
	ID               string
	ConversationID   string
	SenderID         string
	Body             string
	Flagged          bool
	ReplyToMessageID *string
	AttachmentURL    *string
	AttachmentType   *string
	CreatedAt        time.Time
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

func (r *ChatRepo) CreateMessage(ctx context.Context, conversationID, senderID, body string, flagged bool, replyToMessageID, attachmentURL, attachmentType *string) (*Message, error) {
	row := r.pool.QueryRow(ctx, `
		insert into messages (conversation_id, sender_id, body, flagged, reply_to_message_id, attachment_url, attachment_type)
		values ($1, $2, $3, $4, $5, $6, $7)
		returning id, conversation_id, sender_id, body, flagged, reply_to_message_id, attachment_url, attachment_type, created_at
	`, conversationID, senderID, body, flagged, replyToMessageID, attachmentURL, attachmentType)
	return scanMessage(row)
}

func (r *ChatRepo) GetMessageByID(ctx context.Context, id string) (*Message, error) {
	row := r.pool.QueryRow(ctx, `
		select id, conversation_id, sender_id, body, flagged, reply_to_message_id, attachment_url, attachment_type, created_at
		from messages where id = $1
	`, id)
	m, err := scanMessage(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return m, err
}

func (r *ChatRepo) ListMessages(ctx context.Context, conversationID string) ([]Message, error) {
	rows, err := r.pool.Query(ctx, `
		select id, conversation_id, sender_id, body, flagged, reply_to_message_id, attachment_url, attachment_type, created_at
		from messages where conversation_id = $1 order by created_at asc
	`, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Body, &m.Flagged, &m.ReplyToMessageID, &m.AttachmentURL, &m.AttachmentType, &m.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}

func scanMessage(row pgx.Row) (*Message, error) {
	var m Message
	if err := row.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Body, &m.Flagged, &m.ReplyToMessageID, &m.AttachmentURL, &m.AttachmentType, &m.CreatedAt); err != nil {
		return nil, err
	}
	return &m, nil
}

type ConversationRead struct {
	ConversationID    string
	UserID            string
	LastReadMessageID *string
	UpdatedAt         time.Time
}

// MarkRead upserts how far userID has read into conversationID, called when
// the user opens a thread or scrolls to its latest message.
func (r *ChatRepo) MarkRead(ctx context.Context, conversationID, userID, lastReadMessageID string) error {
	_, err := r.pool.Exec(ctx, `
		insert into conversation_reads (conversation_id, user_id, last_read_message_id, updated_at)
		values ($1, $2, $3, now())
		on conflict (conversation_id, user_id)
		do update set last_read_message_id = excluded.last_read_message_id, updated_at = excluded.updated_at
	`, conversationID, userID, lastReadMessageID)
	return err
}

// GetReadStatus returns the read position of every participant who has
// opened conversationID at least once.
func (r *ChatRepo) GetReadStatus(ctx context.Context, conversationID string) ([]ConversationRead, error) {
	rows, err := r.pool.Query(ctx, `
		select conversation_id, user_id, last_read_message_id, updated_at
		from conversation_reads where conversation_id = $1
	`, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ConversationRead
	for rows.Next() {
		var cr ConversationRead
		if err := rows.Scan(&cr.ConversationID, &cr.UserID, &cr.LastReadMessageID, &cr.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, cr)
	}
	return out, rows.Err()
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
