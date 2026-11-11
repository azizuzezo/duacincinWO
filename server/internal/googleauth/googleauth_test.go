package googleauth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"duacincin/server/internal/auth"
	"duacincin/server/internal/config"
	"duacincin/server/internal/repository"
)

const testClientID = "1234-test.apps.googleusercontent.com"

// ---- fakes ----

type fakeVerifier struct {
	id  *Identity
	err error
}

func (f fakeVerifier) Verify(_ context.Context, credential string) (*Identity, error) {
	if credential == "bad" {
		return nil, ErrInvalidToken
	}
	return f.id, f.err
}

type fakeUsers struct {
	byEmail   map[string]*repository.User
	created   []*repository.User
	resets    int
	dupOnce   bool
	getErr    error
	createErr error
}

func (f *fakeUsers) GetByEmail(_ context.Context, email string) (*repository.User, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	if u, ok := f.byEmail[email]; ok {
		return u, nil
	}
	return nil, repository.ErrNotFound
}

func (f *fakeUsers) Create(_ context.Context, email, hash, role, name string) (*repository.User, error) {
	if f.createErr != nil {
		return nil, f.createErr
	}
	if f.dupOnce {
		// Simulate a parallel request creating the same account first.
		f.dupOnce = false
		f.byEmail[email] = &repository.User{ID: "u-race", Email: email, Role: auth.RoleClient, AccountStatus: repository.AccountStatusActive}
		return nil, repository.ErrDuplicateEmail
	}
	if hash == "" {
		return nil, errors.New("empty hash")
	}
	u := &repository.User{ID: "u-new", Email: email, PasswordHash: hash, Role: role, FullName: name, AccountStatus: repository.AccountStatusActive}
	f.created = append(f.created, u)
	f.byEmail[email] = u
	return u, nil
}

func (f *fakeUsers) ResetFailedLogin(context.Context, string) error {
	f.resets++
	return nil
}

type fakeAgreements struct{ recorded []string }

func (f *fakeAgreements) RecordAcceptance(_ context.Context, userID, typ string) error {
	f.recorded = append(f.recorded, userID+":"+typ)
	return nil
}

type fakeLimiter struct {
	deny map[string]bool
	hits map[string]int
}

func (f *fakeLimiter) Allow(_ context.Context, key, action string, _ int, _ time.Duration) (bool, error) {
	if f.hits == nil {
		f.hits = map[string]int{}
	}
	f.hits[action]++
	return !f.deny[action], nil
}

type env struct {
	deps   *Deps
	users  *fakeUsers
	agree  *fakeAgreements
	limit  *fakeLimiter
	ident  *Identity
	router http.Handler
}

func newEnv(t *testing.T, existing ...*repository.User) *env {
	t.Helper()
	e := &env{
		users: &fakeUsers{byEmail: map[string]*repository.User{}},
		agree: &fakeAgreements{},
		limit: &fakeLimiter{deny: map[string]bool{}},
		ident: &Identity{Subject: "g-1", Email: "sari@example.com", Name: "Sari Lestari"},
	}
	for _, u := range existing {
		e.users.byEmail[u.Email] = u
	}
	cfg := &config.Config{JWTSecret: "test-secret-test-secret-test-secret", GoogleClientID: testClientID, AppEnv: "development"}
	e.deps = &Deps{Users: e.users, Agreements: e.agree, Limiter: e.limit, Verifier: fakeVerifier{id: e.ident}, Cfg: cfg}

	// Mount next to the real auth routes, as the router does, to prove the
	// /auth/google route resolves alongside the /auth sub-router.
	r := chi.NewRouter()
	r.Route("/api/v1", func(r chi.Router) {
		auth.Mount(r, &auth.Deps{Cfg: cfg})
		Mount(r, e.deps)
	})
	e.router = r
	return e
}

func (e *env) post(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/google", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "203.0.113.9:5555"
	rec := httptest.NewRecorder()
	e.router.ServeHTTP(rec, req)
	return rec
}

func decode(t *testing.T, rec *httptest.ResponseRecorder) map[string]string {
	t.Helper()
	var m map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &m); err != nil {
		t.Fatalf("bad json %q: %v", rec.Body.String(), err)
	}
	return m
}

func sessionCookie(rec *httptest.ResponseRecorder) *http.Cookie {
	for _, c := range rec.Result().Cookies() {
		if c.Name == auth.SessionCookieName {
			return c
		}
	}
	return nil
}

func activeUser(id, email, role string) *repository.User {
	return &repository.User{ID: id, Email: email, Role: role, FullName: "X", AccountStatus: repository.AccountStatusActive}
}

// ---- handler ----

func TestExistingClientSignsIn(t *testing.T) {
	e := newEnv(t, activeUser("u-1", "sari@example.com", auth.RoleClient))
	rec := e.post(t, `{"credential":"good"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body)
	}
	body := decode(t, rec)
	if body["id"] != "u-1" || body["role"] != auth.RoleClient {
		t.Fatalf("unexpected body %v", body)
	}
	c := sessionCookie(rec)
	if c == nil || !c.HttpOnly || c.Value == "" || c.SameSite != http.SameSiteLaxMode {
		t.Fatalf("missing/weak session cookie: %+v", c)
	}
	if len(e.users.created) != 0 || e.users.resets != 1 {
		t.Fatalf("created=%d resets=%d", len(e.users.created), e.users.resets)
	}
}

func TestNewUserNeedsTerms(t *testing.T) {
	e := newEnv(t)
	rec := e.post(t, `{"credential":"good","role":"client"}`)
	if rec.Code != StatusTermsRequired {
		t.Fatalf("status %d", rec.Code)
	}
	if decode(t, rec)["code"] != "terms_required" {
		t.Fatal("missing terms_required code")
	}
	if len(e.users.created) != 0 || sessionCookie(rec) != nil {
		t.Fatal("account or session created without terms")
	}
}

func TestNewUserBecomesClient(t *testing.T) {
	e := newEnv(t)
	rec := e.post(t, `{"credential":"good","role":"client","accept_terms":true}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d body %s", rec.Code, rec.Body)
	}
	if len(e.users.created) != 1 {
		t.Fatal("no account created")
	}
	u := e.users.created[0]
	if u.Role != auth.RoleClient || u.Email != "sari@example.com" || u.FullName != "Sari Lestari" || u.PasswordHash == "" {
		t.Fatalf("bad account %+v", u)
	}
	if len(e.agree.recorded) != 1 || e.agree.recorded[0] != "u-new:"+repository.AgreementTypeClientTOS {
		t.Fatalf("agreement not recorded like register: %v", e.agree.recorded)
	}
	if e.limit.hits["register"] != 1 {
		t.Fatal("register rate limit not applied")
	}
	if sessionCookie(rec) == nil {
		t.Fatal("no session")
	}
}

func TestNewUserWithoutNameUsesEmailLocalPart(t *testing.T) {
	e := newEnv(t)
	e.ident.Name = ""
	if rec := e.post(t, `{"credential":"good","accept_terms":true}`); rec.Code != http.StatusCreated {
		t.Fatalf("status %d", rec.Code)
	}
	if e.users.created[0].FullName != "sari" {
		t.Fatalf("name %q", e.users.created[0].FullName)
	}
}

func TestNeverEscalatesRoles(t *testing.T) {
	for _, role := range []string{auth.RoleVendor, auth.RoleAdmin, auth.RoleWeddingConsultant} {
		e := newEnv(t, activeUser("u-"+role, "sari@example.com", role))
		rec := e.post(t, `{"credential":"good","role":"client","accept_terms":true}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: status %d", role, rec.Code)
		}
		if got := decode(t, rec)["role"]; got != role {
			t.Fatalf("%s: signed in as %q", role, got)
		}
		if len(e.users.created) != 0 || len(e.agree.recorded) != 0 {
			t.Fatalf("%s: created a second account", role)
		}
	}
}

func TestUnknownRoleRefused(t *testing.T) {
	e := newEnv(t, activeUser("u-x", "sari@example.com", "superuser"))
	if rec := e.post(t, `{"credential":"good"}`); rec.Code != http.StatusUnauthorized {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestNewUserBecomesVendorFromVendorForm(t *testing.T) {
	e := newEnv(t)
	rec := e.post(t, `{"credential":"good","role":"vendor","accept_terms":true}`)
	if rec.Code != http.StatusCreated || len(e.users.created) != 1 {
		t.Fatalf("status %d created %d", rec.Code, len(e.users.created))
	}
	if u := e.users.created[0]; u.Role != auth.RoleVendor {
		t.Fatalf("role %q", u.Role)
	}
	if len(e.agree.recorded) != 1 || e.agree.recorded[0] != "u-new:"+repository.AgreementTypeVendorPartnership {
		t.Fatalf("vendor agreement not recorded: %v", e.agree.recorded)
	}
}

func TestVendorNeedsAgreement(t *testing.T) {
	e := newEnv(t)
	rec := e.post(t, `{"credential":"good","role":"vendor"}`)
	if rec.Code != StatusTermsRequired || len(e.users.created) != 0 {
		t.Fatalf("status %d created %d", rec.Code, len(e.users.created))
	}
}

func TestExistingClientNotUpgradedToVendor(t *testing.T) {
	e := newEnv(t, activeUser("u-1", "sari@example.com", auth.RoleClient))
	rec := e.post(t, `{"credential":"good","role":"vendor","accept_terms":true}`)
	if rec.Code != http.StatusOK || decode(t, rec)["role"] != auth.RoleClient || len(e.users.created) != 0 {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestPrivilegedRoleRefused(t *testing.T) {
	for _, role := range []string{auth.RoleAdmin, auth.RoleWeddingConsultant, "superuser"} {
		e := newEnv(t)
		rec := e.post(t, `{"credential":"good","role":"`+role+`","accept_terms":true}`)
		if rec.Code != http.StatusBadRequest || len(e.users.created) != 0 {
			t.Fatalf("%s: status %d created %d", role, rec.Code, len(e.users.created))
		}
	}
}

func TestSanctionsAndLock(t *testing.T) {
	future := time.Now().Add(time.Hour)
	suspended := activeUser("u-s", "sari@example.com", auth.RoleVendor)
	suspended.AccountStatus = repository.AccountStatusSuspended
	suspended.SuspendedUntil = &future
	if rec := newEnv(t, suspended).post(t, `{"credential":"good"}`); rec.Code != http.StatusForbidden || sessionCookie(rec) != nil {
		t.Fatalf("suspended: %d", rec.Code)
	}

	terminated := activeUser("u-t", "sari@example.com", auth.RoleClient)
	terminated.AccountStatus = repository.AccountStatusTerminated
	if rec := newEnv(t, terminated).post(t, `{"credential":"good"}`); rec.Code != http.StatusForbidden {
		t.Fatalf("terminated: %d", rec.Code)
	}

	locked := activeUser("u-l", "sari@example.com", auth.RoleClient)
	locked.LockedUntil = &future
	if rec := newEnv(t, locked).post(t, `{"credential":"good"}`); rec.Code != http.StatusTooManyRequests || sessionCookie(rec) != nil {
		t.Fatalf("locked: %d", rec.Code)
	}
}

func TestBadTokenAndConfig(t *testing.T) {
	e := newEnv(t)
	if rec := e.post(t, `{"credential":"bad"}`); rec.Code != http.StatusUnauthorized {
		t.Fatalf("bad token: %d", rec.Code)
	}
	if rec := e.post(t, `{"credential":"  "}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("empty token: %d", rec.Code)
	}
	if rec := e.post(t, `{"credential":"good","extra":1}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("unknown field: %d", rec.Code)
	}
	e.deps.Cfg.GoogleClientID = ""
	if rec := e.post(t, `{"credential":"good"}`); rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("no client id: %d", rec.Code)
	}
}

func TestRateLimited(t *testing.T) {
	e := newEnv(t, activeUser("u-1", "sari@example.com", auth.RoleClient))
	e.limit.deny["google_login"] = true
	if rec := e.post(t, `{"credential":"good"}`); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("status %d", rec.Code)
	}

	e = newEnv(t)
	e.limit.deny["register"] = true
	if rec := e.post(t, `{"credential":"good","accept_terms":true}`); rec.Code != http.StatusTooManyRequests || len(e.users.created) != 0 {
		t.Fatalf("register limit: %d", rec.Code)
	}
}

func TestDuplicateRaceSignsIn(t *testing.T) {
	e := newEnv(t)
	e.users.dupOnce = true
	rec := e.post(t, `{"credential":"good","accept_terms":true}`)
	if rec.Code != http.StatusOK || decode(t, rec)["id"] != "u-race" {
		t.Fatalf("status %d body %s", rec.Code, rec.Body)
	}
}

func TestDatabaseErrorIsGeneric(t *testing.T) {
	e := newEnv(t)
	e.users.getErr = errors.New("db down")
	if rec := e.post(t, `{"credential":"good","accept_terms":true}`); rec.Code != http.StatusInternalServerError || len(e.users.created) != 0 {
		t.Fatalf("status %d", rec.Code)
	}
}

// ---- token checks ----

func validInfo(now time.Time) tokenInfo {
	return tokenInfo{
		Aud: testClientID, Iss: "https://accounts.google.com", Sub: "1001",
		Exp: itoa(now.Add(30 * time.Minute).Unix()), Iat: itoa(now.Add(-time.Minute).Unix()),
		Email: " Sari@Example.com ", EmailVerified: "true", Name: "Sari",
	}
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }

func TestCheckClaims(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	id, err := checkClaims(validInfo(now), testClientID, now)
	if err != nil || id.Email != "sari@example.com" || id.Subject != "1001" {
		t.Fatalf("valid token rejected: %v %+v", err, id)
	}

	cases := map[string]func(*tokenInfo){
		"wrong aud":       func(i *tokenInfo) { i.Aud = "other.apps.googleusercontent.com" },
		"wrong iss":       func(i *tokenInfo) { i.Iss = "https://evil.example.com" },
		"no sub":          func(i *tokenInfo) { i.Sub = "" },
		"expired":         func(i *tokenInfo) { i.Exp = itoa(now.Add(-2 * time.Minute).Unix()) },
		"bad exp":         func(i *tokenInfo) { i.Exp = "soon" },
		"issued later":    func(i *tokenInfo) { i.Iat = itoa(now.Add(10 * time.Minute).Unix()) },
		"unverified":      func(i *tokenInfo) { i.EmailVerified = "false" },
		"verified absent": func(i *tokenInfo) { i.EmailVerified = nil },
		"no email":        func(i *tokenInfo) { i.Email = " " },
	}
	for name, mutate := range cases {
		info := validInfo(now)
		mutate(&info)
		if _, err := checkClaims(info, testClientID, now); !errors.Is(err, ErrInvalidToken) {
			t.Errorf("%s: accepted", name)
		}
	}

	info := validInfo(now)
	info.EmailVerified = true
	info.Iss = "accounts.google.com"
	if _, err := checkClaims(info, testClientID, now); err != nil {
		t.Fatalf("bool email_verified / bare issuer rejected: %v", err)
	}
	if _, err := checkClaims(validInfo(now), "", now); err == nil {
		t.Fatal("empty client id accepted")
	}
}

func TestTokenInfoVerifier(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("id_token") != "good-token" {
			http.Error(w, `{"error":"invalid_token"}`, http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(validInfo(now))
	}))
	defer srv.Close()

	v := NewTokenInfoVerifier(testClientID)
	v.Endpoint = srv.URL
	v.Now = func() time.Time { return now }

	if id, err := v.Verify(context.Background(), "good-token"); err != nil || id.Email != "sari@example.com" {
		t.Fatalf("good token: %v", err)
	}
	if _, err := v.Verify(context.Background(), "forged"); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("forged token: %v", err)
	}
	if _, err := v.Verify(context.Background(), ""); !errors.Is(err, ErrInvalidToken) {
		t.Fatal("empty token accepted")
	}
	v.ClientID = "someone-else"
	if _, err := v.Verify(context.Background(), "good-token"); !errors.Is(err, ErrInvalidToken) {
		t.Fatal("token for another client accepted")
	}
}
