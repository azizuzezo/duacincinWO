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
	"fmt"
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
	// Names are trimmed on load: a stray space in the data ("Jakarta Utara ")
	// once made a valid choice fail with "pilih kabupaten/kota dari daftar".
	for i := range provinces {
		provinces[i].Name = strings.TrimSpace(provinces[i].Name)
		for j, c := range provinces[i].Cities {
			c = strings.TrimSpace(c)
			provinces[i].Cities[j] = c
			byLower[strings.ToLower(c)] = c
		}
	}
}

// Canonical returns the list's spelling of a city name, matched ignoring
// case and surrounding spaces, and false when it is not on the list. The
// area "Jabodetabek" (also "Jabotabek") is a valid entry of its own.
func Canonical(name string) (string, bool) {
	if _, ok := Group(name); ok {
		return JabodetabekArea, true
	}
	c, ok := byLower[strings.ToLower(strings.TrimSpace(name))]
	return c, ok
}

// JabodetabekArea is the single service-area entry for all of Greater
// Jakarta: a vendor picks it once instead of listing 13 cities, and is
// found by a search for any of them.
const JabodetabekArea = "Jabodetabek"

// inJabodetabek reports whether a canonical city is one of Jabodetabek's.
func inJabodetabek(c string) bool {
	for _, j := range Jabodetabek {
		if j == c {
			return true
		}
	}
	return false
}

// MatchNames is every entry a vendor may have listed that serves city:
// the city itself plus "Jabodetabek" for a city inside it, or, for the
// area itself, "Jabodetabek" plus its 13 cities. Unknown names stay as
// typed. "" gives nil (any city).
func MatchNames(city string) []string {
	city = strings.TrimSpace(city)
	if city == "" {
		return nil
	}
	if _, ok := Group(city); ok {
		return append([]string{JabodetabekArea}, Jabodetabek...)
	}
	c, ok := Canonical(city)
	if !ok {
		return []string{city}
	}
	if inJabodetabek(c) {
		return []string{c, JabodetabekArea}
	}
	return []string{c}
}

// MaxCities caps how many kabupaten/kota one vendor can list (20 leaves
// room for all of Jabodetabek, 13, plus a few more).
const MaxCities = 20

// Jabodetabek is Greater Jakarta: the five Jakarta cities, Bogor, Depok,
// Tangerang and Bekasi (city and regency). Kepulauan Seribu is left out:
// wedding vendors do not serve it as part of "Jabodetabek".
var Jabodetabek = []string{
	"Jakarta Barat", "Jakarta Pusat", "Jakarta Selatan", "Jakarta Timur", "Jakarta Utara",
	"Bogor", "Kab. Bogor", "Depok", "Tangerang", "Kab. Tangerang", "Tangerang Selatan", "Bekasi", "Kab. Bekasi",
}

// Group returns the cities of a named area ("Jabodetabek", also spelled
// "Jabotabek"), matched ignoring case and spaces.
func Group(name string) ([]string, bool) {
	switch strings.ToLower(strings.Join(strings.Fields(name), "")) {
	case "jabodetabek", "jabotabek", "jabodetabekpunjur":
		return Jabodetabek, true
	}
	return nil, false
}

var splitter = strings.NewReplacer(",", " ", "/", " ", "&", " ", ";", " ", "+", " ", "|", " ")

// Split turns a free-text location ("Bandung sumedang", "Kota Bandung,
// Kab. Sumedang") into list entries, matching the longest names first.
// ok is false when any word is left unmatched, so nothing is guessed.
func Split(text string) (cities []string, ok bool) {
	words := strings.Fields(strings.ToLower(splitter.Replace(text)))
	seen := map[string]bool{}
	for i := 0; i < len(words); {
		w := words[i]
		if w == "dan" || w == "-" {
			i++
			continue
		}
		prefix := ""
		switch w {
		case "kota":
			i++
		case "kab", "kab.", "kabupaten":
			prefix, i = "kab. ", i+1
		}
		matched := false
		for n := min(5, len(words)-i); n >= 1; n-- {
			name := strings.Join(words[i:i+n], " ")
			c, found := byLower[prefix+name]
			if !found && prefix != "" {
				c, found = byLower[name] // "Kabupaten Sumedang" is listed as "Sumedang"
			}
			if found {
				if !seen[c] {
					seen[c] = true
					cities = append(cities, c)
				}
				i += n
				matched = true
				break
			}
		}
		if !matched {
			return nil, false
		}
	}
	return cities, len(cities) > 0
}

// NormalizeCities checks each name against the national kabupaten/kota list
// (so the directory groups vendors under one spelling), keeps the list's
// spelling and drops repeats. A non-empty message means the input is
// refused. Used by the vendor profile and the admin's emergency edit.
func NormalizeCities(in []string) ([]string, string) {
	out := make([]string, 0, len(in))
	seen := map[string]bool{}
	for _, name := range in {
		c, ok := Canonical(name)
		if !ok {
			return nil, "pilih kabupaten/kota dari daftar"
		}
		if !seen[c] {
			seen[c] = true
			out = append(out, c)
		}
	}
	// "Jabodetabek" already covers its cities: keep the one entry.
	if seen[JabodetabekArea] {
		kept := out[:0]
		for _, c := range out {
			if !inJabodetabek(c) {
				kept = append(kept, c)
			}
		}
		out = kept
	}
	switch {
	case len(out) == 0:
		return nil, "kota wajib diisi"
	case len(out) > MaxCities:
		return nil, fmt.Sprintf("pilih paling banyak %d kabupaten/kota", MaxCities)
	}
	return out, ""
}
