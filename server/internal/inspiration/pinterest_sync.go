package inspiration

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"

	"duacincin/server/internal/httpx"
	"duacincin/server/internal/imageupload"
	"duacincin/server/internal/pinterest"
)

const defaultPinterestBoardURL = "https://id.pinterest.com/2cincinid/inspirasi-nikah-indonesia-venue-decor-mua-artis/"

// This board's pins were uploaded in a numerically sequential batch (see
// engineering.md, 2026-09-10) — everything within this many IDs of the
// smallest/largest ID Pinterest server-renders into the page is worth
// probing, in case a newer or older pin falls just outside what got
// discovered in the initial HTML.
const idRangePadding = 150

const maxProbeConcurrency = 12

type syncPinterestRequest struct {
	BoardURL string `json:"board_url"`
}

type syncPinterestResponse struct {
	Imported         int `json:"imported"`
	AlreadySynced    int `json:"already_synced"`
	CandidatesTested int `json:"candidates_tested"`
}

// SyncPinterest re-discovers every pin on the configured Pinterest board and
// imports whichever ones aren't already in the Inspirasi gallery (tracked
// via external_ref) — an Admin-triggered, on-demand action, not a background
// poller (see engineering.md for why: new pins aren't guaranteed to land in
// the same ID range as an older batch, and polling Pinterest unattended on a
// schedule is the kind of automated traffic that gets rate-limited).
func SyncPinterest(deps *Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !deps.Storage.Configured() {
			httpx.Error(w, http.StatusServiceUnavailable, "upload gambar belum tersedia")
			return
		}

		var req syncPinterestRequest
		if err := httpx.DecodeJSON(w, r, &req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "body permintaan tidak valid")
			return
		}
		boardURL := strings.TrimSpace(req.BoardURL)
		if boardURL == "" {
			boardURL = defaultPinterestBoardURL
		}
		boardOwner := boardOwnerFromURL(boardURL)
		if boardOwner == "" {
			httpx.Error(w, http.StatusBadRequest, "URL board tidak valid")
			return
		}

		ctx := r.Context()
		client := pinterest.NewClient()

		seedIDs, err := client.DiscoverSeedIDs(ctx, boardURL)
		if err != nil || len(seedIDs) == 0 {
			httpx.Error(w, http.StatusBadGateway, "gagal membaca board Pinterest, coba lagi")
			return
		}

		candidates, err := expandIDRange(seedIDs)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "gagal memproses ID pin dari board")
			return
		}

		existingRefs, err := deps.Inspiration.ExistingExternalRefs(ctx)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "terjadi kesalahan, coba lagi")
			return
		}

		validPins := probeCandidates(ctx, client, candidates, boardOwner, existingRefs)

		imported := 0
		for _, pin := range validPins {
			data, err := client.DownloadImage(ctx, pin.ImageURL)
			if err != nil {
				continue
			}
			contentType := http.DetectContentType(data)
			ext, ok := imageupload.AllowedTypes[contentType]
			if !ok {
				continue
			}
			path := fmt.Sprintf("pinterest-%s.%s", pin.ID, ext)
			publicURL, err := deps.Storage.Upload(ctx, Bucket, path, contentType, data)
			if err != nil {
				continue
			}
			caption := pin.Title
			if len(caption) > 300 {
				caption = caption[:300]
			}
			if _, err := deps.Inspiration.CreateFromExternal(ctx, "Pinterest", path, publicURL, caption, caption, "pinterest:"+pin.ID); err != nil {
				continue
			}
			imported++
		}

		httpx.JSON(w, http.StatusOK, syncPinterestResponse{
			Imported:         imported,
			AlreadySynced:    len(existingRefs),
			CandidatesTested: len(candidates),
		})
	}
}

// probeCandidates checks every candidate ID (skipping ones already synced)
// against Pinterest's public oEmbed API concurrently, keeping only the ones
// whose author really is this board's owner.
func probeCandidates(ctx context.Context, client *pinterest.Client, candidates []string, boardOwner string, existingRefs map[string]bool) []*pinterest.Pin {
	sem := make(chan struct{}, maxProbeConcurrency)
	var wg sync.WaitGroup
	var mu sync.Mutex
	var valid []*pinterest.Pin

	for _, id := range candidates {
		if existingRefs["pinterest:"+id] {
			continue
		}
		wg.Add(1)
		sem <- struct{}{}
		go func(id string) {
			defer wg.Done()
			defer func() { <-sem }()

			pin, err := client.FetchPin(ctx, id)
			if err != nil {
				return
			}
			if !strings.Contains(pin.AuthorURL, boardOwner) {
				return
			}
			mu.Lock()
			valid = append(valid, pin)
			mu.Unlock()
		}(id)
	}
	wg.Wait()
	return valid
}

// expandIDRange takes whatever pin IDs Pinterest server-rendered into the
// board page directly and generates every candidate ID between the
// smallest and largest of them (plus padding), since this board's pins
// share a common ID prefix from being uploaded together.
func expandIDRange(seedIDs []string) ([]string, error) {
	type parsedID struct {
		prefix string
		suffix int
	}

	var parsed []parsedID
	prefixCounts := make(map[string]int)
	for _, id := range seedIDs {
		if len(id) < 7 {
			continue
		}
		prefix := id[:len(id)-6]
		suffix, err := strconv.Atoi(id[len(id)-6:])
		if err != nil {
			continue
		}
		parsed = append(parsed, parsedID{prefix: prefix, suffix: suffix})
		prefixCounts[prefix]++
	}
	if len(parsed) == 0 {
		return nil, fmt.Errorf("no usable seed ids")
	}

	// Use the most common prefix, in case an unrelated ID (e.g. from an ad
	// or an embedded recommendation) slipped into the seed set.
	bestPrefix, bestCount := "", 0
	for prefix, count := range prefixCounts {
		if count > bestCount {
			bestPrefix, bestCount = prefix, count
		}
	}

	min, max := -1, -1
	for _, p := range parsed {
		if p.prefix != bestPrefix {
			continue
		}
		if min == -1 || p.suffix < min {
			min = p.suffix
		}
		if max == -1 || p.suffix > max {
			max = p.suffix
		}
	}

	min -= idRangePadding
	if min < 0 {
		min = 0
	}
	max += idRangePadding

	candidates := make([]string, 0, max-min+1)
	for n := min; n <= max; n++ {
		candidates = append(candidates, fmt.Sprintf("%s%06d", bestPrefix, n))
	}
	return candidates, nil
}

func boardOwnerFromURL(boardURL string) string {
	u, err := url.Parse(boardURL)
	if err != nil {
		return ""
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		return ""
	}
	return parts[0]
}
