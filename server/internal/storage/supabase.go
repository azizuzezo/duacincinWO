// Package storage uploads files to Supabase Storage using the service-role
// key. It is only ever called from the backend (never expose this key to
// the frontend — PRD §7/§10.2).
package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL    string
	serviceKey string
	httpClient *http.Client
}

func NewClient(supabaseURL, serviceRoleKey string) *Client {
	return &Client{
		baseURL:    supabaseURL,
		serviceKey: serviceRoleKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c.baseURL != "" && c.serviceKey != ""
}

// EnsureBucket creates the bucket if it doesn't already exist. Safe to call
// on every startup.
func (c *Client) EnsureBucket(ctx context.Context, name string, public bool) error {
	if !c.Configured() {
		return fmt.Errorf("supabase storage is not configured")
	}

	body := fmt.Sprintf(`{"id":%q,"name":%q,"public":%t}`, name, name, public)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/storage/v1/bucket", bytes.NewBufferString(body))
	if err != nil {
		return err
	}
	c.setAuthHeaders(req, "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("create bucket %q: %w", name, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 300 || resp.StatusCode == http.StatusConflict {
		return nil
	}

	// Supabase Storage reports "already exists" as HTTP 400 with this error
	// code (not 409) — also fine, the bucket is there either way.
	var parsed struct {
		Code string `json:"code"`
	}
	raw, _ := io.ReadAll(resp.Body)
	if json.Unmarshal(raw, &parsed) == nil && parsed.Code == "BucketAlreadyExists" {
		return nil
	}

	return fmt.Errorf("create bucket %q: unexpected status %d: %s", name, resp.StatusCode, raw)
}

// Upload stores data at bucket/path and returns its public URL. The bucket
// must be public (EnsureBucket(..., true)) for the URL to be reachable
// without a signed token.
func (c *Client) Upload(ctx context.Context, bucket, path, contentType string, data []byte) (string, error) {
	if !c.Configured() {
		return "", fmt.Errorf("supabase storage is not configured")
	}

	url := fmt.Sprintf("%s/storage/v1/object/%s/%s", c.baseURL, bucket, path)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	c.setAuthHeaders(req, contentType)
	req.Header.Set("x-upsert", "true")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("upload to supabase storage: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("upload to supabase storage: unexpected status %d", resp.StatusCode)
	}

	return fmt.Sprintf("%s/storage/v1/object/public/%s/%s", c.baseURL, bucket, path), nil
}

// Delete removes a single object from bucket.
func (c *Client) Delete(ctx context.Context, bucket, path string) error {
	if !c.Configured() {
		return fmt.Errorf("supabase storage is not configured")
	}

	body, err := json.Marshal(map[string][]string{"prefixes": {path}})
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/storage/v1/object/%s", c.baseURL, bucket)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	c.setAuthHeaders(req, "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("delete from supabase storage: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("delete from supabase storage: unexpected status %d", resp.StatusCode)
	}
	return nil
}

func (c *Client) setAuthHeaders(req *http.Request, contentType string) {
	req.Header.Set("Authorization", "Bearer "+c.serviceKey)
	req.Header.Set("apikey", c.serviceKey)
	req.Header.Set("Content-Type", contentType)
}
