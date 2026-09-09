// Package budget implements the Budget Planner (PRD §8.8): a Client's
// total wedding budget auto-split across fixed categories, adjustable
// while keeping percentages summing to 100.
package budget

import "duacincin/server/internal/repository"

// ValidCategories mirrors the PRD §8.8 default split (the percentages here
// are only defaults for reference/tests — the frontend sends whatever
// percentages the Client actually settled on).
var DefaultPercentages = map[string]float64{
	"venue_catering":      40,
	"decor":               15,
	"photo_video":         12,
	"mua_attire":          10,
	"entertainment":       8,
	"invitation_souvenir": 5,
	"reserve":             10,
}

type Deps struct {
	Budget *repository.BudgetRepo
}

func NewDeps(budgetRepo *repository.BudgetRepo) *Deps {
	return &Deps{Budget: budgetRepo}
}
