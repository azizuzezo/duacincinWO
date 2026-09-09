package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	MeetingTypeConsultant = "consultant_meeting"
	MeetingTypeTechnical  = "technical_meeting"

	MeetingStatusScheduled = "scheduled"
	MeetingStatusDone      = "done"
)

type Meeting struct {
	ID          string
	BookingID   *string
	ClientID    string
	Type        string
	ScheduledAt time.Time
	MeetingLink string
	Status      string
	CreatedAt   time.Time
}

type MeetingRepo struct {
	pool *pgxpool.Pool
}

func NewMeetingRepo(pool *pgxpool.Pool) *MeetingRepo {
	return &MeetingRepo{pool: pool}
}

func (r *MeetingRepo) Create(ctx context.Context, bookingID *string, clientID, meetingType string, scheduledAt time.Time, meetingLink string) (*Meeting, error) {
	row := r.pool.QueryRow(ctx, `
		insert into meetings (booking_id, client_id, type, scheduled_at, meeting_link)
		values ($1, $2, $3, $4, $5)
		returning id, booking_id, client_id, type, scheduled_at, meeting_link, status, created_at
	`, bookingID, clientID, meetingType, scheduledAt, meetingLink)
	return scanMeeting(row)
}

func (r *MeetingRepo) ListForBooking(ctx context.Context, bookingID string) ([]Meeting, error) {
	rows, err := r.pool.Query(ctx, `
		select id, booking_id, client_id, type, scheduled_at, meeting_link, status, created_at
		from meetings where booking_id = $1 order by scheduled_at
	`, bookingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectMeetings(rows)
}

func (r *MeetingRepo) ListConsultantMeetingsForClient(ctx context.Context, clientID string) ([]Meeting, error) {
	rows, err := r.pool.Query(ctx, `
		select id, booking_id, client_id, type, scheduled_at, meeting_link, status, created_at
		from meetings where client_id = $1 and type = 'consultant_meeting' order by scheduled_at
	`, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectMeetings(rows)
}

// CountForBooking is used to gate booking completion — PRD §8.11 requires
// at least one technical_meeting before a booking can move to "completed".
func (r *MeetingRepo) CountForBooking(ctx context.Context, bookingID, meetingType string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		select count(*) from meetings where booking_id = $1 and type = $2
	`, bookingID, meetingType).Scan(&count)
	return count, err
}

func scanMeeting(row pgx.Row) (*Meeting, error) {
	var m Meeting
	if err := row.Scan(&m.ID, &m.BookingID, &m.ClientID, &m.Type, &m.ScheduledAt, &m.MeetingLink, &m.Status, &m.CreatedAt); err != nil {
		return nil, err
	}
	return &m, nil
}

func collectMeetings(rows pgx.Rows) ([]Meeting, error) {
	var meetings []Meeting
	for rows.Next() {
		var m Meeting
		if err := rows.Scan(&m.ID, &m.BookingID, &m.ClientID, &m.Type, &m.ScheduledAt, &m.MeetingLink, &m.Status, &m.CreatedAt); err != nil {
			return nil, err
		}
		meetings = append(meetings, m)
	}
	return meetings, rows.Err()
}
