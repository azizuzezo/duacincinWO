// Package booking implements the end-to-end booking journey (PRD §8.5/§8.11):
// requested -> confirmed -> dp_paid -> full_paid -> completed, DP/pelunasan
// via Midtrans escrow (held by DuaCincin, disbursed to the Vendor minus
// commission as a separate Admin step), and technical/consultant meeting
// scheduling.
package booking

import (
	"duacincin/server/internal/payment"
	"duacincin/server/internal/repository"
)

// DPPercent and CommissionRate are MVP defaults — PRD §11 names 10% as the
// default commission and leaves DP % unspecified; both become
// Admin-configurable per vendor/category in Fase 7.
const (
	DPPercent      = 0.30
	CommissionRate = 0.10
)

type Deps struct {
	Bookings      *repository.BookingRepo
	Transactions  *repository.TransactionRepo
	Meetings      *repository.MeetingRepo
	Disbursements *repository.DisbursementRepo
	Vendors       *repository.VendorRepo
	Users         *repository.UserRepo
	Planner       *repository.WeddingPlannerRepo
	Reviews       *repository.ReviewRepo
	Midtrans      *payment.Client
}

func NewDeps(
	bookings *repository.BookingRepo,
	transactions *repository.TransactionRepo,
	meetings *repository.MeetingRepo,
	disbursements *repository.DisbursementRepo,
	vendors *repository.VendorRepo,
	users *repository.UserRepo,
	planner *repository.WeddingPlannerRepo,
	reviews *repository.ReviewRepo,
	midtrans *payment.Client,
) *Deps {
	return &Deps{
		Bookings:      bookings,
		Transactions:  transactions,
		Meetings:      meetings,
		Disbursements: disbursements,
		Vendors:       vendors,
		Users:         users,
		Planner:       planner,
		Reviews:       reviews,
		Midtrans:      midtrans,
	}
}
