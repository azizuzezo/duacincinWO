package vendors

import (
	"reflect"
	"testing"
)

func TestNormalizeCategories(t *testing.T) {
	cases := []struct {
		name string
		in   []string
		want []string
		msg  string
	}{
		{"keeps order, main first", []string{"mc", "entertainment"}, []string{"mc", "entertainment"}, ""},
		{"drops repeats", []string{"decor", "hantaran", "decor"}, []string{"decor", "hantaran"}, ""},
		{"new categories accepted", []string{"content_creator", "wedding_car", "wedding_cake"}, []string{"content_creator", "wedding_car", "wedding_cake"}, ""},
		{"empty", nil, nil, "pilih minimal satu kategori usaha"},
		{"unknown", []string{"venue", "pawang_hujan"}, nil, "kategori tidak valid"},
	}
	for _, c := range cases {
		got, msg := normalizeCategories(c.in)
		if msg != c.msg || (c.msg == "" && !reflect.DeepEqual(got, c.want)) {
			t.Errorf("%s: got %v %q, want %v %q", c.name, got, msg, c.want, c.msg)
		}
	}
}

func TestNormalizeWhatsApp(t *testing.T) {
	cases := []struct {
		in   string
		want string
		ok   bool
	}{
		{"0812-3456-7890", "6281234567890", true},
		{"+62 812 3456 7890", "6281234567890", true},
		{"812 3456 7890", "6281234567890", true},
		{"(0812) 3456.789", "628123456789", true},
		{"6281234567", "6281234567", true},
		{"021 555 1234", "", false},         // landline, not WhatsApp mobile
		{"0812", "", false},                 // too short
		{"0812345678901234", "", false},     // too long
		{"wa.me/6281234567890", "", false},  // not just a number
		{"0812 3456 7890 ext 1", "", false}, // letters
		{"", "", false},
	}
	for _, c := range cases {
		got, ok := NormalizeWhatsApp(c.in)
		if got != c.want || ok != c.ok {
			t.Errorf("NormalizeWhatsApp(%q) = %q, %v; want %q, %v", c.in, got, ok, c.want, c.ok)
		}
	}
}
