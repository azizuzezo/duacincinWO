// Package wilayah holds Indonesia's 38 provinces and 514 regencies/cities
// (Kepmendagri No 300.2.2-2138 Tahun 2025, via github.com/cahyadsn/wilayah),
// so a vendor's kabupaten/kota is picked from one list instead of typed free.
//
// Labels drop the "Kota"/"Kabupaten" prefix ("Bandung", "Sumedang"); a
// regency that shares its name with a city keeps "Kab." ("Kab. Bandung").
// wilayah.json is shared byte-for-byte with web/src/lib/wilayah.json.
package wilayah

import (
	_ "embed"
	"encoding/json"
	"strings"
)

type Province struct {
	Name   string   `json:"name"`
	Cities []string `json:"cities"`
}

//go:embed wilayah.json
var raw []byte

var (
	provinces []Province
	byLower   = map[string]string{}
)

func init() {
	if err := json.Unmarshal(raw, &provinces); err != nil {
		panic("wilayah: " + err.Error())
	}
	for _, p := range provinces {
		for _, c := range p.Cities {
			byLower[strings.ToLower(c)] = c
		}
	}
}

// Canonical returns the list's spelling of a city name, matched ignoring
// case and surrounding spaces, and false when it is not on the list.
func Canonical(name string) (string, bool) {
	c, ok := byLower[strings.ToLower(strings.TrimSpace(name))]
	return c, ok
}
