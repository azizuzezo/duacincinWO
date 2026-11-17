package vendors

import (
	"net/http"
	"strings"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/wilayah"
)

type upsertProfileRequest struct {
	BusinessName string `json:"business_name"`
	// Categories: every kind of service offered, the main one first.
	// Category (a single value) is still accepted from older clients.
	Categories []string `json:"categories"`
	Category   string   `json:"category"`
	// Cities: the kabupaten/kota served, from the national list. City (a
	// single name) is still accepted from older clients.
	Cities      []string `json:"cities"`
	City        string   `json:"city"`
	PriceMin    int64    `json:"price_min"`
	PriceMax    int64    `json:"price_max"`
	Description string   `json:"description"`
	// WhatsAppNumber is required; left empty, the number already saved is kept.
	WhatsAppNumber string `json:"whatsapp_number"`
}

type profileDTO struct {
	UserID          string   `json:"user_id"`
	BusinessName    string   `json:"business_name"`
	Category        string   `json:"category"`
	Categories      []string `json:"categories"`
	City            string   `json:"city"`
	Cities          []string `json:"cities"`
	PriceMin        int64    `json:"price_min"`
	PriceMax        int64    `json:"price_max"`
	Description     string   `json:"description"`
	Status          string   `json:"status"`
	RejectionReason *string  `json:"rejection_reason,omitempty"`
	// WhatsAppNumber is only set on the vendor's own profile (ownProfileDTO),
	// never on the public detail, which also uses toProfileDTO.
	WhatsAppNumber    string         `json:"whatsapp_number,omitempty"`
	Portfolio         []portfolioDTO `json:"portfolio,omitempty"`
	PendingNameChange *nameChangeDTO `json:"pending_name_change,omitempty"`
	AverageRating     float64        `json:"average_rating"`
	ReviewCount       int            `json:"review_count"`
}

type portfolioDTO struct {
	ID      string `json:"id"`
	URL     string `json:"url"`
	AltText string `json:"alt_text"`
}

func toProfileDTO(p *repository.VendorProfile) profileDTO {
	return profileDTO{
		UserID:          p.UserID,
		BusinessName:    p.BusinessName,
		Category:        p.Category,
		Categories:      nonNil(p.Categories),
		City:            p.City,
		Cities:          nonNil(p.Cities),
		PriceMin:        p.PriceMin,
		PriceMax:        p.PriceMax,
		Description:     p.Description,
		Status:          p.Status,
		RejectionReason: p.RejectionReason,
	}
}

// ownProfileDTO is the vendor's own view of its profile: the public fields
// plus the private WhatsApp number.
func ownProfileDTO(p *repository.VendorProfile) profileDTO {
	dto := toProfileDTO(p)
	dto.WhatsAppNumber = p.WhatsAppNumber
	return dto
}

// UpsertProfile lets a Vendor create their profile on first save, or
// update the editable fields afterward. business_name is only used on
// first creation — once a profile exists, it can only change through an
// approved vendor_name_change_request, so any business_name in the
// request body is ignored past that point (existing value is reused).
func UpsertProfile(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		var req upsertProfileRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "data yang dikirim tidak lengkap, coba lagi")
			return
		}

		req.BusinessName = strings.TrimSpace(req.BusinessName)
		req.City = strings.TrimSpace(req.City)

		businessName := req.BusinessName
		savedWhatsApp := ""
		existing, err := deps.Vendors.GetByUserID(r.Context(), claims.UserID)
		if err == nil {
			businessName = existing.BusinessName
			savedWhatsApp = existing.WhatsAppNumber
		} else if err != repository.ErrNotFound {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		} else if businessName == "" {
			httpx.Error(w, http.StatusBadRequest, "nama usaha wajib diisi")
			return
		}

		if len(req.Categories) == 0 && req.Category != "" {
			req.Categories = []string{req.Category}
		}
		categories, msg := normalizeCategories(req.Categories)
		if msg != "" {
			httpx.Error(w, http.StatusBadRequest, msg)
			return
		}
		if len(req.Cities) == 0 && req.City != "" {
			req.Cities = []string{req.City}
		}
		cities, msg := normalizeCities(req.Cities)
		if msg != "" {
			httpx.Error(w, http.StatusBadRequest, msg)
			return
		}
		whatsapp := savedWhatsApp
		if strings.TrimSpace(req.WhatsAppNumber) != "" {
			n, ok := NormalizeWhatsApp(req.WhatsAppNumber)
			if !ok {
				httpx.Error(w, http.StatusBadRequest, "nomor WhatsApp tidak valid, contoh: 0812 3456 7890")
				return
			}
			whatsapp = n
		}
		if whatsapp == "" {
			httpx.Error(w, http.StatusBadRequest, "nomor WhatsApp wajib diisi")
			return
		}
		if req.PriceMin < 0 || req.PriceMax < req.PriceMin {
			httpx.Error(w, http.StatusBadRequest, "rentang harga tidak valid")
			return
		}

		profile, err := deps.Vendors.UpsertProfile(
			r.Context(), claims.UserID, businessName, categories, cities,
			req.PriceMin, req.PriceMax, req.Description, whatsapp,
		)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusOK, ownProfileDTO(profile))
	}
}

// NormalizeWhatsApp turns an Indonesian mobile number as people type it
// ("0812-3456-7890", "+62 812 3456 7890", "812 3456 7890") into digits
// starting with 628. Mobile numbers are 628 followed by 7 to 11 digits.
func NormalizeWhatsApp(raw string) (string, bool) {
	var b strings.Builder
	for i, r := range strings.TrimSpace(raw) {
		switch {
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '+' && i == 0, r == ' ', r == '-', r == '.', r == '(', r == ')':
		default:
			return "", false
		}
	}
	d := b.String()
	switch {
	case strings.HasPrefix(d, "62"):
	case strings.HasPrefix(d, "0"):
		d = "62" + d[1:]
	case strings.HasPrefix(d, "8"):
		d = "62" + d
	default:
		return "", false
	}
	if !strings.HasPrefix(d, "628") || len(d) < 10 || len(d) > 14 {
		return "", false
	}
	return d, true
}

// normalizeCategories checks each category, keeps the order given (the first
// is the vendor's main category) and drops repeats.
func normalizeCategories(in []string) ([]string, string) {
	out := make([]string, 0, len(in))
	seen := map[string]bool{}
	for _, c := range in {
		c = strings.TrimSpace(c)
		if !ValidCategories[c] {
			return nil, "kategori tidak valid"
		}
		if !seen[c] {
			seen[c] = true
			out = append(out, c)
		}
	}
	if len(out) == 0 {
		return nil, "pilih minimal satu kategori usaha"
	}
	return out, ""
}

// normalizeCities checks each name against the national kabupaten/kota list
// (so the directory groups vendors under one spelling), keeps the list's
// spelling and drops repeats. A non-empty message means the input is refused.
func normalizeCities(in []string) ([]string, string) {
	out := make([]string, 0, len(in))
	seen := map[string]bool{}
	for _, name := range in {
		c, ok := wilayah.Canonical(name)
		if !ok {
			return nil, "pilih kabupaten/kota dari daftar"
		}
		if !seen[c] {
			seen[c] = true
			out = append(out, c)
		}
	}
	switch {
	case len(out) == 0:
		return nil, "kota wajib diisi"
	case len(out) > wilayah.MaxCities:
		return nil, "pilih paling banyak 10 kabupaten/kota"
	}
	return out, ""
}

func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// MyProfile returns the authenticated Vendor's own profile + portfolio,
// including its current approval status.
func MyProfile(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		profile, err := deps.Vendors.GetByUserID(r.Context(), claims.UserID)
		if err != nil {
			if err == repository.ErrNotFound {
				httpx.Error(w, http.StatusNotFound, "profil belum dibuat")
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		items, err := deps.Vendors.ListPortfolio(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		dto := ownProfileDTO(profile)
		dto.Portfolio = toPortfolioDTOs(items)
		if avg, count, err := deps.Reviews.GetAggregateForVendor(r.Context(), claims.UserID); err == nil {
			dto.AverageRating, dto.ReviewCount = avg, count
		}

		if pending, err := deps.NameChange.GetPendingForVendor(r.Context(), claims.UserID); err == nil {
			nameChange := toNameChangeDTO(pending)
			dto.PendingNameChange = &nameChange
		} else if err != repository.ErrNotFound {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		httpx.JSON(w, http.StatusOK, dto)
	}
}

func toPortfolioDTOs(items []repository.PortfolioItem) []portfolioDTO {
	out := make([]portfolioDTO, 0, len(items))
	for _, it := range items {
		out = append(out, portfolioDTO{ID: it.ID, URL: it.PublicURL, AltText: it.AltText})
	}
	return out
}
