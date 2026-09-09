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
| 4 | Galeri Inspirasi: struktur data, panel upload/moderasi Admin, seed data awal | §8.7 | Done |
| 5 | Wedding Planner: checklist & timeline, referensi duacincin.id dengan tampilan baru | §8.9 | Done |
| 6 | Booking + Escrow Payment (Midtrans): booking flow, DP, holding, disbursement dikurangi komisi | §8.5 | Done |
| 7 | Admin/backoffice: moderasi Inspirasi, dispute queue, config komisi, dashboard *(approve/reject vendor sudah ditarik maju ke Fase 2, lihat changelog)* | §8.10, §8.6 | Done |

*Landing page (bagian dari §8.1) dikerjakan bersamaan dengan Fase 1-2 karena butuh data direktori vendor untuk ditampilkan (walau anonim).*

---

## Changelog

### 2026-09-09 — Redesain Landing Page (premium, interaktif)
- **Fase:** — (cross-cutting, di luar nomor fase — respons langsung ke feedback pemilik produk bahwa landing page lama terasa "jadul" dan tidak menunjukkan kualitas produk).
- **Apa yang berubah:**
  - Landing page (`/`) yang tadinya cuma placeholder teknis Fase 0 (logo + teks status + beberapa link) diganti total jadi halaman pemasaran penuh: `Navbar` (sticky, hamburger di mobile), `Hero` (headline + CTA + motif dua-cincin SVG animasi lambat), `TrustStrip` (mekanisme nyata: vendor diverifikasi, escrow, dst — bukan angka statistik fiktif), `HowItWorks` (4 langkah bernomor), `FeaturesGrid` (6 fitur dengan ikon), **`BudgetDemo`** (kalkulator Budget Planner yang sungguhan interaktif & jalan di landing page tanpa login — pakai ulang logika `rescale` dari `lib/budget.ts` yang sama persis dengan Fase 3), `AntiCircumvention` (jelaskan kenapa nama vendor disembunyikan, framing sebagai perlindungan bukan pembatasan), `CTABanner`, `Footer`.
  - Ditambahkan komponen `Reveal` (scroll-reveal ringan berbasis satu `IntersectionObserver` per elemen + transisi CSS murni, sengaja tidak pakai library animasi supaya tidak menambah bobot bundle).
  - `globals.css` ditambah utility `.reveal`/`.is-visible` dan `animate-spin-slow` (untuk motif cincin di Hero/CTA).
- **File/komponen utama:** `web/src/app/page.tsx` (full rewrite), `web/src/components/landing/**` (baru: Navbar, Hero, TrustStrip, HowItWorks, FeaturesGrid, BudgetDemo, AntiCircumvention, CTABanner, Footer), `web/src/components/Reveal.tsx`, `web/src/app/globals.css`.
- **Verifikasi yang sudah dijalankan:**
  - `npm run lint` & `npm run build` bersih (halaman `/` tetap ter-prerender statis).
  - **Playwright**: screenshot desktop (1440px) & mobile (375px) dicek visual langsung — hero, trust strip, how-it-works, features grid, budget demo interaktif, anti-circumvention, CTA, footer semua tampil rapi dan konsisten dengan palet brand (§6 PRD).
  - Sempat curiga ada bug "section kosong" dari screenshot full-page pertama — ternyata itu artefak cara Playwright meng-capture full-page (tidak benar-benar men-scroll, jadi `IntersectionObserver` belum sempat trigger), **bukan bug aplikasi**. Dikonfirmasi dengan simulasi scroll asli bertahap: semua 17 elemen `.reveal` di halaman benar-benar berubah jadi `opacity:1`/`is-visible` — jadi sengaja diverifikasi ulang sebelum disimpulkan sebagai bug, bukan cuma diasumsikan.
  - Slider Budget Planner di landing page dites benar-benar responsif (ubah satu kategori → kategori lain rescale, sama seperti versi asli di `/client/budget`).
  - Menu mobile (hamburger) dan anchor link "Budget Planner" di navbar dites & berfungsi.
  - Tidak ada console error saat page load.
- **Keputusan/asumsi:**
  - **Tidak ada testimoni/rating/angka statistik fiktif** ("10.000+ pasangan puas", dsb.) — sengaja dihindari karena melanggar prinsip §10.9 PRD (bukti nyata, bukan klaim kosong) dan karena produk belum punya data pengguna sungguhan. Trust strip memakai *mekanisme* produk yang benar-benar sudah ada (escrow, verifikasi Admin, dll.), bukan metrik yang tidak bisa dibuktikan.
  - Motif visual "dua cincin" (SVG dua lingkaran beririsan) dipakai sebagai elemen dekoratif di Hero & CTA — sengaja terhubung ke nama brand, bukan gradient/blob generik ala AI slop.
  - Galeri Inspirasi tidak ditampilkan sebagai section terpisah di landing page karena kontennya masih kosong (belum ada kurasi asli) — cukup di-link dari navbar/footer; bisa ditambah sebagai section showcase begitu ada konten sungguhan.

### 2026-09-09 — Fase 7 (final): Admin/Backoffice + Penegakan Anti-Circumvention
- **Fase:** 7 — fase terakhir di roadmap §13, semua fase (0-7) kini **Done**.
- **Apa yang berubah:**
  - **Migrasi DB** (`000007_admin_backoffice.up.sql`): `agreement_acceptances` (bukti persetujuan legal — versi & timestamp), `vendor_profiles.commission_rate` (override komisi per vendor, nullable = pakai default platform), `users.account_status`/`suspended_until` (status sanksi), `disputes` (sengketa anti-circumvention).
  - **Persetujuan legal jadi wajib saat daftar** (PRD §8.6, sebelumnya benar-benar belum ada sejak Fase 1!): Client/Vendor register sekarang wajib `accept_terms:true`, dicatat ke `agreement_acceptances` dengan versi dokumen (`v1-2026-09-09`, cocok dengan draft PRD §11). Frontend: checkbox wajib + link ke halaman `/legal/vendor-agreement` dan `/legal/client-tos` (rendering draft klausul PRD §11 apa adanya, dengan disclaimer sama).
  - **Sanksi akun** (PRD §11.1 sanction ladder): `users.account_status` (active/suspended/terminated) dicek di alur login (`User.IsBlocked()`), terpisah dari lockout gagal-login yang sudah ada. Suspend otomatis 30 hari, terminate permanen.
  - **Dispute queue otomatis**: `chat.SendMessage` sekarang membuka baris `disputes` otomatis setiap kali pesan di `vendor_chat` ter-flag mengandung kontak eksternal (PRD §8.4/§8.6) — bukan cuma dicatat sebagai flag pasif seperti sebelumnya. Admin melihat antrian, menerapkan salah satu dari 4 sanksi (peringatan/suspend/terminate/tidak ada pelanggaran) lewat `POST /admin/disputes/{id}/resolve`.
  - **Konfigurasi komisi per vendor** (PRD §8.10): `PATCH /admin/vendors/{id}/commission`. `booking.Complete` (Fase 6) sekarang membaca override ini kalau ada, baru fallback ke konstanta platform 10%.
  - **Dashboard Admin**: `GET /admin/dashboard` (vendor aktif, transaksi berjalan, sengketa terbuka) jadi halaman pendaratan baru setelah login Admin, dengan navigasi ke semua sub-halaman admin (vendor pending/approved, disputes, disbursements, inspirasi).
  - **Moderasi Galeri Inspirasi**: tidak ada perubahan baru — sudah dianggap selesai sejak Fase 4 (Admin upload = publish langsung, tanpa antrian submission terpisah, sesuai keputusan yang didokumentasikan di sana).
- **File/komponen utama:** `server/migrations/000007_*`, `server/internal/repository/{agreements,disputes}.go`, `server/internal/repository/users.go` (+account_status/IsBlocked), `server/internal/repository/vendors.go` (+commission_rate), `server/internal/auth/handlers_{register,login}.go`, `server/internal/chat/handlers.go` (auto-dispute), `server/internal/admin/handlers.go` (rewrite penuh), `server/internal/booking/handlers_booking.go` (Complete pakai komisi override), `web/src/app/legal/**`, `web/src/app/internal/admin/{dashboard,disputes,vendors/approved}/**`, `web/src/components/AgreementCheckbox.tsx`.
- **Bug nyata ditemukan & diperbaiki lewat testing:**
  - **`scanVendorProfile` kelewatan kolom `commission_rate`** — SELECT query menambah kolom `commission_rate` (12 kolom) tapi fungsi scan yang dipakai `GetByUserID`/`UpsertProfile` masih di 11 destination (fungsi `collectVendorProfiles` yang beda sempat ke-update duluan, `scanVendorProfile` terlewat). Efeknya: **setiap panggilan `GetByUserID` gagal total** dengan pesan pgx generik ("number of field descriptions must equal number of destinations") yang oleh handler diterjemahkan jadi "vendor tidak ditemukan" — ketemu saat testing booking dengan komisi custom (vendor yang jelas-jelas approved tiba-tiba "tidak ditemukan"). Ini akan lolos begitu saja kalau hanya mengandalkan `go build`/`go vet` (keduanya tidak menangkap mismatch runtime seperti ini) — ketemu murni karena benar-benar memanggil endpoint-nya dan menelusuri sampai ke database secara langsung.
- **Verifikasi yang sudah dijalankan:**
  - Backend: `go build`/`go vet`/`gofmt` bersih. curl end-to-end ke Supabase asli: register tanpa `accept_terms` ditolak, dengan `accept_terms` tercatat ke `agreement_acceptances` (diverifikasi baris asli di DB) → set komisi custom 20% → booking `Complete` memotong komisi 20% (bukan default 10%, dikonfirmasi lewat disbursement) → validasi rate di luar 0-1 ditolak → kirim pesan chat dengan nomor HP → dispute otomatis terbuka → admin resolve dengan sanksi `suspend` → **vendor yang tadinya bisa login jadi ditolak 403** (dan sebelum sanksi, login masih berhasil — jadi bukan kebetulan) → role-check semua endpoint admin baru (vendor ditolak 403).
  - **Browser sungguhan (Playwright), 7/7 lolos:** tombol daftar disabled sebelum centang persetujuan & enabled sesudahnya, admin diarahkan ke dashboard baru, set komisi via UI tersimpan & persist setelah reload, kirim chat dengan kontak eksternal memicu dispute yang muncul di panel admin, resolve dengan sanksi menghilangkan dispute dari antrian.
  - Semua data uji & tool sementara sudah dibersihkan/dihapus.
- **Keputusan/asumsi:**
  - Dispute hanya dibuka untuk pesan `vendor_chat` yang ter-flag, bukan `consultation` (Wedding Consultant bukan pihak yang disanksi lewat mekanisme §11.1).
  - Sanksi "warning" dan "none" tidak mengubah `account_status` — hanya tercatat di riwayat dispute; hanya "suspend" (30 hari, hardcode) dan "terminate" yang benar-benar memblokir login.
  - Halaman legal (`/legal/vendor-agreement`, `/legal/client-tos`) menampilkan draft §11 PRD apa adanya (dengan disclaimer) — **bukan pengganti review advokat sungguhan**, tetap tercatat sebagai risiko terbuka di PRD §12.
  - "Moderasi Galeri Inspirasi" di PRD §8.10 dianggap sudah terpenuhi lewat model Fase 4 (Admin upload = publish langsung + bisa hapus) — tidak dibangun antrian submission-dari-vendor terpisah karena PRD §8.7 sendiri bilang MVP cukup begitu.

### 2026-09-09 — Fase 6: Booking + Escrow Payment (Midtrans) + Meeting
- **Fase:** 6
- **Apa yang berubah:**
  - **Migrasi DB** (`000006_bookings.up.sql`): `bookings` (status `requested→confirmed→dp_paid→full_paid→completed`/`cancelled`), `transactions` (tipe dp/full, `provider_order_id` unik untuk Midtrans), `meetings` (consultant_meeting/technical_meeting, constraint memastikan technical wajib punya `booking_id` dan consultant tidak), `disbursements` (satu baris per booking: bruto, komisi, netto).
  - **Backend baru:**
    - `internal/payment` — klien Midtrans Snap API (`CreateTransaction` → redirect URL hosted checkout) + `VerifySignature` (SHA512 sesuai skema notifikasi Midtrans). **Mode dev-simulasi**: kalau `MIDTRANS_SERVER_KEY` kosong, endpoint pembayaran mengembalikan `{dev_mode:true}` alih-alih memanggil Midtrans, dan Client bisa memicu `POST /bookings/{id}/dev-simulate-payment` untuk menandai transaksi lunas secara manual — sama persis pola fallback OTP/Resend di Fase 1.
    - `internal/booking` — alur penuh PRD §8.11: `Create`→`Confirm`(vendor)→`PayDP`→`PayFull`→technical meeting→`Complete` (hanya bisa selesai kalau status `full_paid` **dan** ada ≥1 technical meeting), plus `Cancel`. Webhook Midtrans publik (`POST /webhooks/midtrans`) memverifikasi signature sebelum memproses, dan idempoten terhadap notifikasi yang terkirim berulang.
    - `Confirm` memanggil `WeddingPlannerRepo.MarkDoneByCategory` (fungsi yang disiapkan di Fase 5) — tercentang otomatis begitu Vendor kategori terkait dikonfirmasi (PRD §8.9).
    - Perluasan `internal/admin`: `GET /admin/disbursements/pending` + `POST /admin/disbursements/{bookingID}/mark-disbursed` — slice tipis lain yang ditarik maju dari Fase 7 (sama alasan seperti approve-vendor di Fase 2: booking tidak bisa diuji tuntas tanpa cara mencairkan dana).
  - **Frontend baru:** form "Ajukan Booking" di halaman detail vendor, `/client/bookings` (+ detail dengan tombol bayar DP/pelunasan, simulasi dev-mode, jadwalkan technical meeting, tandai selesai), `/vendor/bookings` (+ detail dengan konfirmasi/tolak), `/internal/admin/disbursements`.
- **File/komponen utama:** `server/migrations/000006_*`, `server/internal/{payment,booking}/**`, `server/internal/repository/{booking,meetings}.go`, `server/internal/repository/wedding_planner.go` (fix seeding, lihat di bawah), `server/internal/admin/handlers.go` (+disbursements), `web/src/app/vendors/[id]/page.tsx` (+form booking), `web/src/app/{client,vendor}/bookings/**`, `web/src/app/internal/admin/disbursements/**`.
- **Bug nyata ditemukan & diperbaiki lewat testing (bukan cuma test yang salah kali ini):**
  - **Race condition seeding Wedding Planner ↔ auto-mark booking**: `MarkDoneByCategory` melakukan `UPDATE ... WHERE client_id = ...` terhadap tabel `wedding_planner_tasks` — tapi kalau Client belum pernah membuka halaman Wedding Planner (belum ter-seed), UPDATE itu menyasar nol baris dan diam-diam tidak berefek. Ketahuan lewat Playwright end-to-end (skenario paling realistis: booking duluan, baru buka Wedding Planner belakangan). **Perbaikan:** logika seed dipisah jadi `ensureSeeded`, dipanggil dari `ListForClient` **dan** dari `MarkDoneByCategory`, jadi checklist selalu ada sebelum di-update siapa pun pemicunya duluan.
- **Verifikasi yang sudah dijalankan:**
  - Backend: `go build`/`go vet`/`gofmt` bersih. curl end-to-end ke Supabase asli mencakup **seluruh siklus hidup booking**: create→role-check confirm (client ditolak, vendor bisa)→bayar DP dev-mode→tolak pay/full sebelum DP lunas→bayar lunas→tolak complete tanpa technical meeting→jadwalkan meeting→complete berhasil→disbursement muncul dengan komisi 10% terhitung benar→admin mark-disbursed→IDOR (client lain 404)→**webhook Midtrans jalur asli diuji dengan signature valid dihitung manual (SHA512), bukan cuma dev-simulate** — dan diuji juga idempotensi (webhook dikirim 2x tidak error/dobel proses).
  - **Browser sungguhan (Playwright), 8/8 lolos** setelah perbaikan bug di atas: alur penuh vendor daftar→approve admin→client booking→vendor confirm→**Wedding Planner auto-centang**→bayar DP (dev-mode)→jadwalkan technical meeting→bayar lunas→tandai selesai→admin cairkan dana.
  - Semua data uji & tool sementara sudah dibersihkan/dihapus.
- **Keputusan/asumsi (perlu keputusan bisnis final nanti, lihat §12 PRD):**
  - **DP 30% dan komisi 10%** adalah konstanta MVP (`booking.DPPercent`, `booking.CommissionRate`) — PRD tidak menspesifikasikan angka DP, dan komisi per kategori/vendor yang bisa dikonfigurasi Admin baru ada di Fase 7.
  - **Belum pernah diuji dengan akun Midtrans sungguhan** — `MIDTRANS_SERVER_KEY` masih kosong di `.env`. Kode integrasi (Snap API + verifikasi signature) sudah diverifikasi benar secara manual (signature dihitung & dicocokkan persis), tapi belum pernah menyentuh sandbox Midtrans yang sebenarnya. Ini **wajib** dicoba ulang begitu ada kredensial sandbox asli, sebelum go-live.
  - Pencairan dana ke vendor masih murni pencatatan manual oleh Admin (klik "Tandai Dicairkan") — **tidak ada transfer bank otomatis**. Kalau nanti mau otomatis, itu perlu integrasi terpisah (mis. Midtrans Iris/Payout) yang butuh approval terpisah dari Midtrans.
  - Meeting konsultasi (non-technical) punya endpoint backend (`/meetings/consultation`) tapi **belum ada halaman frontend khusus** — dianggap cukup lewat chat Wedding Consultant yang sudah ada di Fase 2; bisa ditambahkan nanti kalau memang dibutuhkan.

### 2026-09-09 — Fase 5: Wedding Planner
- **Fase:** 5
- **Apa yang berubah:**
  - **Migrasi DB** (`000005_wedding_planner.up.sql`): `wedding_planner_tasks` (per-client, `timeframe`, `title`, `related_category` opsional, `status` todo/in_progress/done, `sort_order`).
  - **Backend baru:** `internal/weddingplanner` — `GET /wedding-planner/tasks` (lazy-seed: kalau Client belum punya checklist, otomatis diisi dari `DefaultChecklist` 12 item H-12 Bulan s/d Hari-H saat pertama kali diakses), `PATCH /wedding-planner/tasks/{id}` (ubah status, scoped ke `client_id` — IDOR-safe).
  - Ditambahkan `WeddingPlannerRepo.MarkDoneByCategory` — **belum dipanggil dari mana pun**, disiapkan untuk Fase 6: begitu booking vendor kategori tertentu terkonfirmasi, task terkait di checklist otomatis tercentang (PRD §8.9).
  - **Frontend baru:** `/client/wedding-planner` — checklist dikelompokkan per timeframe, status di-toggle lewat tombol siklus (Belum→Proses→Selesai→Belum), progress counter (`x/12 selesai`), tautan "Cari Vendor" untuk task yang punya `related_category`.
- **File/komponen utama:** `server/migrations/000005_*`, `server/internal/weddingplanner/**`, `server/internal/repository/wedding_planner.go`, `web/src/app/client/wedding-planner/page.tsx`.
- **Verifikasi yang sudah dijalankan:**
  - Backend: `go build`/`go vet`/`gofmt` bersih. curl end-to-end ke Supabase asli: seed default 12 task saat pertama akses, update status, validasi status tidak valid ditolak, **IDOR test**: client kedua tidak bisa mengubah task milik client pertama (404), task client pertama tetap tidak berubah.
  - **Browser sungguhan (Playwright), 6/6 lolos:** checklist default tampil, progress counter update saat status berubah, tautan vendor per kategori ada, dan status tetap tersimpan setelah reload.
  - Data uji sudah dibersihkan.
- **Keputusan/asumsi:**
  - Isi default checklist (12 milestone H-12 Bulan s/d Hari-H) disusun berdasarkan pengetahuan umum alur perencanaan pernikahan Indonesia, **bukan** hasil menyalin langsung dari duacincin.id (tidak diakses/di-fetch) — PRD hanya minta "referensi fitur ... dengan tampilan fresh", isinya didesain ulang.
  - "Task otomatis tercentang saat booking vendor dikonfirmasi" (PRD §8.9) **belum diaktifkan di fase ini** — fungsi `MarkDoneByCategory` sudah ada di repository tapi baru benar-benar dipanggil begitu Fase 6 (Booking) membuat event konfirmasi booking. *(Update Fase 6: sudah aktif — lihat entri changelog Fase 6, termasuk satu bug seeding yang ketemu & diperbaiki saat mengaktifkannya.)*
  - Status hanya 3 tingkat (todo/in_progress/done) sesuai literal PRD "belum/proses/selesai" — siklus toggle lewat satu tombol demi kesederhanaan UI, bukan dropdown terpisah.

### 2026-09-09 — Fase 4: Galeri Inspirasi
- **Fase:** 4
- **Apa yang berubah:**
  - **Migrasi DB** (`000004_inspiration.up.sql`): `inspiration_items` (kategori teks bebas — bukan enum tetap, karena PRD §8.7 memberi contoh kategori "mis." bukan daftar baku — storage path/URL, alt text, caption, source credit).
  - **Refactor kecil:** logika validasi upload gambar (sniff content-type asli, batas 5MB, ekstensi JPEG/PNG/WEBP) yang tadinya cuma ada di `vendors/handlers_portfolio.go` dipindah ke paket bersama `internal/imageupload`, dipakai juga oleh Inspirasi — menghindari duplikasi kode yang genuinely berulang.
  - **Storage:** bucket publik baru `inspirasi` (dibuat otomatis saat startup, sama seperti `portofolio-vendor`). Ditambahkan `storage.Client.Delete` supaya hapus item juga membersihkan file di Supabase Storage, bukan cuma baris DB.
  - **Backend baru:** `internal/inspiration` — `GET /inspiration` (publik, filter `category` + `q` pencarian sederhana di caption/kategori), `GET /inspiration/categories` (daftar kategori untuk filter chip), `POST/DELETE /admin/inspiration` (Admin-only, upload langsung ter-publish — tidak ada antrian moderasi terpisah di MVP, sesuai catatan PRD §8.7 bahwa upload Admin **adalah** langkah kurasinya).
  - **Frontend baru:** `/inspirasi` (galeri publik, search + filter kategori, layout masonry responsif), `/internal/admin/inspirasi` (form upload + grid dengan tombol hapus), tautan navigasi silang antar dua halaman Admin dan dari homepage/dashboard Client.
- **File/komponen utama:** `server/migrations/000004_*`, `server/internal/{inspiration,imageupload}`, `server/internal/storage/supabase.go` (+Delete), `server/internal/repository/inspiration.go`, `web/src/app/inspirasi/**`, `web/src/app/internal/admin/inspirasi/**`.
- **Verifikasi yang sudah dijalankan:**
  - Backend: `go build`/`go vet`/`gofmt` bersih. curl end-to-end ke Supabase asli: upload → publik langsung terlihat → filter kategori & search bekerja → role non-admin ditolak (403) di endpoint upload/hapus → hapus item juga menghapus file storage-nya (dikonfirmasi URL lama jadi tidak bisa diakses lagi).
  - **Browser sungguhan (Playwright), 6/6 lolos:** galeri kosong tampil pesan yang jelas, 2 item ter-upload muncul di admin, publik melihat keduanya, filter kategori & search masing-masing menyaring dengan benar (sempat salah duga sebagai bug aplikasi — ternyata bug di assertion test-nya sendiri, chip filter memang selalu menampilkan semua nama kategori terlepas dari filter aktif), hapus item hilang dari grid admin.
  - Data uji & tool sementara sudah dibersihkan/dihapus — galeri publik saat ini kosong lagi (siap diisi konten kurasi asli).
- **Keputusan/asumsi:**
  - Tidak ada alur "submission vendor → antrian moderasi Admin" terpisah di MVP — hanya Admin yang bisa mengunggah, dan mengunggah = mempublikasikan. Kalau nanti mau membuka jalur vendor mengirim kandidat foto untuk di-approve, itu perlu ditambahkan sebagai fitur baru (bukan bagian dari yang sudah dibangun ini).
  - Kategori Inspirasi adalah teks bebas yang diisi Admin (bukan enum tetap seperti `vendor_category`) — sengaja fleksibel untuk kurasi konten yang beragam.

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
