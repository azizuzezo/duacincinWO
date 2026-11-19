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
	"strings"
	"time"

	"duacincin/server/internal/config"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/ratelimit"
	"duacincin/server/internal/repository"
)

const (
	maxHistory      = 16   // earlier turns given to the model
	maxUserChars    = 1000 // one visitor message
	maxRounds       = 4    // model calls per visitor message (tool loops)
	perIPPerHour    = 20
	globalPerDay    = 2000
	requestDeadline = 110 * time.Second
)

type Deps struct {
	Vendors     *repository.VendorRepo
	Reviews     *repository.ReviewRepo
	Inspiration *repository.InspirationRepo
	Chats       *repository.AIChatRepo
	Limiter     *ratelimit.Limiter
	Cfg         *config.Config
	llm         *llmClient
}

func NewDeps(vendorRepo *repository.VendorRepo, reviewRepo *repository.ReviewRepo, inspirationRepo *repository.InspirationRepo, chatRepo *repository.AIChatRepo, limiter *ratelimit.Limiter, cfg *config.Config) *Deps {
	return &Deps{
		Vendors: vendorRepo, Reviews: reviewRepo, Inspiration: inspirationRepo, Chats: chatRepo, Limiter: limiter, Cfg: cfg,
		llm: &llmClient{baseURL: cfg.AIBaseURL, apiKey: cfg.AIAPIKey, model: cfg.AIModel, http: &http.Client{Timeout: 90 * time.Second}},
	}
}

// Status lets the landing decide whether to show the assistant at all.
func Status(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=60")
		httpx.JSON(w, http.StatusOK, map[string]bool{"enabled": deps.Cfg.AIEnabled()})
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
		if !deps.Cfg.AIEnabled() {
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
		deps.converse(ctx, history, visitor, send)
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

func (d *Deps) converse(ctx context.Context, history []chatMessage, visitor repository.AIVisitor, send func(string, any)) {
	msgs := append([]chatMessage{{Role: "system", Content: systemPrompt(time.Now(), visitor)}}, history...)
	tools := toolDefs()

	stepN := 0
	step := func(label string) string {
		stepN++
		id := fmt.Sprintf("s%d", stepN)
		send("step", map[string]string{"id": id, "label": label, "state": "run"})
		return id
	}
	done := func(id string) { send("step", map[string]string{"id": id, "state": "done"}) }

	think := step("Memahami ceritamu")
	thinkOpen := true
	closeThink := func() {
		if thinkOpen {
			thinkOpen = false
			done(think)
		}
	}

	wrote := false
	consultantShown := false
	for round := 0; round < maxRounds; round++ {
		roundTools := tools
		if round == maxRounds-1 {
			roundTools = nil // last round: answer with what we have
		}
		res, err := d.llm.stream(ctx, msgs, roundTools, func(t string) {
			closeThink()
			wrote = true
			send("text", map[string]string{"t": t})
		}, nil)
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
			if !wrote {
				send("error", map[string]string{"message": "Maaf, aku belum menemukan jawabannya. Coba ceritakan dengan kata lain, atau tanya Wedding Consultant kami di bawah ini."})
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
