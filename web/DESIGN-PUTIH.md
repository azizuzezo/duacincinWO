# DuaCincin "Putih": sistem desain publik (Nov 2026)

Pengganti arah ivory/tinta/emas (`DESIGN.md`) untuk halaman publik. Dipakai di beranda, halaman auth (`/login`, `/register`, `/forgot-password`), dan semua halaman publik. Logo angsa dan dua cincin (`BrandLogo`) tidak berubah.

Design Read: marketplace vendor pernikahan untuk calon pengantin Indonesia, putih bersih dan lembut, tata letak marketplace (acuan utama Bridestory, juga The Knot, Zola, Hitched). Dial ENERGY 2 / RHYTHM 2 / MOTION 2.

## Token (`src/app/wd.css`, prefix `wd-`)
Layout mengikuti Bridestory; identitas DuaCincin ada di warnanya: **soft gold** (gema logo), bukan pink.

| Token | Nilai | Peran |
|---|---|---|
| `wd-white` | #ffffff | latar halaman |
| `wd-paper` | #fbf9f7 | pita section selang-seling |
| `wd-blush` | #f5f0e8 | sumur gambar, skeleton, hover |
| `wd-ink` | #231f1d | judul, tombol gelap, blok vendor |
| `wd-text` / `wd-muted` | #4b4542 / #756d68 | isi (9,4:1) / meta (5:1 di putih) |
| `wd-line` / `wd-line-2` | #eee8e4 / #ddd4ce | garis |
| `wd-accent` / `wd-accent-deep` | #dcbd80 / #cfa965 | isian emas (tombol utama, chip aktif) dengan teks `wd-ink` (9:1), hover |
| `wd-accent-ink` | #85662b | TEKS emas: tautan, label aktif, aksen italic (5,3:1 di putih) |
| `wd-accent-line` | #d6bc87 | garis emas (chip, outline) |
| `wd-accent-soft` / `wd-accent-wash` | #f5ecd9 / #fbf7ef | badge, panel lembut |
| `wd-champagne` | #f3e7cf | latar footer (teks pakai `wd-text`, 7,7:1) |
| `wd-gold` | #c9a45c | bintang rating saja |

Aturan: emas sebagai isian selalu dengan teks tinta, tidak pernah teks putih. Emas sebagai teks selalu `wd-accent-ink`.

Halaman publik yang masih memakai token lama `dc-*` otomatis dipetakan ke nilai Putih selama header publik (`data-wd-public`) ada di halaman (`:root:has([data-wd-public])` di wd.css), termasuk popover dan modal yang di-portal ke body. Dashboard tidak terpengaruh. Wordmark logo selalu Cormorant (`--font-cormorant`), apa pun font judul halaman.

## Tipografi
- Teks dan UI: **Figtree** (sama dengan Bridestory), variabel.
- Judul section: Figtree 650 (`.wd-title`), gaya marketplace.
- Serif: **Newsreader** (ber-sumbu ukuran optik) untuk judul banner, sapaan auth, dan satu kata aksen italic emas (`<em>` di dalam `.wd-title` / `.wd-display`). Dipilih karena terasa editorial seperti majalah pernikahan dan jarang dipakai desain generik.
- Tanpa huruf kapital ber-tracking lebar. Label kecil (`.wd-kicker`) adalah frasa italic serif.

## Bentuk
Tombol, chip, dan kolom cari berbentuk pill. Input 14px, kartu vendor 14px, banner 20 sampai 24px, panel 28 sampai 32px. Kategori berupa foto bulat.

## Tata letak beranda
Header dua baris (logo, kolom cari, Masuk/Daftar; lalu menu dengan mega menu kategori), carousel banner, H1 "Vendor pernikahan terverifikasi" dengan chip kategori dan baris kartu, kategori bulat, baris vendor per kategori teratas, strip promo DuaCincin Undangan, "Satu akun" (lima fitur), satu baris vendor lagi, inspirasi, panduan, blok vendor (satu-satunya blok gelap), footer champagne.

## Gambar
- Foto vendor dan inspirasi: hanya dari API (asli).
- Kategori dan fitur: foto board Pinterest DuaCincin, foto stok berlisensi, dan tangkapan layar produk asli (`public/showcase`). Tema Digital Invitation: tangkapan layar asli dari invitation.duacincin.id (`public/invitation`).
- **Tidak ada gambar buatan AI** (keputusan pemilik, Nov 2026). Banner, header halaman (`public/banner/*`), dan foto kategori tanpa foto sendiri (`public/photos/kategori-vendor/*`) adalah foto nyata dari Unsplash/Pexels berlisensi bebas pakai, tercatat dengan nama fotografer di `/kredit`.

## Gerak
Carousel banner bergeser tiap 6 detik dan fitur tiap 7 detik. Keduanya berhenti saat di-hover atau difokus, punya tombol jeda, dan mati di `prefers-reduced-motion`. Foto login berganti sekali lalu berhenti. Hover kartu memakai zoom pelan pada foto. Reveal saat scroll memakai `Reveal` yang sudah ada.

## Aturan konten (tetap)
Tanpa angka, testimoni, atau logo palsu. Klaim escrow, verifikasi, dan komisi harus sama dengan perilaku produk. Tanpa em dash. Setiap data dari API punya state memuat, gagal (dengan "Coba lagi"), dan kosong.
