// Package vendors implements vendor profile management, portfolio upload,
// and the public vendor directory (PRD §8.3).
package vendors

import (
	"duacincin/server/internal/repository"
	"duacincin/server/internal/storage"
)

const PortfolioBucket = "portofolio-vendor"

// ValidCategories mirrors the vendor_category enum (migrations 000002 and
// 000025) and web/src/lib/api.ts VENDOR_CATEGORIES.
var ValidCategories = map[string]bool{
	"venue":               true,
	"catering":            true,
	"decor":               true,
	"mua_attire":          true,
	"photo_video":         true,
	"entertainment":       true,
	"invitation_souvenir": true,
	"hantaran":            true,
	"mc":                  true,
	"content_creator":     true,
	"wedding_car":         true,
	"wedding_cake":        true,
}

type Deps struct {
	Vendors       *repository.VendorRepo
	NameChange    *repository.VendorNameChangeRepo
	Storage       *storage.Client
	Reviews       *repository.ReviewRepo
	Disbursements *repository.DisbursementRepo
	Packages      *repository.PackageRepo
	// WhatsApp, when set, makes a verified number win over the form value.
	WhatsApp *repository.WhatsAppLinkRepo
}

func NewDeps(vendors *repository.VendorRepo, nameChange *repository.VendorNameChangeRepo, storageClient *storage.Client, reviews *repository.ReviewRepo, disbursements *repository.DisbursementRepo) *Deps {
	return &Deps{Vendors: vendors, NameChange: nameChange, Storage: storageClient, Reviews: reviews, Disbursements: disbursements, Packages: vendors.Packages()}
}
