package wilayah

import (
	"strings"
	"testing"
)

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

func TestSplit(t *testing.T) {
	for in, want := range map[string]string{
		"Bandung sumedang":                 "Bandung|Sumedang",
		"Kota Bandung, Kabupaten Sumedang": "Bandung|Sumedang",
		"kab bandung / bandung barat":      "Kab. Bandung|Bandung Barat",
		"Jakarta Selatan dan Depok":        "Jakarta Selatan|Depok",
		"Yogyakarta":                       "Yogyakarta",
	} {
		got, ok := Split(in)
		if !ok || strings.Join(got, "|") != want {
			t.Errorf("Split(%q) = %v, %v; want %s", in, got, ok, want)
		}
	}
	for _, in := range []string{"Jakarta", "Bandung kota kembang", ""} {
		if got, ok := Split(in); ok {
			t.Errorf("Split(%q) = %v, want no match", in, got)
		}
	}
}

func TestNoStraySpacesAndJakartaUtara(t *testing.T) {
	if c, ok := Canonical("Jakarta Utara"); !ok || c != "Jakarta Utara" {
		t.Fatalf("Jakarta Utara: %q %v", c, ok)
	}
	for _, p := range provinces {
		for _, c := range p.Cities {
			if c != strings.TrimSpace(c) {
				t.Fatalf("stray space in %q (%s)", c, p.Name)
			}
		}
	}
}

func TestJabodetabekCitiesExist(t *testing.T) {
	for _, c := range Jabodetabek {
		if got, ok := Canonical(c); !ok || got != c {
			t.Fatalf("%q not in the list", c)
		}
	}
	if len(Jabodetabek) > MaxCities {
		t.Fatal("Jabodetabek must fit in MaxCities")
	}
	if g, ok := Group(" JaboTabek "); !ok || len(g) != 13 {
		t.Fatal("Jabotabek alias")
	}
}

func TestNormalizeCities(t *testing.T) {
	out, msg := NormalizeCities([]string{" jakarta utara", "Jakarta Utara", "kab. bogor"})
	if msg != "" || len(out) != 2 || out[0] != "Jakarta Utara" || out[1] != "Kab. Bogor" {
		t.Fatal(out, msg)
	}
	if _, msg := NormalizeCities([]string{"Gotham"}); msg == "" {
		t.Fatal("unknown city accepted")
	}
	if _, msg := NormalizeCities(nil); msg == "" {
		t.Fatal("empty accepted")
	}
}

func TestJabodetabekArea(t *testing.T) {
	if c, ok := Canonical(" jabotabek "); !ok || c != JabodetabekArea {
		t.Fatalf("Canonical(jabotabek) = %q, %v", c, ok)
	}
	out, msg := NormalizeCities([]string{"Depok", "Jabodetabek", "Bandung", "Jakarta Selatan"})
	if msg != "" || len(out) != 2 || out[0] != JabodetabekArea || out[1] != "Bandung" {
		t.Fatalf("NormalizeCities = %v %q, want [Jabodetabek Bandung]", out, msg)
	}
	if got := MatchNames("depok"); len(got) != 2 || got[0] != "Depok" || got[1] != JabodetabekArea {
		t.Fatalf("MatchNames(depok) = %v", got)
	}
	if got := MatchNames("Jabodetabek"); len(got) != 14 || got[0] != JabodetabekArea {
		t.Fatalf("MatchNames(Jabodetabek) = %v", got)
	}
	if got := MatchNames("Bandung"); len(got) != 1 || got[0] != "Bandung" {
		t.Fatalf("MatchNames(Bandung) = %v", got)
	}
	if MatchNames("") != nil {
		t.Fatal("MatchNames(\"\") should be nil")
	}
}
