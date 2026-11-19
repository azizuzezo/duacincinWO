package aiassist

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"

	"duacincin/server/internal/budget"
	"duacincin/server/internal/repository"
	"duacincin/server/internal/vendors"
	"duacincin/server/internal/wilayah"
)

// The assistant answers from real data only: every vendor, photo, rupiah
// amount and article the visitor sees comes out of one of these tools, which
// read the same repositories as the public pages. Each tool returns two
// things: a compact JSON summary the model reads (toolOutput.ForModel), and
// a typed block the landing renders as a card (toolOutput.Block).

type block struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

type toolOutput struct {
	ForModel string
	Block    *block
	// Status is the short line shown while the tool runs ("Mencari MUA di Bandung").
	Status string
}

const (
	maxVendors      = 6
	maxInspirations = 8
	maxTimeline     = 8
	maxPortfolio    = 5
)

var vendorCategoryLabels = map[string]string{
	"venue":               "Venue",
	"catering":            "Catering",
	"decor":               "Dekorasi",
	"mua_attire":          "MUA & Attire",
	"photo_video":         "Foto & Video",
	"entertainment":       "Entertainment",
	"invitation_souvenir": "Undangan & Souvenir",
	"hantaran":            "Hantaran & Seserahan",
	"mc":                  "MC",
	"content_creator":     "Wedding Content Creator",
	"wedding_car":         "Mobil Pengantin",
	"wedding_cake":        "Kue Pengantin",
}

var budgetLabels = map[string]string{
	"venue_catering":      "Venue & Catering",
	"decor":               "Dekorasi",
	"photo_video":         "Foto & Video",
	"mua_attire":          "MUA & Attire",
	"entertainment":       "Entertainment",
	"invitation_souvenir": "Undangan & Souvenir",
	"reserve":             "Dana cadangan",
}

// budgetOrder keeps the card in the same order as the Budget Planner.
var budgetOrder = []string{"venue_catering", "decor", "photo_video", "mua_attire", "entertainment", "invitation_souvenir", "reserve"}

// articles mirrors web/src/content/artikel/registry.ts (slug + title only;
// the landing reads the rest from the registry by slug). Keep in sync when
// an article is published.
var articles = []struct{ Slug, Title, Topic string }{
	{"checklist-persiapan-pernikahan", "Checklist persiapan pernikahan 12 bulan, dari lamaran sampai hari H", "Perencanaan"},
	{"cara-menyusun-anggaran-pernikahan", "Cara menyusun anggaran pernikahan supaya tidak membengkak", "Anggaran"},
	{"cara-memilih-venue-pernikahan", "Cara memilih venue pernikahan: 9 hal yang perlu dicek sebelum DP", "Venue"},
	{"tips-memilih-vendor-pernikahan", "Tips memilih vendor pernikahan yang aman dan tepercaya", "Vendor"},
	{"ragam-adat-pernikahan-indonesia", "Mengenal ragam adat pernikahan di Indonesia dan vendor yang dibutuhkan", "Adat"},
}

func categoryEnum() []string {
	out := make([]string, 0, len(vendors.ValidCategories))
	for c := range vendors.ValidCategories {
		out = append(out, c)
	}
	sort.Strings(out)
	return out
}

func articleEnum() []string {
	out := make([]string, len(articles))
	for i, a := range articles {
		out[i] = a.Slug
	}
	return out
}

func toolDefs() []toolDef {
	obj := func(props map[string]any, required ...string) map[string]any {
		m := map[string]any{"type": "object", "properties": props}
		if len(required) > 0 {
			m["required"] = required
		}
		return m
	}
	return []toolDef{
		{Type: "function", Function: toolDefFunc{
			Name:        "cari_vendor",
			Description: "Cari vendor pernikahan sungguhan yang terdaftar dan terverifikasi di DuaCincin. Pakai setiap kali pengguna mencari, meminta rekomendasi, atau membandingkan vendor. Hasilnya tampil sebagai kartu vendor.",
			Parameters: obj(map[string]any{
				"kategori":    map[string]any{"type": "string", "enum": categoryEnum(), "description": "Jenis vendor."},
				"kota":        map[string]any{"type": "string", "description": "Nama kabupaten/kota tanpa awalan Kota/Kabupaten, misalnya Bandung, Jakarta Selatan, Sleman. Kosongkan kalau pengguna tidak menyebut kota."},
				"budget_maks": map[string]any{"type": "integer", "description": "Batas harga mulai vendor dalam rupiah penuh (misalnya 5000000). Kosongkan kalau tidak disebut."},
			}, "kategori"),
		}},
		{Type: "function", Function: toolDefFunc{
			Name:        "cari_inspirasi",
			Description: "Cari foto inspirasi pernikahan Indonesia dari galeri kurasi DuaCincin (dekorasi, pelaminan, busana, adat, warna, suasana). Pakai saat pengguna minta ide, tema, konsep, atau ingin melihat contoh.",
			Parameters: obj(map[string]any{
				"kata_kunci": map[string]any{"type": "string", "description": "Satu atau dua kata kunci singkat, misalnya: jawa, rustic, pelaminan, garden, sage, minang."},
			}, "kata_kunci"),
		}},
		{Type: "function", Function: toolDefFunc{
			Name:        "hitung_budget",
			Description: "Hitung pembagian budget pernikahan per pos dengan rumus Budget Planner DuaCincin. Wajib dipakai setiap kali pengguna menyebut total budget atau bertanya cukup tidaknya budget. Jangan menghitung sendiri.",
			Parameters: obj(map[string]any{
				"total":       map[string]any{"type": "integer", "description": "Total budget dalam rupiah penuh, misalnya 80000000."},
				"jumlah_tamu": map[string]any{"type": "integer", "description": "Perkiraan jumlah tamu, kalau disebut."},
			}, "total"),
		}},
		{Type: "function", Function: toolDefFunc{
			Name:        "tampilkan_timeline",
			Description: "Tampilkan langkah persiapan pernikahan sebagai timeline visual. Pakai saat pengguna bertanya urutan persiapan, checklist, jadwal, atau apa yang harus dilakukan dalam sekian bulan.",
			Parameters: obj(map[string]any{
				"judul": map[string]any{"type": "string", "description": "Judul singkat timeline."},
				"langkah": map[string]any{
					"type":     "array",
					"maxItems": maxTimeline,
					"items": obj(map[string]any{
						"waktu":  map[string]any{"type": "string", "description": "Kapan, misalnya: 9 bulan sebelum, H-30, Hari H."},
						"judul":  map[string]any{"type": "string"},
						"detail": map[string]any{"type": "string", "description": "Satu kalimat."},
					}, "waktu", "judul"),
				},
			}, "judul", "langkah"),
		}},
		{Type: "function", Function: toolDefFunc{
			Name:        "hubungi_konsultan",
			Description: "Tampilkan kartu untuk chat dengan Wedding Consultant DuaCincin (staf manusia). HANYA dipanggil kalau pengguna secara jelas meminta bicara/chat dengan Wedding Consultant, konsultan, admin, CS, atau manusia.",
			Parameters:  obj(map[string]any{}),
		}},
		{Type: "function", Function: toolDefFunc{
			Name:        "tampilkan_artikel",
			Description: "Tampilkan artikel panduan DuaCincin yang relevan sebagai bacaan lanjutan.",
			Parameters: obj(map[string]any{
				"slugs": map[string]any{"type": "array", "maxItems": 3, "items": map[string]any{"type": "string", "enum": articleEnum()}},
			}, "slugs"),
		}},
	}
}

// statusFor is the line shown while a tool is about to run, built from its
// arguments so the visitor sees what is actually being searched.
func statusFor(name, rawArgs string) string {
	var a map[string]any
	_ = json.Unmarshal([]byte(rawArgs), &a)
	str := func(k string) string { s, _ := a[k].(string); return strings.TrimSpace(s) }
	switch name {
	case "cari_vendor":
		s := "Mencari vendor"
		if l, ok := vendorCategoryLabels[str("kategori")]; ok {
			s = "Mencari " + l
		}
		if k := str("kota"); k != "" {
			s += " di " + k
		}
		return s
	case "cari_inspirasi":
		if k := str("kata_kunci"); k != "" {
			return "Membuka galeri inspirasi “" + k + "”"
		}
		return "Membuka galeri inspirasi"
	case "hitung_budget":
		return "Menghitung pembagian budget"
	case "tampilkan_timeline":
		return "Menyusun timeline persiapan"
	case "tampilkan_artikel":
		return "Memilih bacaan yang pas"
	case "hubungi_konsultan":
		return "Menghubungkan ke Wedding Consultant"
	}
	return "Sedang menyiapkan"
}

func (d *Deps) runTool(ctx context.Context, name, rawArgs string) toolOutput {
	out, err := d.dispatch(ctx, name, rawArgs)
	if err != nil {
		return toolOutput{ForModel: fmt.Sprintf(`{"error":%q}`, err.Error())}
	}
	return out
}

func (d *Deps) dispatch(ctx context.Context, name, rawArgs string) (toolOutput, error) {
	if strings.TrimSpace(rawArgs) == "" {
		rawArgs = "{}"
	}
	switch name {
	case "cari_vendor":
		var a struct {
			Kategori   string  `json:"kategori"`
			Kota       string  `json:"kota"`
			BudgetMaks float64 `json:"budget_maks"`
		}
		if err := json.Unmarshal([]byte(rawArgs), &a); err != nil {
			return toolOutput{}, fmt.Errorf("argumen tidak valid")
		}
		return d.findVendors(ctx, a.Kategori, a.Kota, int64(a.BudgetMaks))
	case "cari_inspirasi":
		var a struct {
			KataKunci string `json:"kata_kunci"`
		}
		_ = json.Unmarshal([]byte(rawArgs), &a)
		return d.findInspiration(ctx, a.KataKunci)
	case "hitung_budget":
		// Models send numbers in many shapes (10000000, "10 juta",
		// "Rp10.000.000"): read them all rather than fail silently.
		var a struct {
			Total      json.RawMessage `json:"total"`
			JumlahTamu json.RawMessage `json:"jumlah_tamu"`
		}
		if err := json.Unmarshal([]byte(rawArgs), &a); err != nil {
			return toolOutput{}, fmt.Errorf("argumen tidak valid")
		}
		total := amountFromText(strings.Trim(string(a.Total), `"`), true)
		guests := int(digitsOnly(strings.Trim(string(a.JumlahTamu), `"`)))
		return splitBudget(total, guests)
	case "tampilkan_timeline":
		return timeline(rawArgs)
	case "hubungi_konsultan":
		b := consultantBlock("", "", "", 0)
		b.Data.(map[string]any)["requested"] = true
		return toolOutput{ForModel: `{"ok":true,"catatan":"Kartu chat Wedding Consultant sudah tampil. Jawab singkat dan hangat."}`, Block: b}, nil
	case "tampilkan_artikel":
		var a struct {
			Slugs []string `json:"slugs"`
		}
		_ = json.Unmarshal([]byte(rawArgs), &a)
		return showArticles(a.Slugs)
	}
	return toolOutput{}, fmt.Errorf("alat %q tidak dikenal", name)
}

type vendorCardDTO struct {
	ID            string  `json:"id"`
	BusinessName  string  `json:"business_name"`
	Category      string  `json:"category"`
	City          string  `json:"city"`
	PriceMin      int64   `json:"price_min"`
	PriceMax      int64   `json:"price_max"`
	SampleImage   string  `json:"sample_image,omitempty"`
	AverageRating float64 `json:"average_rating"`
	ReviewCount   int     `json:"review_count"`
	// Reasons are short "kenapa cocok" tags, from facts only.
	Reasons []string `json:"reasons"`
	// Images are up to 5 portfolio photos (the first is SampleImage).
	Images      []string `json:"images"`
	Description string   `json:"description,omitempty"`
}

func normalizeCity(raw string) string {
	s := strings.TrimSpace(raw)
	for _, p := range []string{"Kota ", "kota ", "Kabupaten ", "kabupaten "} {
		s = strings.TrimPrefix(s, p)
	}
	if c, ok := wilayah.Canonical(s); ok {
		return c
	}
	return s
}

// cityVariants is the city plus its same-name kota/kabupaten twin, when the
// wilayah list has one ("Bandung" <-> "Kab. Bandung"). "" stays "" (any city).
func cityVariants(city string) []string {
	if city == "" {
		return []string{""}
	}
	out := []string{city}
	if bare, ok := strings.CutPrefix(city, "Kab. "); ok {
		if c, ok := wilayah.Canonical(bare); ok {
			out = append(out, c)
		}
	} else if c, ok := wilayah.Canonical("Kab. " + city); ok {
		out = append(out, c)
	}
	return out
}

func (d *Deps) findVendors(ctx context.Context, category, city string, maxPrice int64) (toolOutput, error) {
	if !vendors.ValidCategories[category] {
		return toolOutput{}, fmt.Errorf("kategori %q tidak ada", category)
	}
	if maxPrice < 0 {
		maxPrice = 0
	}
	city = normalizeCity(city)

	// "Bandung" to a visitor means both Kota Bandung and Kab. Bandung (two
	// entries in the wilayah list), so search every same-name variant.
	var profiles []repository.VendorProfile
	seen := map[string]bool{}
	for _, c := range cityVariants(city) {
		found, err := d.Vendors.ListApproved(ctx, category, c, maxPrice)
		if err != nil {
			return toolOutput{}, fmt.Errorf("pencarian vendor gagal")
		}
		for _, p := range found {
			if !seen[p.UserID] {
				seen[p.UserID] = true
				profiles = append(profiles, p)
			}
		}
	}
	label := vendorCategoryLabels[category]
	// Only vendors registered and approved on DuaCincin are ever shown. When
	// none fits, the visitor is handed to a Wedding Consultant instead of a
	// guess (no vendors from other cities, never vendors from outside).
	if len(profiles) == 0 {
		where := ""
		if city != "" {
			where = " di " + city
		}
		budgetNote := ""
		if maxPrice > 0 {
			budgetNote = fmt.Sprintf(" dengan harga mulai di bawah %s", rupiah(maxPrice))
		}
		reason := fmt.Sprintf("Belum ada vendor %s%s%s yang terdaftar di DuaCincin.", label, where, budgetNote)
		js, _ := json.Marshal(map[string]any{
			"jumlah_ditemukan": 0,
			"catatan":          reason + " Jangan menyebut atau mengarang vendor lain, dan jangan menyarankan mencari di luar DuaCincin. Katakan terus terang; kartu Wedding Consultant sudah tampil otomatis untuk membantu mencarikan.",
		})
		return toolOutput{ForModel: string(js), Block: consultantBlock(reason, category, city, maxPrice)}, nil
	}

	total := len(profiles)
	cards := make([]vendorCardDTO, 0, maxVendors)
	for _, p := range profiles {
		rate := p.EffectiveCommissionRate()
		c := vendorCardDTO{
			ID: p.UserID, BusinessName: p.BusinessName, Category: category, City: p.City,
			PriceMin: repository.CustomerPrice(p.PriceMin, rate), PriceMax: repository.CustomerPrice(p.PriceMax, rate),
		}
		c.Images = []string{}
		if items, err := d.Vendors.ListPortfolio(ctx, p.UserID); err == nil && len(items) > 0 {
			c.SampleImage = items[0].PublicURL
			for i, it := range items {
				if i == maxPortfolio {
					break
				}
				c.Images = append(c.Images, it.PublicURL)
			}
		}
		c.Description = shortText(p.Description, 160)
		if avg, n, err := d.Reviews.GetAggregateForVendor(ctx, p.UserID); err == nil {
			c.AverageRating, c.ReviewCount = avg, n
		}
		c.Reasons = matchReasons(c, city, maxPrice)
		cards = append(cards, c)
	}
	// Proof first: reviewed, then rated, then with a photo.
	sort.SliceStable(cards, func(i, j int) bool {
		a, b := cards[i], cards[j]
		if a.ReviewCount != b.ReviewCount {
			return a.ReviewCount > b.ReviewCount
		}
		if a.AverageRating != b.AverageRating {
			return a.AverageRating > b.AverageRating
		}
		return a.SampleImage != "" && b.SampleImage == ""
	})
	if len(cards) > maxVendors {
		cards = cards[:maxVendors]
	}

	forModel := map[string]any{"kategori": label, "jumlah_ditemukan": total, "ditampilkan": len(cards), "catatan": "Hanya vendor ini yang boleh disebut."}
	summ := make([]map[string]any, 0, len(cards))
	for _, c := range cards {
		v := map[string]any{"nama": c.BusinessName, "kota": c.City}
		if c.PriceMin > 0 {
			v["harga_mulai"] = c.PriceMin
		}
		if c.ReviewCount > 0 {
			v["rating"] = math.Round(c.AverageRating*10) / 10
			v["ulasan"] = c.ReviewCount
		}
		summ = append(summ, v)
	}
	forModel["vendor"] = summ
	js, _ := json.Marshal(forModel)

	params := map[string]any{"category": category}
	if city != "" {
		params["city"] = city
	}
	if maxPrice > 0 {
		params["max_price"] = maxPrice
	}
	return toolOutput{ForModel: string(js), Block: &block{Type: "vendors", Data: map[string]any{
		"label": label,
		"city":  city,
		"total": total,
		"query": params,
		"items": cards,
	}}}, nil
}

type inspirationDTO struct {
	ID       string `json:"id"`
	URL      string `json:"url"`
	AltText  string `json:"alt_text"`
	Caption  string `json:"caption"`
	Category string `json:"category"`
}

func (d *Deps) findInspiration(ctx context.Context, keyword string) (toolOutput, error) {
	keyword = strings.TrimSpace(keyword)
	items, err := d.Inspiration.List(ctx, "", keyword)
	if err != nil {
		return toolOutput{}, fmt.Errorf("galeri tidak bisa dibuka")
	}
	exact := true
	// A phrase rarely matches whole; try each word, then the newest photos.
	if len(items) == 0 && strings.Contains(keyword, " ") {
		seen := map[string]bool{}
		for _, w := range strings.Fields(keyword) {
			if len(w) < 3 {
				continue
			}
			more, err := d.Inspiration.List(ctx, "", w)
			if err != nil {
				continue
			}
			for _, it := range more {
				if !seen[it.ID] {
					seen[it.ID] = true
					items = append(items, it)
				}
			}
		}
	}
	if len(items) == 0 {
		exact = false
		items, err = d.Inspiration.List(ctx, "", "")
		if err != nil {
			return toolOutput{}, fmt.Errorf("galeri tidak bisa dibuka")
		}
	}
	if len(items) > maxInspirations {
		items = items[:maxInspirations]
	}
	out := make([]inspirationDTO, 0, len(items))
	captions := make([]string, 0, len(items))
	for _, it := range items {
		out = append(out, inspirationDTO{ID: it.ID, URL: it.PublicURL, AltText: it.AltText, Caption: it.Caption, Category: it.Category})
		if it.Caption != "" {
			captions = append(captions, it.Caption)
		} else {
			captions = append(captions, it.Category)
		}
	}
	js, _ := json.Marshal(map[string]any{"cocok_dengan_kata_kunci": exact, "jumlah": len(out), "foto": captions})
	if len(out) == 0 {
		return toolOutput{ForModel: string(js)}, nil
	}
	return toolOutput{ForModel: string(js), Block: &block{Type: "inspirations", Data: map[string]any{
		"keyword": keyword,
		"exact":   exact,
		"items":   out,
	}}}, nil
}

type budgetLine struct {
	Key        string  `json:"key"`
	Label      string  `json:"label"`
	Percentage float64 `json:"percentage"`
	Amount     int64   `json:"amount"`
}

func splitBudget(total int64, guests int) (toolOutput, error) {
	if total < 1_000_000 || total > 100_000_000_000 {
		return toolOutput{}, fmt.Errorf("total budget harus antara 1 juta dan 100 miliar rupiah")
	}
	if guests < 0 || guests > 100_000 {
		guests = 0
	}
	lines := make([]budgetLine, 0, len(budgetOrder))
	var used int64
	for i, k := range budgetOrder {
		pct := budget.DefaultPercentages[k]
		amt := int64(math.Round(float64(total) * pct / 100))
		if i == len(budgetOrder)-1 {
			amt = total - used // rounding drift lands in the reserve
		}
		used += amt
		lines = append(lines, budgetLine{Key: k, Label: budgetLabels[k], Percentage: pct, Amount: amt})
	}
	data := map[string]any{"total": total, "lines": lines}
	// The model gets plain sentences in rupiah, largest first, so it does not
	// misread keys or recompute numbers.
	readable := make([]string, 0, len(lines))
	for _, l := range lines {
		readable = append(readable, fmt.Sprintf("%s: %s (%g%%)", l.Label, rupiah(l.Amount), l.Percentage))
	}
	forModel := map[string]any{
		"total_budget":      rupiah(total),
		"pembagian_per_pos": readable,
		"pos_terbesar":      fmt.Sprintf("%s, %s", lines[0].Label, rupiah(lines[0].Amount)),
		"catatan":           "Angka ini rumus default Budget Planner DuaCincin dan sudah tampil sebagai kartu. Pakai angka ini apa adanya, jangan dihitung ulang.",
	}
	if guests > 0 {
		perGuest := lines[0].Amount / int64(guests)
		data["guests"] = guests
		data["per_guest"] = perGuest
		forModel["jumlah_tamu"] = guests
		forModel["venue_dan_catering_per_tamu"] = rupiah(perGuest)
	}
	js, _ := json.Marshal(forModel)
	return toolOutput{ForModel: string(js), Block: &block{Type: "budget", Data: data}}, nil
}

func timeline(rawArgs string) (toolOutput, error) {
	var a struct {
		Judul   string `json:"judul"`
		Langkah []struct {
			Waktu  string `json:"waktu"`
			Judul  string `json:"judul"`
			Detail string `json:"detail"`
		} `json:"langkah"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &a); err != nil || len(a.Langkah) == 0 {
		return toolOutput{}, fmt.Errorf("timeline butuh minimal satu langkah")
	}
	if len(a.Langkah) > maxTimeline {
		a.Langkah = a.Langkah[:maxTimeline]
	}
	clip := func(s string, n int) string {
		s = strings.TrimSpace(s)
		if r := []rune(s); len(r) > n {
			return string(r[:n])
		}
		return s
	}
	steps := make([]map[string]string, 0, len(a.Langkah))
	for _, l := range a.Langkah {
		steps = append(steps, map[string]string{"when": clip(l.Waktu, 40), "title": clip(l.Judul, 80), "detail": clip(l.Detail, 200)})
	}
	return toolOutput{
		ForModel: `{"ok":true,"catatan":"Timeline sudah tampil di layar pengguna, jangan diulang satu per satu."}`,
		Block:    &block{Type: "timeline", Data: map[string]any{"title": clip(a.Judul, 80), "steps": steps}},
	}, nil
}

func showArticles(slugs []string) (toolOutput, error) {
	valid := map[string]bool{}
	for _, a := range articles {
		valid[a.Slug] = true
	}
	out := make([]string, 0, 3)
	seen := map[string]bool{}
	for _, s := range slugs {
		if valid[s] && !seen[s] && len(out) < 3 {
			seen[s] = true
			out = append(out, s)
		}
	}
	if len(out) == 0 {
		return toolOutput{}, fmt.Errorf("artikel tidak ditemukan")
	}
	return toolOutput{ForModel: `{"ok":true}`, Block: &block{Type: "articles", Data: map[string]any{"slugs": out}}}, nil
}

func consultantBlock(reason, category, city string, maxPrice int64) *block {
	label := vendorCategoryLabels[category]
	return &block{Type: "consultant", Data: map[string]any{"reason": reason, "category": category, "label": label, "city": city, "budget": maxPrice}}
}

// matchReasons explains a card with facts the visitor gave and the vendor's
// own data; nothing inferred.
func matchReasons(c vendorCardDTO, city string, maxPrice int64) []string {
	out := []string{}
	if maxPrice > 0 && c.PriceMin > 0 && c.PriceMin <= maxPrice {
		out = append(out, "Dalam budget")
	}
	if city != "" {
		out = append(out, "Melayani "+city)
	}
	if c.ReviewCount > 0 && c.AverageRating >= 4.5 {
		out = append(out, "Rating tinggi")
	}
	return append(out, "Terverifikasi")
}

func rupiah(n int64) string {
	s := fmt.Sprint(n)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte('.')
		}
		b.WriteRune(c)
	}
	return "Rp" + b.String()
}

// blockNote is the short line stored with a reply for the model to recall
// which cards it showed.
func blockNote(b *block) string {
	data, _ := b.Data.(map[string]any)
	switch b.Type {
	case "vendors":
		names := []string{}
		if items, ok := data["items"].([]vendorCardDTO); ok {
			for _, v := range items {
				names = append(names, v.BusinessName)
			}
		}
		return fmt.Sprintf("kartu vendor %v: %s", data["label"], strings.Join(names, ", "))
	case "budget":
		return fmt.Sprintf("pembagian budget total %v", data["total"])
	case "inspirations":
		return fmt.Sprintf("foto inspirasi %q", data["keyword"])
	case "timeline":
		return fmt.Sprintf("timeline %q", data["title"])
	case "articles":
		return fmt.Sprintf("artikel %v", data["slugs"])
	case "consultant":
		return "kartu chat Wedding Consultant"
	}
	return b.Type
}

// mergeConsultant folds several "no vendor found" results of one reply into
// a single consultant card (one hand-off, listing every category asked).
func mergeConsultant(blocks []*block) *block {
	if len(blocks) == 1 {
		return blocks[0]
	}
	var reasons, labels []string
	merged := map[string]any{"category": "", "city": "", "budget": int64(0)}
	for _, b := range blocks {
		data, _ := b.Data.(map[string]any)
		if r, _ := data["reason"].(string); r != "" {
			reasons = append(reasons, r)
		}
		if l, _ := data["label"].(string); l != "" {
			labels = append(labels, l)
		}
		if c, _ := data["category"].(string); c != "" && merged["category"] == "" {
			merged["category"] = c
		}
		if c, _ := data["city"].(string); c != "" && merged["city"] == "" {
			merged["city"] = c
		}
		if v, _ := data["budget"].(int64); v > merged["budget"].(int64) {
			merged["budget"] = v
		}
	}
	merged["reason"] = strings.Join(reasons, " ")
	merged["label"] = strings.Join(labels, ", ")
	return &block{Type: "consultant", Data: merged}
}

// shortText trims a vendor description to one or two lines for a card,
// cutting at a word boundary.
func shortText(s string, n int) string {
	s = strings.Join(strings.Fields(s), " ")
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	cut := string(r[:n])
	if i := strings.LastIndex(cut, " "); i > n/2 {
		cut = cut[:i]
	}
	return strings.TrimRight(cut, " ,.;:") + "…"
}
