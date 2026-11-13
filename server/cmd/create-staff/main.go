// create-staff bootstraps an internal account (admin or wedding consultant)
// straight in the database, for the first admin who then adds everyone else
// from /internal/admin/staff. If the email already exists the account is
// promoted to the role and gets the new password.
//
//	STAFF_PASSWORD='…' go run ./cmd/create-staff -email you@example.com -name "Your Name" -role admin
//
// The password is read from STAFF_PASSWORD so it never lands in shell history
// or in the repo.
package main

import (
	"context"
	"errors"
	"flag"
	"log"
	"os"
	"slices"
	"strings"

	"duacincin/server/internal/config"
	"duacincin/server/internal/db"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/security"
)

func main() {
	email := flag.String("email", "", "account email")
	name := flag.String("name", "", "full name")
	role := flag.String("role", "admin", "admin or wedding_consultant")
	flag.Parse()

	password := os.Getenv("STAFF_PASSWORD")
	*email = strings.ToLower(strings.TrimSpace(*email))
	if *email == "" || len(password) < 8 || !slices.Contains(repository.StaffRoles, *role) {
		log.Fatal("need -email, -role admin|wedding_consultant and STAFF_PASSWORD (min 8 chars)")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	ctx := context.Background()
	pool, err := db.New(ctx, cfg.DatabasePooler)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	users := repository.NewUserRepo(pool)
	hash, err := security.HashPassword(password)
	if err != nil {
		log.Fatalf("hash: %v", err)
	}

	existing, err := users.GetByEmail(ctx, *email)
	switch {
	case errors.Is(err, repository.ErrNotFound):
		u, err := users.Create(ctx, *email, hash, *role, *name)
		if err != nil {
			log.Fatalf("create: %v", err)
		}
		log.Printf("created %s as %s (id %s)", u.Email, u.Role, u.ID)
	case err != nil:
		log.Fatalf("lookup: %v", err)
	default:
		if err := users.PromoteToStaff(ctx, existing.ID, *role, hash, *name); err != nil {
			log.Fatalf("promote: %v", err)
		}
		log.Printf("updated %s: was %s, now %s (id %s)", existing.Email, existing.Role, *role, existing.ID)
	}
}
