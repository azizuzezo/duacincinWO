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
	// ClosedAt is set while the session is closed (see Close/Reopen);
	// ClosedBy is who closed it (nil if that account was later deleted).
	ClosedAt *time.Time
	ClosedBy *string
}

// Closed reports whether new messages are currently refused.
func (c *Conversation) Closed() bool { return c.ClosedAt != nil }

// ErrConversationClosed is returned by CreateMessage when the conversation's
// session is closed. The check runs inside the insert, so a close and a send
// racing each other can never let a message slip in after the close.
var ErrConversationClosed = errors.New("conversation closed")

const conversationColumns = "id, type, client_id, vendor_id, created_at, closed_at, closed_by"

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
	// DeliveredAt: the recipient's app fetched this message. ReadAt: the
	// recipient opened the thread with it visible. Both stay nil for a
	// message nobody on the other side has received yet.
	DeliveredAt *time.Time
	ReadAt      *time.Time
}

const messageColumns = "id, conversation_id, sender_id, body, flagged, reply_to_message_id, attachment_url, attachment_type, created_at, delivered_at, read_at"

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
		returning `+conversationColumns+`
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
		returning `+conversationColumns+`
	`, clientID)
	return scanConversation(row)
}

func (r *ChatRepo) GetByID(ctx context.Context, id string) (*Conversation, error) {
	row := r.pool.QueryRow(ctx, `
		select `+conversationColumns+` from conversations where id = $1
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
		select `+conversationColumns+` from conversations
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
		select `+conversationColumns+` from conversations
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
		select `+conversationColumns+` from conversations
		where type = 'consultation' order by created_at desc
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectConversations(rows)
}

// CreateMessage stores a message, or returns ErrConversationClosed when the
// conversation's session is closed (checked in the same statement).
func (r *ChatRepo) CreateMessage(ctx context.Context, conversationID, senderID, body string, flagged bool, replyToMessageID, attachmentURL, attachmentType *string) (*Message, error) {
	row := r.pool.QueryRow(ctx, `
		insert into messages (conversation_id, sender_id, body, flagged, reply_to_message_id, attachment_url, attachment_type)
		select $1::uuid, $2::uuid, $3::text, $4::boolean, $5::uuid, $6::text, $7::text
		where exists (select 1 from conversations where id = $1::uuid and closed_at is null)
		returning `+messageColumns+`
	`, conversationID, senderID, body, flagged, replyToMessageID, attachmentURL, attachmentType)
	m, err := scanMessage(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrConversationClosed
	}
	return m, err
}

func (r *ChatRepo) GetMessageByID(ctx context.Context, id string) (*Message, error) {
	row := r.pool.QueryRow(ctx, `
		select `+messageColumns+`
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
		select `+messageColumns+`
		from messages where conversation_id = $1 order by created_at asc
	`, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Body, &m.Flagged, &m.ReplyToMessageID, &m.AttachmentURL, &m.AttachmentType, &m.CreatedAt, &m.DeliveredAt, &m.ReadAt); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}

func scanMessage(row pgx.Row) (*Message, error) {
	var m Message
	if err := row.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Body, &m.Flagged, &m.ReplyToMessageID, &m.AttachmentURL, &m.AttachmentType, &m.CreatedAt, &m.DeliveredAt, &m.ReadAt); err != nil {
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
	if err := row.Scan(&c.ID, &c.Type, &c.ClientID, &c.VendorID, &c.CreatedAt, &c.ClosedAt, &c.ClosedBy); err != nil {
		return nil, err
	}
	return &c, nil
}

func collectConversations(rows pgx.Rows) ([]Conversation, error) {
	var conversations []Conversation
	for rows.Next() {
		var c Conversation
		if err := rows.Scan(&c.ID, &c.Type, &c.ClientID, &c.VendorID, &c.CreatedAt, &c.ClosedAt, &c.ClosedBy); err != nil {
			return nil, err
		}
		conversations = append(conversations, c)
	}
	return conversations, rows.Err()
}

// recipientSideSQL limits an update on messages m (joined to conversations c)
// to messages the viewer ($1) RECEIVES: for the couple that is everything not
// sent by the couple; for a vendor or the consultant team it is everything the
// couple sent. So one staff member opening a consultation never flips another
// staff member's ticks, and nobody can mark their own messages as read.
const recipientSideSQL = `(case when c.client_id = $1 then m.sender_id <> c.client_id else m.sender_id = c.client_id end)`

// ReceiptChange is one message whose delivered/read status just changed.
type ReceiptChange struct {
	ConversationID string
	MessageID      string
}

// MarkDelivered records that viewerID's app has fetched its incoming
// messages. With conversationID set it covers that one conversation (the
// thread was fetched); with nil it covers the viewer's whole inbox: the
// conversations they take part in, plus every consultation when staff is
// true (shared inbox). Returns only the messages that changed, so callers
// can tell the sender without re-sending unchanged state.
func (r *ChatRepo) MarkDelivered(ctx context.Context, viewerID string, staff bool, conversationID *string) ([]ReceiptChange, error) {
	rows, err := r.pool.Query(ctx, `
		update messages m set delivered_at = now()
		from conversations c
		where m.conversation_id = c.id
		  and m.delivered_at is null
		  and ($3::uuid is null or c.id = $3::uuid)
		  and (c.client_id = $1 or c.vendor_id = $1 or ($2 and c.type = 'consultation'))
		  and `+recipientSideSQL+`
		returning m.conversation_id, m.id
	`, viewerID, staff, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectReceiptChanges(rows)
}

// MarkReadUpTo marks every message viewerID received in conversationID up to
// and including lastReadMessageID as read (and delivered, if that was still
// missing). A message id from another conversation matches nothing.
func (r *ChatRepo) MarkReadUpTo(ctx context.Context, conversationID, viewerID, lastReadMessageID string) ([]ReceiptChange, error) {
	rows, err := r.pool.Query(ctx, `
		update messages m set read_at = now(), delivered_at = coalesce(m.delivered_at, now())
		from conversations c
		where m.conversation_id = c.id
		  and c.id = $2
		  and m.read_at is null
		  and m.created_at <= (select created_at from messages where id = $3 and conversation_id = $2)
		  and `+recipientSideSQL+`
		returning m.conversation_id, m.id
	`, viewerID, conversationID, lastReadMessageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectReceiptChanges(rows)
}

func collectReceiptChanges(rows pgx.Rows) ([]ReceiptChange, error) {
	var out []ReceiptChange
	for rows.Next() {
		var rc ReceiptChange
		if err := rows.Scan(&rc.ConversationID, &rc.MessageID); err != nil {
			return nil, err
		}
		out = append(out, rc)
	}
	return out, rows.Err()
}

// Close ends the conversation's session: no new messages until someone
// reopens it. Closing an already closed conversation keeps the original
// closer and time, and just returns the current state.
func (r *ChatRepo) Close(ctx context.Context, conversationID, userID string) (*Conversation, error) {
	row := r.pool.QueryRow(ctx, `
		update conversations
		set closed_at = coalesce(closed_at, now()),
		    closed_by = case when closed_at is null then $2::uuid else closed_by end
		where id = $1
		returning `+conversationColumns+`
	`, conversationID, userID)
	c, err := scanConversation(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return c, err
}

// Reopen lets messages flow again. Idempotent on an open conversation.
func (r *ChatRepo) Reopen(ctx context.Context, conversationID string) (*Conversation, error) {
	row := r.pool.QueryRow(ctx, `
		update conversations set closed_at = null, closed_by = null
		where id = $1
		returning `+conversationColumns+`
	`, conversationID)
	c, err := scanConversation(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return c, err
}
