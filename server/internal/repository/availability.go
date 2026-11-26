package repository

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	AvailabilityReasonBooked  = "booked"
	AvailabilityReasonBlocked = "blocked"
)

// ErrDateBooked is returned when a vendor tries to block a day that a
// confirmed, dp_paid or full_paid booking already locks.
var ErrDateBooked = errors.New("date already locked by a booking")

// lockingStatuses are the booking statuses that lock the vendor's day.
// A requested, completed or cancelled booking does not.
const lockingStatuses = `('confirmed', 'dp_paid', 'full_paid')`

// jakarta is the calendar the product runs on. Falls back to a fixed UTC+7
// offset when tzdata is not available in the deploy image.
var jakarta = func() *time.Location {
	if loc, err := time.LoadLocation("Asia/Jakarta"); err == nil {
		return loc
	}
	return time.FixedZone("WIB", 7*60*60)
}()

// TodayJakarta returns the current calendar day in Jakarta as a UTC-midnight
// time, the same shape pgx gives for a date column, so the two compare.
func TodayJakarta(now time.Time) time.Time {
	y, m, d := now.In(jakarta).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

// AvailabilityDay is one unavailable day and why.
type AvailabilityDay struct {
	Day    time.Time
	Reason string
}

// MergeAvailability combines booking-locked and vendor-blocked days into one
// ascending list without duplicates. "booked" wins when both apply.
func MergeAvailability(booked, blocked []time.Time) []AvailabilityDay {
	reasons := make(map[time.Time]string, len(booked)+len(blocked))
	for _, d := range blocked {
		reasons[d] = AvailabilityReasonBlocked
	}
	for _, d := range booked {
		reasons[d] = AvailabilityReasonBooked
	}
	out := make([]AvailabilityDay, 0, len(reasons))
	for d, reason := range reasons {
		out = append(out, AvailabilityDay{Day: d, Reason: reason})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Day.Before(out[j].Day) })
	return out
}

type AvailabilityRepo struct {
	pool *pgxpool.Pool
}

func NewAvailabilityRepo(pool *pgxpool.Pool) *AvailabilityRepo {
	return &AvailabilityRepo{pool: pool}
}

func (r *AvailabilityRepo) queryDays(ctx context.Context, q pgx.Tx, sql string, args ...any) ([]time.Time, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if q != nil {
		rows, err = q.Query(ctx, sql, args...)
	} else {
		rows, err = r.pool.Query(ctx, sql, args...)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []time.Time
	for rows.Next() {
		var d time.Time
		if err := rows.Scan(&d); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// ListUnavailable returns the vendor's unavailable days within [from, to]
// inclusive, ascending. It never exposes who booked.
func (r *AvailabilityRepo) ListUnavailable(ctx context.Context, vendorID string, from, to time.Time) ([]AvailabilityDay, error) {
	booked, err := r.queryDays(ctx, nil, `
		select distinct event_date from bookings
		where vendor_id = $1 and status in `+lockingStatuses+` and event_date between $2 and $3
	`, vendorID, from, to)
	if err != nil {
		return nil, err
	}
	blocked, err := r.queryDays(ctx, nil, `
		select day from vendor_blocked_dates
		where vendor_id = $1 and day between $2 and $3
	`, vendorID, from, to)
	if err != nil {
		return nil, err
	}
	return MergeAvailability(booked, blocked), nil
}

// IsUnavailable reports whether day is blocked by the vendor or locked by a
// booking.
func (r *AvailabilityRepo) IsUnavailable(ctx context.Context, vendorID string, day time.Time) (bool, error) {
	var unavailable bool
	err := r.pool.QueryRow(ctx, `
		select exists (select 1 from vendor_blocked_dates where vendor_id = $1 and day = $2)
		    or exists (select 1 from bookings where vendor_id = $1 and event_date = $2 and status in `+lockingStatuses+`)
	`, vendorID, day).Scan(&unavailable)
	return unavailable, err
}

// HasLockingBooking reports whether another booking of the vendor (not
// excludeBookingID) already locks day.
func (r *AvailabilityRepo) HasLockingBooking(ctx context.Context, vendorID string, day time.Time, excludeBookingID string) (bool, error) {
	var locked bool
	err := r.pool.QueryRow(ctx, `
		select exists (
			select 1 from bookings
			where vendor_id = $1 and event_date = $2 and id <> $3 and status in `+lockingStatuses+`
		)
	`, vendorID, day, excludeBookingID).Scan(&locked)
	return locked, err
}

// SetBlocked blocks or reopens days for the vendor, idempotently. Blocking a
// day already locked by a booking fails with ErrDateBooked and changes
// nothing; reopening a booking-locked day is a no-op (the booking still
// locks it).
func (r *AvailabilityRepo) SetBlocked(ctx context.Context, vendorID string, days []time.Time, blocked bool) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if blocked {
		locked, err := r.queryDays(ctx, tx, `
			select event_date from bookings
			where vendor_id = $1 and status in `+lockingStatuses+` and event_date = any($2::date[])
			limit 1
		`, vendorID, days)
		if err != nil {
			return err
		}
		if len(locked) > 0 {
			return ErrDateBooked
		}
		_, err = tx.Exec(ctx, `
			insert into vendor_blocked_dates (vendor_id, day)
			select $1, d from unnest($2::date[]) as d
			on conflict do nothing
		`, vendorID, days)
	} else {
		_, err = tx.Exec(ctx, `
			delete from vendor_blocked_dates where vendor_id = $1 and day = any($2::date[])
		`, vendorID, days)
	}
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
