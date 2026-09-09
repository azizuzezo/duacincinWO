# DuaCincin — Product Requirements Document (PRD)

| | |
|---|---|
| **Versi** | 0.1 (Draft awal) |
| **Tanggal** | 2026-09-09 |
| **Status** | Menunggu review pemilik produk |
| **Terkait** | [engineering.md](./engineering.md) — roadmap fase & log perubahan teknis |

---

## 1. Ringkasan & Visi

DuaCincin adalah marketplace dua sisi yang mempertemukan **Client** (calon pengantin/keluarga yang sedang merencanakan pernikahan) dengan **Vendor Wedding Organizer** (dekorasi, MUA, fotografer/videografer, catering, venue, entertainment, undangan & souvenir).

Client menemukan vendor lewat DuaCincin, berdiskusi lewat DuaCincin, booking lewat DuaCincin, dan membayar lewat DuaCincin. Seluruh nilai transaksi (dan komisi platform) hanya bisa terjadi selama transaksi tetap berada di dalam platform — karena itu, identitas vendor **tidak pernah ditampilkan di landing page publik**, dan setiap vendor terikat perjanjian kemitraan yang melarang transaksi di luar platform, lengkap dengan sanksi yang sah secara hukum.

**Visi produk:** menjadi wadah tepercaya nomor satu di Indonesia untuk merencanakan pernikahan dari sisi vendor & budget, dengan pengalaman yang terasa premium, modern, dan sangat manusiawi — bukan generik/"AI slop".

---

## 2. Masalah yang Diselesaikan

- Client kesulitan menemukan & membandingkan vendor wedding yang tepercaya, sering harus mencari manual di Instagram/rekomendasi orang.
- Vendor kecil-menengah kesulitan mendapat exposure tanpa budget marketing besar.
- Setelah ketemu, transaksi biasanya lompat ke WhatsApp/rekening pribadi — pihak ketiga (marketplace) kehilangan visibilitas dan revenue, dan client kehilangan perlindungan (tidak ada bukti transaksi terverifikasi, tidak ada mediasi sengketa).
- Perencanaan budget pernikahan biasanya dilakukan manual (spreadsheet), tidak terhubung ke proses pemilihan vendor.

---

## 3. Target Pengguna

| Peran | Deskripsi |
|---|---|
| **Client** | Calon pengantin/keluarga, mendaftar untuk mencari vendor, menyusun budget, browsing inspirasi, dan menyusun rencana pernikahan (wedding planner/checklist). |
| **Vendor** | Bisnis penyedia jasa pernikahan (decor, MUA, fotografer, dst) yang mendaftar untuk menerima booking lewat platform, terikat Perjanjian Kemitraan Vendor. |
| **Admin (internal DuaCincin)** | Memverifikasi pendaftaran vendor, moderasi konten Inspirasi, menangani sengketa & pelanggaran anti-akal-akalan, mengelola komisi/payout. |

---

## 4. Tujuan & Metrik Sukses (MVP)

- Client bisa mendaftar, mengisi budget pernikahan, dan langsung mendapat breakdown otomatis per kategori.
- Client bisa browsing direktori vendor per kategori tanpa melihat nama vendor sebelum login.
- Vendor bisa mendaftar, submit portofolio, menerima & membalas diskusi dari Client, dan menerima booking + pembayaran lewat platform.
- 100% komunikasi transaksional (harga, jadwal, kontrak) tercatat di dalam sistem chat DuaCincin — tidak ada kontak langsung (nomor WA/email pribadi vendor) yang terekspos sebelum booking dikonfirmasi & dibayar sebagian (DP) lewat platform.
- Rate limit pendaftaran & OTP mencegah abuse (spam akun, brute-force OTP).

*Metrik kuantitatif (GMV, jumlah vendor aktif, dsb.) menyusul setelah MVP live — belum didefinisikan di versi draft ini.*

---

## 5. Lingkup

### Masuk MVP
1. Landing page (tanpa nama vendor) + Autentikasi Client & Vendor (termasuk OTP lupa password via Resend)
2. Direktori & profil vendor (anonim sampai unlock), sistem diskusi/chat in-app
3. Budget Planner dengan auto-split & adjustable
4. Galeri Inspirasi (kurasi manual, sumber Indonesia)
5. Wedding Planner (checklist & timeline, terinspirasi duacincin.id)
6. Booking + escrow payment (Midtrans, lihat §8.5)
7. Perjanjian Kemitraan Vendor & Ketentuan Layanan Client (anti-circumvention)
8. Admin/backoffice minimal (approve vendor, moderasi, dispute queue)

### Di luar MVP (fase berikutnya)
- Review & rating publik vendor
- Aplikasi mobile native
- Multi-bahasa (Inggris)
- Rekomendasi vendor berbasis AI/matching otomatis
- Integrasi kalender eksternal (Google Calendar) untuk jadwal vendor

---

## 6. Branding & Identitas Visual

- **Nama:** DuaCincin
- **Logo & favicon:** aset sudah tersedia di root proyek — `dc.webp` (logo, motif burung emas terbang membentuk dua cincin kawin) dan `dc.ico` (favicon). Gunakan langsung, jangan generate ulang.
- **Palet warna** (dari referensi yang dikirim, base putih):

| Token | Hex (perkiraan) | Pemakaian |
|---|---|---|
| `--dc-white` | `#FFFFFF` | Base/background utama |
| `--dc-offwhite` | `#F1F1F1` | Section alternate background |
| `--dc-gold` | `#F5A623` | Aksen utama, CTA, highlight (selaras dgn logo) |
| `--dc-navy` | `#152238` | Teks judul, elemen gelap sekunder |
| `--dc-black` | `#0A0A0A` | Teks body, footer |

- **Tipografi:** heading pakai display font tebal-membulat (kesan hangat, bukan corporate-generic — mis. seri seperti pada gambar referensi "Black & Gold Elegance"), body pakai sans-serif humanis yang sangat mudah dibaca (mis. Inter/General Sans).
- **Prinsip desain:** hindari kesan "AI slop" — tidak ada gradient ungu-biru generik, tidak ada ilustrasi 3D generik/blob, tidak ada foto AI-generated. Semua foto di Inspirasi wajib sumber nyata Indonesia (lihat §8.7). Micro-interaction halus (hover, transisi) diperbolehkan asal tidak mengorbankan performa (target Lighthouse Performance ≥ 90).

---

## 7. Arsitektur & Tech Stack

- **Frontend:** Next.js (App Router) + Tailwind CSS, di-deploy terpisah dari backend.
- **Backend:** Go (REST API). Backend Go yang memegang seluruh logic bisnis: auth, OTP, rate limiting, budget calculator, orkestrasi escrow, deteksi pelanggaran anti-circumvention.
- **Database:** PostgreSQL terkelola Supabase, diakses backend Go lewat **connection pooler** (connection string akan ditempel user di `.env`, format `postgres://...:6543/...?pgbouncer=true`). Supabase dipakai murni sebagai Postgres + Storage — **bukan** Supabase Auth (auth custom di Go supaya bisa kontrol penuh OTP/rate-limit/session).
- **Storage media:** Supabase Storage (bucket terpisah: `inspirasi`, `portofolio-vendor`, `dokumen-vendor`).
- **Email OTP:** Resend, template HTML dengan logo DuaCincin, OTP berlaku 5 menit.
- **Payment/Escrow:** Midtrans (placeholder — dapat diganti Xendit, tinggal ganti adapter di layer payment Go backend) untuk pembayaran DP/pelunasan dari Client, dengan dana ditahan platform (virtual account/settlement internal) sebelum disbursement ke vendor dikurangi komisi.
- **Hosting (usulan, konfirmasi nanti):** Frontend di Vercel, backend Go di container (Fly.io/Railway/VPS), tidak mengikat — bisa disesuaikan saat implementasi.

---

## 8. Spesifikasi Fitur

### 8.1 Landing Page
- Tidak menampilkan nama/brand vendor mana pun (termasuk di preview kartu vendor) — hanya kategori, kota, rentang harga, dan cuplikan portofolio yang di-*watermark*/anonimkan.
- CTA utama: "Mulai Rencanakan Pernikahanmu" (daftar sebagai Client) dan CTA sekunder untuk Vendor: "Daftar Jadi Mitra Vendor".
- Menjelaskan secara singkat proposisi nilai: budget planner otomatis, direktori vendor terverifikasi, semua transaksi aman lewat platform.

### 8.2 Autentikasi
- Dua alur terpisah: **Login/Daftar Client** dan **Login/Daftar Vendor** (halaman & endpoint berbeda, role tersimpan di tabel `users.role`).
- Password: hash Argon2id, input password wajib ada tombol **show/hide** (mata) di semua form (login, daftar, reset password).
- **Lupa password:** request → kirim OTP 6 digit ke email via Resend → OTP berlaku **5 menit** → verifikasi OTP → set password baru.
- **Rate limiting:**
  - Request OTP: maksimal 3x per email per 15 menit, dan maksimal 5x per IP per jam.
  - Percobaan daftar akun baru: maksimal 5x per IP per jam (mencegah spam akun).
  - Percobaan login gagal: lockout sementara (mis. 15 menit) setelah 5x gagal berturut-turut per akun.
- Template email OTP menyertakan logo DuaCincin (`dc.webp`), teks singkat, kode OTP besar & jelas, dan peringatan "berlaku 5 menit, jangan bagikan kode ini".

### 8.3 Direktori & Profil Vendor
- Vendor mendaftar, memilih kategori (Venue, Catering, Dekorasi, MUA & Attire, Foto & Video, Entertainment, Undangan & Souvenir), upload portofolio & dokumen legalitas untuk verifikasi Admin.
- Vendor **berstatus "pending"** sampai disetujui Admin sebelum tampil di direktori.
- Client yang belum login melihat kartu vendor **anonim** (kategori, kota, rentang harga, rating jika ada, sample foto blur/watermark). Nama vendor, kontak, dan portofolio penuh hanya terbuka setelah Client login dan membuka profil (masih di dalam sistem DuaCincin, kontak pribadi vendor tetap tidak pernah ditampilkan — komunikasi hanya lewat chat in-app §8.4).

### 8.4 Diskusi / Chat In-App
- Chat 1:1 Client↔Vendor di dalam platform, riwayat tersimpan sebagai bukti (relevan untuk sengketa & audit anti-circumvention).
- Sistem otomatis mendeteksi & memfilter percobaan berbagi nomor telepon/email/link eksternal dalam chat (regex/heuristik dasar untuk MVP), memberi peringatan ke user dan mencatat *flag* untuk ditinjau Admin bila berulang.

### 8.5 Booking & Escrow Payment
- Client memilih vendor → mengajukan booking (tanggal, paket/layanan, harga disepakati lewat chat) → Vendor konfirmasi → Client membayar DP lewat Midtrans ke akun penampung DuaCincin.
- Dana ditahan sampai milestone tercapai (mis. H-1 acara / acara selesai dikonfirmasi Client), baru di-disburse ke rekening vendor dikurangi **komisi platform (default 10%, dikonfigurasi per kategori/vendor oleh Admin, bukan hardcode)**.
- Semua transaksi tercatat di tabel `transactions` dengan status (`pending`, `paid_dp`, `paid_full`, `disbursed`, `disputed`, `refunded`).

### 8.6 Perjanjian Kemitraan Vendor & Anti-Circumvention (Legal)
- Saat mendaftar, Vendor wajib menyetujui **Perjanjian Kemitraan Vendor DuaCincin** (lihat draft lengkap di §11) sebelum akun aktif — dicatat versi & timestamp persetujuan (`vendor_agreements` table, untuk pembuktian hukum).
- Client menyetujui **Ketentuan Layanan Client** saat daftar, termasuk klausul dilarang meminta/menerima kontak langsung vendor untuk bertransaksi di luar platform.
- Pelanggaran yang terdeteksi (lewat chat filter §8.4, laporan pengguna, atau audit Admin) masuk ke antrian dispute Admin dengan opsi sanksi bertingkat (peringatan → penalti finansial sesuai perjanjian → suspend → terminasi akun).

### 8.7 Galeri Inspirasi
- Galeri kurasi manual (bukan generate AI, bukan sumber luar negeri) — foto nyata pernikahan Indonesia, diunggah Admin/tim kurasi dari sumber berizin (submission vendor terverifikasi, atau kurasi dari media sosial dengan kredit/izin).
- Setiap item punya kategori (mis. dekorasi outdoor, gaun adat, dst), filter & search sederhana.
- **Catatan proses:** karena ini kurasi manual berbasis konten nyata, pengisian galeri adalah tugas *editorial* berkelanjutan, bukan sesuatu yang di-generate saat build — di MVP cukup sediakan struktur data + panel upload Admin, isi minimal beberapa contoh dummy dari sumber yang sah (mis. hasil unggahan vendor sendiri) untuk demo.

### 8.8 Budget Planner
- Client input: total budget (Rp) dan jumlah tamu.
- Default split (bisa diubah user, live-recalculate, total wajib 100%):

| Kategori | Persentase Default |
|---|---|
| Venue & Catering | 40% |
| Dekorasi | 15% |
| Foto & Video | 12% |
| MUA & Attire | 10% |
| Entertainment | 8% |
| Undangan & Souvenir | 5% |
| Cadangan | 10% |

- Formula: `Budget Kategori = Total Budget × (Persentase / 100)`.
- Saat user mengubah satu kategori secara manual, kategori lain di-*rescale* proporsional agar total tetap 100% (behavior slider ala "pie chart interaktif").
- Hasil breakdown bisa dikaitkan ke rekomendasi kategori vendor yang relevan di direktori (mis. klik kategori "Dekorasi" → langsung ke direktori vendor dekorasi dengan filter rentang harga sesuai budget kategori itu).

### 8.9 Wedding Planner
- Referensi fitur dari duacincin.id, dibangun ulang dengan tampilan fresh sesuai palet §6 — checklist tahapan pernikahan (H-12 bulan s/d H-hari), timeline visual, status per-task (belum/proses/selesai), terhubung dengan booking vendor yang sudah dikonfirmasi (mis. task "Booking MUA" otomatis tercentang saat ada booking MUA aktif).
- *(Detail interaksi & tampilan visual akan difinalisasi saat brainstorming fase implementasi Phase 5 — lihat engineering.md.)*

### 8.10 Admin / Backoffice
- Approve/reject pendaftaran vendor (review dokumen legalitas).
- Moderasi Galeri Inspirasi (approve/reject submission).
- Dispute queue untuk pelanggaran anti-circumvention & sengketa transaksi.
- Konfigurasi komisi per kategori/vendor.
- Dashboard ringkas: jumlah vendor aktif, transaksi berjalan, laporan pelanggaran terbuka.

---

## 9. Model Data (High-Level)

Entitas inti (detail skema di implementasi, bukan final di sini):

`users` (role: client/vendor/admin) · `vendor_profiles` · `vendor_categories` · `vendor_agreements` (versi & timestamp persetujuan) · `client_agreements` · `otp_codes` · `password_resets` · `conversations` / `messages` · `bookings` · `transactions` · `disputes` · `inspiration_items` · `budget_plans` / `budget_categories` · `wedding_planner_tasks` · `rate_limit_events`.

---

## 10. Non-Functional Requirements

- **Performa:** Core Web Vitals baik (LCP < 2.5s), Lighthouse Performance ≥ 90 di landing page — interaktivitas (hover/animasi) tidak boleh bikin lemot.
- **Keamanan:** password hashing Argon2id, OTP hashed di DB (bukan plaintext), rate limiting semua endpoint sensitif, HTTPS only, input sanitization (cegah XSS/SQLi), secrets (connection string Supabase, Resend API key, Midtrans key) hanya via env var, tidak pernah di-commit.
- **Aksesibilitas:** kontras warna cukup terutama teks di atas warna gold/navy (WCAG AA minimum).
- **Skalabilitas:** backend Go stateless (session via JWT), DB pooling lewat Supabase pooler agar tahan banyak koneksi concurrent.
- **Auditability:** semua persetujuan perjanjian & transaksi harus punya jejak (timestamp, versi dokumen) untuk kebutuhan pembuktian sengketa hukum.

---

## 11. Draft Perjanjian Kemitraan Vendor & Ketentuan Layanan

> ⚠️ **Disclaimer penting:** Teks di bawah ini adalah **draft awal** untuk kebutuhan produk (ditampilkan di alur onboarding vendor/client), disusun berdasarkan pola umum perjanjian kemitraan marketplace. **Ini bukan nasihat hukum** dan **wajib direview serta disahkan oleh advokat/konsultan hukum** sebelum digunakan secara resmi mengikat pengguna nyata. Placeholder seperti `[Nama Badan Hukum]`, `[X%]`, `[Kota Domisili Hukum]` wajib diisi sebelum publish.

### 11.1 Perjanjian Kemitraan Vendor DuaCincin (Ringkasan Klausul)

1. **Definisi** — "Platform" berarti aplikasi dan situs DuaCincin yang dioperasikan oleh `[Nama Badan Hukum, mis. PT DuaCincin Bahagia Indonesia]` ("DuaCincin"). "Mitra Vendor" berarti pihak penyedia jasa yang telah disetujui mendaftar di Platform. "Transaksi Difasilitasi" berarti setiap transaksi jasa pernikahan yang bermula dari pertemuan, diskusi, atau paparan (exposure) yang terjadi di Platform, baik disepakati di dalam maupun di luar Platform.

2. **Kewajiban Mitra Vendor** — Mitra Vendor wajib memproses seluruh komunikasi awal, negosiasi, kesepakatan harga, dan pembayaran Transaksi Difasilitasi melalui fitur yang disediakan Platform (chat in-app, sistem booking, dan sistem pembayaran/escrow Platform).

3. **Larangan Transaksi di Luar Platform (Non-Circumvention)** — Mitra Vendor dilarang: (a) meminta atau mengarahkan Client untuk berkomunikasi/bertransaksi di luar Platform (WhatsApp, telepon, transfer rekening pribadi, dsb.) untuk Transaksi Difasilitasi; (b) memberikan insentif kepada Client agar berpindah ke transaksi di luar Platform; (c) menyembunyikan atau memanipulasi laporan transaksi untuk menghindari komisi Platform.

4. **Sanksi & Penalti** — Pelanggaran Pasal 3 dikenakan sanksi bertingkat: (a) **Peringatan tertulis** untuk pelanggaran pertama; (b) **Penalti finansial** sebesar `[X%, mis. 100%]` dari estimasi nilai Transaksi Difasilitasi yang dialihkan, minimum `Rp [nominal]`, untuk pelanggaran kedua; (c) **Penangguhan (suspend) akun** 30 hari untuk pelanggaran ketiga; (d) **Pemutusan mitra secara permanen** serta pencantuman dalam daftar internal untuk pelanggaran berulang/berat, tanpa mengurangi hak DuaCincin menempuh upaya hukum perdata atas kerugian yang timbul.

5. **Kerahasiaan** — Mitra Vendor menjaga kerahasiaan data Client yang diperoleh melalui Platform dan tidak menggunakannya untuk tujuan di luar Transaksi Difasilitasi yang sah.

6. **Komisi** — DuaCincin berhak atas komisi sebesar `[X%, default 10%]` dari setiap Transaksi Difasilitasi yang berhasil, dipotong otomatis saat disbursement dana melalui sistem escrow Platform.

7. **Penyelesaian Sengketa** — Sengketa diselesaikan lebih dahulu secara musyawarah melalui mekanisme dispute internal DuaCincin; apabila tidak tercapai kesepakatan, para pihak sepakat menyelesaikan melalui `[mediasi/arbitrase BANI/Pengadilan Negeri [Kota]]` sesuai hukum yang berlaku di Indonesia.

8. **Hukum yang Berlaku** — Perjanjian ini tunduk dan ditafsirkan berdasarkan hukum Negara Republik Indonesia.

9. **Masa Berlaku & Pemutusan** — Berlaku sejak akun Mitra Vendor disetujui, dan dapat diakhiri oleh salah satu pihak sesuai ketentuan pemberitahuan `[mis. 30 hari]` sebelumnya, kecuali pemutusan akibat pelanggaran Pasal 3 yang bersifat seketika.

10. **Persetujuan Elektronik** — Persetujuan atas perjanjian ini dilakukan secara elektronik (klik "Saya Setuju") dan memiliki kekuatan hukum yang sah sesuai UU ITE (UU No. 11 Tahun 2008 jo. UU No. 19 Tahun 2016), dicatat dengan timestamp dan versi dokumen di sistem DuaCincin sebagai alat bukti.

### 11.2 Ketentuan Layanan Client (Ringkasan Klausul Relevan)

- Client setuju bahwa seluruh komunikasi dan transaksi dengan Vendor yang ditemukan melalui DuaCincin dilakukan lewat Platform, demi perlindungan Client sendiri (bukti transaksi, mediasi sengketa, jaminan dana via escrow).
- Client tidak diperkenankan secara sengaja mengalihkan transaksi ke luar Platform untuk menghindari biaya layanan; pelanggaran berulang dapat berdampak pada pembatasan akses akun.

---

## 12. Risiko & Asumsi Terbuka

- **Payment gateway:** Midtrans dipilih sebagai default asumsi — perlu dikonfirmasi ulang saat akun merchant benar-benar dibuat (KYC, split settlement/disbursement API mana yang dipakai).
- **Legalitas:** draft §11 wajib direview advokat sebelum go-live nyata (bukan hanya untuk keperluan demo produk).
- **Konten Inspirasi:** proses kurasi manual butuh proses editorial berkelanjutan (bukan sekali build), perlu ditentukan siapa yang bertanggung jawab mengisi kontennya pasca-launch.
- **Komisi & sanksi finansial:** angka persentase masih placeholder, perlu keputusan bisnis final dari pemilik produk.

---

## 13. Roadmap Fase (Ringkas)

Detail tugas, status, dan log perubahan teknis ada di **[engineering.md](./engineering.md)**.

| Fase | Fokus |
|---|---|
| 0 | Setup proyek (Next.js, Go, Supabase, env, CI dasar) |
| 1 | Autentikasi Client & Vendor + OTP + rate limiting |
| 2 | Direktori vendor (anonim→unlock) + profil + chat in-app |
| 3 | Budget Planner |
| 4 | Galeri Inspirasi |
| 5 | Wedding Planner |
| 6 | Booking + Escrow Payment (Midtrans) |
| 7 | Admin/backoffice + penegakan anti-circumvention |
