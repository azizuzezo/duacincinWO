"use client";

import { useEffect, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { MotionItem, MotionList } from "@/components/ui/Motion";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPatch, ApiError, categoryLabel, type CurrentUser, type VendorSummary } from "@/lib/api";
import { ErrorBanner, Monogram, PAGE, persen, ResultCount, RowsSkeleton, SearchField, SubNav } from "../../../_ui";

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
  const [editing, setEditing] = useState<VendorSummary | null>(null);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"custom" | "default" | null>(null);
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

  const q = search.trim().toLowerCase();
  const shown = vendors.filter((v) => !q || v.business_name.toLowerCase().includes(q) || v.city.toLowerCase().includes(q));

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader
          eyebrow="Verifikasi vendor"
          title={
            <>
              Vendor <span className="dc-em">aktif</span>
            </>
          }
          subtitle={`Semua vendor memakai komisi bawaan platform (${DEFAULT_LABEL}) kecuali kamu atur khusus di sini.`}
        />
        <SubNav
          label="Daftar vendor"
          items={[
            { href: "/internal/admin/vendors", label: "Menunggu" },
            { href: "/internal/admin/vendors/approved", label: "Aktif dan komisi", count: loading ? null : vendors.length },
          ]}
        />

        {error && !loadFailed && <ErrorBanner message={error} />}

        {loading ? (
          <RowsSkeleton rows={5} label="Memuat vendor aktif" />
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
          <EmptyState title="Belum ada vendor aktif" body="Vendor yang kamu setujui akan muncul di sini." actionHref="/internal/admin/vendors" actionLabel="Tinjau vendor menunggu" />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <SearchField value={search} onChange={setSearch} label="Cari vendor aktif" placeholder="Cari nama usaha atau kota" />
              <ResultCount shown={shown.length} total={vendors.length} noun="vendor" />
            </div>

            {shown.length === 0 ? (
              <EmptyState title="Tidak ada yang cocok" body={`Tidak ada vendor aktif dengan nama atau kota "${search}".`} action={<Button variant="ghost" size="sm" onClick={() => setSearch("")}>Hapus pencarian</Button>} />
            ) : (
              <div className="overflow-hidden rounded-xl border border-dc-line bg-dc-white">
                <div className="hidden grid-cols-[1fr_180px_150px_140px] gap-4 border-b border-dc-line bg-dc-cream px-5 py-3 text-sm font-semibold text-dc-text-2 md:grid" aria-hidden>
                  <span>Vendor</span>
                  <span>Kategori</span>
                  <span className="text-right">Komisi</span>
                  <span />
                </div>
                <MotionList className="divide-y divide-dc-line">
                  {shown.map((v) => (
                    <MotionItem key={v.user_id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-5 py-4 md:grid-cols-[1fr_180px_150px_140px]">
                      <div className="flex min-w-0 items-center gap-3">
                        <Monogram name={v.business_name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-dc-ink">{v.business_name}</p>
                          <p className="truncate text-sm text-dc-text-3">
                            <span className="md:hidden">{categoryLabel(v.category)} · </span>
                            {v.city}
                          </p>
                        </div>
                      </div>
                      <p className="hidden text-sm text-dc-text-2 md:block">{categoryLabel(v.category)}</p>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums text-dc-ink">{v.commission_rate ? persen(v.commission_rate) : DEFAULT_LABEL}</p>
                        {v.commission_rate ? <Badge tone="gold">Khusus</Badge> : <p className="text-xs text-dc-text-3">bawaan</p>}
                      </div>
                      <div className="col-span-2 md:col-span-1 md:text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(v)} className="w-full md:w-auto" aria-label={`Atur komisi ${v.business_name}`}>
                          Atur komisi
                        </Button>
                      </div>
                    </MotionItem>
                  ))}
                </MotionList>
              </div>
            )}
          </>
        )}
      </div>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Atur komisi"
        description={editing?.business_name}
        footer={
          <div className="flex flex-col gap-2">
            <Button block onClick={() => save(false)} loading={saving === "custom"} disabled={saving !== null}>
              Simpan komisi
            </Button>
            {editing?.commission_rate ? (
              <Button variant="ghost" block onClick={() => save(true)} loading={saving === "default"} disabled={saving !== null}>
                Kembali ke komisi bawaan ({DEFAULT_LABEL})
              </Button>
            ) : null}
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(false);
          }}
          className="flex flex-col gap-5"
        >
          <div className="rounded-lg bg-dc-cream px-4 py-3 text-sm text-dc-text-2">
            Komisi sekarang:{" "}
            <span className="font-semibold text-dc-ink">{editing?.commission_rate ? `${persen(editing.commission_rate)} (khusus)` : `${DEFAULT_LABEL} (bawaan)`}</span>
          </div>
          <Input
            label="Komisi khusus (%)"
            inputMode="decimal"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setDraftError(null);
            }}
            placeholder={`Kosongkan untuk ${DEFAULT_LABEL}`}
            hint="Dipotong saat booking vendor ini selesai dan masuk antrian pencairan. Kosongkan untuk memakai komisi bawaan."
            error={draftError ?? undefined}
            autoFocus
          />
        </form>
      </Sheet>
    </Shell>
  );
}
