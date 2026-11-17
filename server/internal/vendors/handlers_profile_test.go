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
