package vendors

import (
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

// maxPackagesPerVendor keeps a profile scannable; a vendor needing more can
// merge tiers. Limits below are validated server-side, never trusted from UI.
const (
	maxPackagesPerVendor = 12
	maxPackageNameLen    = 80
	maxPackageDescLen    = 600
)

type packageDTO struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Price       int64  `json:"price"`
}

func toPackageDTO(p *repository.VendorPackage) packageDTO {
	return packageDTO{ID: p.ID, Name: p.Name, Description: p.Description, Price: p.Price}
}

type packageRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Price       int64  `json:"price"`
}

// validate trims in place and returns an Indonesian error message, or "".
func (req *packageRequest) validate() string {
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	switch {
	case req.Name == "":
		return "nama paket wajib diisi"
	case utf8.RuneCountInString(req.Name) > maxPackageNameLen:
		return "nama paket terlalu panjang"
	case utf8.RuneCountInString(req.Description) > maxPackageDescLen:
		return "deskripsi paket terlalu panjang"
	case req.Price < 0:
		return "harga tidak valid"
	}
	return ""
}

// ListVendorPackages is PUBLIC (no auth): package pricing is part of the
// public profile, same visibility as the directory. Only approved vendors'
// packages are exposed.
func ListVendorPackages(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		profile, err := deps.Vendors.GetByUserID(r.Context(), id)
		if err != nil || profile.Status != "approved" {
			httpx.Error(w, http.StatusNotFound, "vendor tidak ditemukan")
			return
		}

		pkgs, err := deps.Packages.ListForVendor(r.Context(), id)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]packageDTO, 0, len(pkgs))
		for i := range pkgs {
			out = append(out, toPackageDTO(&pkgs[i]))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

// ListMyPackages returns the authenticated Vendor's own packages (works even
// while the profile is still pending, so they can prepare before approval).
func ListMyPackages(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}
		pkgs, err := deps.Packages.ListForVendor(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := make([]packageDTO, 0, len(pkgs))
		for i := range pkgs {
			out = append(out, toPackageDTO(&pkgs[i]))
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

func CreatePackage(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		var req packageRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		if msg := req.validate(); msg != "" {
			httpx.Error(w, http.StatusBadRequest, msg)
			return
		}

		// A vendor needs a profile before adding packages (same rule as portfolio).
		if _, err := deps.Vendors.GetByUserID(r.Context(), claims.UserID); err != nil {
			if err == repository.ErrNotFound {
				httpx.Error(w, http.StatusBadRequest, "lengkapi profil usaha dulu")
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		n, err := deps.Packages.Count(r.Context(), claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		if n >= maxPackagesPerVendor {
			httpx.Error(w, http.StatusConflict, "jumlah paket sudah mencapai batas")
			return
		}

		pkg, err := deps.Packages.Create(r.Context(), claims.UserID, req.Name, req.Description, req.Price)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusCreated, toPackageDTO(pkg))
	}
}

func UpdatePackage(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		var req packageRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		if msg := req.validate(); msg != "" {
			httpx.Error(w, http.StatusBadRequest, msg)
			return
		}

		pkg, err := deps.Packages.Update(r.Context(), chi.URLParam(r, "id"), claims.UserID, req.Name, req.Description, req.Price)
		if err != nil {
			if err == repository.ErrNotFound {
				httpx.Error(w, http.StatusNotFound, "paket tidak ditemukan")
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		httpx.JSON(w, http.StatusOK, toPackageDTO(pkg))
	}
}

func DeletePackage(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "belum login")
			return
		}

		if err := deps.Packages.Delete(r.Context(), chi.URLParam(r, "id"), claims.UserID); err != nil {
			if err == repository.ErrNotFound {
				httpx.Error(w, http.StatusNotFound, "paket tidak ditemukan")
				return
			}
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
