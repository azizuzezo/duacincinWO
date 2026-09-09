// Package inspiration implements the curated Inspirasi gallery (PRD §8.7):
// real Indonesian wedding photos, uploaded only by Admin/the curation team
// — never AI-generated, never foreign stock (§6). MVP scope is the data
// structure plus an Admin upload panel, per the PRD's own note that ongoing
// curation is an editorial task, not something to build once.
package inspiration

import (
	"duacincin/server/internal/repository"
	"duacincin/server/internal/storage"
)

const Bucket = "inspirasi"

type Deps struct {
	Inspiration *repository.InspirationRepo
	Storage     *storage.Client
}

func NewDeps(inspirationRepo *repository.InspirationRepo, storageClient *storage.Client) *Deps {
	return &Deps{Inspiration: inspirationRepo, Storage: storageClient}
}
