package briefs

import (
	"strings"
	"testing"
)

func TestNormalize(t *testing.T) {
	b := Brief{Category: "photo_video", City: "  Bandung \n", Guests: -5, BudgetMax: -1, Notes: strings.Repeat("a", 900)}
	if err := b.Normalize(); err != nil {
		t.Fatal(err)
	}
	if b.City != "Bandung" || b.Guests != 0 || b.BudgetMax != 0 || len([]rune(b.Notes)) != maxNotes {
		t.Fatalf("unexpected normalize result: %+v", b)
	}
	if err := (&Brief{Category: "nope"}).Normalize(); err == nil {
		t.Fatal("unknown category must be refused")
	}
}

func TestMessageOnlyListsFilledFields(t *testing.T) {
	b := Brief{Category: "decor", City: "Sleman", Guests: 300, BudgetMax: 15000000, Style: "adat Jawa"}
	m := b.Message()
	for _, want := range []string{"Dekorasi", "- Kota: Sleman", "- Jumlah tamu: 300", "- Gaya atau adat: adat Jawa", "sampai Rp15.000.000"} {
		if !strings.Contains(m, want) {
			t.Errorf("message missing %q:\n%s", want, m)
		}
	}
	for _, not := range []string{"Tanggal acara", "Catatan"} {
		if strings.Contains(m, not) {
			t.Errorf("empty field %q must not appear:\n%s", not, m)
		}
	}
	if strings.Contains(m, "—") {
		t.Error("no long dash")
	}
}

func TestEveryCategoryHasALabel(t *testing.T) {
	if len(CategoryLabels) != 12 {
		t.Fatalf("expected 12 categories, got %d", len(CategoryLabels))
	}
}
