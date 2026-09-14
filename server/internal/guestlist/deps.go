// Package guestlist implements the wedding guest list, RSVP link settings,
// and the PUBLIC RSVP form guests submit without an account. The public
// surface (GetRSVPInfo, SubmitRSVP) is protected by an unguessable share
// token plus rate limiting, not a login (see routes.go).
package guestlist

import (
	"duacincin/server/internal/ratelimit"
	"duacincin/server/internal/repository"
)

type Deps struct {
	Guests  *repository.GuestRepo
	Links   *repository.RSVPLinkRepo
	Limiter *ratelimit.Limiter
}

func NewDeps(guests *repository.GuestRepo, links *repository.RSVPLinkRepo, limiter *ratelimit.Limiter) *Deps {
	return &Deps{Guests: guests, Links: links, Limiter: limiter}
}
