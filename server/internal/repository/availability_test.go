package repository

import (
	"testing"
	"time"
)

func day(s string) time.Time {
	d, err := time.Parse("2006-01-02", s)
	if err != nil {
		panic(err)
	}
	return d
}

func TestMergeAvailability(t *testing.T) {
	cases := []struct {
		name            string
		booked, blocked []string
		want            []string // "date:reason"
	}{
		{"empty", nil, nil, []string{}},
		{"blocked only", nil, []string{"2027-03-15"}, []string{"2027-03-15:blocked"}},
		{"booked only", []string{"2027-03-14"}, nil, []string{"2027-03-14:booked"}},
		{"booked wins on overlap", []string{"2027-03-14"}, []string{"2027-03-14"}, []string{"2027-03-14:booked"}},
		{
			"sorted ascending across both",
			[]string{"2027-05-01", "2027-03-14"},
			[]string{"2027-04-01", "2027-03-14", "2027-01-01"},
			[]string{"2027-01-01:blocked", "2027-03-14:booked", "2027-04-01:blocked", "2027-05-01:booked"},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var booked, blocked []time.Time
			for _, s := range c.booked {
				booked = append(booked, day(s))
			}
			for _, s := range c.blocked {
				blocked = append(blocked, day(s))
			}
			got := MergeAvailability(booked, blocked)
			if len(got) != len(c.want) {
				t.Fatalf("got %d days, want %d", len(got), len(c.want))
			}
			for i, g := range got {
				if s := g.Day.Format("2006-01-02") + ":" + g.Reason; s != c.want[i] {
					t.Fatalf("[%d] = %s, want %s", i, s, c.want[i])
				}
			}
		})
	}
}

func TestTodayJakarta(t *testing.T) {
	// 20:00 UTC on the 25th is already 03:00 on the 26th in Jakarta.
	got := TodayJakarta(time.Date(2026, 11, 25, 20, 0, 0, 0, time.UTC))
	if want := day("2026-11-26"); !got.Equal(want) {
		t.Fatalf("TodayJakarta = %v, want %v", got, want)
	}
}
