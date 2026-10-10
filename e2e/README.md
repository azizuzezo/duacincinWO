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

Kedua skrip harus berjalan berurutan, karena `ui.mjs` membaca pengguna dan data yang dibuat `api.mjs`.

## Kebutuhan

`docker`, `go`, `node` 22 atau lebih baru (memakai `WebSocket` bawaan), `npm`, `curl`, dan Chromium atau Chrome. Port `3000`, `8080`, dan `55432` harus kosong. Tidak ada dependensi npm tambahan.

## Opsi (environment variable)

| Variabel | Fungsi |
|---|---|
| `CHROMIUM` | Path ke Chromium atau Chrome bila tidak ditemukan otomatis |
| `E2E_GO_BUILD_FLAGS` | Flag tambahan untuk `go build`, misalnya `-modfile=/tmp/go.mod` bila toolchain lokal lebih tua daripada `server/go.mod` |
| `E2E_REBUILD=1` | Paksa `npm run build` untuk `web/` (default: dibangun hanya bila `web/.next` belum ada) |
| `E2E_PG_PORT`, `E2E_PG_CONTAINER` | Port dan nama kontainer Postgres sementara |
| `SHOTS=/direktori` | Simpan screenshot tiap halaman kunci dari `ui.mjs` |

## Yang tidak tercakup

Midtrans sungguhan, Supabase Storage (upload foto portofolio), pooler Supabase di port 6543, email Resend, dan relay WhatsApp. Ketiganya butuh layanan eksternal dan perlu uji terpisah.

Kalau `ui.mjs` gagal sementara `api.mjs` lulus, periksa dulu apakah `web/.next` sudah dibangun dari kode terbaru (`E2E_REBUILD=1`).
