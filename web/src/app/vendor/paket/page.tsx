"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EtalaseTabs } from "@/components/vendor/EtalaseTabs";
import { WithUser } from "@/components/WithUser";
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  ApiError,
  formatRupiah,
  type CurrentUser,
  type VendorPackage,
  type VendorProfile,
} from "@/lib/api";

const INPUT =
  "min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-4 py-2.5 text-dc-black transition focus:border-dc-ink focus:outline-2 focus:outline-offset-2 focus:outline-dc-gold";
const MAX_PACKAGES = 12; // mirrors server/internal/vendors/handlers_packages.go

export default function VendorPackagesPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorPackagesContent user={user} />}
    </WithUser>
  );
}

function VendorPackagesContent({ user }: { user: CurrentUser }) {
  const [profile, setProfile] = useState<VendorProfile | null | undefined>(undefined);
  const [packages, setPackages] = useState<VendorPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Editor state: `editing` is a package id, "new", or null (closed).
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<VendorPackage | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      apiGet<VendorProfile>("/api/v1/vendor/profile/me").catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null; // no profile yet is normal
        throw e;
      }),
      apiGet<VendorPackage[]>("/api/v1/vendor/packages"),
    ])
      .then(([p, pk]) => {
        setProfile(p);
        setPackages(pk ?? []);
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Gagal memuat paket."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  function openEditor(pkg?: VendorPackage) {
    setEditing(pkg ? pkg.id : "new");
    setName(pkg?.name ?? "");
    setDescription(pkg?.description ?? "");
    setPrice(pkg ? String(pkg.price) : "");
    setFormError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const value = Number(price);
    if (!name.trim()) return setFormError("Nama paket wajib diisi.");
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) return setFormError("Harga harus berupa angka rupiah utuh, 0 atau lebih.");

    setSaving(true);
    try {
      const body = { name: name.trim(), description: description.trim(), price: value };
      if (editing === "new") {
        const created = await apiPost<VendorPackage>("/api/v1/vendor/packages", body);
        setPackages((list) => [...list, created]);
      } else {
        const updated = await apiPut<VendorPackage>(`/api/v1/vendor/packages/${editing}`, body);
        setPackages((list) => list.map((p) => (p.id === updated.id ? updated : p)));
      }
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal menyimpan paket.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/v1/vendor/packages/${toDelete.id}`);
      setPackages((list) => list.filter((p) => p.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Gagal menghapus paket.");
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const atLimit = packages.length >= MAX_PACKAGES;

  return (
    <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <EtalaseTabs publicId={profile?.status === "approved" ? user.id : undefined} />
        <PageHeader
          title="Paket harga"
          subtitle="Rincian paket yang tampil di profil publikmu. Harga mulai dari di direktori tetap diatur di halaman Profil."
          action={
            profile && !loading && editing === null ? (
              <Button type="button" onClick={() => openEditor()} disabled={atLimit} className="w-auto">
                Tambah paket
              </Button>
            ) : undefined
          }
        />

        {loading && (
          <div role="status" aria-label="Memuat paket" className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-dc-ink/10 motion-reduce:animate-none" />
            ))}
          </div>
        )}

        {!loading && loadError && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{loadError}</span>
            <button type="button" onClick={load} className="inline-flex min-h-11 items-center rounded-md border border-red-300 px-4 font-semibold hover:bg-red-100">
              Coba lagi
            </button>
          </div>
        )}

        {!loading && !loadError && profile === null && (
          <EmptyState
            title="Lengkapi profil dulu"
            body="Paket harga ditampilkan di profil usahamu, jadi profil perlu dibuat lebih dulu."
            actionHref="/vendor/profile"
            actionLabel="Ke halaman Profil"
          />
        )}

        {!loading && profile && editing !== null && (
          <Card className="mb-6 p-5">
            <h2 className="font-heading text-2xl text-dc-ink">{editing === "new" ? "Paket baru" : "Ubah paket"}</h2>
            <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4" noValidate>
              <div>
                <label htmlFor="pkg-name" className="mb-1.5 block text-sm font-medium text-dc-ink">
                  Nama paket
                </label>
                <input id="pkg-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={INPUT} placeholder="Contoh: Paket Full Day" />
              </div>
              <div>
                <label htmlFor="pkg-desc" className="mb-1.5 block text-sm font-medium text-dc-ink">
                  Isi paket <span className="font-normal text-dc-black/70">(opsional)</span>
                </label>
                <textarea id="pkg-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} rows={4} className={INPUT} placeholder="Durasi, jumlah tim, hasil yang didapat" />
              </div>
              <div>
                <label htmlFor="pkg-price" className="mb-1.5 block text-sm font-medium text-dc-ink">
                  Harga (Rp)
                </label>
                <input id="pkg-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} className={INPUT} placeholder="25000000" />
              </div>
              {formError && (
                <p role="alert" className="text-sm text-red-700">
                  {formError}
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" loading={saving} className="sm:w-auto">
                  Simpan paket
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)} className="sm:w-auto">
                  Batal
                </Button>
              </div>
            </form>
          </Card>
        )}

        {!loading && !loadError && profile && packages.length === 0 && editing === null && (
          <EmptyState title="Belum ada paket" body="Tambahkan paket supaya calon pengantin bisa membandingkan pilihan dan harga sebelum chat." />
        )}

        {!loading && packages.length > 0 && (
          <ul className="flex flex-col gap-3">
            {packages.map((p) => (
              <li key={p.id}>
                <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-heading break-words text-2xl text-dc-ink">{p.name}</h3>
                    {p.description && <p className="mt-1.5 whitespace-pre-line break-words text-sm text-dc-black/70">{p.description}</p>}
                    <p className="mt-3 font-sans text-lg font-semibold tabular-nums text-dc-ink">{p.price > 0 ? formatRupiah(p.price) : "Gratis"}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditor(p)}
                      aria-label={`Ubah paket ${p.name}`}
                      className="inline-flex min-h-11 items-center rounded-md border border-dc-ink/25 px-4 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-ink hover:bg-dc-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => setToDelete(p)}
                      aria-label={`Hapus paket ${p.name}`}
                      className="inline-flex min-h-11 items-center rounded-md border border-red-300 px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
        {atLimit && <p className="mt-4 text-sm text-dc-black/70">Batas {MAX_PACKAGES} paket sudah tercapai. Hapus atau gabungkan paket untuk menambah yang baru.</p>}
      </div>

      <Modal open={toDelete !== null} onClose={() => setToDelete(null)} title="Hapus paket ini?">
        <p className="text-sm text-dc-black/70">
          Paket <span className="font-semibold text-dc-ink">{toDelete?.name}</span> tidak akan tampil lagi di profil publikmu. Booking yang sudah berjalan tidak terpengaruh.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => setToDelete(null)} className="sm:w-auto">
            Batal
          </Button>
          <Button type="button" onClick={handleDelete} loading={deleting} className="bg-red-700 hover:bg-red-800 sm:w-auto">
            Ya, hapus
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}
