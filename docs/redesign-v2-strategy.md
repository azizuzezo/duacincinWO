# DuaCincin v2: Strategi Redesign dari Nol

Status: DISETUJUI (keputusan §8 terjawab 10 Okt 2026). Fase A berjalan.
Dasar: PRD.md, riset REA atas IndoWedding, Weddingku, WeddingMarket, Zola, The Knot, Antler (file mentah di folder scratchpad sesi, ringkasan di bawah).

## 1. Posisi: celah yang terbukti ada

Temuan riset, bukan asumsi:

| Pesaing | Model | Celah yang terlihat |
|---|---|---|
| IndoWedding | Direktori lead-gen | Tidak ada booking atau pembayaran. Klaim "Secure Booking" tanpa produk di baliknya. Alat planner dan sebagian besar link footer 404. Kartu vendor hampir identik, tanpa harga. |
| Weddingku | Direktori + portal editorial, monetisasi langganan vendor (Gold Rp13,3 jt/th, Diamond Rp27,75 jt/th) | Tanpa pembayaran. Peringkat berbayar tidak diberi label. Chat dan inquiry wajib login. Kartu tanpa harga. |
| WeddingMarket | Direktori + Store (beli paket) | Ada checkout, tapi tanpa escrow atau perlindungan pembayaran. Ulasan kosong. Kontak disamarkan sampai login. Dua katalog terpisah. |
| Zola, The Knot | Marketplace AS | Hanya "minta penawaran", tanpa pembayaran dalam platform. Zola unggul di onboarding tanpa wajib akun dan kartu yang padat info. |

Posisi DuaCincin: satu-satunya yang membawa klien dari pencarian sampai hari-H di satu tempat, dengan dana ditahan escrow dan konsultan manusia. Semua keputusan desain di bawah melayani klaim itu, dan klaim itu harus benar-benar terlihat di produk (bukan hanya di copy).

## 2. Prinsip

1. **Alur dulu, halaman kemudian.** Struktur mengikuti perjalanan PRD §8.11, bukan daftar fitur.
2. **Nilai sebelum akun.** Klien melihat harga, foto, dan alur sebelum diminta mendaftar. Akun diminta saat niat muncul (chat, booking).
3. **Setiap angka dan klaim nyata** (PRD §10.9). Kosong lebih baik daripada palsu.
4. **Escrow terlihat di mana uang disebut.** Kartu, detail, booking, dan dashboard selalu menunjukkan posisi dana.
5. **Mobile-first.** Mayoritas klien Indonesia membuka dari HP: bottom tab bar, bar aksi menempel, target 44px.
6. **Tidak ada jalan buntu.** Tidak ada link mati, profil kosong di hasil pencarian, atau popup saat load.

## 3. Peta situs baru

### Publik (tanpa login)
```
/                         Beranda: pencarian + wizard + alur escrow + kategori
/mulai                    Wizard 4 langkah tanpa akun (tahap, tanggal, kota, budget) -> rencana awal
/vendor                   Direktori: filter kota + kategori + budget, sort, hitungan hasil
/vendor/[kategori]        Halaman SEO per kategori
/vendor/[kategori]/[kota] Halaman SEO per kategori x kota
/vendor/[slug]            Detail vendor (lihat §5)
/inspirasi                Galeri (+ filter adat, kategori)
/cara-kerja               Alur 7 langkah dengan posisi dana
/untuk-vendor             Halaman rekrut vendor (komisi, alur pencairan, daftar 4 field)
/bantuan                  Pusat bantuan + kontak dukungan resmi
/legal/*                  Ketentuan, perjanjian, privasi
404                       Halaman 404 membantu (PRD §10.6)
```
Catatan PRD: kartu anonim sebelum login (§8.1, §8.3) tetap dipakai: nama dan kontak vendor tertutup, tetapi harga, kota, foto ber-watermark, dan jenis paket terbuka. Ini perlu keputusan kamu (lihat §8).

### Client (login)
```
/client                  Beranda perjalanan: "langkah berikutnya" satu tindakan utama
/client/rencana          Wedding Planner terpadu (checklist, rundown, tamu, denah) sebagai tab
/client/anggaran         Budget (terhubung ke booking: terpakai otomatis)
/client/booking[/id]     Daftar + detail dengan stepper escrow
/client/pesan            Pesan vendor + konsultan dalam satu inbox
/client/akun
```

### Vendor (login)
```
/vendor                  Hari ini: permintaan baru, booking menunggu, pencairan berikutnya
/vendor/booking[/id]
/vendor/pesan
/vendor/etalase          Profil + portofolio + paket harga (menyatu, dengan pratinjau publik)
/vendor/pencairan
```

### Internal
Admin dan konsultan tetap dua ruang terpisah. Pengelompokan nav admin: Verifikasi (vendor pending, ganti nama), Uang (pencairan, sengketa), Konten (inspirasi), Sistem (audit). Konsultan: inbox + meeting.

## 4. Alur utama (tulang punggung)

```
Beranda ──▶ Wizard /mulai ──▶ Rencana awal + vendor sesuai ──▶ Buka detail vendor
   │                                                              │
   └──▶ Chat Konsultan (bubble) ──────────────────────────────────┤
                                                                  ▼
                       Daftar/Masuk (baru di sini) ──▶ Chat vendor ──▶ Ajukan booking
                                                                  ▼
                 DP (escrow) ─▶ [Meeting konsultan] ─▶ Pelunasan ─▶ Technical meeting ─▶ Hari-H ─▶ Konfirmasi ─▶ Dana ke vendor ─▶ Ulasan terverifikasi
```
Di dashboard klien, kartu "Langkah berikutnya" selalu menampilkan satu tindakan dan status dana ("Rp X ditahan, diteruskan ke vendor setelah acara selesai"). Ini menjawab PRD §10.6 "satu halaman, satu tujuan".

## 5. Halaman kunci

**Beranda.** Hero tipografi editorial + pencarian kota/kategori/budget (satu bar). Di bawahnya: kartu alur escrow dengan posisi dana, kategori sebagai indeks foto, satu blok bukti nyata hanya jika data ada (jumlah vendor terverifikasi dari API), blok Wedding Consultant, rekrut vendor. Tanpa testimoni atau logo palsu.

**Direktori.** Kartu horizontal di desktop, vertikal di mobile. Isi kartu (dipelajari dari Zola dan Weddingku): foto, kategori, kota, harga "mulai dari", jenis paket, chip "Dana aman lewat escrow", kecepatan respons (jika data ada). Filter kota + kategori + budget + sort (rating, harga, terbaru), hitungan hasil, peta opsional di fase lanjut. Tidak ada overlay sponsor. Jika ada peringkat berbayar kelak: wajib berlabel "Pilihan".

**Detail vendor.** Galeri besar, tab dengan hitungan (Portofolio 45, Paket 6, Ulasan), harga per paket, kartu menempel di kanan (desktop) atau bar bawah menempel (mobile): pilih tanggal, "Chat dengan vendor", "Ajukan booking". Ulasan hanya dari booking escrow yang selesai (label "Terverifikasi"). Profil kosong tidak muncul di hasil pencarian.

**Booking.** Stepper 7 langkah sesuai PRD, tiap langkah menampilkan siapa melakukan apa dan di mana uang berada.

**Vendor etalase.** Editor profil + pratinjau langsung dari halaman publik, supaya vendor tahu persis apa yang dilihat klien.

## 6. Sistem desain v2 (perubahan dari DESIGN.md yang sudah ada)

Tetap: kertas hangat, ink, clay, Instrument Serif + Hanken Grotesk, hairline, tanpa glow/gradient. Ditambah:
- **Skala spasi 4/8** tegas, ritme section 96/64/40.
- **Satu pola kartu vendor** yang dipakai di direktori, hasil wizard, dan rekomendasi konsultan.
- **Komponen status dana** ("Escrow": belum dibayar, ditahan, diteruskan): komponen bersama, dipakai di kartu, booking, dashboard.
- **Bottom tab bar mobile** (klien: Beranda, Cari, Rencana, Pesan, Akun; vendor: Hari ini, Booking, Pesan, Etalase).
- **State kosong, loading, error** sebagai pola baku, bukan per halaman.
- **Mode gelap:** tidak dikirim (merek terang, R-21): keputusan eksplisit.

## 7. Rencana fase

| Fase | Isi | Butuh backend baru? |
|---|---|---|
| A | Fondasi v2: komponen status dana, kartu vendor, bottom tab, 404, sitemap/robots/metadata | Tidak |
| B | Publik: beranda, direktori + halaman SEO, detail vendor, cara kerja, untuk vendor, bantuan | Sebagian (harga "mulai dari", paket, jumlah vendor) |
| C | Wizard /mulai tanpa akun + rencana awal | Ya (menyimpan draf rencana, opsional di localStorage dulu) |
| D | Klien: beranda perjalanan, booking + stepper, inbox gabungan | Sedikit |
| E | Vendor: Hari ini, etalase + pratinjau, paket harga | Ya (CRUD paket) |
| F | Admin/konsultan: regrup nav, antrian kerja | Tidak |
| G | Ulasan terverifikasi dari booking selesai | Ya (PRD menunda ini ke pasca-MVP) |

Tiap fase diakhiri build, tes klik per elemen, screenshot desktop dan 375px, dan Delivery Gate antislop.

## 8. Keputusan yang saya butuhkan dari kamu

1. **Kartu vendor anonim sebelum login** (PRD §8.1/§8.3) dipertahankan, atau dilonggarkan (nama dan foto terbuka, kontak tetap tertutup)? Pesaing membuka lebih banyak; PRD memilih menutup untuk mencegah transaksi di luar platform.
2. **Boleh ubah backend Go** (endpoint harga/paket, jumlah vendor publik, ulasan)? Tanpa itu Fase B sampai E terbatas pada data yang sudah ada.
3. **Ulasan terverifikasi** (Fase G) dimajukan dari "pasca-MVP", atau tetap ditunda?
4. **Urutan prioritas fase**: usul A → B → D → E → C → F → G.

## 9. Koreksi setelah membaca kode backend (10 Okt 2026)

PRD tertinggal dari kode. Fakta dari `server/internal/vendors` dan `repository/reviews.go`:
- Nama vendor dan portofolio **sudah publik** (keputusan produk di engineering.md). Pertanyaan anonimitas di §8.1 terjawab oleh kode: dilonggarkan, kontak tetap tertutup. Keputusan kamu cocok dengan itu.
- Ulasan **sudah terikat booking** (`Create(bookingID, clientID, vendorID, ...)`) dan direktori sudah mengembalikan `average_rating` dan `review_count`. Jadi Fase G tidak perlu membangun fitur dari nol, cukup menampilkannya dengan benar.
- Direktori sudah mendukung filter `category`, `city`, dan `max_price` (server). Yang belum ada: `sort`, paket harga (hanya `price_min`/`price_max`), jumlah vendor publik, kecepatan respons.

Jadi backend baru yang benar-benar dibutuhkan: parameter `sort` di `/vendors`, endpoint statistik publik, dan (Fase E) tabel paket vendor.

## 10. Log pelaksanaan
- Fase A (selesai): komponen status dana, kartu vendor bersama, bottom tab bar, 404, sitemap, robots, metadata.
- Fase B (selesai, 10 Okt 2026): beranda sinematik, direktori, detail vendor (bar aksi mobile), inspirasi, auth, /cara-kerja, /untuk-vendor, /bantuan, /kategori/[kategori] dan /kategori/[kategori]/[kota] (server-rendered, metadata unik). Tanpa perubahan backend. Belum: email dukungan resmi (menunggu pemilik produk), halaman kota di sitemap (butuh listing publik).
- Fase D (selesai sebagian, 10 Okt 2026): sidebar gelap + tab bar mobile berisi tujuan utama (flag `tab` di navConfig), band header berfoto (DashboardBanner), kartu "Langkah berikutnya" di dashboard client (diturunkan dari status booking), FundStatus di daftar dan detail booking. Belum: inbox gabungan pesan vendor + konsultan, rapikan halaman client lain satu per satu terhadap data nyata, dashboard vendor dan admin memakai pola yang sama.
- Fase E (selesai, 10 Okt 2026): backend paket harga (migrasi 000020, repository, endpoint publik dan vendor, unit test validasi); dashboard vendor "Hari ini" dengan langkah berikutnya; etalase = tab Profil / Portofolio / Paket harga + tautan ke tampilan publik; paket tampil di detail vendor dan bisa mengisi form booking. Belum diuji terhadap database sungguhan (hanya go build/vet/test dan mock API). Belum: pratinjau langsung di dalam editor (diganti tautan tab baru).
- Fase F (selesai, 10 Okt 2026): nav admin berkelompok (Verifikasi, Uang dan sengketa, Layanan, Sistem) dengan badge antrian di sidebar dan tab bar; dashboard admin menjadi "Antrian kerja" berurutan menurut urgensi; jumlah antrian dihitung dari endpoint list yang sudah ada (useAdminQueues, cache 30 detik), tanpa perubahan backend. Inbox konsultan: avatar inisial. Belum: pesan terakhir dan status belum dibaca di inbox konsultan (API belum menyediakan), badge tidak langsung turun setelah aksi (menunggu cache 30 detik).
- Fase G (selesai, 10 Okt 2026): ulasan sudah terikat booking di backend, jadi pekerjaannya di tampilan: ringkasan rating dan sebaran dihitung dari ulasan nyata, catatan asal ulasan, tanggal (bulan dan tahun), ulasan terlihat di dashboard vendor, input bintang berupa radiogroup dengan navigasi panah, dan notifikasi ulasan baru mengarah ke dashboard vendor. Belum: balasan vendor atas ulasan (butuh backend dan kebijakan moderasi), pelaporan ulasan, paginasi ulasan.
- Uji end-to-end terhadap backend sungguhan (10 Okt 2026): Postgres 16 sementara di Docker + server Go dari binary di folder terisolasi (tanpa membaca .env proyek). Migrasi 1 sampai 20 terpasang bersih. Skrip perjalanan API 68/68 lulus (registrasi 5 peran, CRUD paket termasuk IDOR dan batas 12, visibilitas pending vs approved, filter direktori, chat dan penandaan kontak, booking dari diajukan sampai selesai dengan pembayaran simulasi, DP 30 persen, ulasan, komisi 10 persen, pencairan, konsultasi). Skrip UI 28/28 lulus (login lewat form untuk client, vendor, admin, konsultan; data asli di direktori, detail, halaman SEO, dashboard). Temuan: vendor tanpa portofolio menampilkan kotak kosong besar di halaman publik (diperkecil).
