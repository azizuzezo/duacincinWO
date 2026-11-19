package whatsapp

import (
	"strings"
	"testing"

	"duacincin/server/internal/repository"
)

func TestMessagePreview(t *testing.T) {
	img := "image/jpeg"
	url := "x"
	cases := []struct {
		msg  repository.Message
		want string
	}{
		{repository.Message{Body: "  Halo\n kak  "}, `"Halo kak"`},
		{repository.Message{Body: "WA 0812", Flagged: true}, "_(Pesan ini hanya bisa dibaca di DuaCincin.)_"},
		{repository.Message{AttachmentURL: &url, AttachmentType: &img}, "📷 Foto"},
		{repository.Message{Body: "lihat", AttachmentURL: &url, AttachmentType: &img}, "📷 Foto\n\"lihat\""},
	}
	for _, c := range cases {
		if got := messagePreview(&c.msg); got != c.want {
			t.Errorf("messagePreview(%+v) = %q, want %q", c.msg, got, c.want)
		}
	}
	long := strings.Repeat("a", 400)
	if got := messagePreview(&repository.Message{Body: long}); !strings.HasSuffix(got, "…\"") || len([]rune(got)) != 303 {
		t.Errorf("long preview not shortened: %d", len([]rune(got)))
	}
}
