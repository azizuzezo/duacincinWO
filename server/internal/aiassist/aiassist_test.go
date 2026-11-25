package aiassist

import (
	"context"
	"duacincin/server/internal/repository"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestStreamAccumulatesToolCallsAndText(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/chat/completions" || r.Header.Get("Authorization") != "Bearer k" {
			t.Errorf("bad request %s %q", r.URL.Path, r.Header.Get("Authorization"))
		}
		var req chatRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		if !req.Stream || req.Model != "m" || len(req.Tools) == 0 {
			t.Errorf("request not streamed with tools: %+v", req)
		}
		w.Header().Set("Content-Type", "text/event-stream")
		for _, line := range []string{
			`{"choices":[{"delta":{"reasoning_content":"hmm"}}]}`,
			`{"choices":[{"delta":{"content":"Seben"}}]}`,
			`{"choices":[{"delta":{"content":"tar"}}]}`,
			`{"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","type":"function","function":{"name":"hitung_budget","arguments":""}}]}}]}`,
			`{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\"total\":"}}]}}]}`,
			`{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"5000000}"}}]}}]}`,
			`{"choices":[{"delta":{"tool_calls":[{"index":1,"id":"c2","function":{"name":"cari_inspirasi","arguments":"{}"}}]}}]}`,
			`{"choices":[{"delta":{},"finish_reason":"tool_calls"}]}`,
			`[DONE]`,
		} {
			fmt.Fprintf(w, "data: %s\n\n", line)
		}
	}))
	defer srv.Close()

	c := &llmClient{baseURL: srv.URL + "/v1", apiKey: "k", model: "m", http: srv.Client()}
	var text strings.Builder
	thought := false
	res, err := c.stream(context.Background(), []chatMessage{{Role: "user", Content: "hi"}}, toolDefs(), func(s string) { text.WriteString(s) }, func() { thought = true })
	if err != nil {
		t.Fatal(err)
	}
	if text.String() != "Sebentar" || res.Content != "Sebentar" || res.Reasoning != "hmm" || !thought {
		t.Fatalf("text=%q content=%q reasoning=%q thought=%v", text.String(), res.Content, res.Reasoning, thought)
	}
	if len(res.ToolCalls) != 2 || res.ToolCalls[0].Function.Name != "hitung_budget" || res.ToolCalls[0].Function.Arguments != `{"total":5000000}` || res.ToolCalls[1].ID != "c2" {
		t.Fatalf("tool calls: %+v", res.ToolCalls)
	}
}

func TestStreamFallsBackToWholeJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"choices":[{"message":{"role":"assistant","content":"Halo"}}]}`)
	}))
	defer srv.Close()
	c := &llmClient{baseURL: srv.URL, apiKey: "k", model: "m", http: srv.Client()}
	got := ""
	res, err := c.stream(context.Background(), nil, nil, func(s string) { got += s }, nil)
	if err != nil || got != "Halo" || res.Content != "Halo" {
		t.Fatalf("got %q %+v %v", got, res, err)
	}
}

func TestStreamUpstreamError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":"down"}`, http.StatusServiceUnavailable)
	}))
	defer srv.Close()
	c := &llmClient{baseURL: srv.URL, apiKey: "k", model: "m", http: srv.Client()}
	if _, err := c.stream(context.Background(), nil, nil, func(string) {}, nil); err == nil {
		t.Fatal("want error on 503")
	}
}

func TestValidMessage(t *testing.T) {
	if _, msg := validMessage("   "); msg == "" {
		t.Fatal("blank message must be rejected")
	}
	if _, msg := validMessage(strings.Repeat("a", maxUserChars+1)); msg == "" {
		t.Fatal("long message must be rejected")
	}
	if m, msg := validMessage("  halo  "); msg != "" || m != "halo" {
		t.Fatalf("got %q %q", m, msg)
	}
}

func TestRecorderStoresWhatWasShown(t *testing.T) {
	rc := &recorder{}
	rc.observe("step", map[string]string{"id": "s1", "label": "Memahami ceritamu", "state": "run"})
	rc.observe("step", map[string]string{"id": "s1", "state": "done"})
	rc.observe("block", consultantBlock("Belum ada vendor MC di Sleman.", "mc", "Sleman", 0))
	rc.observe("text", map[string]string{"t": "\n\n"})
	rc.observe("text", map[string]string{"t": "Belum ada "})
	rc.observe("text", map[string]string{"t": "vendornya."})
	turn := rc.turn()
	if turn.State != "done" || !strings.HasPrefix(turn.Content, "Belum ada vendornya.") || !strings.Contains(turn.Content, "[Ditampilkan: kartu chat Wedding Consultant]") {
		t.Fatalf("content %q", turn.Content)
	}
	var parts []map[string]any
	_ = json.Unmarshal(turn.Parts, &parts)
	if len(parts) != 2 || parts[0]["kind"] != "block" || parts[1]["text"] != "Belum ada vendornya." {
		t.Fatalf("parts %s", turn.Parts)
	}
	if !strings.Contains(string(turn.Steps), `"label":"Memahami ceritamu"`) {
		t.Fatalf("steps %s", turn.Steps)
	}
	rc.observe("error", map[string]string{"message": "x"})
	if rc.turn().State != "error" {
		t.Fatal("error state lost")
	}
}

func TestRupiahAndNoConsultantTool(t *testing.T) {
	if got := rupiah(10000000); got != "Rp10.000.000" {
		t.Fatal(got)
	}
	// The old free-use consultant tool is gone; hubungi_konsultan is only
	// for explicit requests (prompt rule) and always yields the card.
	for _, d := range toolDefs() {
		if d.Function.Name == "arahkan_konsultan" {
			t.Fatal("arahkan_konsultan must not be offered to the model")
		}
	}
	out, err := (&Deps{}).dispatch(context.Background(), "hubungi_konsultan", `{}`)
	if err != nil || out.Block == nil || out.Block.Type != "consultant" || out.Block.Data.(map[string]any)["requested"] != true {
		t.Fatalf("hubungi_konsultan: %+v %v", out, err)
	}
	if _, err := (&Deps{}).dispatch(context.Background(), "arahkan_konsultan", `{}`); err == nil {
		t.Fatal("unknown tool must fail")
	}
}

func TestSplitBudget(t *testing.T) {
	out, err := splitBudget(80_000_001, 300)
	if err != nil {
		t.Fatal(err)
	}
	data := out.Block.Data.(map[string]any)
	lines := data["lines"].([]budgetLine)
	var sum int64
	for _, l := range lines {
		sum += l.Amount
	}
	if sum != 80_000_001 {
		t.Fatalf("lines sum to %d", sum)
	}
	if lines[0].Key != "venue_catering" || lines[0].Amount != 32_000_000 {
		t.Fatalf("first line %+v", lines[0])
	}
	if data["per_guest"].(int64) != 32_000_000/300 {
		t.Fatalf("per guest %v", data["per_guest"])
	}
	if _, err := splitBudget(500, 0); err == nil {
		t.Fatal("tiny budget must be rejected")
	}
}

func TestTimelineAndArticlesValidate(t *testing.T) {
	if _, err := timeline(`{"judul":"x","langkah":[]}`); err == nil {
		t.Fatal("empty timeline must fail")
	}
	out, err := timeline(`{"judul":"x","langkah":[{"waktu":"H-1","judul":"a"},{"waktu":"H","judul":"b"},{"waktu":"","judul":"c"},{"waktu":"","judul":"d"},{"waktu":"","judul":"e"},{"waktu":"","judul":"f"},{"waktu":"","judul":"g"},{"waktu":"","judul":"h"},{"waktu":"","judul":"i"}]}`)
	if err != nil || len(out.Block.Data.(map[string]any)["steps"].([]map[string]string)) != maxTimeline {
		t.Fatalf("timeline cap: %v", err)
	}
	if _, err := showArticles([]string{"tidak-ada"}); err == nil {
		t.Fatal("unknown slug must fail")
	}
	out, _ = showArticles([]string{"tidak-ada", articles[0].Slug, articles[0].Slug})
	if got := out.Block.Data.(map[string]any)["slugs"].([]string); len(got) != 1 {
		t.Fatalf("slugs %v", got)
	}
}

func TestStatusForUsesArguments(t *testing.T) {
	if got := statusFor("cari_vendor", `{"kategori":"mua_attire","kota":"Bandung"}`); got != "Mencari MUA & Attire di Bandung" {
		t.Fatal(got)
	}
}

func TestMatchReasons(t *testing.T) {
	got := matchReasons(vendorCardDTO{PriceMin: 5_000_000, AverageRating: 4.8, ReviewCount: 3}, "Bandung", 8_000_000)
	if strings.Join(got, ",") != "Dalam budget,Melayani Bandung,Rating tinggi,Terverifikasi" {
		t.Fatal(got)
	}
	if got := matchReasons(vendorCardDTO{PriceMin: 9_000_000}, "", 8_000_000); strings.Join(got, ",") != "Terverifikasi" {
		t.Fatal(got)
	}
}

func TestCityVariants(t *testing.T) {
	if got := strings.Join(cityVariants("Bandung"), "|"); got != "Bandung|Kab. Bandung" {
		t.Fatal(got)
	}
	if got := strings.Join(cityVariants("Kab. Bandung"), "|"); got != "Kab. Bandung|Bandung" {
		t.Fatal(got)
	}
	if got := strings.Join(cityVariants("Sleman"), "|"); got != "Sleman" {
		t.Fatal(got)
	}
	if got := cityVariants(""); len(got) != 1 || got[0] != "" {
		t.Fatal(got)
	}
}

func TestMergeConsultant(t *testing.T) {
	b := mergeConsultant([]*block{
		consultantBlock("Belum ada vendor Venue di Bandung.", "venue", "Bandung", 12_000_000),
		consultantBlock("Belum ada vendor Catering di Bandung.", "catering", "Bandung", 12_000_000),
	})
	data := b.Data.(map[string]any)
	if data["label"] != "Venue, Catering" || data["city"] != "Bandung" || data["budget"].(int64) != 12_000_000 || !strings.Contains(data["reason"].(string), "Catering") {
		t.Fatalf("%+v", data)
	}
}

func TestCleanNameAndShortText(t *testing.T) {
	if got := cleanName("  siti   NURhaliza<script> "); got != "Siti Nurhalizascript" {
		t.Fatal(got)
	}
	if got := cleanName("123"); got != "" {
		t.Fatal(got)
	}
	if got := shortText("Kami spesialis dekorasi adat Jawa modern dengan bunga segar dan pencahayaan hangat", 40); got != "Kami spesialis dekorasi adat Jawa…" {
		t.Fatal(got)
	}
}

func TestPromptGreetsByName(t *testing.T) {
	p := systemPrompt(time.Now(), repository.AIVisitor{Name: "Rina", Age: 26})
	if !strings.Contains(p, "Kak Rina") || !strings.Contains(p, "umur 26") {
		t.Fatal("visitor not in prompt")
	}
	if strings.Contains(systemPrompt(time.Now(), repository.AIVisitor{}), "PENGGUNA") {
		t.Fatal("empty visitor must not add a section")
	}
}

func TestNoLongDash(t *testing.T) {
	if got := noLongDash("Venue Rp60 juta — pos terbesar"); got != "Venue Rp60 juta, pos terbesar" {
		t.Fatal(got)
	}
}

func TestAsksForConsultant(t *testing.T) {
	for _, m := range []string{"Aku mau chat sama wedding consultant aja", "bisa ngobrol sama orang?", "hubungkan ke admin dong", "mau tanya ke tim kalian"} {
		if !asksForConsultant(m) {
			t.Fatal("should ask:", m)
		}
	}
	for _, m := range []string{"Cariin MUA di Bandung", "budget 150 juta cukup?", "pesta di gedung"} {
		if asksForConsultant(m) {
			t.Fatal("should not ask:", m)
		}
	}
}

func TestBudgetFromMessage(t *testing.T) {
	cases := []struct {
		msg    string
		total  int64
		guests int
		ok     bool
	}{
		{"Budget kami 150 juta, 300 tamu di Bandung, cukup nggak?", 150_000_000, 300, true},
		{"dana Rp150.000.000 buat 250 undangan", 150_000_000, 250, true},
		{"anggaran 1,5 M untuk 1000 orang", 1_500_000_000, 1000, true},
		{"budget 80jt", 80_000_000, 0, true},
		{"Cariin MUA di Bandung", 0, 0, false},
		{"nikah 2 bulan lagi, 300 tamu", 0, 0, false},
	}
	for _, c := range cases {
		total, guests, ok := budgetFromMessage(c.msg)
		if total != c.total || guests != c.guests || ok != c.ok {
			t.Fatalf("%q: got %d %d %v", c.msg, total, guests, ok)
		}
	}
}

func TestTextGateSwallowsCannedRefusal(t *testing.T) {
	g := &textGate{}
	out := g.feed("I'm having a hard time ") + g.feed("fulfilling your request. Can I help you with something else instead?") + g.flush()
	if out != "" || !g.refused {
		t.Fatalf("refusal leaked: %q", out)
	}
	g = &textGate{}
	out = g.feed("Dengan budget ") + g.feed("150 juta untuk 300 tamu, pos terbesar ada di Venue & Catering, sekitar Rp60 juta.") + g.feed(" Lanjut?") + g.flush()
	if out != "Dengan budget 150 juta untuk 300 tamu, pos terbesar ada di Venue & Catering, sekitar Rp60 juta. Lanjut?" || g.refused {
		t.Fatalf("real answer changed: %q", out)
	}
	g = &textGate{}
	if out := g.feed("Siap!") + g.flush(); out != "Siap!" {
		t.Fatalf("short answer lost: %q", out)
	}
	if !strings.Contains(replacementText(map[string]bool{"budget": true}), "Budget Planner") {
		t.Fatal("budget replacement")
	}
}

func TestRefusalHeuristicAndBudgetContext(t *testing.T) {
	for _, r := range []string{
		"I seem to be encountering an error. Can I try something else for you?",
		"I'm having a hard time fulfilling your request.",
		"Sorry, something went wrong. Please try your request again.",
		"I encountered an error doing what you asked. Could you try again?",
		"An error occurred.",
	} {
		if !looksLikeRefusal(r) {
			t.Fatal("refusal not caught:", r)
		}
	}
	for _, ok := range []string{
		"Untuk budget Rp10 juta dengan 100 tamu, pos terbesar ada di venue dan catering.",
		"Tanpa entertainment, pos terbesar tetap Venue & Catering: Rp65.217.391.",
		"Siap!",
	} {
		if looksLikeRefusal(ok) {
			t.Fatal("Indonesian answer flagged:", ok)
		}
	}
	h := []chatMessage{{Role: "user", Content: "Bantu hitung budget pernikahanku"}, {Role: "assistant", Content: "Berapa totalnya?"}, {Role: "user", Content: "10 juta, 100 tamu"}}
	if total, guests, ok := budgetFromContext(h); !ok || total != 10_000_000 || guests != 100 {
		t.Fatalf("two-step budget: %d %d %v", total, guests, ok)
	}
	for _, m := range []string{"Cariin MUA 5 juta di Bandung", "Cariin MUA di Bandung budget 5 juta", "rekomendasi venue budget 50 juta"} {
		if _, _, ok := budgetFromContext([]chatMessage{{Role: "user", Content: m}}); ok {
			t.Fatal("a vendor price is not a wedding budget:", m)
		}
	}
	if _, _, ok := budgetFromContext([]chatMessage{{Role: "user", Content: "Budget kami 150 juta, 300 tamu di Bandung, cukup nggak?"}}); !ok {
		t.Fatal("wedding budget missed")
	}
	for _, args := range []string{`{"total":10000000}`, `{"total":"10 juta"}`, `{"total":"Rp10.000.000","jumlah_tamu":"100"}`} {
		out, err := (&Deps{}).dispatch(context.Background(), "hitung_budget", args)
		if err != nil || out.Block == nil || out.Block.Data.(map[string]any)["total"].(int64) != 10_000_000 {
			t.Fatalf("lenient args %s: %v", args, err)
		}
	}
}

func TestToolNamePrefixes(t *testing.T) {
	for _, n := range []string{"hitung_budget", "default_api.hitung_budget", "functions.hitung_budget", "tools/hitung_budget", " Hitung_Budget "} {
		if toolName(n) != "hitung_budget" {
			t.Fatal(n, toolName(n))
		}
	}
	out := (&Deps{}).runTool(context.Background(), "default_api.hitung_budget", `{"total":"150 juta","jumlah_tamu":300}`)
	if out.Block == nil || out.Block.Type != "budget" {
		t.Fatalf("prefixed tool did not run: %+v", out)
	}
	if got := statusFor("default_api.hitung_budget", "{}"); got != "Menghitung pembagian budget" {
		t.Fatal(got)
	}
}

func TestSplitBudgetWithout(t *testing.T) {
	out, err := splitBudget(150_000_000, 300, "entertainment")
	if err != nil {
		t.Fatal(err)
	}
	data := out.Block.Data.(map[string]any)
	lines := data["lines"].([]budgetLine)
	var sum int64
	for _, l := range lines {
		if l.Key == "entertainment" {
			t.Fatal("entertainment still there")
		}
		sum += l.Amount
	}
	if sum != 150_000_000 || len(lines) != 6 {
		t.Fatalf("sum %d lines %d", sum, len(lines))
	}
	// 40 / 92 of 150 juta for venue & catering.
	if lines[0].Amount != 65_217_391 {
		t.Fatalf("venue %d", lines[0].Amount)
	}
	if ex := data["excluded"].([]string); len(ex) != 1 || ex[0] != "Entertainment" {
		t.Fatalf("excluded %v", ex)
	}
	// Aliases from the model and "venue" (never dropped) are handled.
	out, _ = (&Deps{}).dispatch(context.Background(), "hitung_budget", `{"total":"150 juta","tanpa":["hiburan","venue"]}`)
	if n := len(out.Block.Data.(map[string]any)["lines"].([]budgetLine)); n != 6 {
		t.Fatalf("lines %d", n)
	}
}

func TestJabodetabekSearch(t *testing.T) {
	if got := normalizeCity("jabotabek"); got != "Jabodetabek" {
		t.Fatal(got)
	}
	if got := cityVariants("Jabodetabek"); len(got) != 1 || got[0] != "Jabodetabek" {
		t.Fatal(got)
	}
}

func TestSplitBudgetAddAndStack(t *testing.T) {
	// Entertainment removed, then MC added: both changes hold.
	out, err := splitBudgetWith(150_000_000, 300, []string{"entertainment"}, []budgetAdd{{Name: "mc"}})
	if err != nil {
		t.Fatal(err)
	}
	data := out.Block.Data.(map[string]any)
	lines := data["lines"].([]budgetLine)
	var sum int64
	var labels []string
	for _, l := range lines {
		sum += l.Amount
		labels = append(labels, l.Label)
	}
	if sum != 150_000_000 {
		t.Fatalf("sum %d", sum)
	}
	got := strings.Join(labels, ",")
	if strings.Contains(got, "Entertainment") || !strings.Contains(got, "MC") || !strings.HasSuffix(got, "MC,Dana cadangan") {
		t.Fatal(got)
	}
	if ad := data["added"].([]string); len(ad) != 1 || ad[0] != "MC" {
		t.Fatal(ad)
	}
	// Model shapes: list of names, or objects with a percent.
	for _, args := range []string{`{"total":"150 juta","tanpa":["entertainment"],"tambah":["MC"]}`, `{"total":150000000,"tambah":[{"nama":"MC","persen":"5%"},{"nama":"Hantaran"}]}`} {
		o, err := (&Deps{}).dispatch(context.Background(), "hitung_budget", args)
		if err != nil || !strings.Contains(fmt.Sprint(o.Block.Data.(map[string]any)["added"]), "MC") {
			t.Fatalf("%s: %v %v", args, err, o.Block)
		}
	}
	// Adding a default pos back undoes its removal.
	o, _ := splitBudgetWith(100_000_000, 0, []string{"entertainment"}, []budgetAdd{{Name: "Entertainment"}})
	if _, ok := o.Block.Data.(map[string]any)["excluded"]; ok {
		t.Fatal("entertainment should be back")
	}
	if !strings.Contains(blockNote(out.Block), "tanpa Entertainment, ditambah MC") {
		t.Fatal(blockNote(out.Block))
	}
}

func TestBriefToolIsRegistered(t *testing.T) {
	found := false
	for _, td := range toolDefs() {
		if td.Function.Name == "siapkan_brief" {
			found = true
		}
	}
	if !found {
		t.Fatal("siapkan_brief tool missing")
	}
	if got := statusFor("siapkan_brief", `{"kategori":"decor"}`); got != "Menyiapkan brief Dekorasi" {
		t.Fatalf("status = %q", got)
	}
	if got := blockNote(&block{Type: "brief", Data: map[string]any{"label": "Dekorasi"}}); !strings.Contains(got, "Dekorasi") {
		t.Fatalf("blockNote = %q", got)
	}
}

func TestCleanDraft(t *testing.T) {
	got := cleanDraft("  \"Halo **Kak** — siap dibantu\"  ", 100)
	if got != "Halo Kak, siap dibantu" {
		t.Fatalf("cleanDraft = %q", got)
	}
	if n := len([]rune(cleanDraft(strings.Repeat("a", 50), 10))); n != 10 {
		t.Fatalf("cleanDraft must cap length, got %d", n)
	}
}

func TestVendorFactsAndCopilotPrompts(t *testing.T) {
	f := &vendorFacts{
		profile:  &repository.VendorProfile{BusinessName: "Rias Ayu", Categories: []string{"mua_attire"}, City: "Bandung", PriceMin: 3500000, Description: "MUA adat Sunda"},
		packages: []repository.VendorPackage{{Name: "Akad", Price: 3500000, Description: "3 jam"}},
	}
	txt := f.text()
	for _, want := range []string{"Rias Ayu", "MUA & Attire", "Bandung", "Rp3.500.000", "Paket: Akad"} {
		if !strings.Contains(txt, want) {
			t.Errorf("facts missing %q:\n%s", want, txt)
		}
	}
	for name, p := range map[string]string{"reply": replySystem, "describe": describeSystem} {
		if strings.Contains(p, "—") {
			t.Errorf("%s prompt has a long dash", name)
		}
	}
}

func TestDraftRetriesWhenTheModelLeaksContactDetails(t *testing.T) {
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req chatRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		calls++
		answer := "Halo Kak, hubungi kami di 081234567890 ya."
		if strings.Contains(req.Messages[len(req.Messages)-1].Content, "Tulis ulang") {
			answer = "Halo Kak, **boleh** info tanggalnya? Kami cek dulu ya."
		}
		w.Header().Set("Content-Type", "text/event-stream")
		b, _ := json.Marshal(map[string]any{"choices": []any{map[string]any{"delta": map[string]any{"content": answer}}}})
		fmt.Fprintf(w, "data: %s\n\ndata: [DONE]\n\n", b)
	}))
	defer srv.Close()

	d := &Deps{cached: &llmClient{baseURL: srv.URL, apiKey: "k", model: "m", http: srv.Client()}, cachedAt: time.Now()}
	got, err := d.draft(context.Background(), "sys", "user", 500)
	if err != nil {
		t.Fatal(err)
	}
	if calls != 2 || got != "Halo Kak, boleh info tanggalnya? Kami cek dulu ya." {
		t.Fatalf("calls=%d draft=%q", calls, got)
	}

	// A model that keeps leaking is refused rather than shown.
	calls = 0
	d2 := &Deps{cached: &llmClient{baseURL: srv.URL, apiKey: "k", model: "m", http: srv.Client()}, cachedAt: time.Now()}
	srv.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"wa.me/6281234567890\"}}]}\n\ndata: [DONE]\n\n")
	})
	if _, err := d2.draft(context.Background(), "sys", "user", 500); err == nil || calls != 2 {
		t.Fatalf("expected a refusal after 2 tries, err=%v calls=%d", err, calls)
	}
}
