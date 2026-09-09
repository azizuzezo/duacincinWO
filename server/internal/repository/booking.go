package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	BookingStatusRequested = "requested"
	BookingStatusConfirmed = "confirmed"
	BookingStatusDPPaid    = "dp_paid"
	BookingStatusFullPaid  = "full_paid"
	BookingStatusCompleted = "completed"
	BookingStatusCancelled = "cancelled"
)

type Booking struct {
	ID                 string
	ClientID           string
	VendorID           string
	EventDate          time.Time
	PackageDescription string
	AgreedPrice        int64
	DPAmount           int64
	Status             string
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type BookingRepo struct {
	pool *pgxpool.Pool
}

func NewBookingRepo(pool *pgxpool.Pool) *BookingRepo {
	return &BookingRepo{pool: pool}
}

func (r *BookingRepo) Create(ctx context.Context, clientID, vendorID string, eventDate time.Time, packageDescription string, agreedPrice, dpAmount int64) (*Booking, error) {
	row := r.pool.QueryRow(ctx, `
		insert into bookings (client_id, vendor_id, event_date, package_description, agreed_price, dp_amount)
		values ($1, $2, $3, $4, $5, $6)
		returning id, client_id, vendor_id, event_date, package_description, agreed_price, dp_amount, status, created_at, updated_at
	`, clientID, vendorID, eventDate, packageDescription, agreedPrice, dpAmount)
	return scanBooking(row)
}

func (r *BookingRepo) GetByID(ctx context.Context, id string) (*Booking, error) {
	row := r.pool.QueryRow(ctx, `
		select id, client_id, vendor_id, event_date, package_description, agreed_price, dp_amount, status, created_at, updated_at
		from bookings where id = $1
	`, id)
	b, err := scanBooking(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return b, err
}

func (r *BookingRepo) ListForClient(ctx context.Context, clientID string) ([]Booking, error) {
	return r.list(ctx, "client_id", clientID)
}

func (r *BookingRepo) ListForVendor(ctx context.Context, vendorID string) ([]Booking, error) {
	return r.list(ctx, "vendor_id", vendorID)
}

func (r *BookingRepo) list(ctx context.Context, column, id string) ([]Booking, error) {
	rows, err := r.pool.Query(ctx, `
		select id, client_id, vendor_id, event_date, package_description, agreed_price, dp_amount, status, created_at, updated_at
		from bookings where `+column+` = $1 order by created_at desc
	`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []Booking
	for rows.Next() {
		var b Booking
		if err := rows.Scan(&b.ID, &b.ClientID, &b.VendorID, &b.EventDate, &b.PackageDescription, &b.AgreedPrice, &b.DPAmount, &b.Status, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		bookings = append(bookings, b)
	}
	return bookings, rows.Err()
}

// UpdateStatus moves a booking from expectedStatus to newStatus, atomically
// (the WHERE clause acts as an optimistic-lock guard against racing
// CountActive powers the Admin dashboard's "transaksi berjalan" stat —
// bookings that haven't reached a final state yet.
func (r *BookingRepo) CountActive(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		select count(*) from bookings where status not in ('completed', 'cancelled')
	`).Scan(&count)
	return count, err
}

// requests — e.g. two payment webhooks arriving concurrently). Returns
// false if the booking wasn't in expectedStatus.
func (r *BookingRepo) UpdateStatus(ctx context.Context, id, expectedStatus, newStatus string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		update bookings set status = $3, updated_at = now()
		where id = $1 and status = $2
	`, id, expectedStatus, newStatus)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func scanBooking(row pgx.Row) (*Booking, error) {
	var b Booking
	if err := row.Scan(&b.ID, &b.ClientID, &b.VendorID, &b.EventDate, &b.PackageDescription, &b.AgreedPrice, &b.DPAmount, &b.Status, &b.CreatedAt, &b.UpdatedAt); err != nil {
		return nil, err
	}
	return &b, nil
}

// --- Transactions ---

const (
	TransactionTypeDP   = "dp"
	TransactionTypeFull = "full"

	TransactionStatusPending = "pending"
	TransactionStatusPaid    = "paid"
)

type Transaction struct {
	ID              string
	BookingID       string
	Type            string
	Amount          int64
	Status          string
	ProviderOrderID string
	PaidAt          *time.Time
	CreatedAt       time.Time
}

type TransactionRepo struct {
	pool *pgxpool.Pool
}

func NewTransactionRepo(pool *pgxpool.Pool) *TransactionRepo {
	return &TransactionRepo{pool: pool}
}

func (r *TransactionRepo) Create(ctx context.Context, bookingID, txType string, amount int64, providerOrderID string) (*Transaction, error) {
	row := r.pool.QueryRow(ctx, `
		insert into transactions (booking_id, type, amount, provider_order_id)
		values ($1, $2, $3, $4)
		returning id, booking_id, type, amount, status, provider_order_id, paid_at, created_at
	`, bookingID, txType, amount, providerOrderID)
	return scanTransaction(row)
}

func (r *TransactionRepo) GetByOrderID(ctx context.Context, orderID string) (*Transaction, error) {
	row := r.pool.QueryRow(ctx, `
		select id, booking_id, type, amount, status, provider_order_id, paid_at, created_at
		from transactions where provider_order_id = $1
	`, orderID)
	t, err := scanTransaction(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

func (r *TransactionRepo) GetLatestPending(ctx context.Context, bookingID, txType string) (*Transaction, error) {
	row := r.pool.QueryRow(ctx, `
		select id, booking_id, type, amount, status, provider_order_id, paid_at, created_at
		from transactions where booking_id = $1 and type = $2 and status = 'pending'
		order by created_at desc limit 1
	`, bookingID, txType)
	t, err := scanTransaction(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

func (r *TransactionRepo) MarkPaid(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `update transactions set status = 'paid', paid_at = now() where id = $1`, id)
	return err
}

func scanTransaction(row pgx.Row) (*Transaction, error) {
	var t Transaction
	if err := row.Scan(&t.ID, &t.BookingID, &t.Type, &t.Amount, &t.Status, &t.ProviderOrderID, &t.PaidAt, &t.CreatedAt); err != nil {
		return nil, err
	}
	return &t, nil
}

// --- Disbursements ---

type Disbursement struct {
	BookingID        string
	GrossAmount      int64
	CommissionAmount int64
	NetAmount        int64
	Status           string
	CreatedAt        time.Time
}

type DisbursementRepo struct {
	pool *pgxpool.Pool
}

func NewDisbursementRepo(pool *pgxpool.Pool) *DisbursementRepo {
	return &DisbursementRepo{pool: pool}
}

func (r *DisbursementRepo) Create(ctx context.Context, bookingID string, grossAmount, commissionAmount, netAmount int64) error {
	_, err := r.pool.Exec(ctx, `
		insert into disbursements (booking_id, gross_amount, commission_amount, net_amount)
		values ($1, $2, $3, $4)
		on conflict (booking_id) do nothing
	`, bookingID, grossAmount, commissionAmount, netAmount)
	return err
}

func (r *DisbursementRepo) ListPending(ctx context.Context) ([]Disbursement, error) {
	rows, err := r.pool.Query(ctx, `
		select booking_id, gross_amount, commission_amount, net_amount, status, created_at
		from disbursements where status = 'pending' order by created_at asc
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Disbursement
	for rows.Next() {
		var d Disbursement
		if err := rows.Scan(&d.BookingID, &d.GrossAmount, &d.CommissionAmount, &d.NetAmount, &d.Status, &d.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *DisbursementRepo) MarkDisbursed(ctx context.Context, bookingID string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		update disbursements set status = 'disbursed', disbursed_at = now()
		where booking_id = $1 and status = 'pending'
	`, bookingID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}
