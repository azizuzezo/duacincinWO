package aiassist

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/chat"
	"duacincin/server/internal/config"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

// Vendor AI Copilot: drafts for vendors, never actions. A vendor asks for a
// suggested chat reply or a tidier business description; the draft goes into
// the vendor's own text box to edit and send (or discard). Nothing is sent or
// saved on the vendor's behalf, and the model only sees facts the vendor
// already owns (their profile, packages, and the conversation they are in).

const (
	copilotPerDay    = 40
	copilotTimeout   = 45 * time.Second
	copilotHistory   = 14
	copilotMsgChars  = 600
	copilotNotesMax  = 1500
	copilotReplyMax  = 1200
	copilotDescMax   = 900
	copilotNoContact = "Ingat: jangan menulis nomor HP, email, tautan, atau akun media sosial. Semua komunikasi tetap di chat DuaCincin."
)

// MountVendor registers the vendor-only copilot routes. They need a vendor
// session, and run a single short model call, so they sit apart from the
// streaming visitor routes.
func MountVendor(r chi.Router, deps *Deps, cfg *config.Config) {
	r.Route("/vendor/ai", func(r chi.Router) {
		r.Use(auth.RequireAuth(cfg))
		r.Use(auth.RequireRole(auth.RoleVendor))
		r.Post("/reply-draft", ReplyDraft(deps))
		r.Post("/describe", DescribeDraft(deps))
	})
}

// complete runs one model round and returns the whole answer text.
func (c *llmClient) complete(ctx context.Context, system, user string) (string, error) {
	var out strings.Builder
	res, err := c.stream(ctx, []chatMessage{
		{Role: "system", Content: system},
		{Role: "user", Content: user},
	}, nil, func(s string) { out.WriteString(s) }, func() {})
	if err != nil {
		return "", err
	}
	text := strings.TrimSpace(out.String())
	if text == "" && res != nil {
		text = strings.TrimSpace(res.Content)
	}
	return text, nil
}

// draft asks the model, cleans the answer and makes sure it carries no
// contact details (retrying once, since vendors are told the rule too).
func (d *Deps) draft(ctx context.Context, system, user string, max int) (string, error) {
	llm := d.client(ctx)
	if llm == nil {
		return "", errCopilotOff
	}
	ctx, cancel := context.WithTimeout(ctx, copilotTimeout)
	defer cancel()
	for attempt := 0; attempt < 2; attempt++ {
		u := user
		if attempt == 1 {
			u += "\n\nDraf sebelumnya memuat kontak luar. Tulis ulang tanpa nomor HP, email, tautan, atau akun media sosial."
		}
		text, err := llm.complete(ctx, system, u)
		if err != nil {
			return "", err
		}
		text = cleanDraft(text, max)
		if text == "" {
			continue
		}
		if !chat.ContainsContactInfo(text) {
			return text, nil
		}
	}
	return "", errors.New("draf tidak bisa dibuat saat ini")
}

var errCopilotOff = errors.New("asisten sedang tidak tersedia")

// cleanDraft removes what a chat box or profile field should not show:
// markdown emphasis, quote wrapping, long dashes, and runaway length.
func cleanDraft(s string, max int) string {
	s = strings.TrimSpace(s)
	s = strings.NewReplacer("**", "", "__", "", " — ", ", ", " – ", ", ", "—", ",", "–", ",").Replace(s)
	s = strings.Trim(s, "\"“”")
	s = strings.TrimSpace(s)
	if utf8.RuneCountInString(s) > max {
		r := []rune(s)
		s = strings.TrimSpace(string(r[:max]))
	}
	return s
}

func (d *Deps) copilotAllowed(w http.ResponseWriter, r *http.Request, vendorID string) bool {
	ok, err := d.Limiter.Allow(r.Context(), "user:"+vendorID, "vendor_ai", copilotPerDay, 24*time.Hour)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
		return false
	}
	if !ok {
		httpx.Error(w, http.StatusTooManyRequests, "Batas bantuan AI hari ini sudah tercapai. Coba lagi besok.")
		return false
	}
	return true
}

func copilotError(w http.ResponseWriter, err error) {
	if errors.Is(err, errCopilotOff) {
		httpx.Error(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	log.Printf("aiassist: vendor copilot: %v", err)
	httpx.Error(w, http.StatusBadGateway, "Asisten belum bisa membuat draf sekarang. Coba lagi sebentar lagi.")
}

type vendorFacts struct {
	profile  *repository.VendorProfile
	packages []repository.VendorPackage
}

func (d *Deps) factsFor(ctx context.Context, vendorID string) (*vendorFacts, error) {
	p, err := d.Vendors.GetByUserID(ctx, vendorID)
	if err != nil {
		return nil, err
	}
	pk, _ := d.Packages.ListForVendor(ctx, vendorID)
	return &vendorFacts{profile: p, packages: pk}, nil
}

func (f *vendorFacts) text() string {
	p := f.profile
	var b strings.Builder
	fmt.Fprintf(&b, "Nama usaha: %s\n", p.BusinessName)
	cats := make([]string, 0, len(p.Categories))
	for _, c := range p.Categories {
		if l, ok := vendorCategoryLabels[c]; ok {
			cats = append(cats, l)
		}
	}
	if len(cats) > 0 {
		fmt.Fprintf(&b, "Layanan: %s\n", strings.Join(cats, ", "))
	}
	if p.City != "" {
		fmt.Fprintf(&b, "Melayani: %s\n", p.City)
	}
	if p.PriceMin > 0 {
		fmt.Fprintf(&b, "Harga mulai dari: %s\n", rupiah(p.PriceMin))
	}
	if p.Description != "" {
		fmt.Fprintf(&b, "Deskripsi usaha: %s\n", shortText(p.Description, 500))
	}
	for _, pk := range f.packages {
		fmt.Fprintf(&b, "Paket: %s, %s", pk.Name, rupiah(pk.Price))
		if pk.Description != "" {
			fmt.Fprintf(&b, " (%s)", shortText(pk.Description, 200))
		}
		b.WriteString("\n")
	}
	return b.String()
}

const replySystem = `Kamu membantu vendor pernikahan di DuaCincin menulis balasan chat kepada calon pengantin. Tulis SATU balasan siap kirim, atas nama vendor, dalam bahasa Indonesia yang ramah, sopan, dan natural (sapa "Kak", pakai "kami" untuk usaha).

ATURAN
- Pakai HANYA fakta dari data usaha dan percakapan di bawah. Jangan mengarang harga, paket, diskon, pengalaman, atau promo.
- Jangan menyatakan tanggal tersedia atau slot kosong. Kalau pertanyaannya soal ketersediaan atau hal yang tidak ada di data, bilang akan dicek dulu dan minta info yang kurang (tanggal, lokasi, jumlah tamu).
- Kalau menyebut harga, hanya dari daftar paket atau "harga mulai dari", dan katakan harga final menyesuaikan kebutuhan.
- Jawab pertanyaan terakhir calon pengantin secara langsung, lalu akhiri dengan satu langkah lanjut atau pertanyaan singkat.
- Singkat: 2 sampai 5 kalimat. Tanpa markdown, tanpa daftar bernomor, tanpa tanda pisah panjang, maksimal satu emoji.
- ` + copilotNoContact + `
- Keluarkan hanya teks balasannya, tanpa pembuka seperti "Berikut balasannya".`

// ReplyDraft suggests a reply for the vendor's side of one conversation.
func ReplyDraft(deps *Deps) http.HandlerFunc {
	type req struct {
		ConversationID string `json:"conversation_id"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		var body req
		if err := httpx.DecodeJSON(w, r, &body); err != nil || body.ConversationID == "" {
			httpx.Error(w, http.StatusBadRequest, "permintaan tidak valid")
			return
		}
		ctx := r.Context()
		if deps.client(ctx) == nil {
			httpx.Error(w, http.StatusServiceUnavailable, errCopilotOff.Error())
			return
		}
		conv, err := deps.Chat.GetByID(ctx, body.ConversationID)
		if err != nil || conv.Type != repository.ConversationTypeVendorChat || conv.VendorID == nil || *conv.VendorID != claims.UserID {
			httpx.Error(w, http.StatusNotFound, "percakapan tidak ditemukan")
			return
		}
		msgs, err := deps.Chat.ListMessages(ctx, conv.ID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if len(msgs) == 0 || msgs[len(msgs)-1].SenderID == claims.UserID {
			httpx.Error(w, http.StatusConflict, "Belum ada pesan baru dari calon pengantin untuk dibalas.")
			return
		}
		facts, err := deps.factsFor(ctx, claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "profil usaha tidak ditemukan")
			return
		}
		if !deps.copilotAllowed(w, r, claims.UserID) {
			return
		}

		if len(msgs) > copilotHistory {
			msgs = msgs[len(msgs)-copilotHistory:]
		}
		var h strings.Builder
		for _, m := range msgs {
			who := "Calon pengantin"
			if m.SenderID == claims.UserID {
				who = "Vendor (kamu)"
			}
			text := strings.TrimSpace(m.Body)
			if text == "" && m.AttachmentURL != nil {
				text = "[mengirim gambar]"
			}
			fmt.Fprintf(&h, "%s: %s\n", who, shortText(text, copilotMsgChars))
		}
		user := "DATA USAHA\n" + facts.text() + "\nPERCAKAPAN (terbaru di bawah)\n" + h.String() + "\nTulis balasan vendor untuk pesan terakhir calon pengantin."

		text, err := deps.draft(ctx, replySystem, user, copilotReplyMax)
		if err != nil {
			copilotError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"draft": text})
	}
}

const describeSystem = `Kamu membantu vendor pernikahan di DuaCincin menulis deskripsi usaha untuk profilnya, yang dibaca calon pengantin. Tulis dalam bahasa Indonesia yang hangat dan jelas, sudut pandang "kami", 60 sampai 120 kata, satu atau dua paragraf pendek.

ATURAN
- Pakai HANYA fakta dari data usaha dan catatan vendor. Jangan mengarang tahun berdiri, jumlah klien, penghargaan, klaim "terbaik", atau layanan yang tidak disebut.
- Kalau catatan vendor sudah berupa deskripsi, rapikan dan lengkapi susunannya tanpa menambah fakta baru.
- Sebut layanan, wilayah, dan gaya kerja kalau ada di data. Boleh menyebut paket secara umum tanpa angka harga.
- Tanpa markdown, tanpa daftar, tanpa tanda pisah panjang, tanpa emoji, tanpa ajakan menghubungi di luar DuaCincin.
- ` + copilotNoContact + `
- Keluarkan hanya teks deskripsinya.`

// DescribeDraft turns the vendor's notes (or current description) and profile
// facts into a tidy business description.
func DescribeDraft(deps *Deps) http.HandlerFunc {
	type req struct {
		Notes string `json:"notes"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		claims, _ := auth.ClaimsFromContext(r.Context())
		var body req
		if err := httpx.DecodeJSON(w, r, &body); err != nil {
			httpx.Error(w, http.StatusBadRequest, "permintaan tidak valid")
			return
		}
		notes := strings.TrimSpace(body.Notes)
		if utf8.RuneCountInString(notes) > copilotNotesMax {
			httpx.Error(w, http.StatusBadRequest, "catatan terlalu panjang")
			return
		}
		ctx := r.Context()
		if deps.client(ctx) == nil {
			httpx.Error(w, http.StatusServiceUnavailable, errCopilotOff.Error())
			return
		}
		facts, err := deps.factsFor(ctx, claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusConflict, "Lengkapi nama usaha dan kategori dulu, lalu simpan profil.")
			return
		}
		if !deps.copilotAllowed(w, r, claims.UserID) {
			return
		}
		user := "DATA USAHA\n" + facts.text()
		if notes != "" {
			user += "\nCATATAN VENDOR\n" + notes + "\n"
		}
		user += "\nTulis deskripsi usahanya."
		text, err := deps.draft(ctx, describeSystem, user, copilotDescMax)
		if err != nil {
			copilotError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"draft": text})
	}
}
