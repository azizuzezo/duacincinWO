// Package rundown implements the Client-only wedding-day schedule (jam
// demi jam: akad, resepsi, sesi foto, dst), an extension of Wedding
// Planner requested directly by the user, beyond the original PRD §8.9
// checklist scope. No public/share view yet (deliberately out of scope
// for this pass, see the redesign design doc).
package rundown

import "duacincin/server/internal/repository"

type Deps struct {
	Rundown *repository.RundownRepo
}

func NewDeps(rundown *repository.RundownRepo) *Deps {
	return &Deps{Rundown: rundown}
}
