# Sub-proyek 1/5: Fondasi (Design System + Platform Backend)

Status: draft, menunggu review user.
Bagian dari: redesign + upgrade fitur seluruh dashboard (client, vendor, internal/admin).
Urutan: proyek ini duluan karena keempat sub-proyek berikutnya (Client, Vendor, Internal/Admin, Public pages) memakai komponen dan endpoint yang dibangun di sini.

## Ruang lingkup

Yang termasuk di sini:
1. Empat fitur backend yang disetujui: review/rating vendor, halaman payout vendor, audit log admin, chat real-time.
2. Sistem desain bersama di frontend: komponen, motion, aksesibilitas, layout mobile, yang dipakai ulang oleh tiga dashboard.

Yang TIDAK termasuk (didorong ke sub-proyek per area, atau di luar scope proyek ini sama sekali):
- Halaman UI konkret per role (client/vendor/admin) dikerjakan di sub-proyek 2 sampai 4. Di sini hanya komponen generik dan endpoint API-nya.
- Pusat notifikasi tersimpan di database. Yang dibangun di sini adalah sistem toast berbasis event yang sudah ada (perubahan status booking, pesan baru lewat websocket), bukan tabel "notifications" baru dengan riwayat/mark-as-read. Kalau kamu mau versi tersimpan/riwayat, itu perlu dikonfirmasi terpisah karena menambah scope backend lagi.
- Reply dan attachment pada chat. Opsi yang kamu setujui ("Chat real-time, ganti polling") secara eksplisit soal transport real-time + read receipt. Reply/attachment adalah pekerjaan terpisah yang bisa disusulkan sebagai sub-proyek 6 kalau mau.
- Library chart pihak ketiga. Chart (budget donut, analytics bar) dibangun sebagai komponen SVG kustom ringan memakai palette brand, bukan menambah dependency baru.

## Kendala desain yang sudah disepakati

- Warna tetap: `--dc-navy` #831843, `--dc-gold` #f5a623, `--dc-rose` #db2777, `--dc-offwhite` #f6eff1, `--dc-white`/`--dc-black`. Tidak ada token warna baru di level brand.
- Font tetap: Plus Jakarta Sans (heading), Inter (body).
- Tiga preset densitas layout, dipakai konsisten di semua komponen bersama:
  - **Soft-calm** (basis Client): radius besar (2xl), shadow lembut `rgba(131,24,66,0.08)`, padding lega.
  - **Structured-pro** (basis Internal/Admin): radius lebih kecil (lg/xl), sidebar solid, stat tile berjejer dengan border-left aksen warna.
  - **Hybrid** (basis Vendor): shell kartu soft-calm, tapi tabel/stat tile mengambil kepadatan structured-pro.
- Aksen "Bold Glass": gradient navy ke rose, permukaan kaca (blur + border tipis gold transparan), glow gold. Dipakai sempit: banner hero dashboard, empty state, momen perayaan (booking dikonfirmasi, dana cair, checklist selesai). Bukan gaya kartu default di manapun.

## Bagian A: Fitur backend

Konvensi yang diikuti (sudah ada di codebase, tidak diubah): migrasi lewat `golang-migrate` di `server/migrations/NNNNNN_*.up|down.sql`, akses DB pakai `pgx/v5` mentah lewat `pgxpool.Pool` (pola `XxxRepo`), routing `chi` dengan `<feature>.Mount(r, deps, cfg)`, auth lewat `auth.RequireAuth` + `auth.RequireRole(...)` dan `auth.ClaimsFromContext(ctx)`, response lewat `httpx.JSON` / `httpx.Error` / `httpx.DecodeJSON`, DTO terpisah dari struct repository.

### A1. Review & rating vendor

- Migrasi baru: tabel `reviews` (`id`, `booking_id` unique FK ke `bookings`, `client_id`, `vendor_id`, `rating` smallint 1-5, `comment` text nullable, `created_at`). Unique di `booking_id` memastikan satu review per booking.
- `ReviewRepo` baru di `server/internal/repository`: `Create(ctx, review)` (tolak kalau booking belum `completed` atau sudah pernah direview, dicek di query/transaction), `ListForVendor(ctx, vendorID, pagination)`, `GetAggregateForVendor(ctx, vendorID)` (`AVG(rating)`, `COUNT(*)`).
- Endpoint baru:
  - `POST /api/v1/bookings/{id}/review` (role client, hanya booking miliknya sendiri dan berstatus completed).
  - `GET /api/v1/vendors/{id}/reviews` (publik, dipakai directory & profil vendor).
- `VendorProfile`/directory listing DTO ditambah `average_rating` dan `review_count` (dihitung dari `GetAggregateForVendor`, bukan kolom tersimpan, karena volume masih kecil dan menghindari drift data).

### A2. Payout/earnings vendor

- Reuse `DisbursementRepo` yang sudah ada (`server/internal/repository/booking.go`). Tambah method `ListForVendor(ctx, vendorID, pagination)`: join `disbursements` ke `bookings` lewat `booking_id`, filter `bookings.vendor_id = $1`.
- Endpoint baru: `GET /api/v1/vendor/payouts` (role vendor), mengembalikan `gross_amount`, `commission_amount`, `net_amount`, `status`, `created_at`, `disbursed_at` per booking miliknya. Read-only, tidak ada aksi vendor di sini (pencairan tetap sepenuhnya alur admin seperti sekarang).
- Dimount di `server/internal/vendors` (subrouter yang sudah pakai `RequireRole(auth.RoleVendor)`), tidak perlu package baru.

### A3. Audit log admin

- Migrasi baru: tabel `admin_audit_log` (`id`, `actor_id`, `actor_role`, `action` text, `target_type` text, `target_id` text, `metadata` jsonb nullable, `created_at`).
- `AuditLogRepo` baru: `Create(ctx, entry)`, `List(ctx, filter)` (filter opsional: `actor_id`, `target_type`, rentang tanggal; pagination).
- Bukan middleware generik (actor/action/target tidak bisa diketahui middleware tanpa refleksi yang rapuh). Sebagai gantinya, panggilan `auditLog.Create(...)` ditambahkan eksplisit di titik akhir tiap handler mutasi admin yang sudah ada dan berhasil: approve/reject vendor, approve/reject ganti nama vendor, resolve dispute (dengan sanksi apa), ubah komisi, mark disbursed. Pola ini konsisten dengan gaya handler closure yang sudah ada di `admin/handlers.go`, hanya menambah satu baris pemanggilan repo per handler.
- Endpoint baru: `GET /api/v1/admin/audit-log` (role admin), dipakai oleh UI audit log di sub-proyek 4.

### A4. Chat real-time

Scope: mengganti transport polling 4 detik dengan push real-time + read receipt. Tidak termasuk reply/attachment (lihat "Yang tidak termasuk").

- Tambah dependency `github.com/gorilla/websocket` (belum ada satupun library websocket/SSE di `go.mod` saat ini).
- Hub in-memory per proses: `map[conversationID][]*client` dengan mutex, satu goroutine per koneksi untuk read/write pump (pola standar gorilla/websocket). Catatan eksplisit: ini desain single-instance. Kalau server nanti di-scale horizontal, broadcast lintas instance perlu Postgres `LISTEN/NOTIFY` atau Redis pub/sub sebagai proyek terpisah, bukan dikerjakan sekarang.
- Endpoint baru: `GET /api/v1/conversations/{id}/ws` (upgrade websocket, auth tetap lewat cookie sesi yang sama seperti request HTTP biasa karena upgrade request tetap membawa cookie). Setelah upgrade, koneksi menerima event `message.new` broadcast ke semua partisipan conversation yang sedang connect.
- Read receipt: migrasi baru tabel `conversation_reads` (`conversation_id`, `user_id`, `last_read_message_id`, `updated_at`, primary key komposit `conversation_id, user_id`). Endpoint `POST /api/v1/conversations/{id}/read` (dipanggil saat user membuka/scroll ke bawah thread) menulis baris ini dan broadcast event `read.updated` ke partisipan lain lewat hub yang sama.
- Frontend `ChatThread.tsx` tetap punya REST `GET .../messages` untuk load awal/riwayat (tidak dihapus), tapi `setInterval(load, 4000)` diganti: buka koneksi websocket, dengarkan `message.new` untuk append pesan baru dan `read.updated` untuk centang dibaca, kirim `POST .../read` saat thread dibuka dan saat scroll mencapai pesan terbawah.

## Bagian B: Sistem desain frontend

### Komponen baru di `web/src/components/ui`

- **Modal/Dialog**: menggantikan `window.prompt()` di dua tempat (`internal/admin/vendors/page.tsx`, `vendor-name-changes/page.tsx`) dan jadi basis dialog konfirmasi di seluruh app. Focus trap, ESC untuk tutup, fokus kembali ke trigger saat tutup, animasi masuk/keluar lewat framer-motion (scale+fade), dihormati `prefers-reduced-motion`.
- **Toast**: `ToastProvider` + hook `useToast()`, container stacked di pojok layar, auto-dismiss. Dipicu oleh event yang sudah ada: `message.new` dari websocket saat user di halaman lain, perubahan status booking terdeteksi saat refetch, hasil aksi admin (approve/reject berhasil). Tidak ada tabel notifikasi baru di backend (lihat catatan scope di atas).
- **NotificationBell** kecil di `Shell` nav untuk role admin/consultant: badge angka dari count yang sudah tersedia lewat endpoint list yang ada (`/admin/vendors/pending`, `/admin/disputes/open`, dst, dihitung panjang array), bukan dari sistem notifikasi baru.
- **Chart primitives** (`DonutChart`, `BarChart` sederhana): SVG kustom dengan warna dari palette brand, dipakai budget planner (sub-proyek 2) dan analytics vendor/admin (sub-proyek 3 & 4). Tidak menambah library chart.
- **StatTile**, **GlowPanel** (aksen bold-glass untuk banner/empty state/momen perayaan): dibangun di atas `DashboardBanner`/`Card` yang sudah ada, bukan menggantinya dari nol.

### Motion

- `web/src/lib/motion.ts` baru: kumpulan `variants` terpusat (`fadeUp`, `staggerList`, `scaleIn` untuk modal, `slideIn` untuk toast/panel), dipakai ulang lintas komponen. Ini menggantikan pola sekarang di mana tiap file (`Hero.tsx`, dll) mendefinisikan animasi sendiri-sendiri secara inline.
- Semua variant di atas wajib menghormati `useReducedMotion()` (pola ini sudah ada di `Hero.tsx`, sekarang jadi konvensi wajib, bukan opsional per komponen).

### Aksesibilitas (antislop-human)

- Aturan eksplisit: `--dc-gold` (#f5a623) tidak pernah dipakai sebagai warna teks body di atas putih/offwhite (kontrasnya tidak cukup) — hanya untuk background chip, ikon, border, glow. Aturan ini didokumentasikan di komponen, bukan cuma diingat.
- Modal baru wajib focus-trap + kembalikan fokus ke trigger. Nav (`Shell`) dicek ulang untuk urutan tab yang benar setelah komponen baru (bell, badge) ditambahkan.

### Layout mobile (antislop-layoutmobile)

- `Shell.tsx` dicek: kalau sidebar sekarang belum punya pola mobile yang baik, tambahkan bottom tab bar atau drawer slide-over di breakpoint kecil (klien/vendor besar kemungkinan banyak akses dari HP). Detail konkretnya diputuskan sub-proyek 2 & 3 saat implementasi Shell dipakai nyata di tiap dashboard, tapi mekanismenya (drawer vs bottom-nav) dibangun sekali di sini supaya konsisten.

### Copywriting (antislop-copywriting)

- Audit microcopy generik (pesan error/empty-state seperti "Terjadi kesalahan", "Berhasil!") diganti bahasa Indonesia yang lebih spesifik dan hangat, konsisten dengan brand "wedding", bukan nada default aplikasi bisnis.

## Testing

- Backend: setiap endpoint baru dapat test handler bergaya yang sudah ada di package terkait (kalau ada file `_test.go` sebagai referensi pola, diikuti; kalau belum ada pola test di repo, ditambahkan test dasar `httptest` per handler baru plus test migrasi up/down jalan bersih).
- Frontend: tidak ada framework test yang terdeteksi saat ini, jadi verifikasi lewat menjalankan dev server dan mencoba komponen baru langsung di browser (skill `run`) untuk tiap komponen bersama (Modal, Toast, chart, motion) sebelum dipakai sub-proyek berikutnya.

## Urutan implementasi disarankan

1. Migrasi + repo + endpoint A1-A3 (independen satu sama lain, backend saja).
2. Websocket A4 (paling berisiko, disendirikan supaya kalau ada masalah tidak memblokir yang lain).
3. Komponen frontend Bagian B (bisa paralel dengan langkah 1, karena tidak saling bergantung kecuali Toast yang idealnya menunggu event `message.new` dari A4 tersedia untuk diuji end-to-end).
