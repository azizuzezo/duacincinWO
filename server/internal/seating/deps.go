// Package seating implements the Client-only table/seat assignment board:
// group confirmed guests (from the guestlist package) into tables. Tables
// are laid out as a simple card grid, not a free-form floor-plan canvas:
// a deliberate scope cut, see the redesign design doc.
package seating

import "duacincin/server/internal/repository"

type Deps struct {
	Tables      *repository.SeatingTableRepo
	Assignments *repository.SeatingAssignmentRepo
	Guests      *repository.GuestRepo
}

func NewDeps(tables *repository.SeatingTableRepo, assignments *repository.SeatingAssignmentRepo, guests *repository.GuestRepo) *Deps {
	return &Deps{Tables: tables, Assignments: assignments, Guests: guests}
}
