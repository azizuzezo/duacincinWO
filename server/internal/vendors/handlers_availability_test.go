package vendors

import (
	"strings"
	"testing"
	"time"
)

var testToday = time.Date(2026, 11, 26, 0, 0, 0, 0, time.UTC)

func TestParseAvailabilityRange(t *testing.T) {
	cases := []struct {
		name     string
		from, to string
		wantFrom string
		wantTo   string
		wantErr  bool
	}{
		{"defaults", "", "", "2026-11-26", "2027-12-30", false},
		{"explicit", "2027-03-01", "2027-03-31", "2027-03-01", "2027-03-31", false},
		{"to defaults from from", "2027-01-01", "", "2027-01-01", "2028-02-04", false},
		{"single day", "2027-03-14", "2027-03-14", "2027-03-14", "2027-03-14", false},
		{"exactly 400 days", "2027-01-01", "2028-02-04", "2027-01-01", "2028-02-04", false},
		{"401 days", "2027-01-01", "2028-02-05", "", "", true},
		{"to before from", "2027-03-02", "2027-03-01", "", "", true},
		{"bad from", "2027-13-01", "", "", "", true},
		{"bad to", "", "x", "", "", true},
		{"unpadded", "2027-3-1", "", "", "", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			from, to, msg := parseAvailabilityRange(c.from, c.to, testToday)
			if (msg != "") != c.wantErr {
				t.Fatalf("msg = %q, wantErr %v", msg, c.wantErr)
			}
			if c.wantErr {
				return
			}
			if from.Format(dateLayout) != c.wantFrom || to.Format(dateLayout) != c.wantTo {
				t.Fatalf("range = %s..%s, want %s..%s", from.Format(dateLayout), to.Format(dateLayout), c.wantFrom, c.wantTo)
			}
		})
	}
}

func TestParseBlockDates(t *testing.T) {
	many := make([]string, 63)
	for i := range many {
		many[i] = testToday.AddDate(0, 0, i).Format(dateLayout)
	}
	cases := []struct {
		name    string
		raw     []string
		wantLen int
		wantErr string
	}{
		{"valid", []string{"2027-03-14", "2027-03-15"}, 2, ""},
		{"today allowed", []string{"2026-11-26"}, 1, ""},
		{"duplicates collapsed", []string{"2027-03-14", "2027-03-14"}, 1, ""},
		{"empty", nil, 0, "minimal"},
		{"past", []string{"2026-11-25"}, 0, "lewat"},
		{"bad format", []string{"2027-02-30"}, 0, "tidak valid"},
		{"62 allowed", many[:62], 62, ""},
		{"63 rejected", many, 0, "62"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, msg := parseBlockDates(c.raw, testToday)
			if c.wantErr == "" && msg != "" || c.wantErr != "" && !strings.Contains(msg, c.wantErr) {
				t.Fatalf("msg = %q, want contains %q", msg, c.wantErr)
			}
			if len(got) != c.wantLen {
				t.Fatalf("len = %d, want %d", len(got), c.wantLen)
			}
		})
	}
}
