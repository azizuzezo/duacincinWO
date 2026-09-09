# DuaCincin — Engineering Log & Roadmap

Dokumen ini adalah **living tracker** untuk pengerjaan teknis DuaCincin. Mengacu ke [PRD.md](./PRD.md) untuk requirement lengkap. Setiap perubahan/fitur yang dikerjakan **wajib ditambahkan sebagai entri baru** di bagian [Changelog](#changelog) — jangan menimpa entri lama.

## Cara memakai dokumen ini

- **Roadmap** di bawah = urutan fase pengerjaan yang disepakati. Update kolom Status saat fase dimulai/selesai.
- **Changelog** = satu entri per perubahan berarti (fitur baru, keputusan arsitektur, migrasi DB, fix signifikan). Urutan kronologis, terbaru di paling atas.
- Format entri changelog:

```
### YYYY-MM-DD — Judul singkat perubahan
- **Fase:** (0-7, sesuai roadmap)
- **Apa yang berubah:** ringkas
- **File/komponen utama:** path relevan
- **Keputusan/asumsi:** hal yang perlu diketahui pengerjaan berikutnya (kalau ada)
- **Status:** Done / In progress / Blocked
```

---

## Roadmap Fase

| Fase | Fokus | Referensi PRD | Status |
|---|---|---|---|
| 0 | Setup proyek: scaffold Next.js + Go, koneksi Supabase (pooler), struktur env, CI dasar | §7 | Done |
| 1 | Autentikasi Client & Vendor: daftar, login, lupa password (OTP via Resend, 5 menit expiry), rate limiting, show/hide password | §8.2 | Done |
| 2 | Direktori vendor (kartu anonim → unlock setelah login), profil vendor, kategori, chat in-app + filter kontak eksternal | §8.3, §8.4 | Done |
| 3 | Budget Planner: input total budget & tamu, auto-split default, adjustable proportional rescale | §8.8 | Done |
| 4 | Galeri Inspirasi: struktur data, panel upload/moderasi Admin, seed data awal | §8.7 | Not started |
| 5 | Wedding Planner: checklist & timeline, referensi duacincin.id dengan tampilan baru | §8.9 | Not started |
| 6 | Booking + Escrow Payment (Midtrans): booking flow, DP, holding, disbursement dikurangi komisi | §8.5 | Not started |
| 7 | Admin/backoffice: moderasi Inspirasi, dispute queue, config komisi, dashboard *(approve/reject vendor sudah ditarik maju ke Fase 2, lihat changelog)* | §8.10, §8.6 | Not started |

*Landing page (bagian dari §8.1) dikerjakan bersamaan dengan Fase 1-2 karena butuh data direktori vendor untuk ditampilkan (walau anonim).*

---

## Changelog

### 2026-09-09 — Fase 3: Budget Planner
- **Fase:** 3
- **Apa yang berubah:**
  - **Migrasi DB** (`000003_budget_plans.up.sql`): `budget_plans` (1 baris per client, `total_budget`, `guest_count`), `budget_plan_categories` (7 kategori tetap per plan, kolom `percentage` sebagai `double precision` — dipilih ketimbang `numeric` supaya scan langsung ke `float64` di pgx tanpa friksi tipe).
  - **Backend baru:** `internal/budget` (`UpsertPlan` — validasi 7 kategori lengkap & total persentase ≈100% dengan toleransi 0.5 untuk rounding frontend, `MyPlan` — mengembalikan default PRD §8.8 kalau Client belum pernah menyimpan).
  - **Perluasan direktori vendor** (`internal/vendors`, `ListApproved`): tambah parameter `max_price` supaya breakdown budget bisa link langsung ke direktori vendor yang harganya masuk akal (PRD §8.8 "filter rentang harga sesuai budget kategori itu").
  - **Frontend baru:** `lib/budget.ts` (metadata 7 kategori + algoritma `rescale` — proporsional terhadap sisa kategori lain, dengan koreksi pembulatan supaya total selalu tepat 100%), halaman `/client/budget` (slider per kategori, live-recalculate, tautan "Cari Vendor" per kategori yang relevan dengan `max_price` sesuai nominal budget kategori itu).
- **File/komponen utama:** `server/migrations/000003_*`, `server/internal/budget/**`, `server/internal/repository/budget.go`, `server/internal/repository/vendors.go` (ListApproved + maxPrice), `server/internal/vendors/handlers_directory.go`, `web/src/lib/budget.ts`, `web/src/app/client/budget/page.tsx`.
- **Verifikasi yang sudah dijalankan:**
  - Backend: `go build`/`go vet`/`gofmt` bersih. curl end-to-end ke Supabase asli: default plan sebelum ada data tersimpan, save & GET ulang menghasilkan `amount` yang tepat (`total_budget × persentase/100`), validasi menolak total persentase ≠100% dan kategori tidak lengkap, role non-client (vendor) ditolak 403.
  - **Browser sungguhan (Playwright), 8/8 lolos:** default 7 kategori tampil sesuai PRD, drag slider "Dekorasi" ke 30% → kategori lain otomatis menyusut proporsional dan total tetap persis 100%, tautan "Cari Vendor" kategori Dekorasi membawa `max_price` yang benar, simpan → reload browser → data tetap tersimpan.
  - Data uji & tool sementara sudah dibersihkan/dihapus.
- **Keputusan/asumsi:**
  - "Kategori lain rescale proporsional" diimplementasikan murni di frontend (live, saat slider digeser) — backend hanya memvalidasi hasil akhir menjumlah ~100%, sesuai sifatnya sebagai interaksi UI instan, bukan business rule server-side.
  - `venue_catering` (budget) dipetakan ke **dua** kategori vendor (`venue` dan `catering`) sekaligus di tautan "Cari Vendor" karena direktori vendor memisah keduanya; `reserve` tidak punya tautan vendor sama sekali (memang bukan kategori jasa).
  - Jumlah tamu (`guest_count`) saat ini murni informasi tersimpan, belum dipakai di formula manapun — sesuai literal PRD §8.8 yang hanya mensyaratkan `Budget Kategori = Total × Persentase`.

### 2026-09-09 — Fase 2: Direktori Vendor + Profil + Chat In-App
- **Fase:** 2
- **Apa yang berubah:**
  - **Migrasi DB** (`000002_vendor_directory_chat.up.sql`): `vendor_profiles` (status pending/approved/rejected), `vendor_portfolio_items`, `conversations` (type `vendor_chat`/`consultation`, dengan unique partial index supaya satu Client hanya punya 1 percakapan per Vendor & 1 percakapan konsultasi), `messages` (kolom `flagged`).
  - **Supabase Storage** diintegrasikan pertama kali (`internal/storage`): bucket publik `portofolio-vendor` dibuat otomatis saat startup, upload lewat service-role key (server-only, sesuai §7/§10.2). Validasi file: sniff content-type asli (bukan cuma ekstensi), maks 5MB, hanya JPEG/PNG/WEBP.
  - **Backend baru:** `internal/vendors` (upsert profil — edit mereset ke pending, upload portofolio, direktori publik anonim, detail unlock), `internal/chat` (get-or-create percakapan, kirim/baca pesan, filter regex kontak eksternal di `internal/chat/filter.go`, model shared-inbox untuk consultation), `internal/admin` (slice tipis: approve/reject vendor — **ditarik maju dari Fase 7** karena direktori tidak bisa diuji end-to-end tanpa ini; sisa Admin/Backoffice tetap di Fase 7).
  - **Middleware baru** di `internal/auth`: `RequireRole` + `ClaimsFromContext` (diekspor) supaya paket lain bisa cek role/pemilik data.
  - **Frontend baru:** form profil + upload portofolio di dashboard Vendor, halaman direktori publik `/vendors` (filter kategori, kartu ter-blur untuk anon), detail vendor `/vendors/[id]` (unlock setelah login Client), `ChatThread`/`ConversationList`/`WithUser` (komponen dipakai bersama Client/Vendor/internal), inbox pesan Client & Vendor, halaman approve vendor Admin, inbox konsultasi Wedding Consultant.
- **File/komponen utama:** `server/migrations/000002_*`, `server/internal/{storage,vendors,chat,admin}`, `server/internal/auth/middleware.go` (RequireRole), `server/internal/httpserver/router.go` (struct `Deps`), `web/src/app/vendors/**`, `web/src/app/{client,vendor}/messages/**`, `web/src/app/internal/{admin/vendors,consultations}/**`, `web/src/components/{ChatThread,ConversationList,WithUser}.tsx`.
- **Verifikasi yang sudah dijalankan:**
  - Backend: `go build`/`go vet`/`gofmt` bersih.
  - **curl end-to-end ke Supabase asli:** vendor daftar → isi profil (pending) → upload foto ke Storage (URL publik dikonfirmasi bisa diakses langsung) → direktori publik kosong (belum approved) → admin approve → direktori publik tampil **tanpa business_name** → client login → detail vendor tampil business_name lengkap → chat vendor (pesan biasa `flagged:false`, pesan berisi nomor HP `flagged:true`) → vendor baca & balas → **IDOR test:** client kedua ditolak (404) saat coba baca percakapan client pertama → consultation: client mulai chat, WC (shared inbox) melihat & membalas → vendor ditolak (403) saat akses endpoint admin, dan client ditolak (403) saat akses endpoint upload profil vendor.
  - **Browser sungguhan (Playwright):** alur penuh vendor register→lengkapi profil→upload foto→admin approve→client browsing anonim→unlock→chat (termasuk flag kontak)→balasan vendor→konsultasi WC. **12/12 pemeriksaan lolos.** Ketemu & diperbaiki 2 bug nyata dalam prosesnya: (a) label form "Kategori"/"Deskripsi" tidak terhubung `htmlFor`↔`id` (bug aksesibilitas asli, bukan cuma isu tes), (b) Supabase Storage mengembalikan HTTP 400 (bukan 409) untuk bucket yang sudah ada — `EnsureBucket` diperbaiki untuk mengenali kode `BucketAlreadyExists`.
  - Ditemukan juga pola lint baru Next.js 16 (`react-hooks/set-state-in-effect`) yang menolak effect yang langsung memanggil fungsi pemicu setState — diperbaiki di 3 tempat dengan `queueMicrotask(load)` alih-alih `load()` langsung.
  - Semua data uji & tool sementara (seed-test, cleanup-test) sudah dibersihkan/dihapus.
- **Keputusan/asumsi:**
  - Approve/reject vendor (thin slice Admin) sengaja ditarik maju dari Fase 7 — didokumentasikan supaya tidak dikira scope creep tanpa alasan.
  - Anonimisasi direktori publik: backend selalu mengembalikan URL foto asli (tidak benar-benar di-blur di server) — blur/watermark visual dilakukan di frontend lewat CSS (`blur-sm`) untuk kartu anonim. Ini cukup untuk MVP tapi bukan proteksi sisi-server (URL foto bisa diakses langsung kalau linknya bocor) — dicatat sebagai risiko ringan.
  - Label percakapan di `ConversationList` masih generik ("Chat dengan Vendor" / "Konsultasi dengan Wedding Consultant") tanpa nama vendor spesifik per-item — penyempurnaan UX kecil yang bisa ditambahkan nanti, bukan blocker.
  - Chat belum real-time (polling 4 detik di `ChatThread`), bukan WebSocket — cukup untuk MVP, dicatat sebagai potensi peningkatan nanti.

### 2026-09-09 — PRD v0.3: checklist UX/SEO & perluasan keamanan
- **Fase:** — (pre-fase, dokumentasi, sebelum mulai Fase 2)
- **Apa yang berubah:** [PRD.md](./PRD.md) diperbarui (§5, §7, §8.2, §10.2–§10.9 baru, §11.3 baru, §12) menambahkan checklist UX/konten/SEO dan memperluas requirement keamanan berdasarkan daftar checklist yang diberikan pemilik produk — sebagian besar item sudah relevan dan diserap langsung, beberapa (mis. contoh CTA "Chat WhatsApp") disesuaikan karena bertentangan dengan model bisnis anti-circumvention DuaCincin.
- **File/komponen utama:** `PRD.md` saja — belum ada kode yang berubah.
- **Keputusan/asumsi:**
  - §10.2 Keamanan sekarang eksplisit mendaftar prinsip yang **sudah** ditegakkan Fase 1 (secrets di server, hash Argon2id/HMAC OTP, cookie httpOnly+SameSite=Lax, rate limiting DB-backed, parameterized query, DisallowUnknownFields anti mass-assignment) vs yang **belum** (Turnstile bot-protection — dicatat sebagai utang teknis di §12).
  - Klarifikasi arsitektur penting di §7: backend connect ke Postgres langsung lewat pooler, bukan lewat Supabase Data API — jadi **RLS Supabase tidak berlaku**, otorisasi harus di kode Go. Ini jadi acuan wajib untuk Fase 2+ (direktori vendor, chat, booking) supaya tidak salah asumsi soal keamanan data antar-user (IDOR).
  - Kebijakan Privasi (§11.3) ditambahkan sebagai dokumen legal baru (selain Perjanjian Vendor & ToS Client yang sudah ada), dengan disclaimer sama (draft, wajib review advokat, kali ini juga soal UU PDP).
  - Item SEO (title/meta/OG image/sitemap/robots.txt) dan analytics ditambahkan sebagai requirement MVP (§5, §10.7–§10.8) — tool analytics final belum dipilih, jadi tercatat sebagai risiko terbuka di §12.
- **Status:** Done (dokumentasi).

### 2026-09-09 — Fase 1: Autentikasi (Client, Vendor, internal) + OTP + rate limiting
- **Fase:** 1
- **Apa yang berubah:**
  - **Migrasi DB** (`server/migrations/000001_init_auth.up.sql`, dijalankan otomatis saat server start via `golang-migrate` + driver `pgx/v5`): tabel `users` (enum role `client`/`vendor`/`admin`/`wedding_consultant`, kolom `failed_login_attempts`/`locked_until` untuk lockout), `otp_codes`, `rate_limit_events`.
  - **Backend Go** — paket baru: `internal/security` (hash password Argon2id, JWT sesi HS256, HMAC OTP), `internal/repository` (`UserRepo`, `OTPRepo`), `internal/ratelimit` (limiter fixed-window berbasis tabel `rate_limit_events`), `internal/email` (klien Resend + template HTML OTP dengan logo & warna brand), `internal/auth` (handler register/login/forgot-password/verify-otp/reset-password/logout/me + middleware sesi).
  - **Endpoint baru** di bawah `/api/v1/auth`: `client/register`, `client/login`, `vendor/register`, `vendor/login`, `internal/login` (khusus role `admin`/`wedding_consultant`, tanpa pendaftaran publik), `forgot-password`, `verify-otp`, `reset-password`, `logout`, `me`.
  - **Sesi**: JWT di cookie httpOnly `dc_session` (`SameSite=Lax`, `Secure` hanya saat `APP_ENV=production`), TTL 7 hari (asumsi, tidak dispesifikasi angka pastinya di PRD).
  - **Frontend Next.js** — komponen baru: `PasswordField` (show/hide), `TextField`, `Button`, `AuthCard` (layout kartu auth bermerek), `DashboardStub` (halaman bukti-sesi sederhana). Halaman baru: `/client/login`, `/client/register`, `/vendor/login`, `/vendor/register`, `/forgot-password` (alur 3 langkah: minta OTP → verifikasi → set password baru), `/internal/login`, `/client/dashboard`, `/vendor/dashboard`. Homepage diberi tautan ke semua halaman ini untuk navigasi sementara.
  - `.env`/`.env.example` ditambah `JWT_SECRET`, `OTP_HMAC_SECRET` (digenerate otomatis via `openssl rand -hex 32`), `PUBLIC_ASSET_BASE_URL`.
- **File/komponen utama:** `server/migrations/000001_init_auth.{up,down}.sql`, `server/migrations/migrations.go`, `server/internal/{security,repository,ratelimit,email,auth,httpx}`, `server/cmd/api/main.go`, `web/src/components/{PasswordField,TextField,Button,AuthCard,DashboardStub}.tsx`, `web/src/app/{client,vendor,forgot-password,internal}/**`, `web/src/lib/api.ts`.
- **Verifikasi yang sudah dijalankan:**
  - Backend: `go build`/`go vet`/`gofmt` bersih. Migrasi jalan otomatis melawan Supabase asli (bukan mock).
  - **End-to-end via curl** langsung ke Supabase sungguhan: register → `/me` → login (email/password salah ditolak dengan pesan generik) → duplikat email ditolak (409) → lupa password → OTP (dev-mode, log ke console karena saat itu `RESEND_API_KEY` belum diisi) → verify-otp (kode salah ditolak, kode benar mengeluarkan `reset_token`, replay kode yang sama ditolak) → reset-password → login gagal dgn password lama, sukses dgn password baru.
  - **Lockout akun**: 5x salah password berturut-turut → akun terkunci 15 menit (HTTP 429), percobaan ke-6 dengan password benar tetap ditolak selama terkunci.
  - **Rate limit registrasi**: percobaan ke-6 dalam 1 jam per IP ditolak (429), sesuai §8.2.
  - **Login internal**: role `wedding_consultant` (dibuat manual, bukan lewat endpoint publik) berhasil login lewat `internal/login` tapi ditolak di `client/login` — konfirmasi pemisahan role.
  - **Browser sungguhan (Playwright + Chromium)**: alur register → redirect ke dashboard → cookie `dc_session` terkonfirmasi `httpOnly` + `SameSite=Lax` (cross-origin `localhost:3000` ↔ `:8080` bekerja) → logout membersihkan cookie & redirect → login ulang berhasil → akses dashboard tanpa sesi redirect ke login → toggle show/hide password berfungsi. **11/11 pemeriksaan lolos.**
  - Semua data uji (user, `rate_limit_events`) dibersihkan dari database setelah verifikasi; tool seed/cleanup sementara dihapus, tidak masuk commit.
- **Keputusan/asumsi:**
  - Email unik secara global (satu email = satu role), bukan unik per-role — pilihan simplifikasi MVP, dicatat karena PRD tidak eksplisit soal ini.
  - `ForgotPassword` selalu membalas pesan generik terlepas email terdaftar atau tidak (cegah user enumeration) — tambahan keamanan di luar teks literal PRD tapi selaras dengan intent-nya.
  - `VerifyOTP` diberi rate limit tambahan (10x/15 menit per email) yang tidak disebutkan eksplisit di PRD §8.2, ditambahkan karena endpoint ini rawan brute-force kode 6 digit.
  - Jika `RESEND_API_KEY` kosong, kode OTP di-log ke console server (mode dev) alih-alih dikirim email — memudahkan testing tanpa akun Resend aktif.
  - `PUBLIC_ASSET_BASE_URL` dipakai untuk menyusun URL logo di email OTP; kalau kosong, email tetap terkirim tanpa gambar logo (fallback teks).
  - Halaman dashboard Client/Vendor saat ini hanya stub pembuktian sesi ("Halo, {nama}" + tombol keluar) — dashboard fitur penuh menyusul di Fase 2+.
- **Status:** Done.

### 2026-09-09 — PRD v0.2: peran Wedding Consultant & alur pemesanan end-to-end
- **Fase:** — (pre-fase, dokumentasi, sebelum mulai Fase 1)
- **Apa yang berubah:** [PRD.md](./PRD.md) diperbarui (§3, §8.2, §8.5, §8.11 baru, §9, §12, §13) menambahkan peran **Wedding Consultant** (staf internal DuaCincin, terpisah dari Vendor & Admin) dan alur: Chat Wedding Consultant/Cari Vendor → Booking → DP → Meeting Konsultan (opsional) → Pelunasan → Technical Meeting → Hari-H.
- **File/komponen utama:** `PRD.md` saja — belum ada kode yang berubah.
- **Keputusan/asumsi:**
  - Role baru `wedding_consultant` ditambahkan ke `users.role`, login lewat halaman internal (bareng `admin`), tidak ada pendaftaran publik.
  - Chat dipisah jadi 2 tipe: `vendor_chat` (sudah ada, §8.4) dan `consultation` (baru, Client↔Wedding Consultant).
  - Booking punya status eksplisit `requested→confirmed→dp_paid→full_paid→completed`, menggantikan status escrow generik sebelumnya.
  - Tabel baru `meetings` (consultant_meeting/technical_meeting) — MVP cukup pencatatan jadwal & status, tanpa integrasi video-call.
  - **Ini menambah scope ke Fase 1 (3 role auth, bukan 2), Fase 2 (2 tipe chat), Fase 5 (task Wedding Planner terhubung ke Technical Meeting), dan Fase 6 (penjadwalan meeting)** — roadmap fase tetap sama urutannya, hanya cakupannya diperluas.
- **Status:** Done (dokumentasi).

### 2026-09-09 — Fase 0: Setup proyek (Next.js + Go + Supabase)
- **Fase:** 0
- **Apa yang berubah:**
  - Inisialisasi git repo + `.gitignore` (mengecualikan `.env`, `node_modules`, `.next`, build artifact Go).
  - Scaffold frontend `web/` dengan `create-next-app` (Next.js 16.3.4, App Router, TypeScript, Tailwind v4, ESLint, `src/` dir, alias `@/*`).
  - Tailwind v4 di-theme dengan token warna brand (`--dc-white/offwhite/gold/navy/black`, lihat PRD §6) via `@theme inline` di `globals.css` — brand tetap putih-based, tidak ikut dark mode OS.
  - Font diganti dari default Geist ke **Plus Jakarta Sans** (heading, `font-heading` utility) + **Inter** (body), sesuai arahan tipografi PRD §6.
  - Aset brand (`dc.ico`, `dc.webp`) disalin ke `web/src/app/favicon.ico` dan `web/public/brand/duacincin-logo.webp`, dipasang di `layout.tsx`/`page.tsx`. Placeholder homepage sementara (bukan landing page final — itu Fase 2).
  - Scaffold backend `server/` (Go 1.27, module `duacincin/server`): `cmd/api` (entrypoint), `internal/config` (loader env + `.env` lookup di `../.env`), `internal/db` (pgxpool ke Supabase pooler), `internal/httpserver` (chi router, middleware request-id/logger/recoverer/CORS, endpoint `/healthz` yang ping DB).
  - Ditambahkan CI dasar `.github/workflows/ci.yml`: job `web` (npm ci, lint, build) dan `server` (go vet, go build).
  - `.env` diisi user dengan kredensial Supabase asli (`DATABASE_POOLER`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`); ditambahkan variabel baru (`PORT`, `APP_ENV`, `NEXT_PUBLIC_API_URL`) + placeholder kosong untuk fase mendatang (`JWT_SECRET`, `RESEND_API_KEY`, `MIDTRANS_*`). `.env.example` dibuat sebagai referensi aman untuk di-commit.
- **File/komponen utama:** `web/` (seluruh scaffold), `server/cmd/api/main.go`, `server/internal/{config,db,httpserver}`, `.env`, `.env.example`, `.gitignore`, `.github/workflows/ci.yml`.
- **Verifikasi yang sudah dijalankan:**
  - `go build ./...` sukses, `go vet ./...` bersih, `gofmt -l .` tidak ada temuan.
  - Server dijalankan lokal → `GET /healthz` → `200 {"status":"ok"}`, artinya koneksi ke Supabase pooler **berhasil**.
  - `npm run lint` bersih, `npm run build` (production) sukses, dev server di-curl → title/favicon/logo ter-render dengan benar.
- **Keputusan/asumsi:**
  - Auth backend akan pakai custom JWT (bukan Supabase Auth) — sudah sesuai rencana PRD §7, belum diimplementasi (menyusul Fase 1).
  - Landing page saat ini hanya placeholder "Fase 0 selesai", bukan representasi final — jangan dianggap sebagai desain landing page.
  - CI belum pernah dijalankan di GitHub Actions sungguhan (repo belum ada remote) — perlu diverifikasi begitu remote dibuat.
- **Status:** Done.

### 2026-09-09 — Inisialisasi PRD & tracker proyek
- **Fase:** — (pre-fase, dokumentasi)
- **Apa yang berubah:** Menulis [PRD.md](./PRD.md) berdasarkan brainstorming requirement penuh (marketplace, anti-circumvention, budget planner, wedding planner, auth+OTP, branding). Membuat `engineering.md` ini sebagai tracker.
- **File/komponen utama:** `PRD.md`, `engineering.md`. Aset brand ditemukan di root: `dc.webp` (logo), `dc.ico` (favicon).
- **Keputusan/asumsi:**
  - Payment gateway: Midtrans (placeholder, bisa diganti Xendit tanpa mengubah struktur — abstraksi adapter payment disarankan saat Fase 6).
  - Komisi platform: 10% (placeholder, harus dikonfirmasi pemilik produk).
  - Perjanjian Kemitraan Vendor & ToS Client: draft awal ada di PRD §11, **belum direview advokat** — jangan dipakai mengikat pengguna nyata sebelum direview.
  - Auth custom di Go backend (bukan Supabase Auth) supaya kontrol penuh OTP/rate-limit/session.
  - Palet warna & tipografi final ada di PRD §6.
- **Status:** Done (dokumentasi). Belum ada kode yang ditulis — proyek masih kosong (belum scaffold Next.js/Go).
