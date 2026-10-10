package vendors

import (
	"strings"
	"testing"
)

func TestPackageRequestValidate(t *testing.T) {
	cases := []struct {
		name string
		req  packageRequest
		want string
	}{
		{"valid", packageRequest{Name: "Paket Full Day", Description: "8 jam", Price: 25_000_000}, ""},
		{"free package allowed", packageRequest{Name: "Konsultasi", Price: 0}, ""},
		{"trims whitespace then accepts", packageRequest{Name: "  Silver  ", Price: 1}, ""},
		{"empty name", packageRequest{Name: "   ", Price: 1}, "nama paket wajib diisi"},
		{"name too long", packageRequest{Name: strings.Repeat("a", maxPackageNameLen+1), Price: 1}, "nama paket terlalu panjang"},
		{"description too long", packageRequest{Name: "A", Description: strings.Repeat("a", maxPackageDescLen+1), Price: 1}, "deskripsi paket terlalu panjang"},
		{"negative price", packageRequest{Name: "A", Price: -1}, "harga tidak valid"},
		{"multibyte name counted in runes", packageRequest{Name: strings.Repeat("é", maxPackageNameLen), Price: 1}, ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := c.req
			if got := req.validate(); got != c.want {
				t.Fatalf("validate() = %q, want %q", got, c.want)
			}
		})
	}

	trim := packageRequest{Name: "  Silver  ", Description: "  x  ", Price: 1}
	trim.validate()
	if trim.Name != "Silver" || trim.Description != "x" {
		t.Fatalf("validate() must trim in place, got %q / %q", trim.Name, trim.Description)
	}
}
