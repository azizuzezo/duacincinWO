# Uji end-to-end

Satu perintah menjalankan seluruh tumpukan di lingkungan sementara dan memeriksa perjalanan utama produk:

```bash
./e2e/run.sh
```

Yang terjadi, dalam urutan:

1. Postgres 16 sementara di Docker (port `55432`), dibuang di akhir.
2. API Go dibangun dari `server/` dan dijalankan dari folder temporer dengan environment bersih. **`.env` proyek tidak terbaca**, jadi kunci Resend, Supabase, dan Midtrans tidak tersentuh. Migrasi berjalan otomatis, dan pembayaran memakai mode simulasi karena Midtrans tidak dikonfigurasi.
3. Aplikasi web (`web/`) dijalankan di port `3000` (CORS API hanya mengizinkan origin itu).
4. `e2e/api.mjs`: perjalanan API untuk lima peran: registrasi, login, profil, paket harga (validasi, IDOR, batas 12), persetujuan admin, filter direktori, chat dan penandaan kontak, booking dari diajukan sampai selesai dengan pembayaran simulasi, ulasan, komisi, pencairan, dan kanal konsultasi.
5. `e2e/ui.mjs`: pemeriksaan di browser nyata dengan data dari langkah 4, login lewat form untuk client, vendor, admin, dan konsultan. Memeriksa direktori, detail vendor, halaman SEO, dan setiap dashboard, termasuk error konsol.

6. `e2e/contrast.mjs`: audit kontras teks WCAG 2.x di 84 kombinasi halaman dan viewport (desktop 1440 dan mobile 390) untuk pengunjung, client, vendor, dan admin. Lulus bila semua teks memenuhi 4,5:1 (3:1 untuk teks besar).

Skrip harus berjalan berurutan, karena `ui.mjs` dan `contrast.mjs` membaca pengguna dan data yang dibuat `api.mjs`.

### Cara audit kontras mengukur

Warna teks dibaca dari CSS yang sudah dihitung browser (termasuk alpha dan opasitas induk). Latar diambil dari **piksel nyata** di belakang teks, dari screenshot yang dirender dengan semua teks dibuat transparan, jadi foto, lapisan gelap, dan gradien ikut terukur. Rasio yang dipakai adalah persentil ke-5 dari piksel di belakang teks, supaya bagian foto yang terang tidak terhapus oleh rata-rata. Elemen `fixed` dan `sticky` diukur di lintasan terpisah karena menutupi konten pada scroll 0. Teks `sr-only` dan `aria-hidden` dilewati. Blok `dc-reveal` dipaksa ke keadaan akhirnya sebelum diukur.

Batasan: tidak menguji keadaan hover, focus, atau disabled, kontras non-teks (border, ikon, cincin fokus), dan teks di dalam gambar. Kontras `focus` dan komponen interaktif tetap perlu diperiksa manual.

## Kebutuhan

`docker`, `go`, `node` 22 atau lebih baru (memakai `WebSocket` bawaan), `npm`, `curl`, dan Chromium atau Chrome. Port `3000`, `8080`, dan `55432` harus kosong (port API dan Postgres bisa diganti, port web `3000` tidak karena CORS API hanya mengizinkan origin itu). Tidak ada dependensi npm tambahan.

## Opsi (environment variable)

| Variabel | Fungsi |
|---|---|
| `CHROMIUM` | Path ke Chromium atau Chrome bila tidak ditemukan otomatis |
| `E2E_GO_BUILD_FLAGS` | Flag tambahan untuk `go build`, misalnya `-modfile=/tmp/go.mod` bila toolchain lokal lebih tua daripada `server/go.mod` |
| `E2E_REBUILD=1` | Paksa `npm run build` untuk `web/` (default: dibangun hanya bila `web/.next` belum ada) |
| `E2E_API_PORT` | Port API (default `8080`). Bila berbeda dari build terakhir, web dibangun ulang otomatis karena URL API tertanam saat build |
| `E2E_PG_PORT`, `E2E_PG_CONTAINER` | Port dan nama kontainer Postgres sementara |
| `E2E_HOLD=1` | Biarkan stack tetap hidup setelah semua langkah, untuk iterasi manual |
| `E2E_SKIP_CONTRAST=1` | Lewati audit kontras (langkah paling lama, sekitar 3 menit) |
| `E2E_CONTRAST_ROLES`, `E2E_CONTRAST_PAGES` | Batasi audit kontras ke peran (`anonymous,client,vendor,admin`) atau path tertentu, untuk debug |
| `E2E_CONTRAST_REPORT_ONLY=1` | Audit kontras hanya melaporkan, tidak menggagalkan run |
| `SHOTS=/direktori` | Simpan screenshot tiap halaman kunci dari `ui.mjs` |

## Yang tidak tercakup

Midtrans sungguhan, Supabase Storage (upload foto portofolio), pooler Supabase di port 6543, email Resend, dan relay WhatsApp. Ketiganya butuh layanan eksternal dan perlu uji terpisah.

Kalau `ui.mjs` gagal sementara `api.mjs` lulus, periksa dulu apakah `web/.next` sudah dibangun dari kode terbaru (`E2E_REBUILD=1`).
