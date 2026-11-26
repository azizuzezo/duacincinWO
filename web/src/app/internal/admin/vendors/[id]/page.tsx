"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

import { VA_BTN_DANGER, VA_BTN_GOLD, VA_BTN_OUTLINE, VA_FOCUS, VaAlert, VaAvatar, VaFailed, VaLightbox, VaPill, VaSkeleton, type VaTone } from "@/components/admin/VaKit";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { CityCombobox } from "@/components/ui/CityCombobox";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, apiPut, ApiError, type Conversation, formatRupiah, formatWhatsApp, categoriesLabel, type CurrentUser } from "@/lib/api";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { findRegion, JABODETABEK } from "@/lib/wilayah";
import { ConfirmDialog, persen, relatif, tanggal } from "../../../_ui";

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

const STATUS: Record<AdminVendorDetail["status"], { label: string; tone: VaTone }> = {
  approved: { label: "Aktif di direktori", tone: "ok" },
  pending: { label: "Menunggu review", tone: "warn" },
  rejected: { label: "Ditolak", tone: "danger" },
};

const REJECT_PICKS = [
  "Nama usaha belum jelas atau tidak sesuai",
  "Kategori tidak sesuai dengan layanan",
  "Kota layanan belum diisi dengan benar",
];

function Section({ id, title, note, action, children }: { id: string; title: React.ReactNode; note?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-wd-line py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="wd-display text-2xl leading-tight">
            {title}
          </h2>
          {note && <p className="mt-1 max-w-2xl text-sm text-wd-text">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

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
  const { show } = useToast();
  const [chatState, setChatState] = useState<{ opening: boolean; error?: string }>({ opening: false });
  const [photo, setPhoto] = useState<number | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  // Same endpoints and payloads as the pending queue.
  async function approve() {
    if (!vendor) return;
    setApproving(true);
    setActionError(null);
    try {
      await apiPost(`/api/v1/admin/vendors/${vendor.user_id}/approve`, {});
      show(`${vendor.business_name} disetujui dan tampil di direktori.`, "success");
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal menyetujui vendor.");
    } finally {
      setApproving(false);
    }
  }

  async function confirmReject() {
    if (!vendor) return;
    setRejecting(true);
    setActionError(null);
    try {
      await apiPost(`/api/v1/admin/vendors/${vendor.user_id}/reject`, { reason: rejectReason });
      show(`${vendor.business_name} ditolak.`, "success");
      setRejectOpen(false);
      setRejectReason("");
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal menolak vendor.");
      setRejectOpen(false);
    } finally {
      setRejecting(false);
    }
  }

  const checks = vendor ? priceChecks(vendor) : [];
  const warnings = checks.filter((c) => c.tone !== "info");
  const fee = (p: PricePair) => p.website - p.vendor;
  const linkCls = `inline-flex min-h-11 items-center text-sm font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink ${VA_FOCUS}`;

  return (
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-10 pt-6 sm:pt-8">
        <Link href={vendor?.status === "pending" ? "/internal/admin/vendors" : "/internal/admin/vendors/approved"} className={`mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-wd-text hover:text-wd-ink ${VA_FOCUS}`}>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
          Daftar vendor
        </Link>

        {error ? (
          <VaFailed what={error.notFound ? "Vendor ini tidak ditemukan, atau detailnya" : "Detail vendor"} onRetry={() => load()} />
        ) : !vendor ? (
          <VaSkeleton rows={4} label="Memuat detail vendor" />
        ) : (
          <>
            <header className="flex items-start gap-4">
              <VaAvatar name={vendor.business_name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="wd-kicker">
                  {categoriesLabel(vendor)} · {vendor.cities.length ? vendor.cities.join(", ") : vendor.city || "Kota belum diisi"}
                </p>
                <h1 className="wd-display mt-1 break-words text-[clamp(2rem,4vw,3rem)] leading-[1.05]">{vendor.business_name}</h1>
                <p className="mt-2 break-words text-wd-text">
                  {vendor.owner_name || "Pemilik"} · {vendor.email} · bergabung {tanggal(vendor.joined_at)}
                </p>
              </div>
            </header>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <VaPill tone={STATUS[vendor.status].tone}>{STATUS[vendor.status].label}</VaPill>
              {vendor.account_status !== "active" && <VaPill tone="danger">Akun {vendor.account_status === "suspended" ? "ditangguhkan" : "diputus"}</VaPill>}
              <VaPill tone={vendor.commission_is_custom ? "warn" : "neutral"}>
                Komisi {persen(vendor.commission_rate)} {vendor.commission_is_custom ? "(khusus)" : "(bawaan)"}
              </VaPill>
              {vendor.whatsapp_number ? (
                <a href={`https://wa.me/${vendor.whatsapp_number}`} target="_blank" rel="noopener noreferrer" className={linkCls}>
                  WhatsApp {formatWhatsApp(vendor.whatsapp_number)}
                </a>
              ) : (
                <VaPill tone="warn">WhatsApp belum diisi</VaPill>
              )}
              <span className="text-sm text-wd-muted">Profil diubah {relatif(vendor.profile_updated_at)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1">
              <button type="button" onClick={openChat} disabled={chatState.opening} aria-busy={chatState.opening} className={`${linkCls} disabled:opacity-60`}>
                {chatState.opening ? "Membuka chat..." : "Chat vendor"}
              </button>
              <Link href={`/internal/admin/percakapan?vendor=${vendor.user_id}`} className={linkCls}>
                Percakapan dengan klien
              </Link>
              <Link href={`/internal/admin/whatsapp?user=${vendor.user_id}`} className={linkCls}>
                Kirim WhatsApp
              </Link>
              {vendor.status === "approved" && (
                <Link href={`/vendors/${vendor.user_id}`} target="_blank" className={linkCls}>
                  Lihat seperti calon pengantin
                  <span className="sr-only"> (tab baru)</span>
                </Link>
              )}
            </div>
            {chatState.error && (
              <p role="alert" className="text-sm font-medium text-wd-danger">
                {chatState.error}
              </p>
            )}
            {vendor.status === "rejected" && vendor.rejection_reason && (
              <p className="mt-4 rounded-2xl bg-wd-danger/[0.06] px-4 py-3 text-sm text-wd-danger">Alasan ditolak: {vendor.rejection_reason}</p>
            )}
            {actionError && <div className="mt-4"><VaAlert message={actionError} /></div>}

            <div className="mt-8">
              <Section id="portofolio" title={<>Portofolio <span className="text-base text-wd-muted">({vendor.portfolio.length})</span></>} note={vendor.portfolio.length > 0 ? "Klik foto untuk memperbesar." : undefined}>
                {vendor.portfolio.length === 0 ? (
                  <p className="rounded-2xl bg-wd-accent-wash px-4 py-3 text-sm text-wd-text">Belum ada foto portofolio.</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
                    {vendor.portfolio.map((src, i) => (
                      <li key={src} className={i === 0 && vendor.portfolio.length > 2 ? "col-span-2 lg:col-span-2 lg:row-span-2" : ""}>
                        <button type="button" onClick={() => setPhoto(i)} aria-label={`Perbesar foto portofolio ${i + 1}`} className={`block h-full w-full overflow-hidden rounded-2xl bg-wd-blush ${VA_FOCUS}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- vendor uploads on Supabase Storage, admin-only */}
                          <img src={src} alt={`Foto portofolio ${i + 1}`} loading={i < 3 ? "eager" : "lazy"} className={`h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02] ${i === 0 && vendor.portfolio.length > 2 ? "aspect-[4/3] lg:aspect-auto" : "aspect-[4/3]"}`} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section id="deskripsi" title="Deskripsi">
                <p className="max-w-3xl whitespace-pre-line break-words leading-relaxed text-wd-text">{vendor.description || "Vendor belum menulis deskripsi."}</p>
              </Section>

              <Section id="cek-harga" title="Pemeriksaan harga">
                {warnings.length === 0 && <p className="mb-3 rounded-2xl bg-wd-ok/10 px-4 py-3 text-sm font-medium text-wd-ok">Harga profil dan paket konsisten. Tidak ada yang perlu diperiksa.</p>}
                {checks.length > 0 && (
                  <ul className="border-t border-wd-line">
                    {checks.map((c) => (
                      <li key={c.text} className="flex items-start gap-3 border-b border-wd-line py-3 text-sm leading-relaxed text-wd-text">
                        <VaPill tone={c.tone === "danger" ? "danger" : c.tone === "warning" ? "warn" : "neutral"} className="mt-0.5 shrink-0">
                          {c.tone === "danger" ? "Periksa" : c.tone === "warning" ? "Perhatian" : "Info"}
                        </VaPill>
                        <span className="min-w-0 break-words">{c.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section id="harga" title="Harga" note={`Kolom kiri adalah yang diisi vendor. Kolom kanan adalah yang dibaca dan dibayar calon pengantin (ditambah komisi ${persen(vendor.commission_rate)}).`}>
                <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_110px] gap-4 border-b border-wd-line px-2 pb-2 text-sm font-semibold text-wd-ink md:grid" aria-hidden>
                  <span>Item</span>
                  <span className="text-right">Diisi vendor</span>
                  <span className="text-right">Komisi</span>
                  <span className="text-right">Tampil di website</span>
                  <span className="text-right">Diubah</span>
                </div>
                <ul>
                  <PriceRow label="Harga mulai dari" note="Tampil di kartu direktori" pair={vendor.price_min} fee={fee(vendor.price_min)} />
                  <PriceRow label="Harga tertinggi" note="Tampil di profil vendor" pair={vendor.price_max} fee={fee(vendor.price_max)} />
                  {vendor.packages.map((p) => (
                    <PriceRow key={p.id} label={p.name} note={p.description} pair={p.price} fee={fee(p.price)} updated={p.updated_at} isPackage />
                  ))}
                </ul>
              </Section>

              <VendorCities vendor={vendor} onSaved={(cities) => setVendor({ ...vendor, cities, city: cities.join(", ") })} />
            </div>
          </>
        )}
      </div>

      {/* Decision bar: sticks to the bottom while a vendor waits for review. */}
      {vendor?.status === "pending" && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-4 pb-2 md:bottom-4">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-3xl border border-wd-accent-line bg-wd-white px-4 py-3 shadow-wd-lift sm:rounded-full sm:pl-6">
            <p className="min-w-0 text-sm text-wd-text">
              <span className="font-semibold text-wd-ink">Keputusan</span>
              <span className="hidden sm:inline"> untuk {vendor.business_name}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setRejectOpen(true)} disabled={approving || rejecting} className={VA_BTN_DANGER}>
                Tolak
              </button>
              <button type="button" onClick={approve} disabled={approving || rejecting} aria-busy={approving} className={VA_BTN_GOLD}>
                {approving ? "Menyetujui..." : "Setujui vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      <VaLightbox photos={vendor?.portfolio ?? []} index={photo} onClose={() => setPhoto(null)} onIndex={setPhoto} label="Foto portofolio" />

      <ConfirmDialog
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setRejectReason("");
        }}
        onConfirm={confirmReject}
        busy={rejecting}
        title={`Tolak ${vendor?.business_name ?? "vendor"}?`}
        consequence="Vendor ini tidak akan tampil di direktori. Alasanmu disimpan bersama penolakan agar vendor tahu apa yang perlu diperbaiki."
        confirmLabel="Tolak vendor"
        reason={{ value: rejectReason, onChange: setRejectReason, label: "Alasan penolakan", picks: REJECT_PICKS, hint: "Tulis dengan sopan dan jelas. Pilih salah satu di atas atau tulis sendiri." }}
      />
    </AdminShell>
  );
}

function PriceRow({ label, note, pair, fee, updated, isPackage = false }: { label: string; note?: string; pair: PricePair; fee: number; updated?: string; isPackage?: boolean }) {
  const empty = pair.vendor === 0;
  return (
    <li className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-b border-wd-line px-2 py-4 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_110px] md:items-center">
      <div className="col-span-2 min-w-0 md:col-span-1">
        <p className="break-words font-semibold text-wd-ink">
          {isPackage && <span className="mr-2 text-xs font-semibold text-wd-accent-ink">Paket</span>}
          {label}
        </p>
        {note && <p className="line-clamp-2 text-sm text-wd-muted">{note}</p>}
      </div>
      <p className="text-sm text-wd-text md:text-right">
        <span className="md:hidden">Diisi vendor: </span>
        <span className="font-semibold tabular-nums text-wd-ink">{empty ? "Lewat chat" : formatRupiah(pair.vendor)}</span>
      </p>
      <p className="text-sm text-wd-text md:text-right">
        <span className="md:hidden">Komisi: </span>
        <span className="tabular-nums">{empty ? "-" : formatRupiah(fee)}</span>
      </p>
      <p className="text-sm text-wd-text md:text-right">
        <span className="md:hidden">Di website: </span>
        <span className="font-bold tabular-nums text-wd-ink">{empty ? "Lewat chat" : formatRupiah(pair.website)}</span>
      </p>
      <p className="text-sm text-wd-muted md:text-right">{updated ? relatif(updated) : <span className="md:hidden" />}</p>
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

  const reasonId = useId();
  return (
    <Section
      id="lokasi"
      title="Lokasi layanan"
      note="Kabupaten/kota yang dilayani vendor. Biasanya diatur vendor sendiri di profilnya."
      action={
        !editing ? (
          <button type="button" onClick={start} className={VA_BTN_OUTLINE}>
            Ubah lokasi (darurat)
          </button>
        ) : undefined
      }
    >
      {saved && (
        <p role="status" className="mb-3 rounded-2xl bg-wd-ok/10 px-4 py-3 text-sm font-medium text-wd-ok">
          Lokasi tersimpan. Vendor sudah diberi notifikasi beserta alasannya, dan perubahan tercatat di audit log.
        </p>
      )}

      {!editing ? (
        vendor.cities.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {vendor.cities.map((c) => (
              <li key={c} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-wd-accent-soft px-3.5 text-sm font-semibold text-wd-ink">
                {c}
                <span className="font-normal text-wd-muted">· {findRegion(c)?.province ?? "di luar daftar"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-wd-accent-wash px-4 py-3 text-sm font-medium text-wd-accent-ink">
            Belum ada kabupaten/kota terpilih{vendor.city ? ` (teks lama: "${vendor.city}")` : ""}. Vendor ini tidak muncul di pencarian per kota.
          </p>
        )
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl bg-wd-accent-wash p-5">
          <p className="text-sm leading-relaxed text-wd-text">Pakai hanya saat darurat, misalnya vendor tidak bisa menyimpan profilnya. Vendor akan menerima notifikasi berisi daftar baru dan alasanmu.</p>
          <CityCombobox
            id="admin-cities"
            label="Kabupaten/kota layanan"
            values={cities}
            onChange={setCities}
            groups={[{ name: "Jabodetabek", cities: JABODETABEK }]}
            hint="Hanya dari daftar resmi kabupaten/kota, maksimal 20."
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={reasonId} className="text-sm font-semibold text-wd-ink">
              Alasan perubahan
            </label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Misalnya: vendor tidak bisa menyimpan Jakarta Utara, diminta lewat chat 19 Nov"
              className={`rounded-xl border border-wd-line-2 bg-wd-white px-4 py-3 text-base text-wd-ink placeholder:text-wd-muted focus:border-wd-accent-line focus:outline-none ${VA_FOCUS}`}
            />
            <span className="text-xs text-wd-muted">Wajib. Tercatat di audit log dan dikirim ke vendor.</span>
          </div>
          {error && (
            <p role="alert" className="text-sm font-semibold text-wd-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className={VA_BTN_OUTLINE}>
              Batal
            </button>
            <button type="button" onClick={save} disabled={saving} aria-busy={saving} className={VA_BTN_GOLD}>
              {saving ? "Menyimpan..." : "Simpan lokasi"}
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}
