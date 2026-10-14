package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	WhatsAppLinkStateAwaitingEmail = "awaiting_email"
	WhatsAppLinkStateAwaitingOTP   = "awaiting_otp"
	WhatsAppLinkStateLinked        = "linked"
)

// WhatsAppLink is one phone number's relay state: which DuaCincin account
// it's linked to (if any), where it is in the email/OTP linking flow, and
// which conversation (if any) it's currently relaying messages for.
type WhatsAppLink struct {
	ID                   string
	Phone                string
	JID                  string
	UserID               *string
	LinkState            string
	PendingEmail         *string
	PendingOTPUserID     *string
	ActiveConversationID *string
	PendingMenu          *string
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

type WhatsAppLinkRepo struct {
	pool *pgxpool.Pool
}

func NewWhatsAppLinkRepo(pool *pgxpool.Pool) *WhatsAppLinkRepo {
	return &WhatsAppLinkRepo{pool: pool}
}

const whatsAppLinkColumns = `id, phone, jid, user_id, link_state, pending_email, pending_otp_user_id, active_conversation_id, pending_menu, created_at, updated_at`

// GetOrCreate returns the link row for phone, creating it (state
// awaiting_email) on first-ever contact. jid is refreshed on every call
// since WhatsApp's JID representation for a phone can change between
// sessions.
func (r *WhatsAppLinkRepo) GetOrCreate(ctx context.Context, phone, jid string) (*WhatsAppLink, error) {
	row := r.pool.QueryRow(ctx, `
		insert into whatsapp_links (phone, jid)
		values ($1, $2)
		on conflict (phone) do update set jid = excluded.jid
		returning `+whatsAppLinkColumns+`
	`, phone, jid)
	return scanWhatsAppLink(row)
}

func (r *WhatsAppLinkRepo) GetByUserID(ctx context.Context, userID string) (*WhatsAppLink, error) {
	row := r.pool.QueryRow(ctx, `select `+whatsAppLinkColumns+` from whatsapp_links where user_id = $1`, userID)
	l, err := scanWhatsAppLink(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return l, err
}

// SetAwaitingOTP records that pendingEmail (belonging to pendingOTPUserID)
// is awaiting OTP verification before the link is completed.
func (r *WhatsAppLinkRepo) SetAwaitingOTP(ctx context.Context, id, pendingEmail, pendingOTPUserID string) error {
	_, err := r.pool.Exec(ctx, `
		update whatsapp_links
		set link_state = 'awaiting_otp', pending_email = $2, pending_otp_user_id = $3, updated_at = now()
		where id = $1
	`, id, pendingEmail, pendingOTPUserID)
	return err
}

// CompleteLink finalizes the link to userID once its OTP has been verified.
func (r *WhatsAppLinkRepo) CompleteLink(ctx context.Context, id, userID string) error {
	_, err := r.pool.Exec(ctx, `
		update whatsapp_links
		set user_id = $2, link_state = 'linked', pending_email = null, pending_otp_user_id = null, updated_at = now()
		where id = $1
	`, id, userID)
	return err
}

// SetActiveConversation focuses the link on conversationID (nil to go
// idle), always clearing any in-progress menu — the two are mutually
// exclusive states.
func (r *WhatsAppLinkRepo) SetActiveConversation(ctx context.Context, id string, conversationID *string) error {
	_, err := r.pool.Exec(ctx, `
		update whatsapp_links
		set active_conversation_id = $2, pending_menu = null, updated_at = now()
		where id = $1
	`, id, conversationID)
	return err
}

// SetPendingMenu stores menu (marshaled to JSON) as the link's in-progress
// picker, or clears it when menu is nil.
func (r *WhatsAppLinkRepo) SetPendingMenu(ctx context.Context, id string, menu any) error {
	var raw *string
	if menu != nil {
		b, err := json.Marshal(menu)
		if err != nil {
			return err
		}
		s := string(b)
		raw = &s
	}
	_, err := r.pool.Exec(ctx, `
		update whatsapp_links set pending_menu = $2::jsonb, updated_at = now() where id = $1
	`, id, raw)
	return err
}

func scanWhatsAppLink(row pgx.Row) (*WhatsAppLink, error) {
	var l WhatsAppLink
	if err := row.Scan(
		&l.ID, &l.Phone, &l.JID, &l.UserID, &l.LinkState, &l.PendingEmail,
		&l.PendingOTPUserID, &l.ActiveConversationID, &l.PendingMenu, &l.CreatedAt, &l.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &l, nil
}
