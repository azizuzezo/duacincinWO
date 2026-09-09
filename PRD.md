# DuaCincin — Product Requirements Document (PRD)

| | |
|---|---|
| **Versi** | 0.4 |
| **Tanggal** | 2026-09-09 |
| **Status** | Seluruh Fase 0–7 (MVP) selesai diimplementasikan — menunggu review pemilik produk sebelum go-live nyata (lihat §12 untuk gap yang masih terbuka: review legal, kredensial Midtrans sungguhan, proteksi bot, dsb.) |
| **Terkait** | [engineering.md](./engineering.md) — roadmap fase & log perubahan teknis |

**Riwayat revisi:**
- v0.4 (2026-09-09) — Fase 7 (final) selesai: persetujuan legal jadi wajib & tercatat saat daftar (§8.6), sanksi akun (suspend/terminate) tersambung ke login, dispute otomatis dari chat ter-flag, komisi bisa dikonfigurasi per vendor, dashboard Admin. Seluruh 8 fase MVP di roadmap §13 kini selesai dibangun & diverifikasi (curl + Playwright browser sungguhan).
- v0.3 (2026-09-09) — Menambahkan checklist UX/konten/SEO (§10.6–§10.9), memperluas persyaratan keamanan (§10.2) dengan item konkret (pemisahan kunci Supabase, RLS vs otorisasi di kode, IDOR, mass assignment, proteksi bot, batas biaya), dan draft Kebijakan Privasi (§11.3).
- v0.2 (2026-09-09) — Menambahkan peran **Wedding Consultant** (staf internal DuaCincin) dan alur pemesanan end-to-end (§8.11), menyelaraskan milestone escrow (§8.5) dengan alur tersebut.
- v0.1 (2026-09-09) — Draft awal.

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
| **Wedding Consultant (internal DuaCincin)** | Staf DuaCincin (bukan Vendor, bukan Admin backoffice) yang menjadi titik kontak utama Client selama proses perencanaan — membantu memilih vendor lewat chat konsultasi, mendampingi lewat sesi meeting bila dibutuhkan, hingga hari-H. Lihat alur lengkap di §8.11. |

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
9. Kebijakan Privasi (§11.3) — wajib sejak MVP karena mengumpulkan data pribadi (email, budget, dokumen legalitas vendor)
10. Dasar SEO & analytics: title/meta per halaman, sitemap, robots.txt, analytics terpasang sejak hari pertama (lihat §10.7–§10.8)

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
- **Otorisasi vs RLS:** backend Go terhubung ke Postgres langsung lewat connection string pooler (bukan lewat Supabase Data API/PostgREST) — artinya **Row Level Security Supabase tidak otomatis berlaku** untuk koneksi ini. Semua pengecekan kepemilikan data & role (mis. Client A tidak boleh baca booking Client B) **wajib ditegakkan di kode backend Go**, bukan diasumsikan sudah aman karena Supabase. Lihat §10.2.
- **Pemisahan kunci Supabase:** `SUPABASE_ANON_KEY` (publishable) hanya boleh dipakai kalau suatu saat ada pemanggilan Supabase Data API langsung dari client; `SUPABASE_SERVICE_ROLE_KEY` (akses penuh, melewati RLS) **tidak boleh pernah** dikirim ke frontend — hanya dipakai backend Go untuk operasi admin (mis. Supabase Storage). Saat ini (Fase 0-1) belum dipakai sama sekali karena akses DB murni lewat `DATABASE_POOLER`.
- **Proteksi bot pada form publik:** Cloudflare Turnstile (atau setara) di form daftar Client/Vendor, lupa password, dan form kontak — token diverifikasi di backend Go sebelum diproses. **Belum diimplementasi di Fase 1**, jadi ini utang teknis yang perlu ditambahkan sebelum go-live (lihat §12).
- **SEO & Analytics:** sitemap.xml & robots.txt digenerate dari Next.js (`app/sitemap.ts`, `app/robots.ts`), didaftarkan ke Google Search Console saat launch. Tool analytics privacy-friendly (mis. Plausible/PostHog — pilihan final menyusul, lihat §12) dipasang sejak hari pertama, didisclose di Kebijakan Privasi (§11.3).

---

## 8. Spesifikasi Fitur

### 8.1 Landing Page
- Tidak menampilkan nama/brand vendor mana pun (termasuk di preview kartu vendor) — hanya kategori, kota, rentang harga, dan cuplikan portofolio yang di-*watermark*/anonimkan.
- CTA utama: "Mulai Rencanakan Pernikahanmu" (daftar sebagai Client) dan CTA sekunder untuk Vendor: "Daftar Jadi Mitra Vendor".
- Menjelaskan secara singkat proposisi nilai: budget planner otomatis, direktori vendor terverifikasi, semua transaksi aman lewat platform.

### 8.2 Autentikasi
- Dua alur terpisah untuk publik: **Login/Daftar Client** dan **Login/Daftar Vendor** (halaman & endpoint berbeda, role tersimpan di tabel `users.role`).
- Role internal (`admin`, `wedding_consultant`) tidak punya halaman daftar publik — akun dibuat manual oleh Admin lewat backoffice (§8.10), login lewat halaman internal terpisah dari Client/Vendor.
- Password: hash Argon2id, input password wajib ada tombol **show/hide** (mata) di semua form (login, daftar, reset password).
- **Lupa password:** request → kirim OTP 6 digit ke email via Resend → OTP berlaku **5 menit** → verifikasi OTP → set password baru.
- **Rate limiting:**
  - Request OTP: maksimal 3x per email per 15 menit, dan maksimal 5x per IP per jam.
  - Percobaan daftar akun baru: maksimal 5x per IP per jam (mencegah spam akun).
  - Percobaan login gagal: lockout sementara (mis. 15 menit) setelah 5x gagal berturut-turut per akun.
- Template email OTP menyertakan logo DuaCincin (`dc.webp`), teks singkat, kode OTP besar & jelas, dan peringatan "berlaku 5 menit, jangan bagikan kode ini".
- Form daftar & lupa password dilindungi Cloudflare Turnstile (§7), diverifikasi di backend — melengkapi rate limiting, bukan pengganti.

### 8.3 Direktori & Profil Vendor
- Vendor mendaftar, memilih kategori (Venue, Catering, Dekorasi, MUA & Attire, Foto & Video, Entertainment, Undangan & Souvenir), upload portofolio & dokumen legalitas untuk verifikasi Admin.
- Vendor **berstatus "pending"** sampai disetujui Admin sebelum tampil di direktori.
- Client yang belum login melihat kartu vendor **anonim** (kategori, kota, rentang harga, rating jika ada, sample foto blur/watermark). Nama vendor, kontak, dan portofolio penuh hanya terbuka setelah Client login dan membuka profil (masih di dalam sistem DuaCincin, kontak pribadi vendor tetap tidak pernah ditampilkan — komunikasi hanya lewat chat in-app §8.4).

### 8.4 Diskusi / Chat In-App
- Chat 1:1 Client↔Vendor di dalam platform, riwayat tersimpan sebagai bukti (relevan untuk sengketa & audit anti-circumvention).
- Sistem otomatis mendeteksi & memfilter percobaan berbagi nomor telepon/email/link eksternal dalam chat (regex/heuristik dasar untuk MVP), memberi peringatan ke user dan mencatat *flag* untuk ditinjau Admin bila berulang.

### 8.5 Booking & Escrow Payment
- Client memilih vendor → mengajukan booking (tanggal, paket/layanan, harga disepakati lewat chat) → Vendor konfirmasi → Client membayar DP lewat Midtrans ke akun penampung DuaCincin.
- Dana ditahan bertahap mengikuti alur pemesanan di §8.11 (DP → pelunasan/full payment), baru di-disburse ke rekening vendor setelah acara selesai dikonfirmasi Client, dikurangi **komisi platform (default 10%, dikonfigurasi per kategori/vendor oleh Admin, bukan hardcode)**.
- Semua transaksi tercatat di tabel `transactions` dengan status yang mengikuti tahapan booking: `pending` → `paid_dp` → `full_paid` → `completed` (setelah acara & disbursement) — dengan cabang `disputed`/`refunded` bila terjadi sengketa.

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
- Mengelola akun internal (`admin`, `wedding_consultant`) — buat/nonaktifkan akun staf, tidak ada pendaftaran publik untuk role ini.

### 8.11 Alur Pemesanan End-to-End (Customer Journey)

Alur utama yang dilalui Client dari awal sampai hari-H, menggabungkan fitur §8.2–§8.6 ke dalam satu rangkaian:

```
Chat dengan Wedding Consultant  ─┐
      atau                       ├─▶ Booking ─▶ DP ─▶ [Meeting dgn Wedding Consultant]* ─▶ Pelunasan (Full Payment) ─▶ Technical Meeting ─▶ Hari-H (Wedding)
Cari Vendor sendiri (§8.3)      ─┘
```
*langkah opsional, hanya bila Client meminta pendampingan.*

1. **Titik masuk (dua opsi, tidak eksklusif):**
   - **Chat dengan Wedding Consultant** — kanal chat terpisah dari chat Client↔Vendor (§8.4): `conversations.type = 'consultation'`, lawan bicara adalah staf `wedding_consultant`, bukan Vendor. Client bisa cerita kebutuhan/budget, lalu Wedding Consultant merekomendasikan vendor dari direktori (bisa mengirim tautan profil vendor langsung ke chat).
   - **Cari Vendor sendiri** — Client browsing direktori (§8.3) tanpa melalui Wedding Consultant.
   - Kedua jalur berakhir di langkah yang sama: Client menghubungi Vendor terpilih lewat chat in-app (§8.4) untuk membahas paket & harga.
2. **Booking** — Client mengajukan booking ke Vendor (tanggal, paket, harga hasil diskusi), Vendor konfirmasi. Status booking: `requested` → `confirmed`.
3. **DP (Down Payment)** — Client bayar DP lewat escrow (§8.5). Status booking → `dp_paid`. Ini adalah milestone pertama yang membuka slot tanggal vendor untuk Client tsb.
4. **Meeting dengan Wedding Consultant (opsional)** — Client bisa menjadwalkan sesi konsultasi lanjutan (video call/telepon) dengan Wedding Consultant di antara DP dan pelunasan, mis. untuk membahas ulang budget atau kebutuhan tambahan. Dijadwalkan lewat kanal `consultation` yang sama di langkah 1 — dicatat sebagai record `meetings` (`type='consultant_meeting'`, `scheduled_at`, `status`), bukan fitur baru yang terpisah.
5. **Pelunasan (Full Payment)** — Client melunasi sisa pembayaran lewat escrow. Status booking → `full_paid`.
6. **Technical Meeting** — Pertemuan (bisa online/offline) antara Client, Vendor, dan opsional Wedding Consultant untuk menyelaraskan detail teknis di lapangan (rundown acara, denah, jadwal kru). Dicatat sebagai `meetings` (`type='technical_meeting'`) dan **wajib ada sebelum status booking bisa berpindah ke tahap acara** — tercermin juga sebagai task otomatis di Wedding Planner (§8.9).
7. **Wedding (Hari-H)** — Acara berlangsung. Setelah Client mengonfirmasi acara selesai (atau lewat batas waktu otomatis, mis. H+2 tanpa keberatan), booking → `completed`, escrow men-disburse dana ke Vendor dikurangi komisi (§8.5).

**Catatan implementasi:** langkah 4 & 6 butuh kapasitas manusia riil dari tim Wedding Consultant DuaCincin (bukan fitur yang bisa "selesai" hanya lewat kode) — MVP cukup menyediakan penjadwalan meeting & pencatatan status, bukan integrasi video-call penuh (link Zoom/Meet cukup ditempel manual oleh Wedding Consultant untuk MVP).

---

## 9. Model Data (High-Level)

Entitas inti (detail skema di implementasi, bukan final di sini):

`users` (role: `client`/`vendor`/`admin`/`wedding_consultant`) · `vendor_profiles` · `vendor_categories` · `vendor_agreements` (versi & timestamp persetujuan) · `client_agreements` · `otp_codes` · `password_resets` · `conversations` (type: `vendor_chat`/`consultation`) / `messages` · `bookings` (status: `requested`→`confirmed`→`dp_paid`→`full_paid`→`completed`) · `meetings` (type: `consultant_meeting`/`technical_meeting`, `scheduled_at`, `status`) · `transactions` · `disputes` · `inspiration_items` · `budget_plans` / `budget_categories` · `wedding_planner_tasks` · `rate_limit_events`.

---

## 10. Non-Functional Requirements

### 10.1 Performa
- Core Web Vitals baik (LCP < 2.5s), Lighthouse Performance ≥ 90 di landing page — interaktivitas (hover/animasi) tidak boleh bikin lemot.

### 10.2 Keamanan

Prinsip yang sudah ditegakkan sejak Fase 1 (lihat engineering.md) dan **wajib tetap dipertahankan** di setiap fase berikutnya:

- **Secrets tidak pernah ke frontend.** Semua kunci (connection string Supabase, `JWT_SECRET`, `OTP_HMAC_SECRET`, Resend API key, Midtrans key, `SUPABASE_SERVICE_ROLE_KEY`) hanya hidup di backend Go via env var — hanya `NEXT_PUBLIC_API_URL` yang boleh ke frontend. Setiap kali ada perubahan besar di frontend, cek hasil build (`next build` output) untuk memastikan tidak ada secret ikut ter-bundle.
- **Riwayat git dijaga bersih dari secret.** `.env` selalu di `.gitignore` (sudah diverifikasi tiap commit Fase 0 & 1). Kalau suatu saat sebuah secret sempat ter-commit, langkahnya adalah **rotasi/cabut kunci itu dulu**, baru bersihkan riwayat — bukan cukup menghapus baris dari file terbaru.
- **Pemisahan kunci Supabase** (detail di §7): `anon`/publishable key ≠ `service_role` key. Service role tidak boleh menyentuh frontend sama sekali.
- **RLS bukan lapisan proteksi utama** (lihat §7) — karena backend connect langsung ke Postgres, otorisasi **ditegakkan di kode Go**: setiap query yang mengembalikan data milik user harus difilter berdasarkan kepemilikan (`user_id` dari JWT sesi, bukan dari body/query request), bukan berasumsi field `role`/`user_id` yang dikirim client itu benar.
- **Cegah IDOR (Insecure Direct Object Reference).** Untuk setiap fitur baru yang mengembalikan data per-record (booking, percakapan, budget plan, dokumen vendor), wajib diuji dengan dua akun: akun A tidak boleh bisa mengakses record milik akun B walau ID-nya ditebak/diganti di request.
- **Cegah mass assignment.** Setiap endpoint hanya menerima field yang eksplisit didefinisikan di request DTO (pola yang sudah dipakai di `internal/auth` dengan `DisallowUnknownFields`) — field sensitif (`role`, status pembayaran, saldo) tidak pernah diterima langsung dari body request pengguna, hanya diubah lewat proses server yang berwenang (mis. webhook Midtrans, approval Admin).
- **Password & OTP:** hash Argon2id untuk password (bukan enkripsi reversibel), OTP di-HMAC sebelum disimpan (bukan plaintext) — sudah diimplementasikan di Fase 1.
- **Sesi web:** cookie sesi `HttpOnly` + `Secure` (saat production) + `SameSite=Lax` — sudah diimplementasikan & diverifikasi di browser sungguhan (Fase 1). Karena `SameSite=Lax` memberi proteksi CSRF parsial saja, evaluasi ulang kebutuhan token CSRF eksplisit begitu ada aksi state-changing yang sensitif (mis. konfirmasi pembayaran) di Fase 6.
- **Rate limiting** di server (bukan hanya di browser) untuk login, request OTP, registrasi — sudah diimplementasikan berbasis tabel `rate_limit_events` sehingga tetap berlaku walau backend di-restart atau dijalankan lebih dari satu instance. Terapkan pola yang sama untuk endpoint baru yang mengirim email atau memanggil layanan berbayar (Midtrans) di fase mendatang.
- **Proteksi bot** (Turnstile) pada form publik — lihat §7 & §8.2, **belum diimplementasikan**, jadi masuk daftar utang teknis di §12.
- **Validasi input di server**, bukan cuma di UI — berlaku untuk semua endpoint baru (jumlah tamu di Budget Planner, tanggal booking, dsb.), bukan cuma percaya validasi HTML/JS di frontend.
- **Cegah XSS.** React/Next.js meng-escape output secara default — hindari `dangerouslySetInnerHTML` untuk konten dari user (pesan chat, deskripsi vendor, caption Inspirasi); kalau suatu saat butuh rich text, gunakan library sanitasi HTML yang terawat (mis. DOMPurify), jangan render HTML mentah dari input pengguna.
- **Query database selalu parameterized** ($1, $2, ... via pgx) — sudah konsisten di Fase 1, tidak pernah menyusun query dengan concatenation string dari input user; untuk sorting/filter dinamis, whitelist nama kolom yang diizinkan, jangan pakai nama kolom langsung dari input.
- **Upload file** (portofolio vendor, dokumen legalitas, Fase 2+): batasi ukuran & tipe, validasi isi file (bukan cuma ekstensi), simpan dengan nama file yang di-generate server (bukan nama asli), cek izin akses saat file diunduh (dokumen legalitas vendor bersifat privat, portofolio publik).
- **Batas biaya & alert.** Sebelum go-live, pasang billing alert di Supabase, Resend, Midtrans, dan hosting; pastikan mana yang benar-benar menghentikan pemakaian saat limit tercapai vs cuma mengirim notifikasi, karena rate limiting di aplikasi tidak otomatis mencegah lonjakan biaya di layanan pihak ketiga.

### 10.3 Aksesibilitas
- Kontras warna cukup, terutama teks di atas warna gold/navy (WCAG AA minimum) — teks abu-abu muda di atas putih dihindari meski terlihat minimalis, karena melelahkan dibaca.

### 10.4 Skalabilitas
- Backend Go stateless (session via JWT), DB pooling lewat Supabase pooler agar tahan banyak koneksi concurrent.

### 10.5 Auditability
- Semua persetujuan perjanjian & transaksi harus punya jejak (timestamp, versi dokumen) untuk kebutuhan pembuktian sengketa hukum.

### 10.6 UX & Kejelasan Halaman
- **Mobile-first, bukan cuma "responsive di laptop".** Setiap halaman wajib dicek nyata di lebar layar HP (≈375px) — menu tidak boleh tertutup, tombol tidak boleh terlalu kecil untuk disentuh, teks tidak boleh meluber/terpotong.
- **Satu halaman, satu tujuan utama.** Pengguna yang membuka sebuah halaman harus langsung tahu harus ngapain (daftar, cari vendor, isi budget, hubungi dukungan) — jangan biarkan mereka menebak langkah berikutnya.
- **Tombol aksi spesifik, bukan generik.** Hindari label seperti "Mulai" atau "Pelajari Lebih Lanjut" tanpa konteks — pakai label yang bilang apa yang akan didapat setelah klik (mis. "Daftar sebagai Client", "Cari Vendor Dekorasi", "Chat dengan Wedding Consultant"). **Catatan khusus DuaCincin:** karena model bisnisnya sengaja menyembunyikan kontak langsung vendor (§1), CTA seperti "Chat WhatsApp" **tidak relevan/bertentangan** dengan produk ini — ganti dengan CTA yang mengarahkan ke chat in-app (§8.4) atau Wedding Consultant (§8.11).
- **Kontak dukungan DuaCincin (bukan kontak vendor) mudah ditemukan.** Beda dengan kontak vendor yang memang disembunyikan, cara menghubungi *dukungan DuaCincin sendiri* (email/form bantuan resmi perusahaan) harus mudah ditemukan di header/footer — untuk pertanyaan akun, sengketa, atau kendala teknis.
- **Menu & link diuji satu per satu** sebelum tiap rilis — tidak ada link menu yang salah arah atau menuju halaman kosong.
- **Halaman 404 yang membantu:** bukan cuma teks "Halaman Tidak Ditemukan", tapi ada tombol kembali ke beranda dan/atau pencarian, tetap dengan branding DuaCincin.
- **Form seminimal mungkin & jelas:** hanya minta data yang benar-benar perlu, label jelas mana yang wajib, pesan error spesifik (bukan cuma border merah) — pola ini sudah mulai diterapkan di form auth Fase 1, lanjutkan ke form Budget Planner & pendaftaran vendor.
- **Konfirmasi jelas setelah form terkirim:** sebutkan status berikutnya dan estimasi waktu (mis. setelah daftar vendor: "dokumen sedang direview, biasanya 1-3 hari kerja" — bukan cuma "berhasil").

### 10.7 SEO & Discoverability
- **Title unik per halaman**, format "Nama Halaman | DuaCincin" (mis. "Cari Vendor Dekorasi Jakarta | DuaCincin"), bukan cuma nama brand berulang di semua tab.
- **Meta description per halaman**, ringkas & manusiawi, bukan tumpukan keyword.
- **Gambar share (Open Graph)** untuk halaman-halaman penting (landing, direktori kategori, artikel/inspirasi) supaya link yang dibagikan ke WhatsApp/media sosial punya preview yang layak diklik.
- **Alt text deskriptif** untuk gambar penting (portofolio vendor, Galeri Inspirasi) — jelaskan isi/fungsi gambar, bukan nama file seperti `IMG_0012.jpg`.
- **`robots.txt` & aturan `noindex` dicek sebelum tiap launch** — pastikan tidak sengaja memblokir halaman publik penting dari Google.
- **Sitemap** (`app/sitemap.ts` di Next.js) didaftarkan ke Google Search Console saat launch.

### 10.8 Analytics & Kebijakan Privasi
- **Analytics terpasang sejak hari pertama** (bukan ditambah belakangan) supaya ada data nyata soal asal trafik, halaman drop-off, dan CTA yang benar-benar diklik — tool final belum dipilih (lihat §12).
- **Kebijakan Privasi** wajib ada sejak MVP karena mengumpulkan data pribadi (email, nomor kontak, detail budget/acara, dokumen legalitas vendor) — draft ada di §11.3, mencakup juga penggunaan analytics ini.

### 10.9 Konten: Bukti Nyata, Bukan Klaim Kosong
- Hindari klaim generik yang tidak bisa diverifikasi ("terpercaya", "terbaik", "berpengalaman") di landing page/copy marketing. Sesuai §8.7, foto portofolio wajib nyata (bukan AI/stok luar negeri); status "vendor terverifikasi" berasal dari proses approval Admin yang sungguhan (§8.3), bukan sekadar label. Testimoni/rating publik menyusul di luar MVP (§5) — sebelum itu tersedia, jangan tampilkan klaim rating/ulasan yang tidak bisa dibuktikan.

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

### 11.3 Draft Kebijakan Privasi (Ringkasan)

> ⚠️ Sama seperti §11.1/§11.2: ini **draft awal**, bukan nasihat hukum, wajib direview advokat (khususnya untuk kepatuhan **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi/UU PDP**) sebelum go-live.

1. **Data yang dikumpulkan** — akun (email, nama, password ter-hash), data acara (tanggal, budget, jumlah tamu), riwayat chat & booking, dokumen legalitas Vendor, data teknis (IP, log rate-limit, analytics).
2. **Tujuan penggunaan** — menyediakan layanan inti (matching vendor, budget planner, booking/escrow), verifikasi & keamanan (rate limiting, deteksi pelanggaran §8.6), komunikasi terkait akun (email OTP), serta analitik produk (§10.8).
3. **Pembagian data ke pihak ketiga** — hanya ke pemroses yang menjalankan layanan inti: Supabase (database & storage), Resend (email), Midtrans (pembayaran), penyedia analytics (§10.8) — tidak dijual/dibagikan untuk tujuan lain.
4. **Hak pengguna** — akses, koreksi, dan penghapusan data pribadi sesuai UU PDP, lewat kontak dukungan DuaCincin (§10.6).
5. **Keamanan data** — mengacu ke §10.2 (hashing password, secrets di server, kontrol akses per-user).
6. **Retensi** — data akun & transaksi disimpan selama akun aktif dan selama diperlukan untuk kepatuhan hukum/pembuktian sengketa (§10.5); permintaan penghapusan akun mengikuti ketentuan retensi ini.
7. **Kontak** — `[email dukungan/DPO DuaCincin]` untuk pertanyaan privasi.

---

## 12. Risiko & Asumsi Terbuka

- **Payment gateway:** Midtrans dipilih sebagai default asumsi — perlu dikonfirmasi ulang saat akun merchant benar-benar dibuat (KYC, split settlement/disbursement API mana yang dipakai). **Integrasi Snap API & verifikasi signature webhook sudah dibangun dan diverifikasi logikanya secara manual (Fase 6), tapi belum pernah dicoba melawan sandbox Midtrans sungguhan** — wajib diuji ulang begitu ada kredensial sandbox nyata, sebelum go-live.
- **DP masih konstanta MVP, komisi sudah bisa dikonfigurasi per vendor:** DP tetap 30% hardcode (§8.5/§8.11, tidak ada mekanisme override) — kalau bisnisnya perlu DP berbeda per kategori/vendor, perlu ditambahkan. Komisi sekarang **sudah** bisa di-override per vendor lewat Admin/Backoffice (Fase 7), fallback ke default 10% kalau tidak diisi.
- **Pencairan dana ke vendor manual:** Admin menandai "sudah dicairkan" secara manual di dashboard (Fase 6), tidak ada transfer bank otomatis — kalau nanti mau otomatis, perlu integrasi terpisah (mis. Midtrans Iris/Payout) dengan approval tambahan dari Midtrans.
- **Legalitas:** draft §11 wajib direview advokat sebelum go-live nyata (bukan hanya untuk keperluan demo produk). **Persetujuan elektronik (accept_terms) sudah diwajibkan & dicatat dengan versi+timestamp sejak Fase 7** — tapi teksnya sendiri tetap draft, belum disahkan.
- **Konten Inspirasi:** proses kurasi manual butuh proses editorial berkelanjutan (bukan sekali build), perlu ditentukan siapa yang bertanggung jawab mengisi kontennya pasca-launch.
- **Sanksi finansial (denda) belum diimplementasikan:** §11.1 Pasal 4 menyebut penalti finansial sebagai salah satu sanksi — yang sudah dibangun di Fase 7 baru 3 aksi (peringatan/suspend 30 hari/terminate akun), **bukan** pemotongan dana otomatis. Kalau mau ada denda finansial sungguhan, perlu fitur tambahan untuk menagih/memotongnya.
- **Kapasitas tim Wedding Consultant:** alur §8.11 mengasumsikan ada tim manusia yang menjalankan peran ini sejak MVP — perlu dipastikan ketersediaannya (jumlah staf, jam operasional/SLA respons chat) sebelum go-live, karena ini bukan sesuatu yang bisa "dikerjakan lewat kode".
- **Utang teknis Fase 1:** proteksi bot (Cloudflare Turnstile, §7/§8.2/§10.2) belum diimplementasikan di form daftar/lupa password yang sudah dibangun — perlu ditambahkan sebelum go-live, mengandalkan rate limiting saja untuk sementara.
- **Tool analytics belum final:** §10.8 mensyaratkan analytics sejak hari pertama tapi tool-nya (Plausible/PostHog/GA4/lainnya) belum dipilih — pilihan ini juga menentukan isi §11.3 (data apa yang dibagi ke pihak ketiga).
- **Kebijakan Privasi & UU PDP:** draft §11.3 masih kerangka, belum diisi detail final (nama badan hukum, kontak DPO) dan belum direview hukum — sama urgensinya dengan §11.1/§11.2 sebelum go-live nyata.

---

## 13. Roadmap Fase (Ringkas)

Detail tugas, status, dan log perubahan teknis ada di **[engineering.md](./engineering.md)**.

| Fase | Fokus |
|---|---|
| 0 | Setup proyek (Next.js, Go, Supabase, env, CI dasar) |
| 1 | Autentikasi Client & Vendor + OTP + rate limiting (termasuk login internal Admin/Wedding Consultant) |
| 2 | Direktori vendor (anonim→unlock) + profil + chat in-app (vendor_chat & consultation) — termasuk slice tipis approve/reject vendor yang ditarik maju dari Fase 7 |
| 3 | Budget Planner |
| 4 | Galeri Inspirasi |
| 5 | Wedding Planner (termasuk task otomatis dari Technical Meeting, §8.11) |
| 6 | Booking + Escrow Payment (Midtrans) + penjadwalan Meeting (consultant & technical) |
| 7 | Admin/backoffice (moderasi Inspirasi, dispute queue, config komisi, dashboard) + penegakan anti-circumvention |

*Alur end-to-end lengkap (chat konsultasi → booking → DP → meeting → pelunasan → technical meeting → hari-H) ada di §8.11 — dibangun bertahap lintas Fase 1, 2, 5, dan 6 di atas, bukan satu fase tersendiri.*
