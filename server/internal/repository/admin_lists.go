package repository

import (
	"context"
	"time"
)

// Admin views over clients and client-vendor chats (read-only lists).

// AdminClientRow is one registered client for the admin's client list.
type AdminClientRow struct {
	ID            string
	FullName      string
	Email         string
	AccountStatus string
	CreatedAt     time.Time
	// WAPhone is the verified WhatsApp number; WAPending the one typed but
	// not verified yet. Admin-only.
	WAPhone       *string
	WAPending     *string
	Conversations int
	Bookings      int
}

// AdminListClients lists clients, newest first, matching q against name,
// email or number. total is the count of all matches.
func (r *UserRepo) AdminListClients(ctx context.Context, q string, limit, offset int) ([]AdminClientRow, int, error) {
	const where = `
		from users u
		left join whatsapp_links l on l.user_id = u.id and l.link_state = 'linked'
		left join whatsapp_verifications v on v.user_id = u.id
		where u.role = 'client'
		  and ($1::text = ''
		    or strpos(lower(coalesce(u.full_name, '')), lower($1::text)) > 0
		    or strpos(lower(u.email), lower($1::text)) > 0
		    or ($2::text <> '' and (strpos(coalesce(l.phone, ''), $2::text) > 0 or strpos(coalesce(v.phone, ''), $2::text) > 0)))`
	var total int
	if err := r.pool.QueryRow(ctx, `select count(*) `+where, q, digitsOf(q)).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.pool.Query(ctx, `
		select u.id, coalesce(u.full_name, ''), u.email, u.account_status, u.created_at, l.phone, v.phone,
		       (select count(*) from conversations c where c.client_id = u.id and c.type = 'vendor_chat'),
		       (select count(*) from bookings b where b.client_id = u.id)
		`+where+`
		order by u.created_at desc limit $3 offset $4
	`, q, digitsOf(q), limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []AdminClientRow
	for rows.Next() {
		var c AdminClientRow
		if err := rows.Scan(&c.ID, &c.FullName, &c.Email, &c.AccountStatus, &c.CreatedAt, &c.WAPhone, &c.WAPending, &c.Conversations, &c.Bookings); err != nil {
			return nil, 0, err
		}
		out = append(out, c)
	}
	return out, total, rows.Err()
}

// AdminChatRow is one client-vendor conversation for the admin's list.
type AdminChatRow struct {
	ID          string
	ClientID    string
	ClientName  string
	ClientEmail string
	VendorID    string
	VendorName  string
	CreatedAt   time.Time
	ClosedAt    *time.Time
	Messages    int
	Flagged     int
	LastBody    *string
	LastType    *string
	LastAt      *time.Time
	LastSender  *string
}

// AdminListVendorChats lists client-vendor conversations, most recently
// active first. q matches the client's name/email or the vendor's business
// name; clientID/vendorID narrow to one person.
func (r *ChatRepo) AdminListVendorChats(ctx context.Context, q, clientID, vendorID string, limit, offset int) ([]AdminChatRow, int, error) {
	const from = `
		from conversations c
		join users cu on cu.id = c.client_id
		left join vendor_profiles vp on vp.user_id = c.vendor_id
		left join users vu on vu.id = c.vendor_id`
	const where = `
		where c.type = 'vendor_chat'
		  and ($2::text = '' or c.client_id::text = $2::text)
		  and ($3::text = '' or c.vendor_id::text = $3::text)
		  and ($1::text = ''
		    or strpos(lower(coalesce(cu.full_name, '')), lower($1::text)) > 0
		    or strpos(lower(cu.email), lower($1::text)) > 0
		    or strpos(lower(coalesce(vp.business_name, vu.full_name, '')), lower($1::text)) > 0)`
	var total int
	if err := r.pool.QueryRow(ctx, `select count(*) `+from+where, q, clientID, vendorID).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.pool.Query(ctx, `
		select c.id, c.client_id, coalesce(cu.full_name, ''), cu.email, c.vendor_id, coalesce(vp.business_name, vu.full_name, ''),
		       c.created_at, c.closed_at,
		       (select count(*) from messages m where m.conversation_id = c.id),
		       (select count(*) from messages m where m.conversation_id = c.id and m.flagged),
		       lm.body, lm.attachment_type, lm.created_at, lm.sender_id::text
		`+from+`
		left join lateral (
			select m.body, m.attachment_type, m.created_at, m.sender_id from messages m
			where m.conversation_id = c.id order by m.created_at desc limit 1
		) lm on true
		`+where+`
		order by coalesce(lm.created_at, c.created_at) desc
		limit $4 offset $5
	`, q, clientID, vendorID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []AdminChatRow
	for rows.Next() {
		var x AdminChatRow
		if err := rows.Scan(&x.ID, &x.ClientID, &x.ClientName, &x.ClientEmail, &x.VendorID, &x.VendorName, &x.CreatedAt, &x.ClosedAt,
			&x.Messages, &x.Flagged, &x.LastBody, &x.LastType, &x.LastAt, &x.LastSender); err != nil {
			return nil, 0, err
		}
		out = append(out, x)
	}
	return out, total, rows.Err()
}
