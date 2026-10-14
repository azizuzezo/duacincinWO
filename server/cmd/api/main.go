package main

import (
	"context"
	"log"
	"net/http"

	"duacincin/server/internal/admin"
	"duacincin/server/internal/auth"
	"duacincin/server/internal/booking"
	"duacincin/server/internal/budget"
	"duacincin/server/internal/chat"
	"duacincin/server/internal/config"
	"duacincin/server/internal/db"
	"duacincin/server/internal/email"
	"duacincin/server/internal/guestlist"
	"duacincin/server/internal/httpserver"
	"duacincin/server/internal/inspiration"
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

func main() {
	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	if err := migrations.Run(cfg.DatabasePooler); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	pool, err := db.New(ctx, cfg.DatabasePooler)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	storageClient := storage.NewClient(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)
	if storageClient.Configured() {
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

	deps := httpserver.Deps{
		Auth: auth.NewDeps(
			userRepo,
			otpRepo,
			repository.NewAgreementRepo(pool),
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

	router := httpserver.NewRouter(pool, cfg, deps)

	addr := ":" + cfg.Port
	log.Printf("duacincin-api listening on %s (env=%s)", addr, cfg.AppEnv)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("server: %v", err)
	}
}
