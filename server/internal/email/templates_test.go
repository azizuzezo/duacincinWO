package email

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const testLogo = "https://wo.example.test/brand/duacincin-logo.webp"

type renderFn func(logoURL, code string) (string, string, error)

var renderers = map[string]struct {
	render renderFn
	text   func(string) string
	phrase string
}{
	"reset":     {RenderPasswordResetOTPEmail, RenderPasswordResetOTPText, "kata sandi baru"},
	"phonelink": {RenderPhoneLinkOTPEmail, RenderPhoneLinkOTPText, "WhatsApp"},
}

func TestOTPEmailsRender(t *testing.T) {
	const code = "482913"
	for name, r := range renderers {
		for _, logo := range []string{testLogo, ""} {
			subject, html, err := r.render(logo, code)
			if err != nil {
				t.Fatalf("%s (logo %q): render error: %v", name, logo, err)
			}
			if !strings.Contains(subject, code) {
				t.Errorf("%s: subject %q does not contain the code", name, subject)
			}
			if !strings.Contains(html, `aria-label="Kode `+code+`"`) {
				t.Errorf("%s: html does not label the code", name)
			}
			for _, d := range code {
				if !strings.Contains(html, ">"+string(d)+"</td>") {
					t.Errorf("%s: digit %c missing from the code cells", name, d)
				}
			}
			if !strings.Contains(html, r.phrase) {
				t.Errorf("%s: purpose copy %q missing", name, r.phrase)
			}
			if !strings.Contains(html, "Abaikan saja email ini") {
				t.Errorf("%s: ignore-if-not-you line missing", name)
			}
			if strings.Contains(html, "—") || strings.Contains(html, "<no value>") || strings.Contains(html, "ZgotmplZ") {
				t.Errorf("%s: html contains an em dash or a template error marker", name)
			}
			if strings.Contains(html, ".webp") {
				t.Errorf("%s: email must not reference WebP images", name)
			}
			if logo == "" {
				if strings.Contains(html, "<img") || strings.Contains(html, "href=") {
					t.Errorf("%s: without a public base the email must not carry images or links", name)
				}
			} else {
				for _, want := range []string{
					`src="https://wo.example.test/email/header.jpg"`,
					`src="https://wo.example.test/email/logo.png"`,
				} {
					if !strings.Contains(html, want) {
						t.Errorf("%s: missing %s", name, want)
					}
				}
			}
			if txt := r.text(code); !strings.Contains(txt, code) || strings.Contains(txt, "<") {
				t.Errorf("%s: plain-text part is wrong: %q", name, txt)
			}
		}

		// Optional previews for visual review: EMAIL_PREVIEW_DIR=/some/dir go test ./internal/email/...
		if dir := os.Getenv("EMAIL_PREVIEW_DIR"); dir != "" {
			_, html, _ := r.render(os.Getenv("EMAIL_PREVIEW_LOGO_URL"), code)
			if err := os.WriteFile(filepath.Join(dir, "wo-"+name+".html"), []byte(html), 0o644); err != nil {
				t.Fatalf("write preview: %v", err)
			}
		}
	}
}

func TestResetEmailLinksToLogin(t *testing.T) {
	_, html, err := RenderPasswordResetOTPEmail(testLogo, "123456")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(html, `href="https://wo.example.test/login"`) {
		t.Error("reset email should link to the login page on the WO site")
	}
}

func TestOTPEmailEscapesCode(t *testing.T) {
	_, html, err := RenderPasswordResetOTPEmail(testLogo, "<b>")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(html, "<b>") {
		t.Error("code must be HTML-escaped")
	}
}

func TestAssetBase(t *testing.T) {
	cases := []struct{ in, base, host string }{
		{"https://duacincin.id/brand/duacincin-logo.webp", "https://duacincin.id", "duacincin.id"},
		{"https://cdn.example.com/wo/brand/duacincin-logo.webp", "https://cdn.example.com/wo", "cdn.example.com"},
		{"https://duacincin.id/other/logo.png", "https://duacincin.id", "duacincin.id"},
		{"http://localhost:3100/brand/duacincin-logo.webp", "http://localhost:3100", "localhost:3100"},
		{"", "", ""},
		{"/brand/duacincin-logo.webp", "", ""},
		{"javascript:alert(1)", "", ""},
	}
	for _, c := range cases {
		base, host := assetBase(c.in)
		if base != c.base || host != c.host {
			t.Errorf("assetBase(%q) = %q, %q; want %q, %q", c.in, base, host, c.base, c.host)
		}
	}
}
