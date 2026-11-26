package articles

import (
	"strings"
	"testing"
)

const validDoc = `{"type":"doc","content":[
 {"type":"heading","attrs":{"level":2,"textAlign":"center"},"content":[{"type":"text","text":"Judul"}]},
 {"type":"paragraph","attrs":{"textAlign":null},"content":[
   {"type":"text","text":"Halo ","marks":[{"type":"bold"},{"type":"textStyle","attrs":{"fontFamily":"Georgia","fontSize":"18px","color":"#a1b"}}]},
   {"type":"text","text":"tautan","marks":[{"type":"link","attrs":{"href":"https://x.id","target":"_blank","rel":"noopener","class":null}},{"type":"highlight","attrs":{"color":"#ffcc00"}}]},
   {"type":"hardBreak"}]},
 {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"satu"}]}]}]},
 {"type":"orderedList","attrs":{"start":1},"content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},
 {"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"kutip","marks":[{"type":"italic"},{"type":"underline"},{"type":"strike"},{"type":"code"}]}]}]},
 {"type":"horizontalRule"},
 {"type":"image","attrs":{"src":"/foto/a.webp","alt":"a","title":null,"width":50}}]}`

func TestValidateBodyValid(t *testing.T) {
	if _, err := ValidateBody([]byte(validDoc)); err != nil {
		t.Fatal(err)
	}
	if b, err := ValidateBody(nil); err != nil || string(b) != string(EmptyBody) {
		t.Fatalf("empty: %v %s", err, b)
	}
}

func nested(n int) string {
	return strings.Repeat(`{"type":"blockquote","content":[`, n) + `{"type":"paragraph"}` + strings.Repeat(`]}`, n)
}

func TestValidateBodyRejects(t *testing.T) {
	p := func(inner string) string {
		return `{"type":"doc","content":[{"type":"paragraph","content":[` + inner + `]}]}`
	}
	cases := map[string]string{
		"not json":       `{`,
		"root not doc":   `{"type":"paragraph"}`,
		"unknown node":   `{"type":"doc","content":[{"type":"script"}]}`,
		"html node":      `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"html","text":"<b>"}]}]}`,
		"unknown key":    `{"type":"doc","content":[{"type":"paragraph","onclick":"x"}]}`,
		"unknown attr":   `{"type":"doc","content":[{"type":"paragraph","attrs":{"style":"x"}}]}`,
		"heading level":  `{"type":"doc","content":[{"type":"heading","attrs":{"level":1}}]}`,
		"bad align":      `{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":"top"}}]}`,
		"unknown mark":   p(`{"type":"text","text":"a","marks":[{"type":"sup"}]}`),
		"js link":        p(`{"type":"text","text":"a","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}`),
		"proto-relative": p(`{"type":"text","text":"a","marks":[{"type":"link","attrs":{"href":"//evil.com"}}]}`),
		"bad font":       p(`{"type":"text","text":"a","marks":[{"type":"textStyle","attrs":{"fontFamily":"Comic Sans"}}]}`),
		"font size":      p(`{"type":"text","text":"a","marks":[{"type":"textStyle","attrs":{"fontSize":"99px"}}]}`),
		"bad color":      p(`{"type":"text","text":"a","marks":[{"type":"highlight","attrs":{"color":"red"}}]}`),
		"image http":     `{"type":"doc","content":[{"type":"image","attrs":{"src":"http://x/a.png"}}]}`,
		"image data":     `{"type":"doc","content":[{"type":"image","attrs":{"src":"data:image/png;base64,AA"}}]}`,
		"image width":    `{"type":"doc","content":[{"type":"image","attrs":{"src":"/a.png","width":5}}]}`,
		"image alt long": `{"type":"doc","content":[{"type":"image","attrs":{"src":"/a.png","alt":"` + strings.Repeat("a", 301) + `"}}]}`,
		"wrong parent":   `{"type":"doc","content":[{"type":"listItem"}]}`,
		"text at doc":    `{"type":"doc","content":[{"type":"text","text":"a"}]}`,
		"too deep":       `{"type":"doc","content":[` + nested(12) + `]}`,
		"too big":        `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"` + strings.Repeat("a", MaxBodyBytes) + `"}]}]}`,
	}
	for name, doc := range cases {
		_, err := ValidateBody([]byte(doc))
		if err == nil {
			t.Errorf("%s: accepted", name)
		} else if !strings.HasPrefix(err.Error(), "isi artikel tidak valid: ") {
			t.Errorf("%s: message %q", name, err)
		}
	}
	if _, err := ValidateBody([]byte(`{"type":"doc","content":[` + nested(8) + `]}`)); err != nil {
		t.Errorf("depth 9 should pass: %v", err)
	}
}

func TestStatsAndReadingMinutes(t *testing.T) {
	b, _ := ValidateBody([]byte(validDoc))
	if _, has := Stats(b); !has {
		t.Fatal("expected content")
	}
	if _, has := Stats(EmptyBody); has {
		t.Fatal("empty doc has no content")
	}
	if ReadingMinutes(EmptyBody) != 1 {
		t.Fatal("min 1")
	}
	long := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"` + strings.Repeat("kata ", 450) + `"}]}]}`
	if got := ReadingMinutes([]byte(long)); got != 3 {
		t.Fatalf("got %d", got)
	}
}

func TestDeriveSlug(t *testing.T) {
	cases := map[string]string{
		"Tips Memilih Venue Pernikahan!": "tips-memilih-venue-pernikahan",
		"  --Hemat 50% Biaya--  ":        "hemat-50-biaya",
		"!!":                             "artikel",
		"Café Å 2027":                    "caf-2027",
	}
	for in, want := range cases {
		if got := DeriveSlug(in); got != want {
			t.Errorf("%q: got %q want %q", in, got, want)
		}
	}
	long := DeriveSlug(strings.Repeat("kata ", 40))
	if len(long) > MaxSlug || strings.HasSuffix(long, "-") || !SlugRe.MatchString(long) {
		t.Errorf("long slug %q", long)
	}
	if s := SlugWithSuffix(strings.Repeat("a", 80), 12); len(s) != 80 || !strings.HasSuffix(s, "-12") {
		t.Errorf("suffix %q", s)
	}
	if SlugWithSuffix("abc", 1) != "abc" || SlugWithSuffix("abc", 3) != "abc-3" {
		t.Error("suffix basic")
	}
}

func TestLocalHTTP(t *testing.T) {
	for _, ok := range []string{"http://localhost:54321/x.png", "http://127.0.0.1:55453/artikel-foto/a.webp", "http://localhost/x"} {
		if !LocalHTTP(ok) {
			t.Errorf("%q should be accepted", ok)
		}
	}
	for _, bad := range []string{"http://example.com/x.png", "http://localhost.evil.com/x", "http://127.0.0.1.evil.com/x", "ftp://localhost/x", "//localhost/x"} {
		if LocalHTTP(bad) {
			t.Errorf("%q should be refused", bad)
		}
	}
}
