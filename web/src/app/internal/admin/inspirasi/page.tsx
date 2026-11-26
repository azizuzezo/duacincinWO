"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { AdmDialog, AdmHeader, ADM_FOCUS, Chips } from "@/components/admin/adm";
import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { Input } from "@/components/ui/Field";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPostForm,
  apiPut,
  ApiError,
  VENDOR_CATEGORIES,
  categoriesLabel,
  type CurrentUser,
  type DirectoryCard,
  type InspirationItem,
} from "@/lib/api";
import { ConfirmDialog, ErrorBanner } from "../../_ui";

/** Same cap as the server (inspiration.MaxVendorTags). */
const MAX_VENDOR_TAGS = 10;

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

  const [tagTarget, setTagTarget] = useState<InspirationItem | null>(null);
  const [vendors, setVendors] = useState<DirectoryCard[] | null>(null);
  const [vendorsFailed, setVendorsFailed] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [vendorQuery, setVendorQuery] = useState("");
  const [tagSaving, setTagSaving] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  const [viewTarget, setViewTarget] = useState<InspirationItem | null>(null);
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

  function loadVendors() {
    setVendorsFailed(false);
    apiGet<DirectoryCard[]>("/api/v1/vendors")
      .then((data) => setVendors(data ?? []))
      .catch(() => setVendorsFailed(true));
  }

  function openTagger(item: InspirationItem) {
    setTagTarget(item);
    setPicked((item.vendors ?? []).map((v) => v.id));
    setVendorQuery("");
    setTagError(null);
    if (vendors === null) loadVendors();
  }

  function togglePicked(id: string) {
    setTagError(null);
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX_VENDOR_TAGS) {
        setTagError(`Maksimal ${MAX_VENDOR_TAGS} vendor per foto.`);
        return cur;
      }
      return [...cur, id];
    });
  }

  async function saveTags() {
    if (!tagTarget) return;
    setTagSaving(true);
    setTagError(null);
    try {
      const updated = await apiPut<InspirationItem>(`/api/v1/admin/inspiration/${tagTarget.id}/vendors`, { vendor_ids: picked });
      setItems((cur) => cur.map((it) => (it.id === updated.id ? { ...it, vendors: updated.vendors } : it)));
      show(picked.length > 0 ? `${picked.length} vendor ditandai di foto ini.` : "Tanda vendor dihapus dari foto ini.", "success");
      setTagTarget(null);
    } catch (err) {
      setTagError(err instanceof ApiError ? err.message : "Gagal menyimpan vendor.");
    } finally {
      setTagSaving(false);
    }
  }

  // Vendors grouped by category, filtered by the search box. Already-picked
  // vendors always stay visible so they can be unticked.
  const vendorGroups = useMemo(() => {
    const needle = vendorQuery.trim().toLowerCase();
    const list = (vendors ?? []).filter(
      (v) => !needle || picked.includes(v.id) || `${v.business_name} ${v.city} ${categoriesLabel(v)}`.toLowerCase().includes(needle),
    );
    return VENDOR_CATEGORIES.map((c) => ({
      ...c,
      vendors: list.filter((v) => v.category === c.value).sort((a, b) => a.business_name.localeCompare(b.business_name, "id")),
    })).filter((g) => g.vendors.length > 0);
  }, [vendors, vendorQuery, picked]);

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

  const viewing = viewTarget ? (items.find((i) => i.id === viewTarget.id) ?? viewTarget) : null;
  const tagged = (it: InspirationItem) => (it.vendors?.length ?? 0) > 0;

  return (
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <AdmHeader
          kicker="Layanan"
          title={
            <>
              Galeri <em>inspirasi</em>
            </>
          }
          sub="Gambar di sini tampil di halaman Inspirasi publik. Hapus yang kurang pantas atau tidak sesuai."
          action={
            <>
              <button type="button" onClick={handleSyncPinterest} disabled={syncing} aria-busy={syncing} className={`${wdButton({ variant: "outline", size: "sm" })} ${ADM_FOCUS}`}>
                {syncing ? "Mengambil..." : "Ambil pin dari Pinterest"}
              </button>
              <button type="button" onClick={() => setUploadOpen(true)} className={`${wdButton({ variant: "ink", size: "sm" })} ${ADM_FOCUS}`}>
                Unggah gambar
              </button>
            </>
          }
        />

        <div className="mt-8">
          {syncResult && (
            <p role="status" className="mb-5 rounded-2xl bg-wd-accent-wash px-4 py-3 text-sm text-wd-text">
              {syncResult}
            </p>
          )}
          {error && <ErrorBanner message={error} />}

          {loading ? (
            <SkeletonGroup label="Memuat galeri" className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-4/5 w-full rounded-[22px]" />
              ))}
            </SkeletonGroup>
          ) : loadFailed ? (
            <ErrorBanner
              message="Galeri belum bisa dimuat."
              onRetry={() => {
                setLoading(true);
                loadItems();
              }}
            />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center rounded-[24px] bg-wd-paper px-6 py-14 text-center">
              <ClientArt kind="frame" className="h-16 w-16" />
              <p className="wd-display mt-4 text-[1.5rem]">Galeri masih kosong</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-wd-text">Unggah gambar pertama atau ambil pin dari papan Pinterest DuaCincin.</p>
              <button type="button" onClick={() => setUploadOpen(true)} className={`${wdButton({ variant: "ink", size: "sm" })} mt-5 ${ADM_FOCUS}`}>
                Unggah gambar
              </button>
            </div>
          ) : (
            <>
              <Chips
                label="Saring kategori"
                value={filter}
                onChange={setFilter}
                items={["semua", ...categories].map((c) => ({
                  id: c,
                  label: c === "semua" ? "Semua" : c,
                  count: c === "semua" ? items.length : items.filter((i) => i.category === c).length,
                }))}
              />

              <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
                {shown.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setViewTarget(item)}
                      aria-label={`Buka foto ${item.caption || item.category}`}
                      className={`group relative block aspect-4/5 w-full overflow-hidden rounded-[22px] bg-wd-blush ${ADM_FOCUS}`}
                    >
                      <Image
                        src={item.url}
                        alt={item.alt_text || item.caption || `Inspirasi ${item.category}`}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
                        unoptimized
                      />
                      {tagged(item) && (
                        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-wd-accent-ink">{item.vendors!.length} vendor</span>
                      )}
                    </button>
                    <div className="px-1 pt-2.5">
                      <p className="text-xs font-semibold text-wd-accent-ink">{item.category}</p>
                      {item.caption && <p className="mt-0.5 line-clamp-2 text-sm text-wd-ink">{item.caption}</p>}
                      {item.source_credit && <p className="mt-0.5 truncate text-xs text-wd-muted">{item.source_credit}</p>}
                      {tagged(item) && (
                        <p className="mt-1 line-clamp-2 text-xs text-wd-text">
                          <span className="font-semibold text-wd-ink">Vendor: </span>
                          {item.vendors!.map((v) => v.business_name).join(", ")}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <button type="button" onClick={() => openTagger(item)} className={`inline-flex min-h-11 items-center text-sm font-semibold text-wd-accent-ink underline-offset-4 hover:underline ${ADM_FOCUS}`}>
                          {tagged(item) ? "Ubah vendor" : "Tandai vendor"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          aria-label={`Hapus gambar ${item.caption || item.category}`}
                          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-wd-muted hover:bg-wd-blush hover:text-wd-danger ${ADM_FOCUS}`}
                        >
                          <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {viewing && (
        <AdmDialog
          title="Foto inspirasi"
          size="lg"
          onClose={() => setViewTarget(null)}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewTarget(null);
                  setDeleteTarget(viewing);
                }}
                className={`${wdButton({ variant: "outline", size: "sm" })} text-wd-danger ${ADM_FOCUS}`}
              >
                Hapus gambar
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewTarget(null);
                  openTagger(viewing);
                }}
                className={`${wdButton({ variant: "ink", size: "sm" })} ${ADM_FOCUS}`}
              >
                {tagged(viewing) ? "Ubah vendor" : "Tandai vendor"}
              </button>
            </div>
          }
        >
          <div className="overflow-hidden rounded-[18px] bg-wd-paper">
            {/* eslint-disable-next-line @next/next/no-img-element -- natural-size preview, same as the vendor portfolio popup */}
            <img src={viewing.url} alt={viewing.alt_text || viewing.caption || `Inspirasi ${viewing.category}`} className="mx-auto max-h-[56svh] w-auto max-w-full object-contain" />
          </div>
          <p className="mt-3 text-xs font-semibold text-wd-accent-ink">{viewing.category}</p>
          {viewing.caption && <p className="mt-0.5 break-words text-wd-ink">{viewing.caption}</p>}
          {viewing.source_credit && <p className="mt-0.5 text-sm text-wd-muted">{viewing.source_credit}</p>}
          <p className="mt-2 text-sm text-wd-text">
            {tagged(viewing) ? (
              <>
                <span className="font-semibold text-wd-ink">Ditandai: </span>
                {viewing.vendors!.map((v) => v.business_name).join(", ")}
              </>
            ) : (
              "Belum ada vendor yang ditandai."
            )}
          </p>
        </AdmDialog>
      )}

      {uploadOpen && (
        <AdmDialog
          title="Unggah gambar"
          note="Gambar langsung tampil di halaman Inspirasi publik."
          onClose={() => setUploadOpen(false)}
          footer={
            <button type="submit" form="form-inspirasi" disabled={uploading} aria-busy={uploading} className={`${wdButton({ variant: "ink", size: "md" })} w-full ${ADM_FOCUS}`}>
              {uploading ? "Mengunggah..." : "Unggah ke galeri"}
            </button>
          }
        >
          <form id="form-inspirasi" onSubmit={handleUpload} className="mt-2 flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="inspirasi-file" className="text-sm font-semibold text-wd-ink">
                Gambar
              </label>
              {preview && (
                // Local blob preview of the picked file; next/image cannot optimise blob URLs.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Pratinjau gambar yang dipilih" className="max-h-64 w-full rounded-2xl bg-wd-paper object-contain" />
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
                className={`w-full rounded-2xl border border-dashed border-wd-line-2 bg-wd-paper p-3 text-sm text-wd-text file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-wd-ink file:px-4 file:text-sm file:font-semibold file:text-white ${ADM_FOCUS}`}
              />
              <p id="inspirasi-file-hint" className="text-xs text-wd-muted">
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
              <p role="alert" className="text-sm font-medium text-wd-danger">
                {uploadError}
              </p>
            )}
          </form>
        </AdmDialog>
      )}

      {tagTarget && (
        <AdmDialog
          title="Vendor di foto ini"
          note="Tandai vendor yang mengerjakan pernikahan di foto ini. Nama mereka tampil di halaman Inspirasi dan tertaut ke profil vendor."
          onClose={() => setTagTarget(null)}
          footer={
            <button type="button" onClick={saveTags} disabled={tagSaving || (vendors === null && !vendorsFailed)} aria-busy={tagSaving} className={`${wdButton({ variant: "ink", size: "md" })} w-full ${ADM_FOCUS}`}>
              {tagSaving ? "Menyimpan..." : `Simpan ${picked.length > 0 ? `${picked.length} vendor` : "tanpa vendor"}`}
            </button>
          }
        >
          <div className="mt-2 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-wd-blush">
                <Image src={tagTarget.url} alt="" fill sizes="64px" className="object-cover" unoptimized />
              </div>
              <p className="line-clamp-3 min-w-0 text-sm text-wd-ink">{tagTarget.caption || tagTarget.alt_text || tagTarget.category}</p>
            </div>
            <Input label="Cari vendor" srLabel type="search" value={vendorQuery} onChange={(e) => setVendorQuery(e.target.value)} placeholder="Cari nama, kota, atau kategori" />
            <p className="text-xs text-wd-muted" aria-live="polite">
              {picked.length} dari maksimal {MAX_VENDOR_TAGS} vendor dipilih
            </p>
            {tagError && (
              <p role="alert" className="text-sm font-medium text-wd-danger">
                {tagError}
              </p>
            )}
            {vendorsFailed ? (
              <ErrorBanner message="Daftar vendor belum bisa dimuat." onRetry={loadVendors} />
            ) : vendors === null ? (
              <SkeletonGroup label="Memuat vendor" className="flex flex-col gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </SkeletonGroup>
            ) : vendors.length === 0 ? (
              <p className="rounded-2xl bg-wd-paper px-4 py-6 text-center text-sm text-wd-text">Belum ada vendor yang disetujui. Vendor baru bisa ditandai setelah pendaftarannya disetujui di menu Vendor Pending.</p>
            ) : vendorGroups.length === 0 ? (
              <p className="rounded-2xl bg-wd-paper px-4 py-6 text-center text-sm text-wd-text">{`Tidak ada vendor yang cocok dengan "${vendorQuery}".`}</p>
            ) : (
              vendorGroups.map((g) => (
                <fieldset key={g.value} className="flex flex-col">
                  <legend className="mb-1 text-xs font-semibold text-wd-accent-ink">{g.label}</legend>
                  <div className="divide-y divide-wd-line border-y border-wd-line">
                    {g.vendors.map((v) => {
                      const on = picked.includes(v.id);
                      return (
                        <label key={v.id} className={`flex min-h-12 cursor-pointer items-center gap-3 px-2 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-wd-ink ${on ? "bg-wd-accent-wash" : "hover:bg-wd-paper"}`}>
                          <input type="checkbox" checked={on} onChange={() => togglePicked(v.id)} className="h-5 w-5 shrink-0 accent-[var(--wd-ink)]" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-wd-ink">{v.business_name}</span>
                            {v.city && <span className="block text-xs text-wd-muted">{v.city}</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))
            )}
          </div>
        </AdmDialog>
      )}

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
            <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-wd-blush">
              <Image src={deleteTarget.url} alt="" fill sizes="64px" className="object-cover" unoptimized />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-wd-accent-ink">{deleteTarget.category}</p>
              {deleteTarget.caption && <p className="line-clamp-2 text-sm text-wd-ink">{deleteTarget.caption}</p>}
            </div>
          </div>
        )}
      </ConfirmDialog>
    </AdminShell>
  );
}
