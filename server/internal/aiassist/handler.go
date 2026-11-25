// Package aiassist is the landing page's AI assistant: a visitor asks
// anything about their wedding in plain words and gets an answer streamed
// back with real DuaCincin data (vendors, inspiration photos, the Budget
// Planner split, a timeline, articles) rendered as cards. No login.
//
// The model only talks; every fact comes from a tool in tools.go that reads
// the same repositories as the public pages. Cost is capped by message and
// history size, a per-IP limit and a global daily limit.
package aiassist

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"duacincin/server/internal/config"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/ratelimit"
	"duacincin/server/internal/repository"
)

const (
	maxHistory      = 16   // earlier turns given to the model
	maxUserChars    = 1000 // one visitor message
	maxRounds       = 3    // model calls per visitor message (tool loops)
	perIPPerHour    = 60   // generous: couples plan in long sessions, and one IP is often shared (wifi, carrier NAT)
	globalPerDay    = 5000
	requestDeadline = 110 * time.Second
)

type Deps struct {
	Vendors     *repository.VendorRepo
	Reviews     *repository.ReviewRepo
	Inspiration *repository.InspirationRepo
	Chats       *repository.AIChatRepo
	Limiter     *ratelimit.Limiter
	Cfg         *config.Config
	// Settings is the admin-edited LLM configuration (the AI_* env vars are ignored).
	Settings *repository.AISettingsRepo
	// Chat and Packages feed the vendor copilot (vendor_copilot.go).
	Chat     *repository.ChatRepo
	Packages *repository.PackageRepo

	mu       sync.Mutex
	cached   *llmClient
	cachedAt time.Time
}

func NewDeps(vendorRepo *repository.VendorRepo, reviewRepo *repository.ReviewRepo, inspirationRepo *repository.InspirationRepo, chatRepo *repository.AIChatRepo, settings *repository.AISettingsRepo, limiter *ratelimit.Limiter, cfg *config.Config) *Deps {
	return &Deps{
		Vendors: vendorRepo, Reviews: reviewRepo, Inspiration: inspirationRepo, Chats: chatRepo, Settings: settings, Limiter: limiter, Cfg: cfg,
	}
}

const settingsTTL = 15 * time.Second

var llmHTTP = &http.Client{Timeout: 90 * time.Second}

// client resolves the LLM configuration from the admin panel only; the AI_*
// env vars are deliberately ignored. Cached briefly so a settings change reaches
// every instance within settingsTTL without a DB read per message. It
// returns nil when the assistant is not fully configured.
func (d *Deps) client(ctx context.Context) *llmClient {
	d.mu.Lock()
	defer d.mu.Unlock()
	if time.Since(d.cachedAt) < settingsTTL {
		return d.cached
	}
	c := &llmClient{http: llmHTTP}
	if d.Settings != nil {
		if s, err := d.Settings.Get(ctx); err != nil {
			log.Printf("aiassist: load settings: %v", err)
		} else {
			if v := strings.TrimRight(strings.TrimSpace(s.BaseURL), "/"); v != "" {
				c.baseURL = v
			}
			if v := strings.TrimSpace(s.Model); v != "" {
				c.model = v
			}
			if v := strings.TrimSpace(s.APIKey); v != "" {
				c.apiKey = v
			}
			if v := strings.TrimSpace(s.ReasoningEffort); v != "" {
				c.reasoning = v
			}
		}
	}
	if c.baseURL == "" || c.apiKey == "" || c.model == "" {
		c = nil
	}
	d.cached, d.cachedAt = c, time.Now()
	return d.cached
}

// Status lets the landing decide whether to show the assistant at all.
func Status(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=60")
		httpx.JSON(w, http.StatusOK, map[string]bool{"enabled": deps.client(r.Context()) != nil})
	}
}

type chatBody struct {
	Message string `json:"message"`
}

func clientIP(r *http.Request) string {
	// middleware.RealIP already rewrote RemoteAddr from X-Forwarded-For.
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}

// validMessage trims the visitor's message and reports why it is refused.
func validMessage(raw string) (string, string) {
	m := strings.TrimSpace(raw)
	if m == "" {
		return "", "pesan kosong"
	}
	if len([]rune(m)) > maxUserChars {
		return "", fmt.Sprintf("pesan terlalu panjang (maksimal %d karakter)", maxUserChars)
	}
	return m, ""
}

// Chat answers one visitor message as a Server-Sent Events stream:
//
//	event: step   {"id":"s1","label":"Mencari MUA di Bandung","state":"run"|"done"}
//	event: text   {"t":"..."}            a piece of the answer
//	event: block  {"type":"vendors",...} a card (see tools.go)
//	event: error  {"message":"..."}      shown to the visitor as is
//	event: done   {}
//
// Earlier turns come from the visitor's stored conversation (session.go),
// never from the request, and both the message and the reply are saved.
func Chat(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		llm := deps.client(r.Context())
		if llm == nil {
			httpx.Error(w, http.StatusServiceUnavailable, "asisten sedang tidak tersedia")
			return
		}

		var body chatBody
		if err := httpx.DecodeJSON(w, r, &body); err != nil {
			httpx.Error(w, http.StatusBadRequest, "permintaan tidak valid")
			return
		}
		msg, bad := validMessage(body.Message)
		if bad != "" {
			httpx.Error(w, http.StatusBadRequest, bad)
			return
		}

		ok, err := deps.Limiter.Allow(r.Context(), "ip:"+clientIP(r), "ai_chat", perIPPerHour, time.Hour)
		if err == nil && ok {
			ok, err = deps.Limiter.Allow(r.Context(), "global", "ai_chat_global", globalPerDay, 24*time.Hour)
		}
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if !ok {
			httpx.Error(w, http.StatusTooManyRequests, "Kirana sedang ramai. Coba lagi sebentar lagi, atau ngobrol langsung dengan Wedding Consultant kami di bawah ini.")
			return
		}

		v := deps.identify(w, r, true)
		sessionID, err := deps.session(r.Context(), v, true)
		if err != nil || sessionID == "" {
			log.Printf("aiassist: session: %v", err)
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		past, err := deps.Chats.RecentTurns(r.Context(), sessionID, historyForLLM)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		// Saved even if the reply is cut short, so the history shows what was asked.
		saveCtx := context.WithoutCancel(r.Context())
		if err := deps.Chats.AddTurn(saveCtx, sessionID, repository.AIChatTurn{Role: "user", Content: msg}); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		flusher, _ := w.(http.Flusher)
		w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache, no-transform")
		w.Header().Set("X-Accel-Buffering", "no")
		w.WriteHeader(http.StatusOK)

		rec := &recorder{}
		send := func(event string, payload any) {
			rec.observe(event, payload)
			b, _ := json.Marshal(payload)
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, b)
			if flusher != nil {
				flusher.Flush()
			}
		}

		ctx, cancel := context.WithTimeout(r.Context(), requestDeadline)
		defer cancel()
		history := append(modelHistory(past), chatMessage{Role: "user", Content: msg})
		visitor, _ := deps.Chats.Visitor(r.Context(), sessionID)
		deps.converse(ctx, llm, history, visitor, send)
		send("done", struct{}{})

		if err := deps.Chats.AddTurn(saveCtx, sessionID, rec.turn()); err != nil {
			log.Printf("aiassist: save reply: %v", err)
		}
	}
}

// recorder keeps what was streamed so the reply can be saved as shown.
type recorder struct {
	parts []map[string]any
	steps []map[string]any
	err   string
}

func (rc *recorder) observe(event string, payload any) {
	switch event {
	case "text":
		t := payload.(map[string]string)["t"]
		if n := len(rc.parts); n > 0 && rc.parts[n-1]["kind"] == "text" {
			rc.parts[n-1]["text"] = rc.parts[n-1]["text"].(string) + t
		} else if strings.TrimSpace(t) != "" {
			rc.parts = append(rc.parts, map[string]any{"kind": "text", "text": strings.TrimLeft(t, " \n")})
		}
	case "block":
		rc.parts = append(rc.parts, map[string]any{"kind": "block", "block": payload})
	case "step":
		p := payload.(map[string]string)
		for _, s := range rc.steps {
			if s["id"] == p["id"] {
				s["done"] = p["state"] == "done"
				return
			}
		}
		rc.steps = append(rc.steps, map[string]any{"id": p["id"], "label": p["label"], "done": p["state"] == "done"})
	case "error":
		rc.err = payload.(map[string]string)["message"]
	}
}

// turn is the stored reply: parts/steps for the landing, and as content
// the words plus a note of the cards shown, so a follow-up like "yang
// kedua itu" still makes sense to the model.
func (rc *recorder) turn() repository.AIChatTurn {
	var text strings.Builder
	var notes []string
	for _, p := range rc.parts {
		if p["kind"] == "text" {
			text.WriteString(p["text"].(string))
			continue
		}
		if b, ok := p["block"].(*block); ok {
			notes = append(notes, blockNote(b))
		}
	}
	content := strings.TrimSpace(text.String())
	if len(notes) > 0 {
		content += "\n\n[Ditampilkan: " + strings.Join(notes, "; ") + "]"
	}
	for _, s := range rc.steps {
		s["done"] = true
	}
	parts, _ := json.Marshal(rc.parts)
	steps, _ := json.Marshal(rc.steps)
	t := repository.AIChatTurn{Role: "assistant", Content: content, Parts: parts, Steps: steps, State: "done"}
	if rc.err != "" {
		t.State, t.Error = "error", rc.err
	}
	return t
}

func (d *Deps) converse(ctx context.Context, llm *llmClient, history []chatMessage, visitor repository.AIVisitor, send func(string, any)) {
	msgs := append([]chatMessage{{Role: "system", Content: systemPrompt(time.Now(), visitor)}}, history...)
	tools := toolDefs()
	// Fast path: a named total budget is computed here, before the model,
	// and shown at once; the model only explains it (one round saved, and
	// the figures never depend on the model calling the tool).
	var preBudget *toolOutput
	if total, guests, ok := budgetFromContext(history); ok {
		if out, err := splitBudget(total, guests); err == nil {
			preBudget = &out
			tools = withoutTool(tools, "hitung_budget")
			msgs[len(msgs)-1].Content += "\n\n[Catatan sistem, bukan dari pengguna: kartu Budget Planner sudah tampil di layar dengan data ini: " + out.ForModel + ". Jelaskan singkat berdasarkan data itu; jangan menghitung ulang dan jangan memanggil hitung_budget.]"
		}
	}

	wrote := false
	consultantShown := false
	budgetShown := false
	stepN := 0
	step := func(label string) string {
		stepN++
		id := fmt.Sprintf("s%d", stepN)
		send("step", map[string]string{"id": id, "label": label, "state": "run"})
		return id
	}
	done := func(id string) { send("step", map[string]string{"id": id, "state": "done"}) }

	if preBudget != nil {
		id := step("Menghitung pembagian budget")
		send("block", preBudget.Block)
		budgetShown = true
		done(id)
	}
	think := step("Memahami ceritamu")
	thinkOpen := true
	closeThink := func() {
		if thinkOpen {
			thinkOpen = false
			done(think)
		}
	}

	shown := map[string]bool{}
	sendOrig := send
	send = func(event string, payload any) {
		if b, ok := payload.(*block); ok && event == "block" {
			shown[b.Type] = true
		}
		sendOrig(event, payload)
	}
	for round := 0; round < maxRounds; round++ {
		roundTools := tools
		if round == maxRounds-1 {
			roundTools = nil // last round: answer with what we have
		}
		gate := &textGate{}
		emit := func(t string) {
			if t != "" {
				wrote = true
				send("text", map[string]string{"t": noLongDash(t)})
			}
		}
		res, err := llm.stream(ctx, msgs, roundTools, func(t string) {
			closeThink()
			emit(gate.feed(t))
		}, nil)
		if err == nil {
			emit(gate.flush())
		}
		if err != nil {
			log.Printf("aiassist: round %d: %v", round, err)
			closeThink()
			if !wrote {
				send("error", map[string]string{"message": "Maaf, Kirana sedang ada kendala dan belum bisa menjawab. Coba lagi sebentar, atau langsung chat Wedding Consultant kami di bawah ini."})
			}
			return
		}
		if len(res.ToolCalls) == 0 {
			closeThink()
			if gate.refused && !wrote {
				// The model (or its proxy) answered with a canned refusal.
				// Say something useful about what is on screen instead.
				defer func() { emit(replacementText(shown)) }()
				wrote = true
			}
			if !wrote {
				send("error", map[string]string{"message": "Maaf, aku belum menemukan jawabannya. Coba ceritakan dengan kata lain, atau tanya Wedding Consultant kami di bawah ini."})
				return
			}
			// The visitor named a total budget but the model answered from
			// its own arithmetic: show the Budget Planner split anyway, so
			// the figures on screen always come from DuaCincin's formula.
			if !budgetShown {
				if total, guests, ok := budgetFromContext(history); ok {
					if out, err := splitBudget(total, guests); err == nil {
						send("block", out.Block)
					}
				}
			}
			// The visitor asked for a person: the card must be there, whatever
			// the model decided (it sometimes says "kartunya sudah tampil").
			if !consultantShown && asksForConsultant(lastUser(history)) {
				b := consultantBlock("", "", "", 0)
				b.Data.(map[string]any)["requested"] = true
				send("block", b)
			}
			return
		}

		closeThink()
		msgs = append(msgs, chatMessage{Role: "assistant", Content: res.Content, ReasoningContent: res.Reasoning, ToolCalls: res.ToolCalls})
		// Hand-offs to a consultant are collected and shown once per reply,
		// after this round's other cards (several empty searches = one card).
		var handoffs []*block
		for _, tc := range res.ToolCalls {
			id := step(statusFor(tc.Function.Name, tc.Function.Arguments))
			out := d.runTool(ctx, tc.Function.Name, tc.Function.Arguments)
			switch {
			case out.Block != nil && out.Block.Type == "consultant":
				if !consultantShown {
					handoffs = append(handoffs, out.Block)
				}
			case out.Block != nil:
				send("block", out.Block)
				if out.Block.Type == "budget" {
					budgetShown = true
				}
			}
			done(id)
			msgs = append(msgs, chatMessage{Role: "tool", ToolCallID: tc.ID, Content: out.ForModel})
		}
		if len(handoffs) > 0 {
			send("block", mergeConsultant(handoffs))
			consultantShown = true
		}
		if res.Content != "" {
			// Keep the next part of the answer from gluing onto this one.
			send("text", map[string]string{"t": "\n\n"})
		}
	}
}

// noLongDash keeps the UI free of em/en dashes (DESIGN.md: "tanpa em dash"),
// whatever the model writes.
func noLongDash(t string) string {
	return strings.NewReplacer(" — ", ", ", "—", ", ", " – ", ", ").Replace(t)
}

var consultantAsk = regexp.MustCompile(`(?i)(wedding\s*consultant|konsultan|consultant|\badmin\b|customer\s*service|\bcs\b|(ngobrol|bicara|chat|ngomong|tanya)\s+(sama|dengan|ke)\s+(orang|manusia|staf|tim))`)

// asksForConsultant reports whether the visitor clearly asks for a person.
func asksForConsultant(msg string) bool { return consultantAsk.MatchString(msg) }

func lastUser(history []chatMessage) string {
	for i := len(history) - 1; i >= 0; i-- {
		if history[i].Role == "user" {
			return history[i].Content
		}
	}
	return ""
}

var (
	budgetAmount = regexp.MustCompile(`(?i)(?:rp\.?\s*)?(\d+(?:[.,]\d+)*)\s*(miliar|milyar|m\b|juta|jt\b|ribu|rb\b)?`)
	budgetWord   = regexp.MustCompile(`(?i)\b(budget|bujet|anggaran|dana|biaya|modal)\b`)
	vendorAsk    = regexp.MustCompile(`(?i)\b(cari|cariin|carikan|rekomendasi|rekomendasiin|mua|rias|make ?up|dekor|dekorasi|venue|gedung|catering|katering|foto|fotografer|video|videografer|mc|souvenir|mobil|kue|hantaran|seserahan|band|entertainment|vendor)\b`)
	guestCount   = regexp.MustCompile(`(?i)(\d{2,5})\s*(orang\s*)?(tamu|undangan|pax|orang)`)
)

// amountFromText reads the first plausible rupiah total (1 juta to 100
// miliar) in free text: "150 juta", "Rp150.000.000", "1,5 M", "80jt".
// bareOK also accepts a plain number ("10000000"), as tools send it.
func amountFromText(text string, bareOK bool) int64 {
	for _, m := range budgetAmount.FindAllStringSubmatch(text, -1) {
		num, unit := m[1], strings.ToLower(m[2])
		var v float64
		switch unit {
		case "miliar", "milyar", "m":
			v = parseDecimal(num) * 1e9
		case "juta", "jt":
			v = parseDecimal(num) * 1e6
		case "ribu", "rb":
			v = parseDecimal(num) * 1e3
		default:
			// A bare number only counts when written in full rupiah.
			if !bareOK && !strings.ContainsAny(num, ".,") {
				continue
			}
			v = float64(digitsOnly(num))
		}
		if v >= 1_000_000 && v <= 100_000_000_000 {
			return int64(v)
		}
	}
	return 0
}

// budgetFromMessage reads a total wedding budget (and guest count) from
// the visitor's words: "budget 150 juta, 300 tamu", "dana Rp150.000.000",
// "anggaran 1,5 M". ok is false when no budget word or plausible amount.
func budgetFromMessage(msg string) (total int64, guests int, ok bool) {
	// "Cariin MUA budget 5 juta" is a price limit for one vendor, not the
	// wedding's total budget.
	if !budgetWord.MatchString(msg) || vendorAsk.MatchString(msg) {
		return 0, 0, false
	}
	return budgetAmountAndGuests(msg)
}

func budgetAmountAndGuests(msg string) (total int64, guests int, ok bool) {
	total = amountFromText(msg, false)
	if total == 0 {
		return 0, 0, false
	}
	if g := guestCount.FindStringSubmatch(msg); g != nil {
		guests = int(digitsOnly(g[1]))
	}
	return total, guests, true
}

// budgetFromContext also catches a two-step ask: "Bantu hitung budget
// pernikahanku" then "10 juta, 200 tamu" (the amount alone, right after a
// message about the budget).
func budgetFromContext(history []chatMessage) (total int64, guests int, ok bool) {
	var users []string
	for _, m := range history {
		if m.Role == "user" {
			users = append(users, m.Content)
		}
	}
	if len(users) == 0 {
		return 0, 0, false
	}
	last := users[len(users)-1]
	if total, guests, ok = budgetFromMessage(last); ok {
		return total, guests, ok
	}
	if len(users) >= 2 && budgetWord.MatchString(users[len(users)-2]) && !vendorAsk.MatchString(users[len(users)-2]) && !vendorAsk.MatchString(last) {
		return budgetAmountAndGuests(last)
	}
	return 0, 0, false
}

// parseDecimal reads "1,5" or "1.5" as 1.5 and "150" as 150 (Indonesian
// writes the decimal comma; a thousands dot before a unit is rare).
func parseDecimal(s string) float64 {
	s = strings.ReplaceAll(s, ",", ".")
	if strings.Count(s, ".") > 1 {
		s = strings.ReplaceAll(s, ".", "")
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return f
}

func digitsOnly(s string) int64 {
	var n int64
	for _, r := range s {
		if r >= '0' && r <= '9' {
			n = n*10 + int64(r-'0')
		}
	}
	return n
}

// Canned refusals some models or proxies return instead of an answer
// ("I'm having a hard time fulfilling your request...", "I seem to be
// encountering an error..."). Kirana always answers in Indonesian, so a
// reply that opens in English is treated as one too. Never shown as is.
var (
	cannedRefusal  = regexp.MustCompile(`(?i)(i'?m having a hard time|i seem to be|encounter(ed|ing) an error|something went wrong|(please )?try (your request |that |it )?again|can i (try|help with|help you with) something else|something else (for you|instead)|i can'?t (help|assist)|i'?m (sorry|unable)|sorry, (but )?(i|something|there|an error)|an error (occurred|has occurred)|as an ai|i cannot (help|assist|fulfill))`)
	englishWord    = regexp.MustCompile(`(?i)\b(i|you|your|the|a|an|is|was|were|it|of|for|to|be|can|could|please|try|again|something|else|error|request|help|seem|sorry|instead|with|went|wrong|there|this|that)\b`)
	indonesianWord = regexp.MustCompile(`(?i)\b(yang|dan|untuk|di|ke|dari|ini|itu|kamu|aku|ada|bisa|dengan|budget|vendor|tamu|juta|ya|nggak|tidak|sudah|kalau)\b`)
)

func looksLikeRefusal(text string) bool {
	if cannedRefusal.MatchString(text) {
		return true
	}
	return len(englishWord.FindAllString(text, -1)) >= 3 && len(indonesianWord.FindAllString(text, -1)) == 0
}

const gateChars = 80

// textGate holds back the first characters of a reply long enough to tell
// a canned refusal from a real answer; a refusal is swallowed whole.
type textGate struct {
	buf      strings.Builder
	released bool
	refused  bool
}

func (g *textGate) feed(t string) string {
	if g.refused {
		return ""
	}
	if g.released {
		return t
	}
	g.buf.WriteString(t)
	if g.buf.Len() < gateChars {
		return ""
	}
	return g.release()
}

// flush releases whatever is still held at the end of a round.
func (g *textGate) flush() string {
	if g.released || g.refused || g.buf.Len() == 0 {
		return ""
	}
	return g.release()
}

func (g *textGate) release() string {
	text := g.buf.String()
	g.buf.Reset()
	if looksLikeRefusal(text) {
		g.refused = true
		return ""
	}
	g.released = true
	return text
}

// replacementText speaks to the cards already on screen when the model's
// own words were a refusal.
func replacementText(shown map[string]bool) string {
	switch {
	case shown["budget"]:
		return "Ini pembagian budget dari Budget Planner DuaCincin untuk total yang kamu sebut. Pos terbesar ada di Venue & Catering. Mau aku bantu carikan vendor yang sesuai budget ini?"
	case shown["vendors"]:
		return "Ini vendor terdaftar di DuaCincin yang cocok dengan pencarianmu. Buka portofolionya untuk lihat karya mereka lebih lengkap ya."
	case shown["consultant"]:
		return "Wedding Consultant DuaCincin siap bantu, tinggal tekan tombol Chat konsultan di kartu ya."
	case shown["timeline"]:
		return "Ini urutan persiapannya. Mau aku bantu mulai dari langkah yang paling mendesak?"
	case shown["inspirations"]:
		return "Ini beberapa inspirasi dari galeri DuaCincin. Mau aku carikan vendor yang bisa mewujudkan konsep ini?"
	}
	return "Maaf, aku belum bisa menjawab yang itu. Coba ceritakan dengan kata lain, atau tanya Wedding Consultant kami."
}

func withoutTool(tools []toolDef, name string) []toolDef {
	out := make([]toolDef, 0, len(tools))
	for _, t := range tools {
		if t.Function.Name != name {
			out = append(out, t)
		}
	}
	return out
}
