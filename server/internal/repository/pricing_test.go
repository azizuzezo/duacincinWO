package repository

import "testing"

func TestCustomerPriceRoundTrip(t *testing.T) {
	for _, tc := range []struct {
		base int64
		rate float64
		want int64
	}{{10_000_000, 0.10, 11_000_000}, {5_000_000, 0.125, 5_625_000}, {0, 0.10, 0}, {7_350_000, 0, 7_350_000}} {
		got := CustomerPrice(tc.base, tc.rate)
		if got != tc.want {
			t.Errorf("CustomerPrice(%d, %v) = %d, want %d", tc.base, tc.rate, got, tc.want)
		}
		if vendor := got - CommissionInCustomerPrice(got, tc.rate); vendor != tc.base {
			t.Errorf("vendor share of %d at %v = %d, want %d", got, tc.rate, vendor, tc.base)
		}
	}
}
