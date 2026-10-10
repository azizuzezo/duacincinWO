"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { TextField } from "@/components/TextField";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import { ErrorBanner, INPUT, PAGE } from "../../_ui";
import { apiDelete, apiGet, apiPost, apiPostForm, ApiError, type CurrentUser, type InspirationItem } from "@/lib/api";

export default function AdminInspirasiPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminInspirasiContent user={user} />}
    </WithUser>
  );
}

function AdminInspirasiContent({ user }: { user: CurrentUser }) {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [category, setCategory] = useState("");
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [sourceCredit, setSourceCredit] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  function loadItems() {
    apiGet<InspirationItem[]>("/api/v1/inspiration")
      .then((data) => {
        setItems(data ?? []);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Gagal memuat galeri."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const fileInput = document.getElementById("inspirasi-file") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Pilih file gambar dulu.");
      return;
    }
    if (!category.trim()) {
      setError("Kategori wajib diisi.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      form.append("caption", caption);
      form.append("alt_text", altText);
      form.append("source_credit", sourceCredit);
      await apiPostForm("/api/v1/admin/inspiration", form);
      setCategory("");
      setCaption("");
      setAltText("");
      setSourceCredit("");
      fileInput.value = "";
      loadItems();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus item ini dari galeri Inspirasi?")) return;
    try {
      await apiDelete(`/api/v1/admin/inspiration/${id}`);
      loadItems();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus item.");
    }
  }

  async function handleSyncPinterest() {
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const result = await apiPost<{ imported: number; already_synced: number; candidates_tested: number }>(
        "/api/v1/admin/inspiration/sync-pinterest",
        {},
      );
      setSyncResult(
        result.imported > 0
          ? `${result.imported} pin baru ditambahkan (${result.already_synced} sudah ada sebelumnya).`
          : `Tidak ada pin baru. Semua ${result.already_synced} pin di board sudah tersinkron.`,
      );
      loadItems();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal sinkronisasi board Pinterest.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader title="Kelola Galeri Inspirasi" subtitle="Unggah gambar atau sinkronkan dari Pinterest untuk galeri publik." />

        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-dc-ink">Sync Pinterest Board</p>
              <p className="mt-0.5 text-xs text-dc-black/60">
                Ambil pin baru dari papan Pinterest resmi DuaCincin dan tambahkan ke galeri ini. Pin yang sudah pernah
                disinkron tidak akan diimpor ulang.
              </p>
            </div>
            <div className="shrink-0">
              <Button type="button" onClick={handleSyncPinterest} loading={syncing}>
                Sync sekarang
              </Button>
            </div>
          </div>
          {syncResult && <p role="status" className="mt-3 text-sm text-dc-ink/80">{syncResult}</p>}
        </Card>

        <Card className="mt-6 p-5">
          <h2 className="mb-4 font-heading text-2xl text-dc-ink">Unggah gambar</h2>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="inspirasi-file" className="text-sm font-medium text-dc-ink">
                Gambar (JPEG/PNG/WEBP, maks 5MB)
              </label>
              <input
                id="inspirasi-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={`${INPUT} py-2 file:mr-3 file:rounded-md file:border-0 file:bg-dc-cream file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-dc-ink`}
              />
            </div>
            <TextField label="Kategori" value={category} onChange={setCategory} placeholder="mis. Dekorasi Outdoor" />
            <TextField label="Caption" value={caption} onChange={setCaption} required={false} />
            <TextField label="Alt text (deskripsi gambar)" value={altText} onChange={setAltText} required={false} />
            <TextField label="Sumber/kredit" value={sourceCredit} onChange={setSourceCredit} required={false} placeholder="mis. Vendor: Nama Vendor" />
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <Button type="submit" loading={uploading}>
              Unggah
            </Button>
          </form>
        </Card>

        <h2 className="mb-3 mt-10 font-heading text-2xl text-dc-ink">Galeri</h2>
        {loadError && <ErrorBanner message={loadError} onRetry={() => { setLoading(true); loadItems(); }} />}
        {loading ? (
          <div role="status" aria-label="Memuat" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-dc-cream" />
            ))}
          </div>
        ) : items.length === 0 ? (
          !loadError && <EmptyState title="Galeri masih kosong" body="Unggah gambar pertama atau sinkronkan dari Pinterest di atas." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="relative aspect-square w-full bg-dc-cream">
                  <Image src={item.url} alt={item.alt_text || item.caption} fill className="object-cover" unoptimized />
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-1">
                  <p className="truncate text-xs font-semibold text-dc-ink">{item.category}</p>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-xs font-semibold text-red-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-clay/50"
                  >
                    Hapus
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
