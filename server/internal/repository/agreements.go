package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	AgreementTypeVendorPartnership = "vendor_partnership"
	AgreementTypeClientTOS         = "client_tos"

	// CurrentAgreementVersion is the legal text in force (web/src/lib/legal.ts,
	// LEGAL_VERSION 2.0, effective 14 November 2026). Bump this any
	// time the legal text materially changes, so old acceptances stay
	// attributable to the version the user actually saw.
	CurrentAgreementVersion = "v2-2026-11-14"
)

type AgreementRepo struct {
	pool *pgxpool.Pool
}

func NewAgreementRepo(pool *pgxpool.Pool) *AgreementRepo {
	return &AgreementRepo{pool: pool}
}

// RecordAcceptance stores evidence (PRD §8.6) that userID accepted
// agreementType at CurrentAgreementVersion, with a server timestamp.
func (r *AgreementRepo) RecordAcceptance(ctx context.Context, userID, agreementType string) error {
	_, err := r.pool.Exec(ctx, `
		insert into agreement_acceptances (user_id, agreement_type, version)
		values ($1, $2, $3)
	`, userID, agreementType, CurrentAgreementVersion)
	return err
}
