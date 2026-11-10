"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { MotionItem, MotionList } from "@/components/ui/Motion";
import { WithUser } from "@/components/WithUser";
import { apiDelete, apiGet, apiPost, apiPostForm, ApiError, type CurrentUser, type InspirationItem } from "@/lib/api";
import { ConfirmDialog, ErrorBanner, PAGE } from "../../_ui";

export default function AdminInspirasiPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminInspirasiContent user={user} />}
    </WithUser>
  );
}

function AdminInspirasiContent({ user }: { user: CurrentUser }) {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("semua");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [sourceCredit, setSourceCredit] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<InspirationItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { show } = useToast();

  function loadItems() {
    apiGet<InspirationItem[]>("/api/v1/inspiration")
      .then((data) => {
        setItems(data ?? []);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(loadItems);
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function resetForm() {
    setCategory("");
    setCaption("");
    setAltText("");
    setSourceCredit("");
    setPreview(null);
    setUploadError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setUploadError("Pilih file gambar dulu.");
      return;
    }
    if (!category.trim()) {
      setUploadError("Kategori wajib diisi.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      form.append("caption", caption);
      form.append("alt_text", altText);
      form.append("source_credit", sourceCredit);
      await apiPostForm("/api/v1/admin/inspiration", form);
      show("Gambar ditambahkan ke galeri Inspirasi.", "success");
      resetForm();
      setUploadOpen(false);
      loadItems();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete(`/api/v1/admin/inspiration/${deleteTarget.id}`);
      show("Gambar dihapus dari galeri.", "success");
      setDeleteTarget(null);
      loadItems();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus item.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSyncPinterest() {
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const result = await apiPost<{ imported: number; already_synced: number; candidates_tested: number }>("/api/v1/admin/inspiration/sync-pinterest", {});
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

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "id"));
  const shown = filter === "semua" ? items : items.filter((i) => i.category === filter);

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader
          eyebrow="Layanan"
          title={
            <>
              Galeri <span className="dc-em">inspirasi</span>
            </>
          }
          subtitle="Gambar di sini tampil di halaman Inspirasi publik. Hapus yang kurang pantas atau tidak sesuai."
          action={
            <>
              <Button variant="ghost" size="sm" onClick={handleSyncPinterest} loading={syncing}>
                Ambil pin dari Pinterest
              </Button>
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                Unggah gambar
              </Button>
            </>
          }
        />

        {syncResult && (
          <p role="status" className="mb-5 rounded-lg bg-dc-cream px-4 py-3 text-sm text-dc-text-2">
            {syncResult}
          </p>
        )}
        {error && <ErrorBanner message={error} />}

        {loading ? (
          <SkeletonGroup label="Memuat galeri" className="columns-2 gap-4 sm:columns-3 lg:columns-4">
            {["4/5", "1/1", "3/4", "4/5", "1/1", "3/4", "1/1", "4/5"].map((r, i) => (
              <div key={i} style={{ aspectRatio: r }} className="mb-4 break-inside-avoid overflow-hidden rounded-lg">
                <Skeleton className="h-full w-full" />
              </div>
            ))}
          </SkeletonGroup>
        ) : loadFailed ? (
          <ErrorState title="Galeri belum bisa dimuat" onRetry={() => { setLoading(true); loadItems(); }} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Galeri masih kosong"
            body="Unggah gambar pertama atau ambil pin dari papan Pinterest DuaCincin."
            action={<Button size="sm" onClick={() => setUploadOpen(true)}>Unggah gambar</Button>}
          />
        ) : (
          <>
            <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
              <div role="group" aria-label="Saring kategori" className="flex w-max gap-2">
                {["semua", ...categories].map((c) => {
                  const on = filter === c;
                  const n = c === "semua" ? items.length : items.filter((i) => i.category === c).length;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFilter(c)}
                      className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
                        on ? "border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong bg-dc-white text-dc-text-2 hover:border-dc-ink hover:text-dc-ink"
                      }`}
                    >
                      {c === "semua" ? "Semua" : c}
                      <span className={`tabular-nums ${on ? "text-dc-on-dark/75" : "text-dc-text-3"}`}>{n}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Masonry keeps each photo at its own ratio, the way the public page shows it. */}
            <MotionList className="columns-2 gap-4 sm:columns-3 lg:columns-4">
              {shown.map((item) => (
                <MotionItem key={item.id} layout={false} className="mb-4 break-inside-avoid">
                  <figure className="group relative overflow-hidden rounded-lg border border-dc-line bg-dc-white">
                    <Image
                      src={item.url}
                      alt={item.alt_text || item.caption || `Inspirasi ${item.category}`}
                      width={600}
                      height={750}
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="h-auto w-full"
                      unoptimized
                    />
                    <figcaption className="px-3 pb-3 pt-2.5">
                      <p className="text-xs font-semibold text-dc-clay">{item.category}</p>
                      {item.caption && <p className="mt-0.5 line-clamp-2 text-sm text-dc-ink">{item.caption}</p>}
                      {item.source_credit && <p className="mt-1 truncate text-xs text-dc-text-3">{item.source_credit}</p>}
                    </figcaption>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      aria-label={`Hapus gambar ${item.caption || item.category}`}
                      className="absolute right-2 top-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-dc-white/95 px-3.5 text-sm font-semibold text-dc-danger shadow-soft transition-colors hover:bg-dc-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                    >
                      <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" />
                      </svg>
                      Hapus
                    </button>
                  </figure>
                </MotionItem>
              ))}
            </MotionList>
          </>
        )}
      </div>

      <Sheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Unggah gambar"
        description="Gambar langsung tampil di halaman Inspirasi publik."
        footer={
          <Button type="submit" form="form-inspirasi" block loading={uploading}>
            Unggah ke galeri
          </Button>
        }
      >
        <form id="form-inspirasi" onSubmit={handleUpload} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor="inspirasi-file" className="text-sm font-semibold text-dc-ink">
              Gambar
            </label>
            {preview && (
              // Local blob preview of the picked file; next/image cannot optimise blob URLs.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Pratinjau gambar yang dipilih" className="max-h-64 w-full rounded-lg object-contain" />
            )}
            <input
              ref={fileRef}
              id="inspirasi-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-describedby="inspirasi-file-hint"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : null);
                setUploadError(null);
              }}
              className="w-full rounded-md border border-dashed border-dc-line-strong bg-dc-ivory p-3 text-sm text-dc-text-2 file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-dc-ink file:px-4 file:text-sm file:font-semibold file:text-dc-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
            />
            <p id="inspirasi-file-hint" className="text-xs text-dc-text-3">
              JPEG, PNG, atau WEBP, maksimal 5 MB.
            </p>
          </div>
          <Input label="Kategori" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Misalnya Dekorasi Outdoor" list="kategori-inspirasi" />
          <datalist id="kategori-inspirasi">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Input label="Caption" optional value={caption} onChange={(e) => setCaption(e.target.value)} />
          <Input label="Deskripsi gambar" optional hint="Dibacakan untuk pengunjung tunanetra. Jelaskan isi gambarnya." value={altText} onChange={(e) => setAltText(e.target.value)} />
          <Input label="Sumber atau kredit" optional value={sourceCredit} onChange={(e) => setSourceCredit(e.target.value)} placeholder="Misalnya Vendor: Nama Vendor" />
          {uploadError && (
            <p role="alert" className="text-sm font-medium text-dc-danger">
              {uploadError}
            </p>
          )}
        </form>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        busy={deleting}
        title="Hapus gambar ini?"
        consequence="Gambar langsung hilang dari halaman Inspirasi publik."
        confirmLabel="Hapus gambar"
      >
        {deleteTarget && (
          <div className="flex items-center gap-3">
            <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-dc-cream">
              <Image src={deleteTarget.url} alt="" fill sizes="64px" className="object-cover" unoptimized />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dc-clay">{deleteTarget.category}</p>
              {deleteTarget.caption && <p className="line-clamp-2 text-sm text-dc-ink">{deleteTarget.caption}</p>}
            </div>
          </div>
        )}
      </ConfirmDialog>
    </Shell>
  );
}
