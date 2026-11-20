"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CityCombobox } from "@/components/ui/CityCombobox";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, apiPut, ApiError, type Conversation, formatRupiah, formatWhatsApp, categoriesLabel, type CurrentUser } from "@/lib/api";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { findRegion, JABODETABEK } from "@/lib/wilayah";
import { Monogram, PAGE, persen, relatif, RowsSkeleton, tanggal } from "../../../_ui";

type PricePair = { vendor: number; website: number };

type AdminVendorDetail = {
  user_id: string;
  business_name: string;
  category: string;
  categories?: string[];
  city: string;
  cities: string[];
  description: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  owner_name: string;
  email: string;
  /** Private contact for verification, digits 628...; empty for profiles saved before it was required. */
  whatsapp_number: string;
  account_status: string;
  joined_at: string;
  profile_updated_at: string;
  commission_rate: number;
  commission_is_custom: boolean;
  price_min: PricePair;
  price_max: PricePair;
  packages: { id: string; name: string; description: string; price: PricePair; updated_at: string }[];
  portfolio: string[];
};

const STATUS: Record<AdminVendorDetail["status"], { label: string; tone: "success" | "warning" | "danger" }> = {
  approved: { label: "Aktif di direktori", tone: "success" },
  pending: { label: "Menunggu review", tone: "warning" },
  rejected: { label: "Ditolak", tone: "danger" },
};

/** A price below this is almost always a missing zero. */
const SUSPICIOUSLY_LOW = 50_000;

type Check = { tone: "danger" | "warning" | "info"; text: string };

/** Mismatches between what the vendor typed and what couples will read. */
function priceChecks(v: AdminVendorDetail): Check[] {
  const out: Check[] = [];
  const priced = v.packages.filter((p) => p.price.vendor > 0);
  const cheapest = priced.length ? Math.min(...priced.map((p) => p.price.vendor)) : 0;
  const dearest = priced.length ? Math.max(...priced.map((p) => p.price.vendor)) : 0;

  if (v.price_min.vendor > 0 && cheapest > 0 && cheapest < v.price_min.vendor)
    out.push({ tone: "danger", text: `Harga mulai dari (${formatRupiah(v.price_min.vendor)}) lebih tinggi dari paket termurah (${formatRupiah(cheapest)}). Kartu direktori menampilkan harga mulai yang tidak sesuai paket.` });
  if (v.price_min.vendor > 0 && cheapest > v.price_min.vendor)
    out.push({ tone: "warning", text: `Paket termurah (${formatRupiah(cheapest)}) di atas harga mulai dari (${formatRupiah(v.price_min.vendor)}). Calon pengantin bisa berharap harga yang tidak ada di paket.` });
  if (v.price_max.vendor > 0 && dearest > v.price_max.vendor)
    out.push({ tone: "warning", text: `Paket termahal (${formatRupiah(dearest)}) melebihi harga tertinggi di profil (${formatRupiah(v.price_max.vendor)}).` });
  for (const p of priced)
    if (p.price.vendor < SUSPICIOUSLY_LOW) out.push({ tone: "danger", text: `Paket "${p.name}" hanya ${formatRupiah(p.price.vendor)}. Periksa, kemungkinan ada angka nol yang kurang.` });
  if (v.price_min.vendor > 0 && v.price_min.vendor < SUSPICIOUSLY_LOW)
    out.push({ tone: "danger", text: `Harga mulai dari hanya ${formatRupiah(v.price_min.vendor)}. Periksa, kemungkinan ada angka nol yang kurang.` });
  if (v.price_min.vendor === 0) out.push({ tone: "info", text: "Harga mulai dari kosong, jadi kartu direktori menulis harga dibahas lewat chat." });
  const unpriced = v.packages.filter((p) => p.price.vendor === 0);
  if (unpriced.length) out.push({ tone: "info", text: `${unpriced.length} paket tanpa harga (dibahas lewat chat): ${unpriced.map((p) => p.name).join(", ")}.` });
  if (v.packages.length === 0) out.push({ tone: "info", text: "Vendor belum menambahkan paket harga." });
  return out;
}

export default function AdminVendorDetailPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <Content user={user} />}
    </WithUser>
  );
}

function Content({ user }: { user: CurrentUser }) {
  const { id } = useParams<{ id: string }>();
  const [vendor, setVendor] = useState<AdminVendorDetail | null>(null);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);
  const router = useRouter();
  const [chatState, setChatState] = useState<{ opening: boolean; error?: string }>({ opening: false });

  // Opens (or creates) this admin's chat with the vendor.
  async function openChat() {
    setChatState({ opening: true });
    try {
      const conv = await apiPost<Conversation>(`/api/v1/conversations/admin-vendor/${id}`, {});
      router.push(`/internal/admin/pesan/${conv.id}`);
    } catch (err) {
      setChatState({ opening: false, error: err instanceof ApiError ? err.message : "Chat belum bisa dibuka. Coba lagi." });
    }
  }

  const load = useCallback(
    (background = false) =>
      apiGet<AdminVendorDetail>(`/api/v1/admin/vendors/${id}`)
        .then((d) => {
          setVendor(d);
          setError(null);
        })
        .catch((err) => {
          if (background) return;
          setError({ notFound: err instanceof ApiError && err.status === 404, message: err instanceof ApiError ? err.message : "Gagal memuat vendor." });
        }),
    [id],
  );

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);
  // Vendors edit prices any time; keep what Admin is checking current.
  useLiveRefresh(() => load(true), 30_000);

  const checks = vendor ? priceChecks(vendor) : [];
  const fee = (p: PricePair) => p.website - p.vendor;

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <Link href="/internal/admin/vendors/approved" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-dc-text-2 hover:text-dc-ink">
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
          Daftar vendor
        </Link>

        {error ? (
          <ErrorState title={error.notFound ? "Vendor tidak ditemukan" : "Detail vendor belum bisa dimuat"} onRetry={error.notFound ? undefined : () => load()} />
        ) : !vendor ? (
          <RowsSkeleton rows={4} label="Memuat detail vendor" />
        ) : (
          <>
            <div className="flex items-start gap-4">
              <Monogram name={vendor.business_name} size="lg" />
              <div className="min-w-0 flex-1">
                <PageHeader
                  eyebrow={`${categoriesLabel(vendor)} · ${vendor.cities.length ? vendor.cities.join(", ") : vendor.city || "Kota belum diisi"}`}
                  title={vendor.business_name}
                  subtitle={`${vendor.owner_name || "Pemilik"} · ${vendor.email} · bergabung ${tanggal(vendor.joined_at)}`}
                />
              </div>
            </div>
            <div className="-mt-2 mb-8 flex flex-wrap items-center gap-2">
              <Badge tone={STATUS[vendor.status].tone}>{STATUS[vendor.status].label}</Badge>
              {vendor.account_status !== "active" && <Badge tone="danger">Akun {vendor.account_status === "suspended" ? "ditangguhkan" : "diputus"}</Badge>}
              <Badge tone={vendor.commission_is_custom ? "gold" : "neutral"}>
                Komisi {persen(vendor.commission_rate)} {vendor.commission_is_custom ? "(khusus)" : "(bawaan)"}
              </Badge>
              {vendor.whatsapp_number ? (
                <a
                  href={`https://wa.me/${vendor.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink"
                >
                  WhatsApp {formatWhatsApp(vendor.whatsapp_number)}
                </a>
              ) : (
                <Badge tone="gold">WhatsApp belum diisi</Badge>
              )}
              <span className="text-sm text-dc-text-3">Profil diubah {relatif(vendor.profile_updated_at)}</span>
              <Button size="sm" variant="ghost" className="ml-auto" loading={chatState.opening} onClick={openChat}>
                Chat vendor
              </Button>
              <Link
                href={`/internal/admin/percakapan?vendor=${vendor.user_id}`}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink"
              >
                Percakapan dengan klien
              </Link>
              <Link
                href={`/internal/admin/whatsapp?user=${vendor.user_id}`}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink"
              >
                Kirim WhatsApp
              </Link>
              {vendor.status === "approved" && (
                <Link href={`/vendors/${vendor.user_id}`} target="_blank" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
                  Lihat seperti calon pengantin
                </Link>
              )}
              {chatState.error && (
                <p role="alert" className="basis-full text-sm font-medium text-dc-danger">
                  {chatState.error}
                </p>
              )}
            </div>

            <VendorCities vendor={vendor} onSaved={(cities) => setVendor({ ...vendor, cities, city: cities.join(", ") })} />

            <section aria-labelledby="cek-harga" className="mb-8">
              <h2 id="cek-harga" className="mb-3 font-heading text-2xl text-dc-ink">
                Pemeriksaan harga
              </h2>
              {checks.filter((c) => c.tone !== "info").length === 0 && (
                <p className="mb-3 rounded-lg bg-dc-success-soft px-4 py-3 text-sm font-medium text-dc-success">Harga profil dan paket konsisten. Tidak ada yang perlu diperiksa.</p>
              )}
              {checks.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {checks.map((c) => (
                    <li
                      key={c.text}
                      className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                        c.tone === "danger" ? "bg-dc-danger-soft text-dc-danger" : c.tone === "warning" ? "bg-dc-warning-soft text-dc-warning" : "bg-dc-cream text-dc-text-2"
                      }`}
                    >
                      {c.text}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="harga" className="mb-8">
              <h2 id="harga" className="mb-1 font-heading text-2xl text-dc-ink">
                Harga
              </h2>
              <p className="mb-3 text-sm text-dc-text-2">
                Kolom kiri adalah yang diisi vendor. Kolom kanan adalah yang dibaca dan dibayar calon pengantin (ditambah komisi {persen(vendor.commission_rate)}).
              </p>
              <Card className="overflow-hidden p-0">
                <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_110px] gap-4 border-b border-dc-line bg-dc-cream px-5 py-3 text-sm font-semibold text-dc-text-2 md:grid" aria-hidden>
                  <span>Item</span>
                  <span className="text-right">Diisi vendor</span>
                  <span className="text-right">Komisi</span>
                  <span className="text-right">Tampil di website</span>
                  <span className="text-right">Diubah</span>
                </div>
                <ul className="divide-y divide-dc-line">
                  <PriceRow label="Harga mulai dari" note="Tampil di kartu direktori" pair={vendor.price_min} fee={fee(vendor.price_min)} />
                  <PriceRow label="Harga tertinggi" note="Tampil di profil vendor" pair={vendor.price_max} fee={fee(vendor.price_max)} />
                  {vendor.packages.map((p) => (
                    <PriceRow key={p.id} label={p.name} note={p.description} pair={p.price} fee={fee(p.price)} updated={p.updated_at} isPackage />
                  ))}
                </ul>
              </Card>
            </section>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <section aria-labelledby="deskripsi">
                <h2 id="deskripsi" className="mb-3 font-heading text-2xl text-dc-ink">
                  Deskripsi
                </h2>
                <Card className="p-5">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-dc-text-2">{vendor.description || "Vendor belum menulis deskripsi."}</p>
                  {vendor.status === "rejected" && vendor.rejection_reason && (
                    <p className="mt-4 rounded-lg bg-dc-danger-soft px-4 py-3 text-sm text-dc-danger">Alasan ditolak: {vendor.rejection_reason}</p>
                  )}
                </Card>
              </section>
              <section aria-labelledby="portofolio">
                <h2 id="portofolio" className="mb-3 font-heading text-2xl text-dc-ink">
                  Portofolio <span className="text-base text-dc-text-3">({vendor.portfolio.length})</span>
                </h2>
                {vendor.portfolio.length === 0 ? (
                  <Card className="p-5 text-sm text-dc-text-2">Belum ada foto portofolio.</Card>
                ) : (
                  <ul className="grid grid-cols-3 gap-2">
                    {vendor.portfolio.slice(0, 9).map((src, i) => (
                      <li key={src} className="aspect-square overflow-hidden rounded-lg bg-dc-cream">
                        {/* eslint-disable-next-line @next/next/no-img-element -- vendor uploads on Supabase Storage, admin-only thumbnails */}
                        <img src={src} alt={`Foto portofolio ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

function PriceRow({ label, note, pair, fee, updated, isPackage = false }: { label: string; note?: string; pair: PricePair; fee: number; updated?: string; isPackage?: boolean }) {
  const empty = pair.vendor === 0;
  return (
    <li className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-5 py-4 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_110px] md:items-center">
      <div className="col-span-2 min-w-0 md:col-span-1">
        <p className="font-semibold text-dc-ink">
          {isPackage && <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-dc-text-3">Paket</span>}
          {label}
        </p>
        {note && <p className="line-clamp-2 text-sm text-dc-text-3">{note}</p>}
      </div>
      <p className="text-sm text-dc-text-2 md:text-right">
        <span className="md:hidden">Diisi vendor: </span>
        <span className="font-semibold tabular-nums text-dc-ink">{empty ? "Lewat chat" : formatRupiah(pair.vendor)}</span>
      </p>
      <p className="text-sm text-dc-text-2 md:text-right">
        <span className="md:hidden">Komisi: </span>
        <span className="tabular-nums">{empty ? "–" : formatRupiah(fee)}</span>
      </p>
      <p className="text-sm text-dc-text-2 md:text-right">
        <span className="md:hidden">Di website: </span>
        <span className="font-bold tabular-nums text-dc-ink">{empty ? "Lewat chat" : formatRupiah(pair.website)}</span>
      </p>
      <p className="text-sm text-dc-text-3 md:text-right">{updated ? relatif(updated) : <span className="md:hidden" />}</p>
    </li>
  );
}

/** Service area, with the Admin's emergency edit: for when a vendor cannot
 * fix their kabupaten/kota themselves. Same rules as the vendor form; a
 * reason is required, goes to the audit log and to the vendor's
 * notification. */
function VendorCities({ vendor, onSaved }: { vendor: AdminVendorDetail; onSaved: (cities: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [cities, setCities] = useState<string[]>(vendor.cities);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function start() {
    setCities(vendor.cities);
    setReason("");
    setError(null);
    setSaved(false);
    setEditing(true);
  }

  async function save() {
    if (cities.length === 0) return setError("Pilih minimal satu kabupaten atau kota.");
    if (reason.trim().length < 5) return setError("Tulis alasan perubahan, minimal 5 karakter.");
    setSaving(true);
    setError(null);
    try {
      const res = await apiPut<{ cities: string[] }>(`/api/v1/admin/vendors/${vendor.user_id}/cities`, { cities, reason: reason.trim() });
      onSaved(res.cities);
      setEditing(false);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lokasi belum bisa disimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="lokasi" className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="lokasi" className="font-heading text-2xl text-dc-ink">
            Lokasi layanan
          </h2>
          <p className="text-sm text-dc-text-2">Kabupaten/kota yang dilayani vendor. Biasanya diatur vendor sendiri di profilnya.</p>
        </div>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={start}>
            Ubah lokasi (darurat)
          </Button>
        )}
      </div>

      {saved && (
        <p role="status" className="mb-3 rounded-lg bg-dc-success-soft px-4 py-3 text-sm font-medium text-dc-success">
          Lokasi tersimpan. Vendor sudah diberi notifikasi beserta alasannya, dan perubahan tercatat di audit log.
        </p>
      )}

      {!editing ? (
        vendor.cities.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {vendor.cities.map((c) => (
              <li key={c} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dc-line-strong bg-dc-cream px-3.5 text-sm font-semibold text-dc-ink">
                {c}
                <span className="font-normal text-dc-text-3">· {findRegion(c)?.province ?? "di luar daftar"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg bg-dc-warning-soft px-4 py-3 text-sm font-medium text-dc-warning">
            Belum ada kabupaten/kota terpilih{vendor.city ? ` (teks lama: "${vendor.city}")` : ""}. Vendor ini tidak muncul di pencarian per kota.
          </p>
        )
      ) : (
        <Card className="flex flex-col gap-4 p-5">
          <p className="rounded-lg bg-dc-warning-soft px-4 py-3 text-sm leading-relaxed text-dc-warning">
            Pakai hanya saat darurat, misalnya vendor tidak bisa menyimpan profilnya. Vendor akan menerima notifikasi berisi daftar baru dan alasanmu.
          </p>
          <CityCombobox
            id="admin-cities"
            label="Kabupaten/kota layanan"
            values={cities}
            onChange={setCities}
            groups={[{ name: "Jabodetabek", cities: JABODETABEK }]}
            hint="Hanya dari daftar resmi kabupaten/kota, maksimal 20."
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-dc-ink">Alasan perubahan</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Misalnya: vendor tidak bisa menyimpan Jakarta Utara, diminta lewat chat 19 Nov"
              className="rounded-md border border-dc-line-strong bg-dc-white px-3.5 py-2.5 text-base text-dc-ink outline-none focus:border-dc-gold focus:shadow-[0_0_0_4px_rgb(184_146_74_/_0.15)]"
            />
            <span className="text-xs text-dc-text-3">Wajib. Tercatat di audit log dan dikirim ke vendor.</span>
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-dc-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Batal
            </Button>
            <Button size="sm" variant="primary" loading={saving} onClick={save}>
              Simpan lokasi
            </Button>
          </div>
        </Card>
      )}
    </section>
  );
}
