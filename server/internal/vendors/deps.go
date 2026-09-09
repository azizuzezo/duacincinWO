// Package vendors implements vendor profile management, portfolio upload,
// and the public anonymized directory (PRD §8.3).
package vendors

import (
	"duacincin/server/internal/repository"
	"duacincin/server/internal/storage"
)

const PortfolioBucket = "portofolio-vendor"

var ValidCategories = map[string]bool{
	"venue":               true,
	"catering":            true,
	"decor":               true,
	"mua_attire":          true,
	"photo_video":         true,
	"entertainment":       true,
	"invitation_souvenir": true,
}

type Deps struct {
	Vendors *repository.VendorRepo
	Storage *storage.Client
}

func NewDeps(vendors *repository.VendorRepo, storageClient *storage.Client) *Deps {
	return &Deps{Vendors: vendors, Storage: storageClient}
}
