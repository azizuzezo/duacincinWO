// Package auth implements registration, login, session, and password-reset
// (via OTP) for the Client, Vendor, and internal (Admin/Wedding Consultant)
// roles described in PRD §8.2.
package auth

import (
	"duacincin/server/internal/config"
	"duacincin/server/internal/email"
	"duacincin/server/internal/ratelimit"
	"duacincin/server/internal/repository"
)

type Deps struct {
	Users   *repository.UserRepo
	OTPs    *repository.OTPRepo
	Limiter *ratelimit.Limiter
	Mailer  *email.Client
	Cfg     *config.Config
}

func NewDeps(users *repository.UserRepo, otps *repository.OTPRepo, limiter *ratelimit.Limiter, mailer *email.Client, cfg *config.Config) *Deps {
	return &Deps{Users: users, OTPs: otps, Limiter: limiter, Mailer: mailer, Cfg: cfg}
}
