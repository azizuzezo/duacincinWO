# Komponen DuaCincin WO (panduan cepat untuk page agent)

Arah desain: `web/DESIGN.md`. Token: `src/app/globals.css`. Gerak: `src/lib/motion.ts`.
Pakai yang ada dulu; buat komponen baru hanya bila tidak ada padanannya. Jangan menulis warna hex baru di halaman: pakai token `dc-*`.

## Kerangka halaman
| Kebutuhan | Pakai |
|---|---|
| Halaman app (client, vendor, admin, konsultan). Sidebar muncul mulai `lg`; di bawahnya top bar + tab bar bawah (beri ruang `pb` sudah diatur Shell) | `<WithUser>` + `<Shell user navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">` (`shell/Shell.tsx`, `shell/navConfig.ts`). Isi langsung jadi `<main id="konten">`. Bungkus isi dengan `<div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">`. |
| Judul halaman app | `<PageHeader eyebrow="Booking" title="Booking kamu" subtitle="..." action={<ButtonLink .../>} />` |
| Pembuka dashboard (gelap, opsional foto) | `<DashboardBanner title subtitle eyebrow photo action />` lalu konten dengan `-mt-10` |
| Halaman publik | `<PublicShell>` (Navbar overlay + Footer + `main#konten`) dan `<PageHero eyebrow title subtitle image>` |
| Auth | `<AuthCard variant="client|vendor|internal|unified" title subtitle footer>` |

## Primitif (`ui/`)
- `Button` / `ButtonLink` / `buttonClasses()`: `variant` primary | gold | ghost | ghostLight | light | quiet | danger, `size` sm | md | lg, `block`, `loading`. `Button` default `type="button"`; form submit tulis `type="submit"`. (Legacy `components/Button.tsx` = full width, default submit.)
- `Input`, `Select`, `Textarea` (`ui/Field.tsx`): `label` wajib, `hint`, `error` (diumumkan + aria-describedby), `optional`, `srLabel`. `controlClasses` untuk kontrol custom.
- `Card` `tone="card|paper|ink"`, `interactive` untuk kartu yang bisa diklik.
- `Badge` `tone="neutral|gold|clay|ink|success|danger"`. Status booking: `BOOKING_STATUS_TONE` dari `lib/api`.
- `StatTile label value trend density="structured" accent`. Hanya angka dari API.
- `FundStatus status compact`: tampilkan di MANA PUN ada uang (booking, pembayaran, pencairan).
- `Tabs` + `TabPanel` (keyboard panah, indikator meluncur). Contoh di header file.
- `Modal` (keputusan singkat) dan `Sheet` (filter, form panjang, detail; bawah di mobile, kanan di desktop). Keduanya focus trap + Escape.
- `useToast().show("Tersimpan", "success" | "danger")`.
- State data: `Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonGroup label`; `EmptyState title body actionHref actionLabel | action`; `ErrorState title body onRetry compact`.
- Lainnya: `GlowPanel` (satu blok ink per layar), `FeatureIcon`, `StarInput`, `BarChart`, `DonutChart` (+ legenda teks wajib), `NotificationBell`, `BrandLogo size tone` (logo asli WO, kolaborasi Kaloka: jangan diganti), `Rings`.
- `vendor/VendorCard card horizontal`: satu-satunya kartu vendor.

## Kelas CSS brand
`font-heading` (serif), `.dc-em` / `.dc-em-light` (satu frasa italic emas per judul), `.dc-script` / `.dc-script-light` (maks satu per layar), `.dc-eyebrow` (+ `.is-light` atau di dalam `.dc-on-dark`), `.dc-container`, `.dc-rule`, `.dc-grain`, `.dc-skeleton`, `.dc-kenburns`, `animate-fade-up` (+ `style={{ animationDelay }}` untuk urutan), `.dc-draw` (centang sukses menggambar diri). Scroll reveal: `<Reveal>` dari `landing/Reveal.tsx`; beri `.dc-stagger` pada daftar di dalamnya supaya item muncul berurutan 70ms. `Shell` sudah memberi transisi masuk halaman (`.dc-page-enter`) di setiap navigasi; jangan tambahkan lagi. Toast muncul di atas (bukan di atas footer Sheet atau tab bar).

## Teks
- Teks isi `text-dc-text-2`, meta `text-dc-text-3`, aksen teks emas di terang `text-dc-clay` (bukan `text-dc-gold`). Di ink: `text-dc-on-dark`, `/80` untuk isi, `text-dc-gold-antique` aksen.
- Error `text-dc-danger`, sukses `text-dc-success`.

## Gerak
`import { fadeUp, staggerList, blurReveal, motionSafe, useReducedMotion, EASE, SPRING_SNAPPY } from "@/lib/motion"`. Selalu `variants={motionSafe(reduced, fadeUp)}`. Tulis satu baris komentar tujuan gerak.
Satu sistem gerak (nilai di `MOTION` lib/motion.ts dan token `--dc-dur-*` di globals.css "Motion system"):
- `reveal`: blok di bawah lipatan, pakai `<Reveal>` (blur ke tajam di tablet ke atas + naik 20px, 640ms, mulai sedikit sebelum masuk layar).
- `stagger`: daftar di dalam `<Reveal>` diberi `.dc-stagger` (item muncul berurutan 55ms, maks 6 langkah). Foto di dalamnya otomatis "mengendap" (scale 1.06 ke 1).
- `enter`: elemen di atas lipatan saat halaman dibuka, `.animate-fade-up` (420ms, naik 10px) atau `<FadeIn inView={false}>`.
- `route`: konten halaman dasbor setelah pindah menu, `.dc-page-enter` di Shell (opacity 260ms). Sidebar dan tab bar tetap di tempat karena user disimpan `WithUser`.
- `panel`: isi tab berganti, `<TabPanel>` (280ms), indikator tab meluncur (`layoutId`).
- `dissolve()`: gambar berganti di bingkai yang sama (layar perangkat, latar hero): yang baru muncul di atas yang lama, tidak pernah dua-duanya pudar.
Jangan menambah fade/slide baru di luar preset ini.

## Uji
Harness Playwright bersama: lihat `HARNESS.md` di scratchpad koordinator (`scratchpad/wo/HARNESS.md`). Dev server bersama di port 3100, jangan jalankan yang kedua.
