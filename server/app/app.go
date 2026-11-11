// Package app wires config, database, storage and every feature's
// dependencies into the API's http.Handler. It is shared by the long-running
// server (cmd/api) and the Vercel function (api/index.go).
//
// It deliberately lives outside internal/: Vercel's Go builder compiles
// api/*.go inside a generated wrapper module, and Go rejects imports of
// another module's internal/ packages. api/index.go therefore imports only
// this package, which in turn imports internal/ from inside the module.
package app

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"duacincin/server/internal/admin"
	"duacincin/server/internal/auth"
	"duacincin/server/internal/booking"
	"duacincin/server/internal/budget"
	"duacincin/server/internal/chat"
	"duacincin/server/internal/config"
	"duacincin/server/internal/db"
	"duacincin/server/internal/email"
	"duacincin/server/internal/googleauth"
	"duacincin/server/internal/guestlist"
	"duacincin/server/internal/httpserver"
	"duacincin/server/internal/inspiration"
	"duacincin/server/internal/invitationlink"
	"duacincin/server/internal/notifications"
	"duacincin/server/internal/payment"
	"duacincin/server/internal/ratelimit"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/rundown"
	"duacincin/server/internal/seating"
	"duacincin/server/internal/storage"
	"duacincin/server/internal/vendors"
	"duacincin/server/internal/weddingplanner"
	"duacincin/server/internal/whatsapp"
	"duacincin/server/migrations"
)

// Options controls the start-up steps that differ between the long-running
// server and a serverless instance.
type Options struct {
	// RunMigrations applies pending SQL migrations before serving.
	RunMigrations bool
	// EnsureBuckets creates the Supabase Storage buckets if missing.
	EnsureBuckets bool
	// Pool tunes the Postgres pool (zero value = pgx defaults).
	Pool db.Options
}

// ServerOptions is what `go run ./cmd/api` has always done on start-up.
func ServerOptions() Options {
	return Options{RunMigrations: true, EnsureBuckets: true}
}

// ServerlessOptions suits a Vercel instance: a few short-lived connections
// per instance, and no migrations (they take a session-level advisory lock
// that Supabase's transaction pooler cannot hold, and every cold start
// would race to run them). Run migrations from `go run ./cmd/api` instead.
func ServerlessOptions() Options {
	return Options{
		RunMigrations: false,
		EnsureBuckets: true,
		Pool:          db.Options{MaxConns: 4, MaxConnIdleTime: time.Minute},
	}
}

// App is a fully wired API.
type App struct {
	Config  *config.Config
	Handler http.Handler
	// Close releases the database pool.
	Close func()
}

// New loads config from the environment and builds the API. Errors are
// prefixed by step ("config: ...", "migrations: ...", "database: ...").
func New(ctx context.Context, opts Options) (*App, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("config: %w", err)
	}

	if opts.RunMigrations {
		if err := migrations.Run(cfg.DatabasePooler); err != nil {
			return nil, fmt.Errorf("migrations: %w", err)
		}
	}

	pool, err := db.NewWithOptions(ctx, cfg.DatabasePooler, opts.Pool)
	if err != nil {
		return nil, fmt.Errorf("database: %w", err)
	}

	storageClient := storage.NewClient(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)
	if opts.EnsureBuckets && storageClient.Configured() {
		for _, bucket := range []string{vendors.PortfolioBucket, inspiration.Bucket, chat.AttachmentBucket} {
			if err := storageClient.EnsureBucket(ctx, bucket, true); err != nil {
				log.Printf("warning: could not ensure storage bucket %q: %v", bucket, err)
			}
		}
	}

	vendorRepo := repository.NewVendorRepo(pool)
	vendorNameChangeRepo := repository.NewVendorNameChangeRepo(pool)
	chatRepo := repository.NewChatRepo(pool)
	userRepo := repository.NewUserRepo(pool)
	plannerRepo := repository.NewWeddingPlannerRepo(pool)
	disbursementRepo := repository.NewDisbursementRepo(pool)
	disputeRepo := repository.NewDisputeRepo(pool)
	bookingRepo := repository.NewBookingRepo(pool)
	reviewRepo := repository.NewReviewRepo(pool)
	auditLogRepo := repository.NewAuditLogRepo(pool)
	notificationRepo := repository.NewNotificationRepo(pool)
	guestRepo := repository.NewGuestRepo(pool)
	otpRepo := repository.NewOTPRepo(pool)
	whatsappLinkRepo := repository.NewWhatsAppLinkRepo(pool)
	chatHub := chat.NewHub()
	limiter := ratelimit.New(pool)
	midtransClient := payment.NewClient(cfg.MidtransServerKey, cfg.MidtransIsProduction)
	mailer := email.NewClient(cfg.ResendAPIKey, cfg.ResendFromEmail)

	chatDeps := chat.NewDeps(chatRepo, vendorRepo, disputeRepo, userRepo, chatHub, notificationRepo, storageClient)
	whatsappDeps := whatsapp.NewDeps(whatsappLinkRepo, chatRepo, vendorRepo, userRepo, otpRepo, disputeRepo, limiter, chatHub, mailer, cfg)
	// chat.Deps is built first (chat doesn't know about whatsapp), then
	// wired to the relay here so a new message sent from the web app also
	// gets forwarded to WhatsApp when the other participant is linked.
	chatDeps.Notifier = whatsappDeps

	agreementRepo := repository.NewAgreementRepo(pool)

	deps := httpserver.Deps{
		GoogleAuth: googleauth.NewDeps(userRepo, agreementRepo, limiter, cfg),
		Auth: auth.NewDeps(
			userRepo,
			otpRepo,
			agreementRepo,
			limiter,
			mailer,
			cfg,
		),
		Vendors:        vendors.NewDeps(vendorRepo, vendorNameChangeRepo, storageClient, reviewRepo, disbursementRepo),
		Admin:          admin.NewDeps(vendorRepo, vendorNameChangeRepo, disbursementRepo, disputeRepo, userRepo, bookingRepo, auditLogRepo, notificationRepo),
		Chat:           chatDeps,
		Whatsapp:       whatsappDeps,
		Budget:         budget.NewDeps(repository.NewBudgetRepo(pool)),
		Inspiration:    inspiration.NewDeps(repository.NewInspirationRepo(pool), storageClient, auditLogRepo),
		WeddingPlanner: weddingplanner.NewDeps(plannerRepo),
		Notifications:  notifications.NewDeps(notificationRepo),
		GuestList:      guestlist.NewDeps(guestRepo, repository.NewRSVPLinkRepo(pool), limiter),
		Rundown:        rundown.NewDeps(repository.NewRundownRepo(pool)),
		InvitationLink: invitationlink.NewDeps(userRepo, guestRepo, repository.NewRSVPLinkRepo(pool), bookingRepo, limiter, cfg),
		Seating:        seating.NewDeps(repository.NewSeatingTableRepo(pool), repository.NewSeatingAssignmentRepo(pool), guestRepo),
		Booking: booking.NewDeps(
			bookingRepo,
			repository.NewTransactionRepo(pool),
			repository.NewMeetingRepo(pool),
			disbursementRepo,
			vendorRepo,
			userRepo,
			plannerRepo,
			reviewRepo,
			notificationRepo,
			midtransClient,
		),
	}

	return &App{
		Config:  cfg,
		Handler: httpserver.NewRouter(pool, cfg, deps),
		Close:   pool.Close,
	}, nil
}
