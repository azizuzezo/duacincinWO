package wilayah

import "testing"

func TestList(t *testing.T) {
	if len(provinces) != 38 {
		t.Fatalf("provinces = %d, want 38", len(provinces))
	}
	if len(byLower) != 514 {
		t.Fatalf("cities = %d, want 514 (a duplicate label?)", len(byLower))
	}
	for in, want := range map[string]string{"bandung": "Bandung", " Sumedang ": "Sumedang", "kab. bandung": "Kab. Bandung"} {
		if got, ok := Canonical(in); !ok || got != want {
			t.Errorf("Canonical(%q) = %q, %v; want %q", in, got, ok, want)
		}
	}
	if _, ok := Canonical("Bandung sumedang"); ok {
		t.Error("free text must not pass")
	}
}
