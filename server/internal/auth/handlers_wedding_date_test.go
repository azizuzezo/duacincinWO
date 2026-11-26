package auth

import (
	"testing"
	"time"
)

func TestParseWeddingDate(t *testing.T) {
	today := time.Date(2026, 11, 26, 0, 0, 0, 0, time.UTC)
	cases := []struct {
		name    string
		raw     string
		want    string // formatted date, "" for nil
		wantErr bool
	}{
		{"empty clears", "", "", false},
		{"valid", "2027-03-14", "2027-03-14", false},
		{"today allowed", "2026-11-26", "2026-11-26", false},
		{"yesterday rejected", "2026-11-25", "", true},
		{"exactly five years ahead allowed", "2031-11-26", "2031-11-26", false},
		{"one day past five years", "2031-11-27", "", true},
		{"not a calendar date", "2027-02-30", "", true},
		{"wrong format slashes", "14/03/2027", "", true},
		{"missing zero padding", "2027-3-14", "", true},
		{"with time part", "2027-03-14T00:00:00Z", "", true},
		{"garbage", "besok", "", true},
		{"leap day valid", "2028-02-29", "2028-02-29", false},
		{"leap day invalid year", "2027-02-29", "", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, msg := parseWeddingDate(c.raw, today)
			if (msg != "") != c.wantErr {
				t.Fatalf("msg = %q, wantErr %v", msg, c.wantErr)
			}
			if gotStr := formatWeddingDate(got); gotStr != c.want {
				t.Fatalf("date = %q, want %q", gotStr, c.want)
			}
		})
	}
}
