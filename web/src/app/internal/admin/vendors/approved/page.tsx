"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { VA_BTN_DANGER, VA_BTN_GOLD, VA_BTN_OUTLINE, VA_FOCUS, VaAlert, VaAvatar, VaChips, VaEmpty, VaFailed, VaHeader, VaList, VaPill, VaRouteTabs, VaRow, VaSearch, VaSkeleton } from "@/components/admin/VaKit";
import { wdButton } from "@/components/home/ui";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiDelete, apiGet, apiPatch, ApiError, categoriesLabel, type CurrentUser, type VendorSummary } from "@/lib/api";
import { ConfirmDialog, persen } from "../../../_ui";

/** Platform default when a vendor has no override (PRD §8.10). */
const DEFAULT_LABEL = "10%";

export default function ApprovedVendorsPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <ApprovedVendorsContent user={user} />}
    </WithUser>
  );
}

function ApprovedVendorsContent({ user }: { user: CurrentUser }) {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "custom" | "default">("all");
  const [editing, setEditing] = useState<VendorSummary | null>(null);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"custom" | "default" | null>(null);
  const [deleting, setDeleting] = useState<VendorSummary | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { show } = useToast();

  function load() {
    apiGet<VendorSummary[]>("/api/v1/admin/vendors/approved")
      .then((data) => {
        setVendors(data ?? []);
        setLoadFailed(false);
      })
      .catch((err) => {
        setLoadFailed(true);
        setError(err instanceof ApiError ? err.message : "Gagal memuat daftar vendor.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  function openEdit(v: VendorSummary) {
    setEditing(v);
    setDraft(v.commission_rate ? String(Math.round(v.commission_rate * 1000) / 10) : "");
    setDraftError(null);
  }

  // Same contract as before: a percentage is sent as a fraction; an empty
  // value (or "Pakai komisi bawaan") sends null to clear the override.
  async function save(useDefault: boolean) {
    if (!editing) return;
    const raw = useDefault ? "" : draft.trim().replace(",", ".");
    const rate = raw === "" ? null : Number(raw) / 100;
    if (rate !== null && (Number.isNaN(rate) || rate < 0 || rate > 1)) {
      setDraftError("Isi angka antara 0 dan 100.");
      return;
    }
    setSaving(useDefault || rate === null ? "default" : "custom");
    setError(null);
    try {
      await apiPatch(`/api/v1/admin/vendors/${editing.user_id}/commission`, { rate });
      show(rate === null ? `Komisi ${editing.business_name} kembali ke bawaan.` : `Komisi ${editing.business_name} jadi ${persen(rate)}.`, "success");
      setEditing(null);
      load();
    } catch (err) {
      setDraftError(err instanceof ApiError ? err.message : "Gagal menyimpan komisi.");
    } finally {
      setSaving(null);
    }
  }

  function openDelete(v: VendorSummary) {
    setDeleting(v);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await apiDelete(`/api/v1/admin/vendors/${target.user_id}`);
      show(`${target.business_name} sudah dihapus.`, "success");
      setVendors((prev) => prev.filter((x) => x.user_id !== target.user_id));
      setDeleting(null);
    } catch (err) {
      // 409 carries the plain reason (the vendor still has bookings).
      setDeleteError(err instanceof ApiError ? err.message : "Gagal menghapus vendor, coba lagi.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const q = search.trim().toLowerCase();
  const customCount = vendors.filter((v) => v.commission_rate).length;
  const shown = vendors.filter(
    (v) => (!q || v.business_name.toLowerCase().includes(q) || v.city.toLowerCase().includes(q)) && (filter === "all" || (filter === "custom" ? !!v.commission_rate : !v.commission_rate)),
  );
  const filtering = !!q || filter !== "all";

  return (
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <VaHeader
          kicker="Verifikasi vendor"
          title={
            <>
              Vendor <em>aktif</em>
            </>
          }
          sub={`Komisi ditambahkan di atas harga vendor pada harga yang dilihat calon pengantin; vendor menerima harganya utuh. Bawaan ${DEFAULT_LABEL} kecuali kamu atur khusus di sini.`}
        />
        <VaRouteTabs
          label="Daftar vendor"
          items={[
            { href: "/internal/admin/vendors", label: "Menunggu" },
            { href: "/internal/admin/vendors/approved", label: "Aktif dan komisi", count: loading ? null : vendors.length },
          ]}
        />

        <div className="mt-6">
          {error && !loadFailed && <VaAlert message={error} />}

          {loading ? (
            <VaSkeleton rows={5} label="Memuat vendor aktif" />
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
              art="shop"
              title="Belum ada vendor aktif"
              action={
                <Link href="/internal/admin/vendors" className={`${wdButton({ variant: "outline", size: "sm", className: "min-h-11" })} ${VA_FOCUS}`}>
                  Tinjau vendor menunggu
                </Link>
              }
            >
              Vendor yang kamu setujui akan muncul di sini.
            </VaEmpty>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
                <VaSearch value={search} onChange={setSearch} label="Cari vendor aktif" placeholder="Cari nama usaha atau kota" />
                <VaChips
                  label="Jenis komisi"
                  value={filter}
                  onChange={(id) => setFilter(id as "all" | "custom" | "default")}
                  options={[
                    { id: "all", label: "Semua", count: vendors.length },
                    { id: "custom", label: "Komisi khusus", count: customCount },
                    { id: "default", label: "Bawaan", count: vendors.length - customCount },
                  ]}
                />
              </div>
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
                        setFilter("all");
                      }}
                    >
                      Hapus pencarian
                    </button>
                  }
                >
                  Tidak ada vendor aktif yang cocok dengan pencarian ini.
                </VaEmpty>
              ) : (
                <VaList>
                  {shown.map((v) => (
                    <VaRow key={v.user_id}>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-1 py-4 sm:px-2">
                        <VaAvatar name={v.business_name} />
                        <div className="min-w-0 flex-1 basis-48">
                          <Link href={`/internal/admin/vendors/${v.user_id}`} className={`break-words text-lg font-semibold leading-snug text-wd-ink underline-offset-4 hover:underline ${VA_FOCUS}`}>
                            {v.business_name}
                          </Link>
                          <p className="mt-0.5 text-sm text-wd-text">
                            {categoriesLabel(v)} · {v.city}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 sm:w-36 sm:flex-col sm:items-end sm:gap-0.5">
                          <p className="font-semibold tabular-nums text-wd-ink">
                            <span className="sr-only">Komisi </span>
                            {v.commission_rate ? persen(v.commission_rate) : DEFAULT_LABEL}
                          </p>
                          {v.commission_rate ? <VaPill tone="warn">Khusus</VaPill> : <span className="text-xs text-wd-muted">bawaan</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openEdit(v)} className={VA_BTN_OUTLINE} aria-label={`Atur komisi ${v.business_name}`}>
                            Atur komisi
                          </button>
                          <button type="button" onClick={() => openDelete(v)} className={VA_BTN_DANGER} aria-label={`Hapus ${v.business_name}`}>
                            Hapus
                          </button>
                        </div>
                      </div>
                    </VaRow>
                  ))}
                </VaList>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Atur komisi" description={editing?.business_name}>
        <CommissionForm
          key={editing?.user_id ?? "none"}
          currentLabel={editing?.commission_rate ? `${persen(editing.commission_rate)} (khusus)` : `${DEFAULT_LABEL} (bawaan)`}
          hasOverride={!!editing?.commission_rate}
          draft={draft}
          onDraft={(v) => {
            setDraft(v);
            setDraftError(null);
          }}
          error={draftError}
          saving={saving}
          onSave={save}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => {
          if (!deleteBusy) setDeleting(null);
        }}
        onConfirm={confirmDelete}
        title={`Hapus ${deleting?.business_name ?? "vendor"}?`}
        consequence="Akun, profil, portofolio, paket harga, dan percakapan vendor ini dihapus permanen dan tidak bisa dikembalikan. Vendor yang sudah punya booking tidak bisa dihapus, karena riwayat booking dan pembayaran calon pengantin harus tetap tersimpan."
        confirmLabel="Hapus permanen"
        busy={deleteBusy}
        typeToConfirm={deleting?.business_name}
      >
        {deleteError && <VaAlert message={deleteError} />}
      </ConfirmDialog>
    </AdminShell>
  );
}

function CommissionForm({
  currentLabel,
  hasOverride,
  draft,
  onDraft,
  error,
  saving,
  onSave,
}: {
  currentLabel: string;
  hasOverride: boolean;
  draft: string;
  onDraft: (v: string) => void;
  error: string | null;
  saving: "custom" | "default" | null;
  onSave: (useDefault: boolean) => void;
}) {
  const id = useId();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(false);
      }}
      className="flex flex-col gap-5"
    >
      <div className="rounded-2xl bg-wd-accent-wash px-4 py-3 text-sm text-wd-text">
        Komisi sekarang: <span className="font-semibold text-wd-ink">{currentLabel}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-wd-ink">
          Komisi khusus (%)
        </label>
        <input
          id={id}
          inputMode="decimal"
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          placeholder={`Kosongkan untuk ${DEFAULT_LABEL}`}
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint`}
          className={`min-h-12 rounded-xl border bg-wd-white px-4 text-[0.95rem] text-wd-ink placeholder:text-wd-muted focus:border-wd-accent-line focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink ${error ? "border-wd-danger" : "border-wd-line-2"}`}
        />
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-wd-muted">
          Langsung menaikkan harga vendor ini di direktori, profil, dan paket (contoh: Rp10.000.000 tampil Rp11.000.000 dengan 10%). Booking yang sudah dibuat tidak berubah. Kosongkan untuk memakai komisi bawaan.
        </p>
        {error && (
          <p role="alert" className="text-sm font-semibold text-wd-danger">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <button type="submit" disabled={saving !== null} aria-busy={saving === "custom"} className={`${VA_BTN_GOLD} w-full`}>
          {saving === "custom" ? "Menyimpan..." : "Simpan komisi"}
        </button>
        {hasOverride && (
          <button type="button" onClick={() => onSave(true)} disabled={saving !== null} aria-busy={saving === "default"} className={`${VA_BTN_OUTLINE} w-full`}>
            Kembali ke komisi bawaan ({DEFAULT_LABEL})
          </button>
        )}
      </div>
    </form>
  );
}
