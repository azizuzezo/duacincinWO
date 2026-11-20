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

// WhatsAppRecipient is a client or vendor with a verified WhatsApp number.
type WhatsAppRecipient struct {
	UserID       string
	FullName     string
	Email        string
	Role         string
	BusinessName string
	Phone        string
}

// SearchRecipients finds verified clients/vendors by name, business name,
// email or number (q may be empty), optionally one role or one user.
func (r *WhatsAppLinkRepo) SearchRecipients(ctx context.Context, q, role, userID string, limit int) ([]WhatsAppRecipient, error) {
	rows, err := r.pool.Query(ctx, `
		select u.id, coalesce(u.full_name, ''), u.email, u.role, coalesce(vp.business_name, ''), l.phone
		from users u
		join whatsapp_links l on l.user_id = u.id and l.link_state = 'linked'
		left join vendor_profiles vp on vp.user_id = u.id
		where u.role::text in ('client', 'vendor')
		  and ($2::text = '' or u.role::text = $2::text)
		  and ($3::text = '' or u.id::text = $3::text)
		  and ($1::text = ''
		    or strpos(lower(coalesce(u.full_name, '')), lower($1)) > 0
		    or strpos(lower(u.email), lower($1)) > 0
		    or strpos(lower(coalesce(vp.business_name, '')), lower($1)) > 0
		    or ($4::text <> '' and strpos(l.phone, $4::text) > 0))
		order by u.created_at desc
		limit $5
	`, q, role, userID, digitsOf(q), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []WhatsAppRecipient
	for rows.Next() {
		var x WhatsAppRecipient
		if err := rows.Scan(&x.UserID, &x.FullName, &x.Email, &x.Role, &x.BusinessName, &x.Phone); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

// digitsOf keeps the digits of a typed number, dropping a leading 0 so
// "0812..." matches the stored "62812..."; "" when fewer than 4 digits.
func digitsOf(s string) string {
	b := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		if s[i] >= '0' && s[i] <= '9' {
			b = append(b, s[i])
		}
	}
	d := string(b)
	if len(d) > 0 && d[0] == '0' {
		d = d[1:]
	}
	if len(d) < 4 {
		return ""
	}
	return d
}
