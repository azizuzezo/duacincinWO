package repository

import "math"

// DefaultCommissionRate is the platform commission when Admin has not set a
// vendor-specific rate (PRD §8.10).
const DefaultCommissionRate = 0.10

// EffectiveCommissionRate is the vendor's override, or the platform default.
func (p *VendorProfile) EffectiveCommissionRate() float64 {
	if p.CommissionRate != nil {
		return *p.CommissionRate
	}
	return DefaultCommissionRate
}

// CustomerPrice is what a couple sees and pays for a vendor price: the
// commission is added on top, so the vendor still receives their own price
// in full. Zero ("harga lewat chat") stays zero.
func CustomerPrice(vendorPrice int64, rate float64) int64 {
	if vendorPrice <= 0 {
		return vendorPrice
	}
	return int64(math.Round(float64(vendorPrice) * (1 + rate)))
}

// CommissionInCustomerPrice splits a customer total back into the platform's
// share; total minus this is what the vendor receives.
func CommissionInCustomerPrice(customerTotal int64, rate float64) int64 {
	if customerTotal <= 0 {
		return 0
	}
	return customerTotal - int64(math.Round(float64(customerTotal)/(1+rate)))
}
