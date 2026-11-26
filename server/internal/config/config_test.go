package config

import "testing"

func TestParseCloudinaryURL(t *testing.T) {
	name, key, secret := ParseCloudinaryURL("cloudinary://111:secret@demo")
	if name != "demo" || key != "111" || secret != "secret" {
		t.Fatalf("got %q %q %q", name, key, secret)
	}
	for _, bad := range []string{"", "cloudinary://111@demo", "cloudinary://:secret@demo", "cloudinary://111:secret@", "https://111:secret@demo", "::notaurl"} {
		if n, k, s := ParseCloudinaryURL(bad); n != "" || k != "" || s != "" {
			t.Errorf("%q must be not configured", bad)
		}
	}
}
