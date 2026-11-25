package admin

import (
	"net/http"
	"net/url"
	"strings"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/httpx"
	"duacincin/server/internal/repository"
)

// Kirana model settings: base URL, model, API key and reasoning effort,
// stored in the database so switching provider needs no redeploy. A field
// left empty stays unset (the AI_* env vars are ignored). The key is
// write-only: reads only say whether one is set and its last 4 characters.

type aiSettingsDTO struct {
	BaseURL         string `json:"base_url"`
	Model           string `json:"model"`
	ReasoningEffort string `json:"reasoning_effort"`
	KeySet          bool   `json:"key_set"`
	KeyHint         string `json:"key_hint"`
}

type aiSettingsRequest struct {
	BaseURL         string `json:"base_url"`
	Model           string `json:"model"`
	APIKey          string `json:"api_key"`
	ReasoningEffort string `json:"reasoning_effort"`
}

func getAISettings(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		s, err := deps.AISettings.Get(r.Context())
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		out := aiSettingsDTO{
			BaseURL: s.BaseURL, Model: s.Model, ReasoningEffort: s.ReasoningEffort,
			KeySet: s.APIKey != "",
		}
		if n := len(s.APIKey); n > 0 {
			out.KeyHint = s.APIKey[max(0, n-4):]
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

var validReasoning = map[string]bool{"": true, "none": true, "low": true, "medium": true, "high": true, "max": true}

func saveAISettings(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req aiSettingsRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "permintaan tidak valid")
			return
		}
		base := strings.TrimRight(strings.TrimSpace(req.BaseURL), "/")
		if base != "" {
			u, err := url.Parse(base)
			if err != nil || u.Scheme != "https" || u.Host == "" {
				httpx.Error(w, http.StatusBadRequest, "Base URL harus diawali https://")
				return
			}
		}
		effort := strings.ToLower(strings.TrimSpace(req.ReasoningEffort))
		if !validReasoning[effort] {
			httpx.Error(w, http.StatusBadRequest, "reasoning effort tidak dikenal")
			return
		}
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "tidak diizinkan")
			return
		}
		err := deps.AISettings.Save(r.Context(), repository.AISettings{
			BaseURL: base, Model: strings.TrimSpace(req.Model), APIKey: strings.TrimSpace(req.APIKey), ReasoningEffort: effort,
		}, claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}
		// Never log the key itself.
		logAction(deps, r, "ai_settings.update", "ai_settings", "kirana", map[string]any{
			"base_url": base, "model": strings.TrimSpace(req.Model), "reasoning_effort": effort, "key_changed": strings.TrimSpace(req.APIKey) != "",
		})
		httpx.JSON(w, http.StatusOK, map[string]string{"message": "tersimpan"})
	}
}
