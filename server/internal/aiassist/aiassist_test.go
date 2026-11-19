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
