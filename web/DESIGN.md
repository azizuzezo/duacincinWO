# DuaCincin WO: Design Direction

Satu keluarga merek dengan DuaCincin Undangan (invitation.duacincin.id). Arah ini menggantikan "v3 garnet" (Okt 2026). Sumber token: `src/app/globals.css`. Cara memakai komponen: `src/components/README.md`. Turunan dari `.ai/design-language/DESIGN_LANGUAGE.md` di repo undangan (romantis, editorial, satu aksi utama per halaman, gerak untuk menjelaskan bukan menghias). Filter: skill `antislop` (mode DURING) dan `ui-ux-pro-max` (aksesibilitas, sentuh, gerak, tipografi). Palet merah muda yang disarankan `ui-ux-pro-max` untuk "wedding" ditolak: arah merek pemilik (ivory, tinta, emas) yang berlaku.

Design Read: marketplace vendor pernikahan + dashboard operasional untuk calon pengantin Indonesia, vendor, dan tim internal, dalam bahasa visual "modern & ceria" milik DuaCincin: kertas ivory, tinta hangat, emas, serif display dengan satu frasa script, foto nyata yang di-grade hangat.
Dial publik: ENERGY 3 / RHYTHM 3 / MOTION 3 (hero), MOTION 2 di section lain. Dial dashboard: ENERGY 2 / RHYTHM 1 / MOTION 1.

## Aturan konten (jawaban pemilik, tetap berlaku)
- Tanpa angka, testimoni, atau logo palsu. Angka hanya dari API nyata; kalau tidak ada, jangan tampil.
- Aset nyata saja: `public/scene/*` (lukisan domain publik dan foto berlisensi dari situs undangan), `public/photos/*` (foto pernikahan Indonesia dari Wikimedia Commons: `pasangan/` foto pasangan hero dalam bingkai lengkung, tanpa cutout, `latar/`, `adat/`, `kategori/`, `momen/`), `public/brand/*`, dan foto portofolio vendor dari API. Setiap foto pihak ketiga wajib tercatat di `components/kredit/credits.ts` (tampil di /kredit); kredit lukisan/foto hero tetap tampil di dekat gambar (`components/landing/scenes.ts`). Gapura di hero adalah ornamen SVG (`components/ornament/GoldArch.tsx`). `public/stock/*` tidak dipakai situs lagi.
- Tidak membuat avatar, logo, atau foto orang baru. Avatar = inisial.
- Tanpa em dash di teks UI. Tanpa istilah teknis (server, API, slug, token) di UI.
- Klaim escrow, konsultan, verifikasi vendor harus sama dengan perilaku produk (PRD §8.5, §8.11).
- Setiap daftar/tabel/data punya tiga state: loading (`Skeleton`), kosong (`EmptyState` dengan tindakan), gagal (`ErrorState` dengan "Coba lagi").

## Warna
| Token Tailwind | Nilai | Peran |
|---|---|---|
| `dc-ink` | #15110d | teks judul, blok gelap (satu per layar), tombol utama |
| `dc-ink-2` / `dc-ink-3` | #241d17 / #3a3027 | permukaan dan garis di atas ink |
| `dc-ivory` | #faf6ef | latar halaman (kertas) |
| `dc-cream` | #f3ecdf | section selang-seling, chip, track |
| `dc-paper-3` | #e9dfcc | skeleton, rel |
| `dc-white` | #fffdf9 | permukaan kartu (hangat, bukan putih murni) |
| `dc-gold` | #b8924a | isi, garis, ikon, cincin. **Bukan teks di atas terang** (2,7:1) |
| `dc-gold-antique` | #dcbb76 | emas di atas ink/foto: teks, ikon, aksen (10:1 di ink) |
| `dc-clay` | #7a5c24 | emas tua untuk TEKS di atas terang: tautan aktif, aksen italic (5,3:1 di cream) |
| `dc-black` | #1d1712 | teks isi |
| `dc-text-2` / `dc-text-3` | #4d443b / #6b6157 | isi sekunder (8:1) / meta (5,1:1 di cream) |
| `dc-on-dark` | #f6efe3 | teks di atas ink |
| `dc-line` / `dc-line-strong` | #e6dccb / #d3c4ab | hairline kartu / pembatas daftar |
| `dc-success` / `dc-success-soft` | #2f6a47 / #e6efe6 | status selesai (5,4:1) |
| `dc-warning` / `dc-warning-soft` | #8a4b14 / #fae3cc | giliran pengguna bertindak (5,5:1), beda dari emas = dana ditahan |
| `dc-danger` / `dc-danger-soft` | #a3362a / #f8e6e1 | masalah, batal (5,6:1) |
| `dc-info` / `dc-info-soft` | #3f5869 / #e8edf0 | menunggu pihak lain (6,3:1) |
| `dc-gold-soft` / `dc-gold-wash` | #f3e8d0 / #f6edda | badge emas / nav aktif dan baris fokus |
| `dc-chart-1..7` | #3a2f27 #b0873c #b0604a #5e7f68 #5a6f84 #9a6a7c #9c8b72 | seri grafik (espresso, emas, terakota, sage, slate, mauve, taupe), masing-masing >= 3:1 di kartu |

Dashboard (client, vendor, admin): `Shell` memberi kelas `.dc-app`; selama itu ada di halaman, token kertas dipetakan ulang ke permukaan dashboard (`:root:has(.dc-app)` di globals.css): `dc-canvas` #f5f0e8 latar, `dc-surface` #fffefb kartu, `dc-surface-2` #f4efe6 sisipan/chip/track, `dc-sidebar` #fbf9f5. Sidebar terang dengan garis rambut, item aktif = champagne wash + ikon emas tua; ink hanya untuk tombol utama dan satu blok fokus per layar. Status badge: info (menunggu pihak lain), warning (giliranmu), gold (dana ditahan), success, danger.

Emas adalah satu-satunya aksen. Tidak ada biru, ungu, pink. Gradien hanya dua: scrim keterbacaan di atas foto, dan tombol `gold` (logam).

## Tipografi
- Judul: **Cormorant Garamond** 500/600 (`font-heading`). Serif tinggi kontras yang sama dengan situs undangan; terasa seperti kartu undangan cetak.
- Aksen: italic Cormorant (`.dc-em` emas tua di terang, `.dc-em-light` emas di gelap), tepat satu frasa per judul.
- Script: **Great Vibes** (`.dc-script` / `.dc-script-light`), maksimal satu frasa per layar (hero, auth, penutup), ukuran besar saja.
- Teks dan UI: **Plus Jakarta Sans** (buatan Tokotype, Jakarta), bulat dan ramah, identitas lokal.
- Angka: StatTile memakai serif dengan `lining-nums tabular-nums`; rupiah di kartu memakai sans tebal tabular.
- Label section: `.dc-eyebrow` (motif dua cincin + kalimat biasa). Tanpa huruf kapital ber-tracking lebar.

## Bentuk dan permukaan
- Radius (skala Tailwind diubah): `rounded-md` 12px input, `rounded-lg` 18px, `rounded-xl` 24px kartu, `rounded-2xl` 32px panel/foto besar. Pill (`rounded-full`) hanya untuk tombol aksi, chip, badge status, tab.
- Semua elemen yang bisa diklik memakai kursor tangan (diatur global di `globals.css`) dan memberi umpan balik tekan (skala 0,98 sampai 0,99).
- Elevasi: `shadow-soft` kartu diam, `shadow-lift` kartu di-hover / foto penting, `shadow-float` dropdown, modal, sheet, toast, `shadow-gold` hanya hover tombol gold.
- Glass: hanya navbar publik setelah scroll dan top bar mobile app. Glow: hanya satu cahaya emas lembut di `GlowPanel`/blok konsultan.
- Motif identitas: dua cincin bertaut. Logo `BrandLogo` = logo asli DuaCincin WO (angsa emas dan dua cincin, `/brand/duacincin-logo.webp`, kolaborasi dengan Kaloka): **jangan diubah, digambar ulang, atau diganti logo undangan**; di sebelahnya teks "DuaCincin" (serif), `.dc-eyebrow`, `Rings`, `FeatureIcon`, ornamen cincin besar tipis di ink.
- Grain kertas (`.dc-grain`) hanya di section kertas besar.

## Tombol (`components/ui/Button.tsx`)
- `primary` pill ink, `gold` satu aksi terpenting per layar, `ghost`/`ghostLight` sekunder, `light` utama di atas foto, `quiet` aksi teks di dalam kartu, `danger` konfirmasi hapus.
- Tinggi minimum 44px. CTA spesifik ("Cari vendor", "Daftar sebagai vendor", "Buat akun client"), bukan "Get Started". Panah hanya bila menunjuk navigasi lanjut.

## Layout
- Publik: `.dc-container` maks 1240px, gutter clamp 16 sampai 48px. Ritme section sengaja berbeda: scene, kertas, cream, ink, kertas, putih, cream, kertas, foto. Ink penuh maksimal satu blok per halaman (selain footer).
- App: sidebar terang (`dc-sidebar`) 272px mulai `lg` (1024px), top bar ivory + tab bar bawah 5 item di bawah `lg` (HP dan tablet potret, supaya konten 768px tidak terjepit sidebar), konten maks 1152px (`max-w-6xl`), `PageHeader` di atas setiap halaman.
- Breakpoint: 320 sampai 1920px tanpa scroll horizontal, target sentuh 44px.

## Gerak (`src/lib/motion.ts`)
Setiap gerak punya tujuan:
- Hero: crossfade dunia (adat berganti), ken burns (still film), parallax tiga lapis mouse + scroll (kedalaman). Berhenti saat hover/fokus/di luar layar, ada tombol jeda.
- Satu sistem preset (lihat `src/components/README.md` "Gerak"): reveal, stagger, media, enter, route, panel, dissolve. Kurva `--dc-ease`, 260 sampai 640ms, keluar lebih cepat dari masuk.
- Scroll reveal satu kali untuk blok di bawah lipatan: blur ke tajam (tablet ke atas) + naik 20px, mulai sebelum blok masuk layar sehingga tidak ada layar kosong saat menggulir. Daftar di dalamnya muncul berurutan; blok pembungkus tidak ikut bergerak (tidak ada gerak ganda).
- Maksimal 1 sampai 2 elemen bergerak per layar; tidak ada loop dekoratif (cahaya bokeh dihapus). Animasi keluar 60 sampai 70% durasi masuk. Semua gerak bisa diinterupsi dan tidak memblokir input.
- Sticky storytelling escrow: koin emas berpindah stasiun mengikuti tahap.
- Shared layout: indikator nav aktif, tab, tab bar bawah meluncur antar item.
- Hover depth: kartu naik 4px + shadow-lift. Tombol naik 2px.
- Dashboard: sidebar dan tab bar tetap saat pindah menu (tidak berkedip ke layar kosong); hanya konten halaman yang memudar masuk (`dc-page-enter`), lalu kartu naik berurutan (`animate-fade-up`). Plus transisi hover/fokus.
- `prefers-reduced-motion`: semua di atas mati, perubahan jadi instan (pakai `motionSafe()` / `useReducedMotion`).
