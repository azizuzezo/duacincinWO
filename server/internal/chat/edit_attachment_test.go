package chat

import (
	"strings"
	"testing"
	"time"

	"duacincin/server/internal/config"
	"duacincin/server/internal/repository"
)

func TestWithinWindow(t *testing.T) {
	created := time.Date(2026, 11, 11, 10, 0, 0, 0, time.UTC)
	if !withinWindow(created, created.Add(14*time.Minute), editWindow) {
		t.Fatal("14 minutes must still be editable")
	}
	if withinWindow(created, created.Add(16*time.Minute), editWindow) {
		t.Fatal("16 minutes must be too late to edit")
	}
	if !withinWindow(created, created.Add(23*time.Hour), retractWindow) || withinWindow(created, created.Add(25*time.Hour), retractWindow) {
		t.Fatal("retract window is 24 hours")
	}
}

func TestRetractedMessageDTOLeaksNothing(t *testing.T) {
	now := time.Now()
	url, typ, name, size := "https://x/y.png", "image/png", "foto.png", int64(10)
	m := repository.Message{
		ID: "m1", SenderID: "u1", Body: "rahasia 081234567890", Flagged: true,
		AttachmentURL: &url, AttachmentType: &typ, AttachmentName: &name, AttachmentSize: &size,
		CreatedAt: now, RetractedAt: &now, EditedAt: &now,
	}
	dto := toMessageDTO(&m)
	if dto.Body != "" || dto.Flagged || dto.AttachmentURL != nil || dto.AttachmentType != nil || dto.AttachmentName != nil || dto.AttachmentSize != nil {
		t.Fatalf("retracted dto leaks: %+v", dto)
	}
	if !dto.Retracted || !dto.Edited {
		t.Fatalf("flags missing: %+v", dto)
	}
	if m.Body == "" {
		t.Fatal("toMessageDTO must not modify the stored message")
	}
	p := replyPreview(&m)
	if p.Body != "" || !p.Retracted {
		t.Fatalf("reply preview = %+v", p)
	}
	live := replyPreview(&repository.Message{ID: "m2", SenderID: "u1", Body: "halo"})
	if live.Body != "halo" || live.Retracted {
		t.Fatalf("live preview = %+v", live)
	}
}

// Example from Cloudinary's docs ("Generating authentication signatures").
func TestCloudinarySignatureDocsExample(t *testing.T) {
	got := cloudinarySignature(map[string]string{
		"eager":     "w_400,h_300,c_pad|w_260,h_200,c_crop",
		"public_id": "sample_image",
		"timestamp": "1315060510",
	}, "abcd")
	if want := "bfd09f95f331f558cbd1320e67aa8d488770583e"; got != want {
		t.Fatalf("signature = %s, want %s", got, want)
	}
}

func TestCheckAttachment(t *testing.T) {
	cases := []struct {
		mime    string
		size    int64
		wantMsg string
		kind    string
	}{
		{"image/jpeg", 1 * mb, "", "image"},
		{"image/gif", 15 * mb, "", "image"},
		{"image/jpeg", 15*mb + 1, "Ukuran file maksimal 15 MB untuk foto.", ""},
		{"video/mp4", 100 * mb, "", "video"},
		{"video/webm", 100*mb + 1, "Ukuran file maksimal 100 MB untuk video.", ""},
		{"application/pdf", 25 * mb, "", "document"},
		{"text/csv", 25*mb + 1, "Ukuran file maksimal 25 MB untuk dokumen.", ""},
		{"application/zip", 1, msgUnsupportedFile, ""},
		{"image/svg+xml", 1, msgUnsupportedFile, ""},
		{"text/html", 1, msgUnsupportedFile, ""},
		{"application/x-msdownload", 1, msgUnsupportedFile, ""},
		{"", 1, msgUnsupportedFile, ""},
		{"application/pdf", 0, msgFileEmpty, ""},
	}
	for _, c := range cases {
		spec, msg := checkAttachment(c.mime, c.size)
		if msg != c.wantMsg || spec.Kind != c.kind {
			t.Errorf("checkAttachment(%q,%d) = %q,%q want %q,%q", c.mime, c.size, spec.Kind, msg, c.kind, c.wantMsg)
		}
	}
	if spec, _ := checkAttachment("application/pdf", 1); spec.ResourceType != "raw" || spec.Ext != "pdf" {
		t.Fatalf("pdf spec = %+v", spec)
	}
	if spec, _ := checkAttachment("video/mp4", 1); spec.ResourceType != "video" {
		t.Fatalf("video spec = %+v", spec)
	}
}

func TestValidateAttachmentRef(t *testing.T) {
	cfg := &config.Config{CloudinaryCloudName: "demo", SupabaseURL: "https://sb.example.co"}
	conv := "11111111-1111-1111-1111-111111111111"
	other := "22222222-2222-2222-2222-222222222222"
	pdf, png, mp4 := "application/pdf", "image/png", "video/mp4"
	good := "https://res.cloudinary.com/demo/raw/upload/v1/duacincin/chat/" + conv + "/abc.pdf"
	legacy := "https://sb.example.co/storage/v1/object/public/chat-attachments/" + conv + "/abc.png"

	cases := []struct {
		name string
		url  string
		mime *string
		ok   bool
	}{
		{"cloudinary raw pdf", good, &pdf, true},
		{"cloudinary video", "https://res.cloudinary.com/demo/video/upload/v1/duacincin/chat/" + conv + "/abc.mp4", &mp4, true},
		{"legacy multipart image", legacy, &png, true},
		{"legacy url for a pdf", legacy, &pdf, false},
		{"missing type", good, nil, false},
		{"other conversation folder", strings.Replace(good, conv, other, 1), &pdf, false},
		{"other cloud", strings.Replace(good, "/demo/", "/evil/", 1), &pdf, false},
		{"http scheme", strings.Replace(good, "https", "http", 1), &pdf, false},
		{"other host", strings.Replace(good, "res.cloudinary.com", "evil.example", 1), &pdf, false},
		{"userinfo trick", "https://res.cloudinary.com@evil.example/demo/raw/upload/duacincin/chat/" + conv + "/a.pdf", &pdf, false},
		{"resource type mismatch", good, &mp4, false},
		{"arbitrary hotlink", "https://example.com/a.png", &png, false},
		{"unsupported type", good, strPtr("application/zip"), false},
		{"legacy for another conversation", strings.Replace(legacy, conv, other, 1), &png, false},
	}
	for _, c := range cases {
		got := validateAttachmentRef(cfg, conv, c.url, c.mime) == ""
		if got != c.ok {
			t.Errorf("%s: ok = %v, want %v", c.name, got, c.ok)
		}
	}
	// Without Cloudinary configured no Cloudinary URL is accepted.
	if validateAttachmentRef(&config.Config{}, conv, good, &pdf) == "" {
		t.Error("cloudinary url accepted while unconfigured")
	}
}

func TestSanitizeAttachmentName(t *testing.T) {
	if got := sanitizeAttachmentName(strPtr("../../etc/pass\\wd\x00\n.pdf")); got != "etcpasswd.pdf" {
		t.Fatalf("got %q", got)
	}
	if got := sanitizeAttachmentName(strPtr(strings.Repeat("a", 300))); len(got) != 200 {
		t.Fatalf("len = %d", len(got))
	}
	if sanitizeAttachmentName(nil) != "" {
		t.Fatal("nil must be empty")
	}
}

func strPtr(s string) *string { return &s }
