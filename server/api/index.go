// Package handler is the Vercel Go Function entrypoint for the DuaCincin
// API. vercel.json rewrites every path (/healthz, /api/v1/...) here, and the
// same chi router used by `go run ./cmd/api` routes on the original path.
//
// Keep this directory to this single file: Vercel treats every .go file
// under api/ as a function entrypoint. Shared code lives in package app.
package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"sync"
	"time"

	"duacincin/server/app"
)

// initRetryAfter stops a broken configuration from hammering the database
// on every request; a transient failure is retried after this long.
const initRetryAfter = 5 * time.Second

var (
	mu       sync.Mutex
	handler  http.Handler
	lastErr  error
	failedAt time.Time

	// newApp is swapped in tests.
	newApp = func(ctx context.Context) (http.Handler, error) {
		a, err := app.New(ctx, app.ServerlessOptions())
		if err != nil {
			return nil, err
		}
		// The pool is deliberately never closed: it lives as long as the
		// instance and is reused across invocations.
		return a.Handler, nil
	}
)

// Handler serves one request, building the API once per instance. The
// database pool built here is reused by every later invocation.
func Handler(w http.ResponseWriter, r *http.Request) {
	h, err := get()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "layanan sedang tidak tersedia, coba lagi sebentar lagi",
		})
		return
	}
	// Vercel delivers the original (pre-rewrite) URL in r.URL; keep
	// RequestURI in step so request logs show the real path.
	r.RequestURI = r.URL.RequestURI()
	h.ServeHTTP(w, r)
}

func get() (http.Handler, error) {
	mu.Lock()
	defer mu.Unlock()

	if handler != nil {
		return handler, nil
	}
	if lastErr != nil && time.Since(failedAt) < initRetryAfter {
		return nil, lastErr
	}

	// Not the request context: a client disconnect must not poison the
	// instance-wide initialisation.
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	h, err := newApp(ctx)
	if err != nil {
		lastErr, failedAt = err, time.Now()
		log.Printf("api init failed: %s", redact(err.Error()))
		return nil, err
	}
	handler, lastErr = h, nil
	return handler, nil
}

// dsnCredentials matches the user:password part of a URL.
var dsnCredentials = regexp.MustCompile(`://[^@/\s]+@`)

// redact strips URL credentials and password=... pairs from an error
// message before it is logged.
func redact(s string) string {
	s = dsnCredentials.ReplaceAllString(s, "://***@")
	return regexp.MustCompile(`(?i)(password=)\S+`).ReplaceAllString(s, "${1}***")
}
