"use client";

import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, categoryLabel, type CurrentUser } from "@/lib/api";
import { ConfirmDialog, DangerGhostButton, ErrorBanner, Monogram, PAGE, QueueItem, ResultCount, RowsSkeleton, SearchField, SubNav } from "../../_ui";

type PendingVendor = {
  user_id: string;
  business_name: string;
  category: string;
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { show } = useToast();

  async function load() {
    try {
      const data = (await apiGet<PendingVendor[]>("/api/v1/admin/vendors/pending")) ?? [];
      setVendors(data);
      // Drop selections for vendors that are no longer pending.
      setSelected((prev) => new Set([...prev].filter((id) => data.some((v) => v.user_id === id))));
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar vendor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

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
  const shown = vendors.filter((v) => !q || v.business_name.toLowerCase().includes(q) || v.city.toLowerCase().includes(q));
  const selectedVendors = vendors.filter((v) => selected.has(v.user_id));
  const allShownSelected = shown.length > 0 && shown.every((v) => selected.has(v.user_id));

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader
          eyebrow="Verifikasi vendor"
          title={
            <>
              Vendor <span className="dc-em">menunggu</span> review
            </>
          }
          subtitle="Vendor baru tampil di direktori setelah kamu setujui. Vendor yang ditolak menerima alasanmu."
        />
        <SubNav
          label="Daftar vendor"
          items={[
            { href: "/internal/admin/vendors", label: "Menunggu", count: loading ? null : vendors.length },
            { href: "/internal/admin/vendors/approved", label: "Aktif dan komisi" },
          ]}
        />

        {error && !loadFailed && <ErrorBanner message={error} />}

        {loading ? (
          <RowsSkeleton rows={3} label="Memuat vendor" />
        ) : loadFailed ? (
          <ErrorState
            title="Daftar vendor belum bisa dimuat"
            onRetry={() => {
              setLoading(true);
              setError(null);
              load();
            }}
          />
        ) : vendors.length === 0 ? (
          <EmptyState
            title="Tidak ada vendor yang menunggu"
            body="Pendaftaran vendor baru akan muncul di sini untuk kamu tinjau."
            actionHref="/internal/admin/vendors/approved"
            actionLabel="Lihat vendor aktif"
          />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <SearchField value={search} onChange={setSearch} label="Cari vendor" placeholder="Cari nama usaha atau kota" />
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-dc-text-2">
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
                  className="h-5 w-5 accent-dc-ink"
                />
                Pilih semua yang tampil
              </label>
              <ResultCount shown={shown.length} total={vendors.length} noun="vendor" />
            </div>

            <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-lg bg-dc-cream px-4 py-3 text-sm text-dc-text-2">
              <p>
                <span className="font-semibold text-dc-ink">Sebelum menyetujui:</span> pastikan nama usaha, kategori, dan kota sesuai layanan yang dijual. Setiap vendor sudah menyetujui Perjanjian Kemitraan saat mendaftar.
              </p>
              <Link
                href="/legal/vendor-agreement"
                target="_blank"
                className="inline-flex min-h-11 items-center font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
              >
                Baca perjanjian
                <span className="sr-only"> (tab baru)</span>
              </Link>
            </div>

            {shown.length === 0 ? (
              <EmptyState title="Tidak ada yang cocok" body={`Tidak ada vendor dengan nama atau kota "${search}".`} action={<Button variant="ghost" size="sm" onClick={() => setSearch("")}>Hapus pencarian</Button>} />
            ) : (
              <ul className="grid gap-4 lg:grid-cols-2">
                <AnimatePresence initial={false}>
                {shown.map((v, i) => {
                  const isSel = selected.has(v.user_id);
                  return (
                    <QueueItem key={v.user_id} index={i}>
                      <article
                        aria-labelledby={`v-${v.user_id}`}
                        className={`flex h-full flex-col rounded-xl border bg-dc-white transition-colors ${isSel ? "border-dc-ink" : "border-dc-line"}`}
                      >
                        <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
                          <Monogram name={v.business_name} />
                          <div className="min-w-0 flex-1">
                            <h2 id={`v-${v.user_id}`} className="font-heading text-2xl leading-tight text-dc-ink">
                              {v.business_name}
                            </h2>
                            <p className="mt-1 text-sm text-dc-text-2">
                              {categoryLabel(v.category)} · {v.city}
                            </p>
                          </div>
                          <label className="-m-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-dc-cream">
                            <input type="checkbox" checked={isSel} onChange={() => toggleSelect(v.user_id)} className="h-5 w-5 accent-dc-ink" aria-label={`Pilih ${v.business_name}`} />
                          </label>
                        </div>

                        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-dc-line px-5 py-3 sm:px-6">
                          <span className="flex items-center gap-1.5 text-sm text-dc-text-2">
                            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-dc-success" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m4.5 10.5 3.5 3.5 7.5-8" />
                            </svg>
                            Perjanjian kemitraan disetujui
                          </span>
                          <span className="flex gap-2">
                          <DangerGhostButton onClick={() => setRejectTarget(v)} disabled={busyId === v.user_id}>
                            Tolak
                          </DangerGhostButton>
                          <Button size="sm" onClick={() => handleApprove(v)} loading={busyId === v.user_id}>
                            Setujui vendor
                          </Button>
                          </span>
                        </div>
                      </article>
                    </QueueItem>
                  );
                })}
                </AnimatePresence>
              </ul>
            )}
          </>
        )}
        {selected.size > 0 && <div aria-hidden className="h-20" />}
      </div>

      {/* Sticky bulk bar: appears only with a selection, above the mobile tab bar. */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-4 md:bottom-6 md:left-[272px]">
          <div className="mx-auto flex max-w-xl animate-fade-up items-center justify-between gap-3 rounded-full bg-dc-ink py-2 pl-5 pr-2 text-dc-on-dark shadow-float">
            <p className="text-sm font-medium tabular-nums" aria-live="polite">
              {selected.size} vendor dipilih
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setSelected(new Set())} className="min-h-11 rounded-full px-3 text-sm font-semibold text-dc-on-dark/80 hover:text-dc-on-dark focus-visible:outline-2 focus-visible:outline-dc-gold-antique">
                Batal pilih
              </button>
              <Button variant="light" size="sm" onClick={() => setBulkOpen(true)}>
                Setujui semua
              </Button>
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
    </Shell>
  );
}
