package auth

import "testing"

func TestAvatarPath(t *testing.T) {
	if got := avatarPath("u1", "abc", "png"); got != "u1/abc.png" {
		t.Fatalf("got %q", got)
	}
}

func TestAvatarPathFromURL(t *testing.T) {
	cases := []struct {
		name string
		url  string
		want string
		ok   bool
	}{
		{"own bucket", "https://x.supabase.co/storage/v1/object/public/foto-profil/u1/abc.png", "u1/abc.png", true},
		{"other bucket", "https://x.supabase.co/storage/v1/object/public/portofolio-vendor/u1/abc.png", "", false},
		{"empty", "", "", false},
		{"no path", "https://x/storage/v1/object/public/foto-profil/", "", false},
		{"traversal", "https://x/storage/v1/object/public/foto-profil/../other/a.png", "", false},
		{"foreign url", "https://example.com/me.png", "", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, ok := avatarPathFromURL(c.url)
			if got != c.want || ok != c.ok {
				t.Fatalf("got (%q, %v), want (%q, %v)", got, ok, c.want, c.ok)
			}
		})
	}
}
