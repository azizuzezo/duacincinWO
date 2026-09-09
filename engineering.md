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
| 1 | Autentikasi Client & Vendor: daftar, login, lupa password (OTP via Resend, 5 menit expiry), rate limiting, show/hide password | §8.2 | Not started |
| 2 | Direktori vendor (kartu anonim → unlock setelah login), profil vendor, kategori, chat in-app + filter kontak eksternal | §8.3, §8.4 | Not started |
| 3 | Budget Planner: input total budget & tamu, auto-split default, adjustable proportional rescale | §8.8 | Not started |
| 4 | Galeri Inspirasi: struktur data, panel upload/moderasi Admin, seed data awal | §8.7 | Not started |
| 5 | Wedding Planner: checklist & timeline, referensi duacincin.id dengan tampilan baru | §8.9 | Not started |
| 6 | Booking + Escrow Payment (Midtrans): booking flow, DP, holding, disbursement dikurangi komisi | §8.5 | Not started |
| 7 | Admin/backoffice: approve vendor, moderasi Inspirasi, dispute queue, config komisi | §8.10, §8.6 | Not started |

*Landing page (bagian dari §8.1) dikerjakan bersamaan dengan Fase 1-2 karena butuh data direktori vendor untuk ditampilkan (walau anonim).*

---

## Changelog

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
