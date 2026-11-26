"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { VA_BTN_DANGER, VA_BTN_GOLD, VA_BTN_OUTLINE, VA_FOCUS, VaAlert, VaAvatar, VaChips, VaEmpty, VaFailed, VaHeader, VaList, VaPill, VaRouteTabs, VaRow, VaSearch, VaSkeleton } from "@/components/admin/VaKit";
import { wdButton } from "@/components/home/ui";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, categoriesLabel, categoryLabel, type CurrentUser, vendorCategoryList } from "@/lib/api";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { ConfirmDialog } from "../../_ui";

type PendingVendor = {
  user_id: string;
  business_name: string;
  category: string;
  categories?: string[];
  city: string;
  status: string;
};

const REJECT_PICKS = [
  "Nama usaha belum jelas atau tidak sesuai",
  "Kategori tidak sesuai dengan layanan",
  "Kota layanan belum diisi dengan benar",
];

export default function AdminVendorsPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminVendorsContent user={user} />}
    </WithUser>
  );
}

function AdminVendorsContent({ user }: { user: CurrentUser }) {
  const [vendors, setVendors] = useState<PendingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingVendor | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { show } = useToast();

  // Ids already on screen, to tell which rows a background refresh brought in.
  const knownIds = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  async function load({ background = false }: { background?: boolean } = {}) {
    try {
      const data = (await apiGet<PendingVendor[]>("/api/v1/admin/vendors/pending")) ?? [];
      const arrived = knownIds.current ? data.filter((v) => !knownIds.current!.has(v.user_id)) : [];
      knownIds.current = new Set(data.map((v) => v.user_id));
      if (background && arrived.length > 0) {
        setFresh((prev) => new Set([...prev, ...arrived.map((v) => v.user_id)]));
        show(arrived.length === 1 ? `Vendor baru menunggu review: ${arrived[0].business_name}.` : `${arrived.length} vendor baru menunggu review.`);
      }
      setVendors(data);
      // Drop selections for vendors that are no longer pending.
      setSelected((prev) => new Set([...prev].filter((id) => data.some((v) => v.user_id === id))));
      setLoadFailed(false);
    } catch (err) {
      // A failed background refresh keeps the list on screen; the next tick retries.
      if (background) return;
      setLoadFailed(true);
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar vendor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(load);
    // Mount only; later refreshes come from useLiveRefresh below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New sign-ups appear without a reload. Paused while an approve/reject is
  // in flight so the list never jumps under the admin's hand.
  useLiveRefresh(() => {
    if (!busyId && !bulkBusy && !loadFailed) load({ background: true });
  });

  async function handleApprove(v: PendingVendor) {
    setBusyId(v.user_id);
    setError(null);
    try {
      await apiPost(`/api/v1/admin/vendors/${v.user_id}/approve`, {});
      show(`${v.business_name} disetujui dan tampil di direktori.`, "success");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyetujui vendor.");
    } finally {
      setBusyId(null);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkApprove() {
    setBulkBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ approved: number }>("/api/v1/admin/vendors/bulk-approve", { ids: Array.from(selected) });
      show(`${res.approved} vendor disetujui.`, "success");
      setSelected(new Set());
      setBulkOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyetujui vendor terpilih.");
      setBulkOpen(false);
    } finally {
      setBulkBusy(false);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setBusyId(target.user_id);
    setError(null);
    try {
      await apiPost(`/api/v1/admin/vendors/${target.user_id}/reject`, { reason: rejectReason });
      show(`${target.business_name} ditolak.`, "success");
      setRejectTarget(null);
      setRejectReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menolak vendor.");
    } finally {
      setBusyId(null);
    }
  }

  const q = search.trim().toLowerCase();
  const catCounts = new Map<string, number>();
  vendors.forEach((v) => vendorCategoryList(v).forEach((c) => catCounts.set(c, (catCounts.get(c) ?? 0) + 1)));
  const catOptions = [{ id: "all", label: "Semua", count: vendors.length }, ...[...catCounts].map(([id, count]) => ({ id, label: categoryLabel(id), count }))];
  const activeCat = cat === "all" || catCounts.has(cat) ? cat : "all";
  const shown = vendors.filter(
    (v) => (!q || v.business_name.toLowerCase().includes(q) || v.city.toLowerCase().includes(q)) && (activeCat === "all" || vendorCategoryList(v).includes(activeCat)),
  );
  const selectedVendors = vendors.filter((v) => selected.has(v.user_id));
  const allShownSelected = shown.length > 0 && shown.every((v) => selected.has(v.user_id));
  const filtering = !!q || activeCat !== "all";

  return (
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <VaHeader
          kicker="Verifikasi vendor"
          title={
            <>
              Vendor <em>menunggu</em> review
            </>
          }
          sub="Vendor baru tampil di direktori setelah kamu setujui. Vendor yang ditolak menerima alasanmu."
        />
        <VaRouteTabs
          label="Daftar vendor"
          items={[
            { href: "/internal/admin/vendors", label: "Menunggu", count: loading ? null : vendors.length },
            { href: "/internal/admin/vendors/approved", label: "Aktif dan komisi" },
          ]}
        />

        <div className="mt-6">
          {error && !loadFailed && <VaAlert message={error} />}

          {loading ? (
            <VaSkeleton rows={4} label="Memuat vendor" />
          ) : loadFailed ? (
            <VaFailed
              what="Daftar vendor"
              onRetry={() => {
                setLoading(true);
                setError(null);
                load();
              }}
            />
          ) : vendors.length === 0 ? (
            <VaEmpty
              art="clipboard"
              title="Tidak ada vendor yang menunggu"
              action={
                <Link href="/internal/admin/vendors/approved" className={`${wdButton({ variant: "outline", size: "sm", className: "min-h-11" })} ${VA_FOCUS}`}>
                  Lihat vendor aktif
                </Link>
              }
            >
              Pendaftaran vendor baru akan muncul di sini untuk kamu tinjau.
            </VaEmpty>
          ) : (
            <>
              <div className="mb-5 rounded-2xl bg-wd-accent-wash px-5 py-4 text-sm leading-relaxed text-wd-text">
                <span className="font-semibold text-wd-ink">Sebelum menyetujui:</span> pastikan nama usaha, kategori, dan kota sesuai layanan yang dijual. Setiap vendor sudah menyetujui Perjanjian Kemitraan saat mendaftar.{" "}
                <Link href="/legal/vendor-agreement" target="_blank" className={`inline-flex min-h-11 items-center font-semibold text-wd-accent-ink underline underline-offset-4 ${VA_FOCUS}`}>
                  Baca perjanjian
                  <span className="sr-only"> (tab baru)</span>
                </Link>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
                <VaSearch value={search} onChange={setSearch} label="Cari vendor" placeholder="Cari nama usaha atau kota" />
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-wd-text">
                  <input
                    type="checkbox"
                    checked={allShownSelected}
                    onChange={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        shown.forEach((v) => (allShownSelected ? next.delete(v.user_id) : next.add(v.user_id)));
                        return next;
                      })
                    }
                    className={`h-5 w-5 accent-wd-ink ${VA_FOCUS}`}
                  />
                  Pilih semua yang tampil
                </label>
              </div>
              {catOptions.length > 2 && (
                <div className="mb-4">
                  <VaChips label="Kategori" options={catOptions} value={activeCat} onChange={setCat} />
                </div>
              )}
              <p className="mb-2 text-sm text-wd-muted" aria-live="polite">
                {filtering ? `${shown.length} dari ${vendors.length} vendor` : `${vendors.length} vendor`}
              </p>

              {shown.length === 0 ? (
                <VaEmpty
                  art="mirror"
                  title="Tidak ada yang cocok"
                  action={
                    <button
                      type="button"
                      className={VA_BTN_OUTLINE}
                      onClick={() => {
                        setSearch("");
                        setCat("all");
                      }}
                    >
                      Hapus pencarian
                    </button>
                  }
                >
                  Tidak ada vendor yang cocok dengan pencarian atau kategori ini.
                </VaEmpty>
              ) : (
                <VaList>
                  {shown.map((v) => {
                    const isSel = selected.has(v.user_id);
                    return (
                      <VaRow key={v.user_id} className={isSel ? "bg-wd-accent-wash" : ""}>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-1 py-4 sm:px-2">
                          <label className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-wd-blush">
                            <input type="checkbox" checked={isSel} onChange={() => toggleSelect(v.user_id)} className={`h-5 w-5 accent-wd-ink ${VA_FOCUS}`} aria-label={`Pilih ${v.business_name}`} />
                          </label>
                          <VaAvatar name={v.business_name} />
                          <div className="min-w-0 flex-1 basis-48">
                            <p className="flex flex-wrap items-center gap-2">
                              <Link href={`/internal/admin/vendors/${v.user_id}`} className={`break-words text-lg font-semibold leading-snug text-wd-ink underline-offset-4 hover:underline ${VA_FOCUS}`}>
                                {v.business_name}
                              </Link>
                              {fresh.has(v.user_id) && <VaPill tone="gold">Baru</VaPill>}
                            </p>
                            <p className="mt-0.5 text-sm text-wd-text">
                              {categoriesLabel(v)} · {v.city}
                            </p>
                            <p className="mt-0.5 text-xs text-wd-muted">Perjanjian kemitraan disetujui</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pl-[3.75rem] sm:pl-0">
                            <Link href={`/internal/admin/vendors/${v.user_id}`} className={VA_BTN_OUTLINE}>
                              Tinjau
                              <span className="sr-only"> {v.business_name}</span>
                            </Link>
                            <button type="button" onClick={() => setRejectTarget(v)} disabled={busyId === v.user_id} className={VA_BTN_DANGER}>
                              Tolak
                            </button>
                            <button type="button" onClick={() => handleApprove(v)} disabled={busyId === v.user_id} aria-busy={busyId === v.user_id} className={VA_BTN_GOLD}>
                              {busyId === v.user_id ? "Menyetujui..." : "Setujui vendor"}
                            </button>
                          </div>
                        </div>
                      </VaRow>
                    );
                  })}
                </VaList>
              )}
            </>
          )}
        </div>
        {selected.size > 0 && <div aria-hidden className="h-20" />}
      </div>

      {/* Bulk bar: appears only with a selection, above the mobile tab bar. */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-4 md:bottom-6 md:left-[272px]">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-full bg-wd-ink py-2 pl-5 pr-2 text-white shadow-wd-lift">
            <p className="text-sm font-medium tabular-nums" aria-live="polite">
              {selected.size} vendor dipilih
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setSelected(new Set())} className="min-h-11 rounded-full px-3 text-sm font-semibold text-white/80 hover:text-white focus-visible:outline-2 focus-visible:outline-wd-accent">
                Batal pilih
              </button>
              <button type="button" onClick={() => setBulkOpen(true)} className={wdButton({ variant: "gold", size: "sm", className: "min-h-11 focus-visible:outline-2 focus-visible:outline-white" })}>
                Setujui semua
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!rejectTarget}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason("");
        }}
        onConfirm={confirmReject}
        busy={!!rejectTarget && busyId === rejectTarget.user_id}
        title={`Tolak ${rejectTarget?.business_name ?? "vendor"}?`}
        consequence="Vendor ini tidak akan tampil di direktori. Alasanmu disimpan bersama penolakan agar vendor tahu apa yang perlu diperbaiki."
        confirmLabel="Tolak vendor"
        reason={{ value: rejectReason, onChange: setRejectReason, label: "Alasan penolakan", picks: REJECT_PICKS, hint: "Tulis dengan sopan dan jelas. Pilih salah satu di atas atau tulis sendiri." }}
      />

      <ConfirmDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onConfirm={handleBulkApprove}
        busy={bulkBusy}
        tone="primary"
        title={`Setujui ${selected.size} vendor?`}
        consequence="Semua vendor di bawah langsung tampil di direktori dan bisa menerima booking."
        confirmLabel={`Setujui ${selected.size} vendor`}
      >
        <ul className="max-h-48 overflow-y-auto rounded-lg border border-dc-line">
          {selectedVendors.map((v, i) => (
            <li key={v.user_id} className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${i > 0 ? "border-t border-dc-line" : ""}`}>
              <span className="font-semibold text-dc-ink">{v.business_name}</span>
              <span className="text-dc-text-3">{v.city}</span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </AdminShell>
  );
}
