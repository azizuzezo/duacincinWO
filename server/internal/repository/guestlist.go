package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	GuestRSVPPending      = "pending"
	GuestRSVPAttending    = "attending"
	GuestRSVPNotAttending = "not_attending"

	GuestSourceManual   = "manual"
	GuestSourceRSVPForm = "rsvp_form"
)

type RSVPLink struct {
	ClientID  string
	Token     string
	EventName string
	EventDate *time.Time
	VenueNote string
	CreatedAt time.Time
}

type RSVPLinkRepo struct {
	pool *pgxpool.Pool
}

func NewRSVPLinkRepo(pool *pgxpool.Pool) *RSVPLinkRepo {
	return &RSVPLinkRepo{pool: pool}
}

// GetOrCreate returns the client's RSVP link settings, creating one with a
// fresh token on first access.
func (r *RSVPLinkRepo) GetOrCreate(ctx context.Context, clientID string, newToken string) (*RSVPLink, error) {
	row := r.pool.QueryRow(ctx, `
		insert into wedding_rsvp_links (client_id, token)
		values ($1, $2)
		on conflict (client_id) do update set client_id = excluded.client_id
		returning client_id, token, event_name, event_date, venue_note, created_at
	`, clientID, newToken)
	return scanRSVPLink(row)
}

func (r *RSVPLinkRepo) GetByToken(ctx context.Context, token string) (*RSVPLink, error) {
	row := r.pool.QueryRow(ctx, `
		select client_id, token, event_name, event_date, venue_note, created_at
		from wedding_rsvp_links where token = $1
	`, token)
	link, err := scanRSVPLink(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return link, err
}

func (r *RSVPLinkRepo) UpdateSettings(ctx context.Context, clientID, eventName string, eventDate *time.Time, venueNote string) error {
	_, err := r.pool.Exec(ctx, `
		update wedding_rsvp_links set event_name = $2, event_date = $3, venue_note = $4
		where client_id = $1
	`, clientID, eventName, eventDate, venueNote)
	return err
}

func scanRSVPLink(row pgx.Row) (*RSVPLink, error) {
	var l RSVPLink
	if err := row.Scan(&l.ClientID, &l.Token, &l.EventName, &l.EventDate, &l.VenueNote, &l.CreatedAt); err != nil {
		return nil, err
	}
	return &l, nil
}

type Guest struct {
	ID         string
	ClientID   string
	Name       string
	Phone      string
	PartySize  int
	RSVPStatus string
	Message    string
	Source     string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type GuestRepo struct {
	pool *pgxpool.Pool
}

func NewGuestRepo(pool *pgxpool.Pool) *GuestRepo {
	return &GuestRepo{pool: pool}
}

func (r *GuestRepo) Create(ctx context.Context, clientID, name, phone string, partySize int, status, message, source string) (*Guest, error) {
	row := r.pool.QueryRow(ctx, `
		insert into wedding_guests (client_id, name, phone, party_size, rsvp_status, message, source)
		values ($1, $2, $3, $4, $5, $6, $7)
		returning id, client_id, name, phone, party_size, rsvp_status, message, source, created_at, updated_at
	`, clientID, name, phone, partySize, status, message, source)
	return scanGuest(row)
}

func (r *GuestRepo) ListForClient(ctx context.Context, clientID string) ([]Guest, error) {
	rows, err := r.pool.Query(ctx, `
		select id, client_id, name, phone, party_size, rsvp_status, message, source, created_at, updated_at
		from wedding_guests where client_id = $1 order by created_at desc
	`, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Guest
	for rows.Next() {
		var g Guest
		if err := rows.Scan(&g.ID, &g.ClientID, &g.Name, &g.Phone, &g.PartySize, &g.RSVPStatus, &g.Message, &g.Source, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

// Update lets the Client (owner) correct any field, scoped to clientID
// (IDOR guard).
func (r *GuestRepo) Update(ctx context.Context, clientID, id, name, phone string, partySize int, status, message string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		update wedding_guests
		set name = $3, phone = $4, party_size = $5, rsvp_status = $6, message = $7, updated_at = now()
		where id = $2 and client_id = $1
	`, clientID, id, name, phone, partySize, status, message)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *GuestRepo) Delete(ctx context.Context, clientID, id string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `delete from wedding_guests where id = $2 and client_id = $1`, clientID, id)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *GuestRepo) GetByID(ctx context.Context, id string) (*Guest, error) {
	row := r.pool.QueryRow(ctx, `
		select id, client_id, name, phone, party_size, rsvp_status, message, source, created_at, updated_at
		from wedding_guests where id = $1
	`, id)
	g, err := scanGuest(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return g, err
}

func scanGuest(row pgx.Row) (*Guest, error) {
	var g Guest
	if err := row.Scan(&g.ID, &g.ClientID, &g.Name, &g.Phone, &g.PartySize, &g.RSVPStatus, &g.Message, &g.Source, &g.CreatedAt, &g.UpdatedAt); err != nil {
		return nil, err
	}
	return &g, nil
}
