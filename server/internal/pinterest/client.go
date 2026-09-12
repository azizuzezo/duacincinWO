// Package pinterest talks to Pinterest for the Admin "Sync Pinterest Board"
// action (PRD §8.7 Inspirasi): pulling a curated public board's real photos
// into our own Inspirasi gallery.
//
// Pinterest has no public "list a board's pins" API for third parties, so
// this uses two things it does expose without login:
//   - the board page's server-rendered HTML, which already contains a
//     handful of pin IDs (enough to find the ID range a board's pins were
//     batch-uploaded in)
//   - the official public oEmbed endpoint (oembed.json), used both to
//     validate a candidate ID really belongs to this board (via AuthorURL)
//     and to fetch its real image/title
package pinterest

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// Pinterest server-renders some pins directly into the board page's HTML
// for SEO; this matches the numeric pin IDs embedded there.
var seedIDPattern = regexp.MustCompile(`\b\d{16,19}\b`)

type Client struct {
	httpClient *http.Client
}

func NewClient() *Client {
	return &Client{httpClient: &http.Client{Timeout: 20 * time.Second}}
}

type Pin struct {
	ID        string
	ImageURL  string
	Title     string
	AuthorURL string
}

// DiscoverSeedIDs fetches the board page's raw HTML and returns whatever pin
// IDs already appear in it. This is only a starting point — Pinterest lazy-
// loads the rest of the board client-side, so most pins won't be in this
// initial HTML at all.
func (c *Client) DiscoverSeedIDs(ctx context.Context, boardURL string) ([]string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, boardURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch pinterest board: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("fetch pinterest board: unexpected status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	seen := make(map[string]bool)
	var ids []string
	for _, m := range seedIDPattern.FindAllString(string(body), -1) {
		if !seen[m] {
			seen[m] = true
			ids = append(ids, m)
		}
	}
	return ids, nil
}

type oEmbedResponse struct {
	ThumbnailURL string `json:"thumbnail_url"`
	Title        string `json:"title"`
	AuthorURL    string `json:"author_url"`
}

// FetchPin calls Pinterest's official public oEmbed API for a single pin —
// no login required, and not rate-limited the way anonymous board browsing
// is.
func (c *Client) FetchPin(ctx context.Context, pinID string) (*Pin, error) {
	oembedURL := fmt.Sprintf("https://www.pinterest.com/oembed.json?url=https://www.pinterest.com/pin/%s", pinID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, oembedURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch pinterest oembed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("pin %s not found", pinID)
	}

	var parsed oEmbedResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}

	// Pinterest's oEmbed defaults to a 236px thumbnail; the 736x bucket is
	// Pinterest's standard larger size for the same image.
	imageURL := strings.Replace(parsed.ThumbnailURL, "/236x/", "/736x/", 1)

	return &Pin{ID: pinID, ImageURL: imageURL, Title: parsed.Title, AuthorURL: parsed.AuthorURL}, nil
}

// DownloadImage fetches a pin's actual image bytes so it can be re-hosted on
// our own Supabase Storage bucket instead of hotlinking Pinterest's CDN.
func (c *Client) DownloadImage(ctx context.Context, imageURL string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("download pinterest image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("download pinterest image: unexpected status %d", resp.StatusCode)
	}
	return io.ReadAll(resp.Body)
}
