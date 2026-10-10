# DuaCincin: Design Direction

Design Read: marketplace vendor pernikahan + dashboard operasional untuk calon pengantin Indonesia, vendor, dan tim internal, bergaya editorial luxury terang (majalah pernikahan, bukan template SaaS). Dial ENERGY 2 / RHYTHM 3 / MOTION 2 (publik), ENERGY 1 / RHYTHM 1 / MOTION 1 (dashboard).

Referensi riset (REA, 10 Okt 2026): Antler (tipografi besar ringan + satu frasa italic, tombol persegi, kartu foto-pertama), IndoWedding (pencarian di hero, kategori), Weddingku/WeddingMarket (kepadatan katalog, filter kota). Diambil: ketegasan tipografi, katalog foto-pertama, pencarian sebagai pintu utama. Tidak diambil: popup promosi, warna pink/neon, banner bertumpuk.

## Aturan konten (jawaban pemilik)
- Tanpa angka, testimoni, atau logo palsu. Angka hanya dari API nyata; kalau tidak ada, jangan tampil.
- Foto hanya dari aset repo (`/hero/adat/*`, dan foto portofolio vendor dari API). Tidak membuat avatar atau logo baru.
- Tanpa em dash di teks UI.

## Arah v3 (10 Okt 2026, menggantikan "editorial luxury terang polos")
Keluhan pemilik atas v2: terlalu polos dan kosong, serif kuno, palet krem-cokelat membosankan, foto pasangan di kotak krem terlihat seperti stiker. Arah baru: **foto-pertama, sinematik**. Dial publik ENERGY 3 / RHYTHM 3 / MOTION 2.
- Foto penuh layar sebagai hero dan penutup; ritme bergantian terang, foto, gelap.
- Foto saat ini adalah **stok Pexels sebagai placeholder** (public/stock/README.md). Wajib diganti foto nyata Indonesia/vendor sebelum go-live (PRD §8.7).
- Dilarang: foto pasangan transparan di dalam kotak berwarna.

## Warna
| Token | Nilai | Peran |
|---|---|---|
| dc-ink | #120e0d | teks, blok gelap, tombol utama |
| dc-ivory / dc-cream | #f7f3ec / #ece6da | latar kertas / permukaan sekunder |
| dc-white | #ffffff | kartu di atas kertas |
| dc-clay (garnet) | #8c1d2f | satu-satunya aksen: tombol aksi di atas foto, italic headline, tautan. Terhubung ke warna bunga merah di foto hero |
| dc-gold-antique | #e2bf7e | teks italic aksen di atas foto/gelap saja |
| dc-gold | #b8862f | hanya hairline dan ornamen, tidak pernah teks |
Kontras: garnet/ivory sekitar 9:1, putih di atas foto dijamin scrim bawah (bg-linear-to-t dari ink), emas antik/ink sekitar 11:1.

## Tipografi
- Heading: **Plus Jakarta Sans** 500, tracking -0.03em. Dipilih karena modern, rapat, terbaca di ukuran besar, dan dirancang di Jakarta (cocok untuk merek Indonesia). Menggantikan serif penuh yang terasa kuno.
- Aksen: **Instrument Serif italic** (`.dc-em` garnet di terang, `.dc-em-light` emas di gelap/foto), tepat satu frasa per headline.
- Isi: Hanken Grotesk. Angka dashboard: sans, tabular-nums.

## Bentuk dan permukaan
- Radius: tombol dan input 6px (`rounded-md`), kartu dan foto 8px (`rounded-lg`), modal 12px. Pil hanya untuk Badge status. Tidak ada radius 2xl+.
- Kartu: latar putih, border hairline `border-dc-ink/10`, tanpa shadow. Shadow hanya pada elemen melayang (dropdown, modal, toast).
- Tidak ada glow, blur dekoratif, glassmorphism (kecuali navbar yang mengunci saat scroll: satu-satunya blur). Gradient hanya sebagai scrim keterbacaan di atas foto (bawah foto ke ink), bukan dekorasi.
- Hairline gold 1px sebagai pembatas section dan di bawah judul halaman.
- Motif identitas: dua cincin saling bertaut (garis tipis) sebagai ornamen kecil, tidak berputar.

## Tombol
- Primary: ink solid, teks putih, hover clay. Secondary: border ink/25 transparan. Tertaut teks: clay garis bawah.
- Tinggi minimum 44px. CTA spesifik ("Cari vendor", "Daftar sebagai vendor"), bukan "Get Started".

## Layout
- Publik: lebar maks 1200px, gutter 16/24/40px. Ritme section sengaja berbeda (hero asimetris, strip direktori horizontal, split editorial, blok gelap tunggal, penutup).
- Dashboard: sidebar 256px kertas, konten maks 1152px, kepadatan tinggi, judul halaman serif 32px, tanpa banner gelap besar.

## Gerak
- Publik: reveal sekali saat scroll (opacity + 12px), hero headline per baris. Dashboard: hanya transisi hover/focus 150ms.
- Hormati prefers-reduced-motion di semua kasus.

## State wajib
Setiap daftar/tabel/data: loading (skeleton netral), empty (EmptyState dengan tindakan), error (pesan + coba lagi).
