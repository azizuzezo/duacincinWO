package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// ErrPhoneTaken: the number is already verified on another account.
var ErrPhoneTaken = errors.New("phone already linked to another account")

// WhatsAppVerification is a number being proven by a code sent to it over
// WhatsApp. CodeHash is nil until a code has been sent (registration only
// records the number; the code is sent from the account once signed in).
type WhatsAppVerification struct {
	UserID    string
	Phone     string
	CodeHash  *string
	ExpiresAt *time.Time
	Attempts  int
	SentAt    *time.Time
}

func (r *WhatsAppLinkRepo) GetVerification(ctx context.Context, userID string) (*WhatsAppVerification, error) {
	var v WhatsAppVerification
	err := r.pool.QueryRow(ctx, `
		select user_id, phone, code_hash, expires_at, attempts, sent_at
		from whatsapp_verifications where user_id = $1
	`, userID).Scan(&v.UserID, &v.Phone, &v.CodeHash, &v.ExpiresAt, &v.Attempts, &v.SentAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &v, err
}

// SetPendingPhone records the number typed at registration, with no code yet.
func (r *WhatsAppLinkRepo) SetPendingPhone(ctx context.Context, userID, phone string) error {
	_, err := r.pool.Exec(ctx, `
		insert into whatsapp_verifications (user_id, phone) values ($1, $2)
		on conflict (user_id) do update set phone = excluded.phone, code_hash = null,
			expires_at = null, attempts = 0, updated_at = now()
	`, userID, phone)
	return err
}

// StartVerification stores a fresh code for phone, resetting the attempts.
func (r *WhatsAppLinkRepo) StartVerification(ctx context.Context, userID, phone, codeHash string, ttl time.Duration) error {
	_, err := r.pool.Exec(ctx, `
		insert into whatsapp_verifications (user_id, phone, code_hash, expires_at, attempts, sent_at)
		values ($1, $2, $3, now() + make_interval(secs => $4), 0, now())
		on conflict (user_id) do update set phone = excluded.phone, code_hash = excluded.code_hash,
			expires_at = excluded.expires_at, attempts = 0, sent_at = now(), updated_at = now()
	`, userID, phone, codeHash, ttl.Seconds())
	return err
}

// BumpAttempt counts one wrong guess and returns the new total.
func (r *WhatsAppLinkRepo) BumpAttempt(ctx context.Context, userID string) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		update whatsapp_verifications set attempts = attempts + 1, updated_at = now()
		where user_id = $1 returning attempts
	`, userID).Scan(&n)
	return n, err
}

// PhoneTakenByOther reports whether phone is verified on an account other than userID.
func (r *WhatsAppLinkRepo) PhoneTakenByOther(ctx context.Context, phone, userID string) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx, `
		select exists(select 1 from whatsapp_links
			where phone = $1 and user_id is not null and user_id <> $2 and link_state = 'linked')
	`, phone, userID).Scan(&ok)
	return ok, err
}

// LinkVerified makes phone the account's WhatsApp number once its code is
// proven: the account's previous number (if any) is released, the number
// is linked, the pending verification is cleared and, for a vendor, the
// private number on the profile follows. All or nothing.
func (r *WhatsAppLinkRepo) LinkVerified(ctx context.Context, userID, phone string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		update whatsapp_links
		set user_id = null, link_state = 'awaiting_email', pending_email = null, pending_otp_user_id = null,
			active_conversation_id = null, pending_menu = null, updated_at = now()
		where user_id = $1 and phone <> $2
	`, userID, phone); err != nil {
		return err
	}
	var id string
	err = tx.QueryRow(ctx, `
		insert into whatsapp_links (phone, jid, user_id, link_state)
		values ($1, $1 || '@s.whatsapp.net', $2, 'linked')
		on conflict (phone) do update set user_id = $2, link_state = 'linked', pending_email = null,
			pending_otp_user_id = null, updated_at = now(),
			active_conversation_id = case when whatsapp_links.user_id = $2 then whatsapp_links.active_conversation_id end,
			pending_menu = case when whatsapp_links.user_id = $2 then whatsapp_links.pending_menu end
		where whatsapp_links.user_id is null or whatsapp_links.user_id = $2 or whatsapp_links.link_state <> 'linked'
		returning id
	`, phone, userID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrPhoneTaken
	}
	if err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `delete from whatsapp_verifications where user_id = $1`, userID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `update vendor_profiles set whatsapp_number = $2, updated_at = now() where user_id = $1`, userID, phone); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// WhatsAppCoverage counts, per role, accounts with and without a verified number.
type WhatsAppCoverage struct {
	ClientsVerified, ClientsMissing int
	VendorsVerified, VendorsMissing int
}

func (r *WhatsAppLinkRepo) Coverage(ctx context.Context) (WhatsAppCoverage, error) {
	var c WhatsAppCoverage
	err := r.pool.QueryRow(ctx, `
		select
			count(*) filter (where u.role = 'client' and l.id is not null),
			count(*) filter (where u.role = 'client' and l.id is null),
			count(*) filter (where u.role = 'vendor' and l.id is not null),
			count(*) filter (where u.role = 'vendor' and l.id is null)
		from users u
		left join whatsapp_links l on l.user_id = u.id and l.link_state = 'linked'
		where u.role in ('client', 'vendor')
	`).Scan(&c.ClientsVerified, &c.ClientsMissing, &c.VendorsVerified, &c.VendorsMissing)
	return c, err
}
